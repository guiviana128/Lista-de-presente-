const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

test('buying a gift moves it from wishes to purchased and undo returns it to wishes', async () => {
  process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bought-test-')), 'data.json');
  const db = require('../database');
  const gift = await db.createGift({ title: 'Presente para separar', url: 'https://example.com', for_who: 'Rayza' });
  const contains = async status => (await db.getGifts({ status })).some(g => g.id === gift.id);
  assert.equal(await contains('desejos'), true);
  await db.toggleBought(gift.id);
  assert.equal(await contains('desejos'), false);
  assert.equal(await contains('comprado'), true);
  await db.toggleBought(gift.id);
  assert.equal(await contains('desejos'), true);
  assert.equal(await contains('comprado'), false);
});

test('opening the page requests wishes rather than all gifts', async () => {
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, { style: {}, hidden: false }); return elements.get(id); };
  let requested;
  const context = vm.createContext({
    localStorage: { getItem: () => null }, URL, URLSearchParams, console,
    document: { getElementById: get, addEventListener() {} },
    capture: async route => { requested = route; return { gifts: [] }; }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8'), context);
  vm.runInContext('api = capture; renderGifts = () => {}', context);
  await vm.runInContext('loadGifts()', context);
  assert.equal(new URL(requested, 'https://example.com').searchParams.get('status'), 'desejos');
});

