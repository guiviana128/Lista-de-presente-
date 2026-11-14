const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

test('an upload finishing after the editor closes cannot replace another gift image', async () => {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, { value: '', textContent: '', style: {}, classList: { add() {}, remove() {} } });
    return elements.get(id);
  };
  let finish;
  const context = vm.createContext({
    document: { getElementById: get, addEventListener() {}, querySelector: () => null, body: { classList: { remove() {} } } },
    localStorage: { getItem: () => null }, URL, console,
    finishUpload: () => new Promise(resolve => { finish = resolve; })
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8'), context);
  vm.runInContext("optimizeImage = async () => 'image'; api = finishUpload", context);
  const upload = vm.runInContext("chooseImage({}, 'gift')", context);
  await new Promise(resolve => setImmediate(resolve));
  vm.runInContext("closeGiftModal()", context);
  get('giftImageUrl').value = 'https://example.com/other-gift.jpg';
  finish({ url: '/api/images/abc.png' });
  await upload;
  assert.equal(get('giftImageUrl').value, 'https://example.com/other-gift.jpg');
});
