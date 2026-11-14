const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('CRUD survives a fresh database instance and stale sync cannot resurrect deleted gifts', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wishlist-test-'));
  process.env.DATA_FILE = path.join(dir, 'data.json');
  const reload = () => {
    delete require.cache[require.resolve('../database')];
    return require('../database');
  };
  let db = reload();
  const gift = await db.createGift({ title: "Perfume d'água", url: 'https://example.com/a', for_who: 'Rayza' });
  await db.updateGift(gift.id, { ...gift, title: 'Perfume novo', image_url: 'https://example.com/image.png' });
  db = reload();
  assert.equal((await db.getGiftById(gift.id)).title, 'Perfume novo');
  await db.updateUserAvatar('Rayza', 'https://example.com/rayza.jpg');
  db = reload();
  assert.equal((await db.getUserByName('Rayza')).avatar, 'https://example.com/rayza.jpg');
  await db.deleteGift(gift.id);
  await db.syncGifts([gift]);
  db = reload();
  assert.equal(await db.getGiftById(gift.id), undefined);
  assert.equal((await db.getGifts()).filter(g => g.title === gift.title).length, 0, 'deleted gifts must not return from stale browser backups');
});

test('same-title gifts keep independent identities', async () => {
  const db = require('../database');
  const a = await db.createGift({ title: 'Livro', url: 'https://example.com', for_who: 'Rayza' });
  const b = await db.createGift({ title: 'Livro', url: 'https://example.com', for_who: 'Guilherme' });
  assert.notEqual(a.id, b.id);
  await db.deleteGift(a.id);
  assert.equal((await db.getGiftById(b.id)).for_who, 'Guilherme');
});
