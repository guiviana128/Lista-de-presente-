const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const dir = process.env.IMAGE_DIR || path.join(__dirname, 'data', 'images');
const remote = Boolean(process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN);
const types = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };
async function upload(data) {
  const match = typeof data === 'string' && data.match(/^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw Object.assign(new Error('Envie uma imagem PNG, JPG, WebP ou GIF.'), { status: 400 });
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 2 * 1024 * 1024) throw Object.assign(new Error('A imagem deve ter até 2 MB após otimização.'), { status: 413 });
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const signature = ext === 'png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) :
    ext === 'jpg' ? bytes[0] === 255 && bytes[1] === 216 :
    ext === 'gif' ? bytes.subarray(0,3).toString() === 'GIF' :
    bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP';
  if (!signature) throw Object.assign(new Error('O arquivo não é uma imagem válida.'), { status: 400 });
  const name = randomUUID() + '.' + ext;
  if (remote) {
    await require('@vercel/blob').put('wishlist/images/' + name, bytes, { access: 'private', contentType: types[ext], addRandomSuffix: false });
  } else {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), bytes);
  }
  return '/api/images/' + name;
}
async function serve(name, res) {
  const ext = name.split('.').pop();
  let bytes;
  if (remote) {
    const result = await require('@vercel/blob').get('wishlist/images/' + name, { access: 'private' });
    if (result) bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
  } else {
    try { bytes = await fs.readFile(path.join(dir, name)); } catch (err) { if (err.code !== 'ENOENT') throw err; }
  }
  if (!bytes) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[ext], 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
  res.end(bytes);
}
module.exports = { upload, serve };

