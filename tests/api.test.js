const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

test('API saves, edits and deletes exact gift, persists profile image and validates input', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wishlist-api-'));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '31993', DATA_FILE: path.join(dir, 'data.json'), IMAGE_DIR: path.join(dir, 'images') },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => child.kill());
  await once(child.stdout, 'data');
  async function request(route, method = 'GET', body) {
    const res = await fetch('http://localhost:31993/api' + route, {
      method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, data: await res.json() };
  }
  const input = { title: "Livro d'água", url: 'https://example.com', for_who: 'Rayza' };
  const saved = await request('/gifts', 'POST', input);
  assert.equal(saved.status, 201);
  assert.ok(saved.data.gift.id, 'saving must return the persisted gift identity');
  const id = saved.data.gift.id;
  const edit = await request('/gifts/' + id, 'PUT', { ...input, title: 'Livro editado', image_url: 'https://example.com/a.png' });
  assert.equal(edit.data.gift.title, 'Livro editado');
  assert.equal((await request('/gifts/' + id)).data.gift.image_url, 'https://example.com/a.png');
  assert.equal((await request('/gifts', 'POST', { ...input, url: 'javascript:alert(1)' })).status, 400);
  const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMZkAAAAASUVORK5CYII=';
  const upload = await request('/images', 'POST', { image: photo });
  assert.equal(upload.status, 201);
  assert.match(upload.data.url, /^\/api\/images\//);
  const image = await fetch('http://localhost:31993' + upload.data.url);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.ok((await image.arrayBuffer()).byteLength > 0);
  assert.equal((await request('/users/avatar', 'POST', { name: 'Rayza', avatar: upload.data.url })).status, 200);
  assert.equal((await request('/users')).data.users.find(u => u.name === 'Rayza').avatar, upload.data.url);
  assert.equal((await request('/gifts/' + id, 'DELETE')).status, 200);
  assert.equal((await request('/gifts/' + id)).status, 404);
  await request('/sync', 'POST', { gifts: [saved.data.gift] });
  assert.equal((await request('/gifts')).data.gifts.some(g => g.id === id || g.title === input.title), false);
});
