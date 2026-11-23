'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, test, beforeEach, afterEach } = require('node:test');

const plugin = require('./index');

const ORIGIN = 'https://victordepaiva.com';
const KEY = 'abcd1234efgh5678';

describe('IndexNow plugin hooks', { concurrency: 1 }, () => {
  const envKeys = ['CONTEXT', 'BUILD_ID', 'INDEXNOW_MAX_ATTEMPTS', 'INDEXNOW_RETRY_DELAY_MS'];
  let savedEnv;
  let savedFetch;
  let originalLog;
  let originalError;
  let logs;

  beforeEach(() => {
    savedEnv = {};
    for (const key of envKeys) savedEnv[key] = process.env[key];
    savedFetch = globalThis.fetch;
    originalLog = console.log;
    originalError = console.error;
    logs = [];
    console.log = (...args) => logs.push(args.join(' '));
    console.error = (...args) => logs.push(args.join(' '));
    process.env.INDEXNOW_MAX_ATTEMPTS = '3';
    process.env.INDEXNOW_RETRY_DELAY_MS = '0';
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] == null) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    globalThis.fetch = savedFetch;
    console.log = originalLog;
    console.error = originalError;
  });

  test('preview builds scan pages and do not submit or touch the cache', async () => {
    const site = makeSite({
      [`${KEY}.txt`]: KEY,
      'en/about/index.html': '<p>about</p>',
      '404.html': '<p>nope</p>',
      'assets/app.js': 'var x = 1;',
    });
    const cache = memoryCache();
    const fetched = [];
    globalThis.fetch = async () => {
      fetched.push(true);
      return okResponse(200);
    };
    process.env.CONTEXT = 'deploy-preview';
    process.env.BUILD_ID = 'preview-1';

    await plugin.onPostBuild(hookArgs(site, cache));
    await plugin.onSuccess(hookArgs(site, cache));

    assert.strictEqual(fetched.length, 0);
    assert.deepStrictEqual(cache.calls.map((call) => call[0]), []);
    assert.match(logs.join('\n'), /dry-run: this is not a production deploy/);
    assert.match(logs.join('\n'), /Skipping IndexNow POST/);
    assert.match(logs.join('\n'), new RegExp(`${ORIGIN}/${KEY}\\.txt`));
    assert.match(logs.join('\n'), new RegExp(`dry-run page ${ORIGIN}/en/about/`));
  });

  test('the first production deploy submits every current page and the second submits nothing', async () => {
    const site = makeSite({
      [`${KEY}.txt`]: KEY,
      'en/index.html': '<p>en</p>',
      'en/about/index.html': '<p>about</p>',
      '404.html': '<p>missing</p>',
      'sitemap.html': '<p>map</p>',
      'assets/ignore.html': '<p>asset</p>',
      'llms.txt': 'hello',
    });
    const cache = memoryCache();
    const fetched = [];
    globalThis.fetch = async (url, options) => {
      fetched.push({ url, body: JSON.parse(options.body), headers: options.headers });
      return okResponse(202, 'accepted');
    };
    process.env.CONTEXT = 'production';
    process.env.BUILD_ID = 'prod-baseline';

    await plugin.onPostBuild(hookArgs(site, cache));
    await plugin.onSuccess(hookArgs(site, cache));

    assert.strictEqual(fetched.length, 1);
    assert.strictEqual(fetched[0].url, 'https://api.indexnow.org/indexnow');
    assert.strictEqual(fetched[0].headers['Content-Type'], 'application/json; charset=utf-8');
    assert.deepStrictEqual(fetched[0].body, {
      host: 'victordepaiva.com',
      key: KEY,
      keyLocation: `${ORIGIN}/${KEY}.txt`,
      urlList: [`${ORIGIN}/en/`, `${ORIGIN}/en/about/`],
    });
    assert.ok(cache.calls.some((call) => call[0] === 'save'));

    fetched.length = 0;
    process.env.BUILD_ID = 'prod-quiet';
    await plugin.onPostBuild(hookArgs(site, cache));
    await plugin.onSuccess(hookArgs(site, cache));
    assert.strictEqual(fetched.length, 0);
    assert.match(logs.join('\n'), /nothing changed/);
  });

  test('later production deploys submit only added, modified, and removed pages', async () => {
    const files = {
      [`${KEY}.txt`]: KEY,
      'en/index.html': '<p>en</p>',
      'en/about/index.html': '<p>about</p>',
    };
    const site = makeSite(files);
    const cache = memoryCache();
    const fetched = [];
    globalThis.fetch = async (_url, options) => {
      fetched.push(JSON.parse(options.body).urlList);
      return okResponse(200);
    };
    process.env.CONTEXT = 'production';
    process.env.BUILD_ID = 'prod-1';
    await plugin.onPostBuild(hookArgs(site, cache));
    await plugin.onSuccess(hookArgs(site, cache));
    fetched.length = 0;

    fs.writeFileSync(path.join(site.publish, 'en/about/index.html'), '<p>about edited</p>');
    write(site.publish, 'en/now/index.html', '<p>now</p>');
    fs.rmSync(path.join(site.publish, 'en/index.html'));
    process.env.BUILD_ID = 'prod-2';
    await plugin.onPostBuild(hookArgs(site, cache));
    await plugin.onSuccess(hookArgs(site, cache));

    assert.deepStrictEqual(fetched, [[
      `${ORIGIN}/en/`,
      `${ORIGIN}/en/about/`,
      `${ORIGIN}/en/now/`,
    ]]);
  });

  test('a local production context does not submit', async () => {
    const site = makeSite({ [`${KEY}.txt`]: KEY, 'en/index.html': '<p>en</p>' });
    const cache = memoryCache();
    const fetched = [];
    globalThis.fetch = async () => {
      fetched.push(true);
      return okResponse(200);
    };
    process.env.CONTEXT = 'production';
    process.env.BUILD_ID = 'local-prod';
    const args = hookArgs(site, cache);
    args.constants.IS_LOCAL = true;
    await plugin.onPostBuild(args);
    await plugin.onSuccess(args);
    assert.strictEqual(fetched.length, 0);
    assert.deepStrictEqual(cache.calls, []);
  });

  test('a missing or newline-terminated key does not submit or advance the manifest', async () => {
    const site = makeSite({
      [`${KEY}.txt`]: `${KEY}\n`,
      'en/index.html': '<p>en</p>',
    });
    const cache = memoryCache();
    const fetched = [];
    globalThis.fetch = async () => {
      fetched.push(true);
      return okResponse(200);
    };
    process.env.CONTEXT = 'production';
    process.env.BUILD_ID = 'bad-key';
    await plugin.onPostBuild(hookArgs(site, cache));
    await plugin.onSuccess(hookArgs(site, cache));
    assert.strictEqual(fetched.length, 0);
    assert.ok(!cache.calls.some((call) => call[0] === 'save'));
    assert.match(logs.join('\n'), /trailing newline/);
  });

  test('a failed submission is swallowed and the manifest rollback lets the next deploy retry', async () => {
    const site = makeSite({ [`${KEY}.txt`]: KEY, 'en/index.html': '<p>en</p>' });
    const cache = memoryCache();
    process.env.CONTEXT = 'production';
    process.env.INDEXNOW_MAX_ATTEMPTS = '2';
    globalThis.fetch = async () => {
      throw new Error('network down');
    };
    process.env.BUILD_ID = 'fail-network';
    await assert.doesNotReject(plugin.onPostBuild(hookArgs(site, cache)));
    await assert.doesNotReject(plugin.onSuccess(hookArgs(site, cache)));
    assert.match(logs.join('\n'), /network down/);
    assert.match(logs.join('\n'), /The deploy will continue/);
    assert.ok(cache.calls.some((call) => call[0] === 'remove'));

    const fetched = [];
    globalThis.fetch = async (_url, options) => {
      fetched.push(JSON.parse(options.body).urlList);
      return okResponse(200);
    };
    process.env.BUILD_ID = 'retry-after-rollback';
    await plugin.onPostBuild(hookArgs(site, cache));
    await plugin.onSuccess(hookArgs(site, cache));
    assert.deepStrictEqual(fetched, [[`${ORIGIN}/en/`]]);
  });

  test('a 400 response is not retried and does not reject the hook', async () => {
    const site = makeSite({ [`${KEY}.txt`]: KEY, 'en/index.html': '<p>v1</p>' });
    const cache = memoryCache();
    globalThis.fetch = async () => okResponse(200);
    process.env.CONTEXT = 'production';
    process.env.BUILD_ID = 'seed-400';
    await plugin.onPostBuild(hookArgs(site, cache));
    await plugin.onSuccess(hookArgs(site, cache));

    fs.writeFileSync(path.join(site.publish, 'en/index.html'), '<p>v2</p>');
    const attempts = [];
    globalThis.fetch = async () => {
      attempts.push(1);
      return okResponse(400, 'Bad Request', 'invalid');
    };
    process.env.BUILD_ID = 'send-400';
    process.env.INDEXNOW_MAX_ATTEMPTS = '3';
    await assert.doesNotReject(plugin.onPostBuild(hookArgs(site, cache)));
    await assert.doesNotReject(plugin.onSuccess(hookArgs(site, cache)));
    assert.strictEqual(attempts.length, 1);
    assert.match(logs.join('\n'), /response 400/);
    assert.match(logs.join('\n'), /best-effort manifest rollback/);
  });

  test('retries a 403 and then accepts 200', async () => {
    const site = makeSite({ [`${KEY}.txt`]: KEY, 'en/index.html': '<p>en</p>' });
    const cache = memoryCache();
    const statuses = [403, 200];
    globalThis.fetch = async () => okResponse(statuses.shift(), 'status');
    process.env.CONTEXT = 'production';
    process.env.BUILD_ID = 'retry-403';
    process.env.INDEXNOW_MAX_ATTEMPTS = '3';
    await plugin.onPostBuild(hookArgs(site, cache));
    await plugin.onSuccess(hookArgs(site, cache));
    assert.deepStrictEqual(statuses, []);
    assert.match(logs.join('\n'), /response 200/);
    assert.ok(!cache.calls.some((call) => call[0] === 'remove'));
  });

  test('splits a submission larger than 10000 URLs', async () => {
    const files = { [`${KEY}.txt`]: KEY };
    for (let index = 0; index < 10001; index += 1) {
      files[`p${index}/index.html`] = `<p>${index}</p>`;
    }
    const site = makeSite(files);
    const cache = memoryCache();
    const sizes = [];
    globalThis.fetch = async (_url, options) => {
      sizes.push(JSON.parse(options.body).urlList.length);
      return okResponse(200);
    };
    process.env.CONTEXT = 'production';
    process.env.BUILD_ID = 'chunks';
    await plugin.onPostBuild(hookArgs(site, cache));
    await plugin.onSuccess(hookArgs(site, cache));
    assert.deepStrictEqual(sizes, [10000, 1]);
  });
});

function hookArgs(site, cache) {
  return {
    cwd: site.root,
    constants: { PUBLISH_DIR: site.publish, IS_LOCAL: false },
    utils: {
      cache,
      status: { show() {} },
    },
  };
}

function makeSite(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'indexnow-site-'));
  fs.writeFileSync(
    path.join(root, '_config.yml'),
    'url                      : "https://victordepaiva.com" # comment https://example.com\n'
  );
  const publish = path.join(root, '_site');
  fs.mkdirSync(publish);
  for (const [rel, contents] of Object.entries(files)) write(publish, rel, contents);
  return { root, publish };
}

function write(dir, rel, contents) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}

function okResponse(status, statusText = 'OK', body = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: { get: () => null },
    text: async () => body,
  };
}

function memoryCache() {
  const blobs = new Map();
  return {
    calls: [],
    async restore(rel, options = {}) {
      this.calls.push(['restore', rel, options.cwd]);
      const dest = path.join(options.cwd, rel);
      if (!blobs.has(rel)) return false;
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(blobs.get(rel), dest, { recursive: true });
      return true;
    },
    async save(rel, options = {}) {
      this.calls.push(['save', rel, options.cwd]);
      const src = path.join(options.cwd, rel);
      if (!fs.existsSync(src)) return false;
      const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'indexnow-blob-'));
      fs.cpSync(src, dest, { recursive: true });
      blobs.set(rel, dest);
      return true;
    },
    async remove(rel) {
      this.calls.push(['remove', rel]);
      blobs.delete(rel);
      return true;
    },
  };
}
