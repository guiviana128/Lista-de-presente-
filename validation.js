function invalid(message) { throw Object.assign(new Error(message), { status: 400 }); }
function httpUrl(value) { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol); } catch { return false; } }
function validateImage(value) {
  if (!value) return;
  if (typeof value !== 'string' || value.length > 2048 || (!httpUrl(value) && !/^\/api\/images\/[a-f0-9-]+\.(png|jpg|webp|gif)$/.test(value) && !['🌸', '💙'].includes(value))) invalid('Use um link http/https válido ou envie uma imagem.');
}
function validateGift(data) {
  if (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 200) invalid('Informe um nome de até 200 caracteres.');
  if (typeof data.url !== 'string' || !httpUrl(data.url) || data.url.length > 4096) invalid('Informe um link de loja http/https válido.');
  if (!['Rayza', 'Guilherme', 'Nós Dois'].includes(data.for_who)) invalid('Escolha para quem é o presente.');
  if (data.price !== undefined && (!Number.isFinite(Number(data.price)) || Number(data.price) < 0)) invalid('Informe um preço válido.');
  if (String(data.description || '').length > 5000) invalid('A descrição pode ter até 5000 caracteres.');
  validateImage(data.image_url);
}
module.exports = { validateGift, validateImage };

