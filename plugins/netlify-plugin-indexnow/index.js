'use strict';

// Production-only IndexNow notifier.
//
// Change detection hashes the built HTML (not the git diff). A layout or
// include edit then shows up as a modified page, and a deleted page is still
// reported because its URL disappears from the publish directory. Asset
// files are ignored. The hash manifest lives in Netlify's build cache via
// utils.cache, which persists from onPostBuild. onSuccess runs after the
// deploy is live, which is when IndexNow can fetch the URLs and the key.
//
// The manifest is saved before that POST. A failed POST is logged, retried
// inside this build, and then swallowed. A best-effort cache rollback is
// attempted so the next production deploy can send the same URLs again.
// Cache writes during onSuccess are not guaranteed to persist; if they do
// not, clear the Netlify build cache and redeploy to resubmit.

const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  CACHE_DIR,
  MANIFEST_FILE,
  MAX_URLS_PER_REQUEST,
  INDEXNOW_ENDPOINT,
  readCanonicalSite,
  inspectKeyFiles,
  collectPages,
  diffPages,
  readManifest,
  writeManifest,
  chunk,
  countChanges,
} = require('./logic');

const REQUEST_TIMEOUT_MS = 20000;
const LOG_EACH_LIMIT = 100;

function guard(name, fn) {
  return async function guarded(args) {
    try {
      await fn(args || {});
    } catch (error) {
      console.error(`IndexNow: ${name} hit an unexpected error. The deploy will continue.`);
      console.error(error && error.stack ? error.stack : error);
    }
  };
}

function isProduction(constants) {
  return process.env.CONTEXT === 'production' && !(constants && constants.IS_LOCAL);
}

function workingDirectory(args) {
  return args.cwd || process.cwd();
}

function pendingFile() {
  const raw = process.env.BUILD_ID || process.env.DEPLOY_ID || process.env.COMMIT_REF || 'local';
  const safe = String(raw).replace(/[^A-Za-z0-9._-]/g, '_');
  return path.join(os.tmpdir(), `indexnow-pending-${safe}.json`);
}

function writePending(payload) {
  const file = pendingFile();
  fs.writeFileSync(file, JSON.stringify(payload));
}

function readPending() {
  const file = pendingFile();
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`IndexNow: could not read the pending submission file (${error.message}).`);
    return null;
  } finally {
    fs.rmSync(file, { force: true });
  }
}

function clearPending() {
  fs.rmSync(pendingFile(), { force: true });
}

function showStatus(utils, summary) {
  try {
    if (utils && utils.status && typeof utils.status.show === 'function') {
      utils.status.show({ title: 'IndexNow', summary });
    }
  } catch (error) {
    console.error('IndexNow: could not set the deploy summary.');
    console.error(error && error.stack ? error.stack : error);
  }
}

function logChanges(changes) {
  const listed = changes.length <= LOG_EACH_LIMIT ? changes : changes.slice(0, 20);
  for (const change of listed) {
    console.log(`IndexNow: ${change.change} ${change.url}`);
  }
  if (listed.length < changes.length) {
    console.log(`IndexNow: ${changes.length - listed.length} more changed URL(s) not listed.`);
  }
}

function manifestPath(cwd) {
  return path.join(cwd, CACHE_DIR, MANIFEST_FILE);
}

async function loadPreviousPages(cache, cwd) {
  const directory = path.join(cwd, CACHE_DIR);
  fs.rmSync(directory, { recursive: true, force: true });
  const restored = await cache.restore(CACHE_DIR, { cwd });
  if (!restored) {
    console.log('IndexNow: no page manifest in the Netlify build cache yet.');
    return null;
  }
  try {
    const pages = readManifest(manifestPath(cwd));
    console.log(`IndexNow: restored a manifest covering ${Object.keys(pages).length} page URL(s).`);
    return pages;
  } catch (error) {
    console.error(
      `IndexNow: the cached manifest could not be read (${error.message}). This deploy will establish a new baseline.`
    );
    return null;
  }
}

async function saveManifest(cache, cwd, pages) {
  writeManifest(manifestPath(cwd), pages);
  const saved = await cache.save(CACHE_DIR, {
    cwd,
    digests: [`${CACHE_DIR}/${MANIFEST_FILE}`],
  });
  if (!saved) {
    console.error('IndexNow: utils.cache.save returned false. The next production deploy may submit these URLs again.');
    return false;
  }
  console.log('IndexNow: saved the page manifest to the Netlify build cache.');
  return true;
}

function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  if (typeof timer.unref === 'function') timer.unref();
  return controller.signal;
}

function retryDelayMs(attempt, response) {
  if (process.env.INDEXNOW_RETRY_DELAY_MS != null && process.env.INDEXNOW_RETRY_DELAY_MS !== '') {
    const configured = Number(process.env.INDEXNOW_RETRY_DELAY_MS);
    if (Number.isFinite(configured) && configured >= 0) return configured;
  }
  const header = response && response.headers && typeof response.headers.get === 'function'
    ? response.headers.get('retry-after')
    : null;
  const retryAfterSeconds = header == null ? NaN : Number(header);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(retryAfterSeconds * 1000, 15000);
  }
  return Math.min(1000 * 2 ** (attempt - 1), 8000);
}

function maxAttempts() {
  const configured = Number(process.env.INDEXNOW_MAX_ATTEMPTS || 3);
  if (Number.isInteger(configured) && configured > 0) return configured;
  return 3;
}

function shouldRetryStatus(status) {
  return status === 403 || status === 422 || status === 429 || status >= 500;
}

function delay(ms) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postBatch(fetchFn, body, batchNumber, batchCount) {
  const label = batchCount > 1 ? ` batch ${batchNumber}/${batchCount}` : '';
  const attempts = maxAttempts();
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      console.log(
        `IndexNow: POST ${INDEXNOW_ENDPOINT}${label} (${body.urlList.length} URL(s), attempt ${attempt}/${attempts}).`
      );
      const response = await fetchFn(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'victordepaiva-indexnow',
        },
        body: JSON.stringify(body),
        signal: timeoutSignal(REQUEST_TIMEOUT_MS),
      });
      const text = typeof response.text === 'function' ? await response.text() : '';
      const snippet = text && text.length > 500 ? `${text.slice(0, 500)}…` : text;
      const status = response.status;
      const statusText = response.statusText || '';
      if (status === 200 || status === 202) {
        console.log(`IndexNow: response ${status} ${statusText}`.trim() + (snippet ? ` ${snippet}` : ''));
        return { ok: true, status };
      }
      console.error(`IndexNow: response ${status} ${statusText}`.trim() + (snippet ? `: ${snippet}` : ''));
      if (!shouldRetryStatus(status) || attempt === attempts) {
        return { ok: false, status };
      }
      await delay(retryDelayMs(attempt, response));
    } catch (error) {
      const name = error && error.name ? error.name : 'Error';
      const message = error && error.message ? error.message : error;
      console.error(`IndexNow: request failed (${name}: ${message}).`);
      if (attempt === attempts) return { ok: false, status: null };
      await delay(retryDelayMs(attempt));
    }
  }
  return { ok: false, status: null };
}

async function postIndexNow({ host, key, keyLocation, urls }) {
  if (typeof globalThis.fetch !== 'function') {
    console.error('IndexNow: global fetch is not available. No request sent.');
    return { ok: false, status: null };
  }
  const batches = chunk(urls, MAX_URLS_PER_REQUEST);
  let allOk = true;
  let lastStatus = null;
  for (let index = 0; index < batches.length; index += 1) {
    const result = await postBatch(
      globalThis.fetch,
      { host, key, keyLocation, urlList: batches[index] },
      index + 1,
      batches.length
    );
    if (!result.ok) allOk = false;
    if (result.status != null) lastStatus = result.status;
  }
  return { ok: allOk, status: lastStatus };
}

function urlsForHost(changes, host) {
  const urls = [];
  for (const change of changes) {
    let parsed;
    try {
      parsed = new URL(change.url);
    } catch (error) {
      console.error(`IndexNow: skipping invalid URL ${change.url}.`);
      continue;
    }
    if (parsed.hostname !== host) {
      console.error(`IndexNow: skipping ${change.url} because its host is not ${host}.`);
      continue;
    }
    urls.push(change.url);
  }
  return urls;
}

async function rollbackManifest(cache, cwd, previousPages) {
  if (!cache) return;
  try {
    fs.rmSync(path.join(cwd, CACHE_DIR), { recursive: true, force: true });
    if (previousPages) {
      writeManifest(manifestPath(cwd), previousPages);
      const saved = await cache.save(CACHE_DIR, {
        cwd,
        digests: [`${CACHE_DIR}/${MANIFEST_FILE}`],
      });
      console.log(`IndexNow: best-effort manifest rollback save returned ${saved}.`);
      return;
    }
    if (typeof cache.remove === 'function') {
      const removed = await cache.remove(CACHE_DIR, { cwd });
      console.log(`IndexNow: best-effort manifest removal returned ${removed}.`);
      return;
    }
    console.error('IndexNow: cache.remove is unavailable, so the new manifest was left in place.');
  } catch (error) {
    console.error('IndexNow: could not roll the page manifest back.');
    console.error(error && error.stack ? error.stack : error);
  }
}

async function onPostBuild(args) {
  const constants = args.constants || {};
  const utils = args.utils || {};
  const cwd = workingDirectory(args);
  const context = process.env.CONTEXT || '(unset)';
  clearPending();
  console.log(`IndexNow: onPostBuild context=${context} local=${Boolean(constants.IS_LOCAL)}.`);

  const publishDir = constants.PUBLISH_DIR;
  if (!publishDir || !fs.existsSync(publishDir)) {
    console.error('IndexNow: publish directory is missing. Nothing will be sent.');
    showStatus(utils, 'Skipped: publish directory missing');
    return;
  }

  let site;
  try {
    site = readCanonicalSite(cwd);
  } catch (error) {
    console.error(`IndexNow: ${error.message}. Nothing will be sent.`);
    showStatus(utils, 'Skipped: site URL unavailable');
    return;
  }

  const keys = inspectKeyFiles(publishDir);
  for (const invalid of keys.invalid) {
    console.error(`IndexNow: ignored ${invalid.fileName}: ${invalid.reason}.`);
  }
  if (keys.valid.length === 1) {
    console.log(`IndexNow: key file ${site.origin}/${keys.valid[0].fileName} (${keys.valid[0].key.length} bytes, no trailing newline).`);
  } else {
    console.error(`IndexNow: expected one root key file whose contents equal its name. Found ${keys.valid.length}.`);
  }

  const pages = collectPages(publishDir, site.origin);
  const pageCount = Object.keys(pages).length;
  console.log(`IndexNow: scanned ${pageCount} indexable HTML page(s). Non-page assets, 404, and sitemap files are skipped.`);

  if (!isProduction(constants)) {
    console.log('IndexNow: dry-run: this is not a production deploy. No IndexNow request will be sent and the change manifest will not be read or updated.');
    const sample = Object.keys(pages).sort().slice(0, 15);
    for (const url of sample) console.log(`IndexNow: dry-run page ${url}`);
    if (pageCount > sample.length) {
      console.log(`IndexNow: dry-run: ${pageCount - sample.length} more page(s) not listed.`);
    }
    showStatus(utils, 'Skipped: not a production deploy');
    return;
  }

  const cache = utils.cache;
  if (!cache || typeof cache.restore !== 'function' || typeof cache.save !== 'function') {
    console.error('IndexNow: Netlify cache utils are unavailable. Nothing will be sent.');
    showStatus(utils, 'Skipped: build cache unavailable');
    return;
  }

  const previousPages = await loadPreviousPages(cache, cwd);
  const hadBaseline = previousPages != null;
  const changes = diffPages(hadBaseline ? previousPages : null, pages);
  const counts = countChanges(changes);

  if (keys.valid.length !== 1) {
    console.error(`IndexNow: not submitting ${changes.length} changed URL(s), and not updating the manifest, because the key file was missing or ambiguous.`);
    logChanges(changes);
    showStatus(utils, 'Skipped: IndexNow key file missing');
    return;
  }

  if (!hadBaseline) {
    console.log(`IndexNow: no previous manifest. Submitting all ${changes.length} current page URL(s) once to establish a baseline.`);
  } else if (changes.length === 0) {
    console.log('IndexNow: no page URL changes since the last saved manifest.');
  } else {
    console.log(`IndexNow: ${changes.length} changed page URL(s) (added=${counts.added}, modified=${counts.modified}, removed=${counts.removed}).`);
  }
  logChanges(changes);

  await saveManifest(cache, cwd, pages);

  if (changes.length === 0) {
    console.log('IndexNow: nothing changed. No request will be sent.');
    writePending({ submit: false, reason: 'no-changes' });
    showStatus(utils, 'No page changes to submit');
    return;
  }

  const urls = urlsForHost(changes, site.host);
  if (urls.length === 0) {
    console.error('IndexNow: every changed URL was rejected. No request will be sent.');
    showStatus(utils, 'Skipped: no URLs for this host');
    return;
  }

  writePending({
    submit: true,
    host: site.host,
    key: keys.valid[0].key,
    keyLocation: `${site.origin}/${keys.valid[0].fileName}`,
    urls,
    previousPages,
  });
  showStatus(utils, `Will submit ${urls.length} URL(s) after deploy`);
}

async function onSuccess(args) {
  const constants = args.constants || {};
  const utils = args.utils || {};
  const cwd = workingDirectory(args);
  const context = process.env.CONTEXT || '(unset)';

  if (!isProduction(constants)) {
    console.log(`IndexNow: onSuccess context=${context} local=${Boolean(constants.IS_LOCAL)}. Skipping IndexNow POST.`);
    showStatus(utils, 'Skipped: not a production deploy');
    return;
  }

  const pending = readPending();
  if (!pending) {
    console.error('IndexNow: onSuccess found no pending submission. No request sent.');
    return;
  }
  if (!pending.submit) {
    console.log(`IndexNow: onSuccess nothing to send (${pending.reason || 'empty'}).`);
    return;
  }

  const urls = Array.isArray(pending.urls) ? pending.urls : [];
  if (urls.length === 0) {
    console.log('IndexNow: onSuccess URL list is empty. No request sent.');
    return;
  }

  const result = await postIndexNow({
    host: pending.host,
    key: pending.key,
    keyLocation: pending.keyLocation,
    urls,
  });

  if (!result.ok) {
    console.error('IndexNow: submission did not succeed. The deploy will continue.');
    console.error('IndexNow: the page manifest was saved before the request. Attempting to roll it back so the next production deploy can retry. If that rollback does not persist, clear the Netlify build cache and redeploy.');
    await rollbackManifest(utils.cache, cwd, pending.previousPages || null);
    showStatus(utils, 'Submission failed; deploy continues. See the log.');
    return;
  }

  console.log(`IndexNow: submitted ${urls.length} URL(s).`);
  showStatus(utils, `Submitted ${urls.length} URL(s) (HTTP ${result.status}).`);
}

module.exports = {
  onPostBuild: guard('onPostBuild', onPostBuild),
  onSuccess: guard('onSuccess', onSuccess),
};
