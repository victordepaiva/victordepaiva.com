'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const {
  MAX_URLS_PER_REQUEST,
  readCanonicalSite,
  inspectKeyFiles,
  isIndexableHtml,
  toPublicUrl,
  collectPages,
  diffPages,
  readManifest,
  writeManifest,
  chunk,
} = require('./logic');

const ORIGIN = 'https://victordepaiva.com';
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const KEY = '03a62b60b9b11b21a31a19ddd01eee9c';

test('reads the canonical site URL and ignores the comment', () => {
  const site = readCanonicalSite(REPO_ROOT);
  assert.deepStrictEqual(site, { origin: ORIGIN, host: 'victordepaiva.com' });
});

test('the committed key file is the key alone, with no trailing newline', () => {
  const body = fs.readFileSync(path.join(REPO_ROOT, `${KEY}.txt`));
  assert.ok(body.equals(Buffer.from(KEY, 'utf8')));
  assert.strictEqual(body.length, KEY.length);
});

test('maps pretty Jekyll paths to public URLs and encodes segments', () => {
  assert.strictEqual(toPublicUrl('index.html', ORIGIN), `${ORIGIN}/`);
  assert.strictEqual(toPublicUrl('en/index.html', ORIGIN), `${ORIGIN}/en/`);
  assert.strictEqual(toPublicUrl('en/about/index.html', ORIGIN), `${ORIGIN}/en/about/`);
  assert.strictEqual(toPublicUrl('plain.html', ORIGIN), `${ORIGIN}/plain.html`);
  assert.strictEqual(toPublicUrl('my page/index.html', ORIGIN), `${ORIGIN}/my%20page/`);
});

test('skips assets, 404, sitemaps, and feeds', () => {
  assert.strictEqual(isIndexableHtml('en/about/index.html'), true);
  assert.strictEqual(isIndexableHtml('assets/page.html'), false);
  assert.strictEqual(isIndexableHtml('404.html'), false);
  assert.strictEqual(isIndexableHtml('sitemap.html'), false);
  assert.strictEqual(isIndexableHtml('sitemap/index.html'), false);
  assert.strictEqual(isIndexableHtml('feed/index.html'), false);
  assert.strictEqual(isIndexableHtml('feed.xml'), false);
  assert.strictEqual(isIndexableHtml('robots.txt'), false);
  assert.strictEqual(isIndexableHtml('llms.txt'), false);
});

test('accepts only a root key file whose bytes equal its name', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'indexnow-keys-'));
  fs.writeFileSync(path.join(dir, 'abcd1234ef.txt'), 'abcd1234ef');
  fs.writeFileSync(path.join(dir, 'zzzz9999aa.txt'), 'zzzz9999aa\n');
  fs.writeFileSync(path.join(dir, 'llms.txt'), 'llms');
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'notes');
  const found = inspectKeyFiles(dir);
  assert.deepStrictEqual(found.valid.map((item) => item.key), ['abcd1234ef']);
  assert.strictEqual(found.invalid.length, 1);
  assert.match(found.invalid[0].reason, /trailing newline/);
});

test('collects page hashes and ignores non-pages', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'indexnow-pages-'));
  write(dir, 'en/about/index.html', '<p>about</p>');
  write(dir, 'en/index.html', '<p>home</p>');
  write(dir, '404.html', '<p>missing</p>');
  write(dir, 'sitemap.html', '<p>time</p>');
  write(dir, 'assets/ignore.html', '<p>asset</p>');
  write(dir, `${KEY}.txt`, KEY);
  const pages = collectPages(dir, ORIGIN);
  assert.deepStrictEqual(Object.keys(pages).sort(), [
    `${ORIGIN}/en/`,
    `${ORIGIN}/en/about/`,
  ]);
});

test('diffs added, modified, removed, and unchanged URLs', () => {
  const previous = {
    [`${ORIGIN}/en/`]: 'aaa',
    [`${ORIGIN}/en/about/`]: 'bbb',
    [`${ORIGIN}/old/`]: 'ccc',
  };
  const current = {
    [`${ORIGIN}/en/`]: 'aaa',
    [`${ORIGIN}/en/about/`]: 'ddd',
    [`${ORIGIN}/new/`]: 'eee',
  };
  assert.deepStrictEqual(diffPages(previous, current), [
    { url: `${ORIGIN}/en/about/`, change: 'modified' },
    { url: `${ORIGIN}/new/`, change: 'added' },
    { url: `${ORIGIN}/old/`, change: 'removed' },
  ]);
  assert.deepStrictEqual(
    diffPages(null, current).map((change) => change.change),
    ['added', 'added', 'added']
  );
  assert.deepStrictEqual(diffPages(current, current), []);
});

test('round-trips the manifest and rejects a bad shape', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'indexnow-manifest-'));
  const file = path.join(dir, 'manifest.json');
  writeManifest(file, { [`${ORIGIN}/b/`]: '2', [`${ORIGIN}/a/`]: '1' });
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(text.endsWith('\n'));
  assert.ok(text.indexOf(`${ORIGIN}/a/`) < text.indexOf(`${ORIGIN}/b/`));
  assert.deepStrictEqual(readManifest(file), {
    [`${ORIGIN}/a/`]: '1',
    [`${ORIGIN}/b/`]: '2',
  });
  fs.writeFileSync(file, '{"version":2,"pages":{}}\n');
  assert.throws(() => readManifest(file), /unexpected manifest shape/);
});

test('chunks URL lists at the IndexNow limit', () => {
  const urls = Array.from({ length: MAX_URLS_PER_REQUEST + 1 }, (_, index) => `https://victordepaiva.com/${index}/`);
  const batches = chunk(urls, MAX_URLS_PER_REQUEST);
  assert.strictEqual(batches.length, 2);
  assert.strictEqual(batches[0].length, MAX_URLS_PER_REQUEST);
  assert.strictEqual(batches[1].length, 1);
});

function write(dir, rel, contents) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}
