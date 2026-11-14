const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('remote changes retry conflicts, survive cold starts and preserve other writers', async (t) => {
  let stored = null;
  let version = 0;
  let conflict = false;
  const originalLoad = Module._load;
  process.env.VERCEL = '1';
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  t.after(() => { Module._load = originalLoad; delete process.env.VERCEL; delete process.env.BLOB_READ_WRITE_TOKEN; });
  const sdk = {
    async head() {
      if (!stored) { const error = new Error('missing'); error.name = 'BlobNotFoundError'; throw error; }
      return { etag: String(version) };
    },
    async get(name, options) {
      assert.equal(options.useCache, false, 'mutable data must bypass Blob cache');
      if (!stored) return null;
      return { stream: new Response(JSON.stringify(stored)).body, blob: { etag: 'delivery-' + version } };
    },
    async put(name, body, options) {
      if (conflict) {
        conflict = false;
        stored.gifts.push({ ...stored.gifts[0], id: 'other-writer', title: 'Outro presente' });
        version++;
      }
      if (stored && options.ifMatch !== String(version)) {
        const error = new Error('changed');
        error.name = 'BlobPreconditionFailedError';
        throw error;
      }
      stored = JSON.parse(body);
      version++;
    }
  };
  Module._load = function (name, ...args) { return name === '@vercel/blob' ? sdk : originalLoad.call(this, name, ...args); };
  const reload = () => { delete require.cache[require.resolve('../database')]; return require('../database'); };
  let db = reload();
  const baseline = (await db.getGifts()).map(g => g.id);
  const gift = await db.createGift({ title: 'Primeiro', url: 'https://example.com', for_who: 'Rayza' });
  conflict = true;
  await db.updateGift(gift.id, { title: 'Editado' });
  db = reload();
  assert.equal((await db.getGiftById(gift.id)).title, 'Editado');
  assert.equal((await db.getGifts()).length, baseline.length + 2);
  await db.deleteGift(gift.id);
  db = reload();
  await db.syncGifts([gift]);
  assert.deepEqual((await db.getGifts()).map(g => String(g.id)).sort(), [...baseline, 'other-writer'].map(String).sort());
});
