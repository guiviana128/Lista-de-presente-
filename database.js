const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const remote = Boolean(process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN);
const dataFile = process.env.DATA_FILE || path.join(__dirname, 'data', 'wishlist.json');
const blobPath = process.env.VERCEL_ENV === 'preview' ? 'wishlist/preview/data.json' : 'wishlist/v1/data.json';
let queue = Promise.resolve();

function initialData() {
  const seed = require('./seed.json');
  return structuredClone(seed);
}

async function readSnapshot() {
  if (remote) {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
      throw new Error('Armazenamento permanente não configurado.');
    }
    const { get, head } = require('@vercel/blob');
    for (let attempt = 0; attempt < 5; attempt++) {
      let before;
      try { before = await head(blobPath); }
      catch (error) {
        if (error.name === 'BlobNotFoundError' || error.constructor?.name === 'BlobNotFoundError') return { data: initialData(), etag: null };
        throw error;
      }
      const result = await get(blobPath, { access: 'private', useCache: false });
      if (!result) continue;
      const data = await new Response(result.stream).json();
      const after = await head(blobPath);
      // The delivery ETag from get() may differ from the control-plane ETag.
      // Bracket the fresh content read with metadata reads to get a stable revision.
      if (before.etag === after.etag) return { data, etag: after.etag };
    }
    throw new Error('A lista está sendo atualizada. Tente novamente.');
  }
  try {
    return { data: JSON.parse(await fs.readFile(dataFile, 'utf8')) };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { data: initialData() };
  }
}

async function writeSnapshot(data, etag) {
  if (remote) {
    const { put } = require('@vercel/blob');
    return put(blobPath, JSON.stringify(data), {
      access: 'private', addRandomSuffix: false, contentType: 'application/json',
      allowOverwrite: Boolean(etag), ...(etag ? { ifMatch: etag } : {})
    });
  }
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  const temporary = dataFile + '.' + randomUUID() + '.tmp';
  await fs.writeFile(temporary, JSON.stringify(data));
  await fs.rename(temporary, dataFile);
}

function mutate(change) {
  const operation = queue.then(async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, etag } = await readSnapshot();
      const result = change(data);
      try {
        await writeSnapshot(data, etag);
        return result;
      } catch (error) {
        if (attempt === 4) throw error;
        if (!etag) {
          // Another cold instance may have initialized the document first.
          const latest = await readSnapshot();
          if (latest.etag) continue;
        }
        if (error.constructor?.name !== 'BlobPreconditionFailedError' && error.name !== 'BlobPreconditionFailedError') throw error;
      }
    }
  });
  queue = operation.catch(() => {});
  return operation;
}

const publicUser = ({ pin, ...user }) => user;
async function getUsers() { return (await readSnapshot()).data.users.map(publicUser); }
async function getUserByName(name) { return (await getUsers()).find(u => u.name === name); }
async function verifyUserPin(name, pin) {
  const user = (await readSnapshot()).data.users.find(u => u.name === name && u.pin === pin);
  return user ? publicUser(user) : undefined;
}
function updateUserPin(name, newPin) {
  return mutate(data => { const u = data.users.find(u => u.name === name); if (!u) return false; u.pin = newPin; return true; });
}
function updateUserAvatar(name, avatar) {
  return mutate(data => { const u = data.users.find(u => u.name === name); if (!u) return false; u.avatar = avatar; return true; });
}
async function getGifts(filters = {}) {
  let gifts = (await readSnapshot()).data.gifts;
  if (filters.for_who && filters.for_who !== 'Todos') gifts = gifts.filter(g => g.for_who === filters.for_who);
  if (filters.category && filters.category !== 'Todas') gifts = gifts.filter(g => g.category === filters.category);
  if (filters.status === 'desejos') gifts = gifts.filter(g => !g.is_bought);
  if (filters.status === 'disponivel') gifts = gifts.filter(g => !g.is_bought && !g.is_reserved);
  if (filters.status === 'reservado') gifts = gifts.filter(g => g.is_reserved && !g.is_bought);
  if (filters.status === 'comprado') gifts = gifts.filter(g => g.is_bought);
  if (filters.search?.trim()) {
    const term = filters.search.trim().toLocaleLowerCase('pt-BR');
    gifts = gifts.filter(g => [g.title, g.description, g.category, g.url].some(v => String(v || '').toLocaleLowerCase('pt-BR').includes(term)));
  }
  return [...gifts].sort((a,b) => filters.sort === 'price_asc' ? a.price - b.price :
    filters.sort === 'price_desc' ? b.price - a.price :
    filters.sort === 'priority' ? b.priority.localeCompare(a.priority) :
    b.created_at.localeCompare(a.created_at) || String(b.id).localeCompare(String(a.id)));
}
async function getGiftById(id) { return (await readSnapshot()).data.gifts.find(g => String(g.id) === String(id)); }
function fields(data) {
  return { title: data.title.trim(), url: data.url || '', image_url: data.image_url || '',
    price: Number(data.price) || 0, category: data.category || 'Geral',
    priority: data.priority || '⭐⭐ Quero Muito', description: data.description || '', for_who: data.for_who || 'Rayza' };
}
function createGift(input) {
  const id = randomUUID();
  return mutate(data => {
    const now = new Date().toISOString();
    const gift = { ...fields(input), id, created_by: input.created_by || 'Rayza',
      is_reserved: 0, reserved_by: '', is_bought: 0, created_at: now, updated_at: now };
    data.gifts.push(gift);
    return gift;
  });
}
function updateGift(id, input) {
  return mutate(data => {
    const gift = data.gifts.find(g => String(g.id) === String(id));
    if (!gift) return undefined;
    Object.assign(gift, fields({ ...gift, ...input }), { updated_at: new Date().toISOString() });
    return gift;
  });
}
function deleteGift(id) {
  return mutate(data => {
    const index = data.gifts.findIndex(g => String(g.id) === String(id));
    if (index < 0) return false;
    data.gifts.splice(index, 1);
    return true;
  });
}
function toggleReserve(id, userName) {
  return mutate(data => {
    const g = data.gifts.find(g => String(g.id) === String(id));
    if (!g) return undefined;
    g.is_reserved = g.is_reserved ? 0 : 1;
    g.reserved_by = g.is_reserved ? userName || 'Alguém especial' : '';
    g.updated_at = new Date().toISOString();
    return g;
  });
}
function toggleBought(id) {
  return mutate(data => {
    const g = data.gifts.find(g => String(g.id) === String(id));
    if (!g) return undefined;
    g.is_bought = g.is_bought ? 0 : 1;
    g.updated_at = new Date().toISOString();
    return g;
  });
}
// Old clients may still call this endpoint. Browser backups are never authoritative.
async function syncGifts() { return getGifts(); }
async function getStats() {
  const gifts = await getGifts();
  return { total: gifts.length, forRayza: gifts.filter(g => g.for_who === 'Rayza').length,
    forGuilherme: gifts.filter(g => g.for_who === 'Guilherme').length,
    forBoth: gifts.filter(g => g.for_who === 'Nós Dois').length,
    reserved: gifts.filter(g => g.is_reserved).length, bought: gifts.filter(g => g.is_bought).length,
    sumPrice: Number(gifts.reduce((sum,g) => sum + g.price, 0).toFixed(2)) };
}
module.exports = { getUsers, getUserByName, verifyUserPin, updateUserPin, updateUserAvatar, getGifts, getGiftById,
  createGift, updateGift, deleteGift, toggleReserve, toggleBought, syncGifts, getStats };

