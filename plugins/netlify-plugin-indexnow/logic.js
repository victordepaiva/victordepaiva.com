'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = '.indexnow-cache';
const MANIFEST_FILE = 'manifest.json';
const MANIFEST_VERSION = 1;
const MAX_URLS_PER_REQUEST = 10000;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const KEY_FILE_PATTERN = /^([A-Za-z0-9-]{8,128})\.txt$/;

function readCanonicalSite(repoRoot) {
  const configPath = path.join(repoRoot, '_config.yml');
  let text;
  try {
    text = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    throw new Error(`Could not read ${configPath}: ${error.message}`);
  }

  const match = text.match(/^\s*url\s*:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))\s*(?:#.*)?$/m);
  const raw = match && (match[1] || match[2] || match[3]);
  if (!raw) {
    throw new Error('Could not find a site url in _config.yml');
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch (error) {
    throw new Error(`Site url in _config.yml is not an absolute URL (${raw})`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Site url in _config.yml must be http(s) (${raw})`);
  }

  return {
    origin: parsed.origin,
    host: parsed.hostname,
  };
}

function describeKeyMismatch(fileName, body) {
  const key = fileName.replace(/\.txt$/, '');
  const asText = body.toString('utf8');
  if (asText.replace(/\r?\n$/, '') === key && !body.equals(Buffer.from(key, 'utf8'))) {
    return 'contents include a trailing newline; IndexNow requires the key alone';
  }
  return `contents are ${body.length} bytes and are not exactly the key`;
}

function inspectKeyFiles(publishDir) {
  const valid = [];
  const invalid = [];
  const entries = fs.readdirSync(publishDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = KEY_FILE_PATTERN.exec(entry.name);
    if (!match) continue;
    const fullPath = path.join(publishDir, entry.name);
    const body = fs.readFileSync(fullPath);
    const expected = Buffer.from(match[1], 'utf8');
    if (body.equals(expected)) {
      valid.push({ key: match[1], fileName: entry.name });
    } else {
      invalid.push({
        fileName: entry.name,
        reason: describeKeyMismatch(entry.name, body),
      });
    }
  }
  valid.sort((a, b) => a.fileName.localeCompare(b.fileName));
  invalid.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return { valid, invalid };
}

function isIndexableHtml(relPosix) {
  const rel = String(relPosix).replace(/\\/g, '/');
  const lower = rel.toLowerCase();
  if (!lower.endsWith('.html') && !lower.endsWith('.htm')) return false;
  const parts = lower.split('/');
  if (parts.includes('assets')) return false;
  const base = parts[parts.length - 1];
  if (base === '404.html') return false;
  if (lower.includes('sitemap')) return false;
  if (
    base === 'feed.html' ||
    base === 'atom.html' ||
    base === 'rss.html' ||
    lower === 'feed/index.html' ||
    lower.endsWith('/feed/index.html')
  ) {
    return false;
  }
  return true;
}

function toPublicUrl(relPosix, origin) {
  const rel = String(relPosix).replace(/\\/g, '/');
  let cleaned = rel;
  if (cleaned === 'index.html') {
    cleaned = '';
  } else if (cleaned.endsWith('/index.html')) {
    cleaned = cleaned.slice(0, -'index.html'.length);
  }
  const directory = cleaned === '' || cleaned.endsWith('/');
  const encoded = cleaned
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  if (!encoded) return `${origin}/`;
  return directory ? `${origin}/${encoded}/` : `${origin}/${encoded}`;
}

function walkFiles(dir, onFile) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'assets' || entry.name === '.git') continue;
      walkFiles(fullPath, onFile);
      continue;
    }
    if (entry.isFile()) onFile(fullPath);
  }
}

function collectPages(publishDir, origin) {
  const pages = {};
  const sources = {};
  walkFiles(publishDir, (fullPath) => {
    const rel = path.relative(publishDir, fullPath).split(path.sep).join('/');
    if (!isIndexableHtml(rel)) return;
    const url = toPublicUrl(rel, origin);
    if (Object.prototype.hasOwnProperty.call(pages, url)) {
      throw new Error(`Both ${sources[url]} and ${rel} publish to ${url}`);
    }
    const hash = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
    sources[url] = rel;
    pages[url] = hash;
  });
  return pages;
}

function diffPages(previousPages, currentPages) {
  const hadBaseline = previousPages != null;
  const previous = previousPages || {};
  const changes = [];

  for (const url of Object.keys(currentPages)) {
    if (!hadBaseline || !Object.prototype.hasOwnProperty.call(previous, url)) {
      changes.push({ url, change: 'added' });
    } else if (previous[url] !== currentPages[url]) {
      changes.push({ url, change: 'modified' });
    }
  }

  if (hadBaseline) {
    for (const url of Object.keys(previous)) {
      if (!Object.prototype.hasOwnProperty.call(currentPages, url)) {
        changes.push({ url, change: 'removed' });
      }
    }
  }

  changes.sort((a, b) => a.url.localeCompare(b.url) || a.change.localeCompare(b.change));
  return changes;
}

function sanitizePages(pages) {
  const clean = {};
  for (const [url, hash] of Object.entries(pages)) {
    if (typeof url === 'string' && url && typeof hash === 'string' && hash) {
      clean[url] = hash;
    }
  }
  return clean;
}

function readManifest(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (
    !parsed ||
    parsed.version !== MANIFEST_VERSION ||
    !parsed.pages ||
    typeof parsed.pages !== 'object' ||
    Array.isArray(parsed.pages)
  ) {
    throw new Error('unexpected manifest shape');
  }
  return sanitizePages(parsed.pages);
}

function writeManifest(filePath, pages) {
  const sorted = {};
  for (const url of Object.keys(pages).sort()) sorted[url] = pages[url];
  const body = `${JSON.stringify({ version: MANIFEST_VERSION, pages: sorted }, null, 2)}\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp`;
  fs.writeFileSync(temporary, body);
  fs.renameSync(temporary, filePath);
}

function chunk(items, size) {
  if (!Number.isInteger(size) || size < 1) {
    throw new Error(`Invalid chunk size: ${size}`);
  }
  const batches = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function countChanges(changes) {
  const counts = { added: 0, modified: 0, removed: 0 };
  for (const change of changes) {
    if (Object.prototype.hasOwnProperty.call(counts, change.change)) {
      counts[change.change] += 1;
    }
  }
  return counts;
}

module.exports = {
  CACHE_DIR,
  MANIFEST_FILE,
  MANIFEST_VERSION,
  MAX_URLS_PER_REQUEST,
  INDEXNOW_ENDPOINT,
  readCanonicalSite,
  inspectKeyFiles,
  isIndexableHtml,
  toPublicUrl,
  collectPages,
  diffPages,
  readManifest,
  writeManifest,
  chunk,
  countChanges,
};
