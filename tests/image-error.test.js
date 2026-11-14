const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
test('an image storage failure returns a JSON error without crashing the request', async (t) => {
  const images = require('../images');
  const original = images.serve;
  images.serve = async () => { throw new Error('storage offline'); };
  const server = require('../server');
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { images.serve = original; server.closeAllConnections(); server.close(); });
  const res = await fetch('http://127.0.0.1:' + server.address().port + '/api/images/abc.png');
  assert.equal(res.status, 500);
  assert.ok((await res.json()).error);
});
