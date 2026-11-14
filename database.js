const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'presentes.db');
const db = new DatabaseSync(DB_PATH);

// Inicializa tabelas
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      avatar TEXT,
      pin TEXT DEFAULT '',
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      image_url TEXT,
      price REAL DEFAULT 0,
      category TEXT DEFAULT 'Geral',
      priority TEXT DEFAULT '⭐⭐ Quero Muito',
      description TEXT,
      created_by TEXT NOT NULL,
      for_who TEXT NOT NULL,
      is_reserved INTEGER DEFAULT 0,
      reserved_by TEXT DEFAULT '',
      is_bought INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Verifica se já existem usuários; se não houver, cadastra Rayza e Guilherme
  const countUsersStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = countUsersStmt.get().count;

  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (name, avatar, pin, role) VALUES (?, ?, ?, ?)
    `);
    insertUser.run('Rayza', '🌸', '1234', 'admin');
    insertUser.run('Guilherme', '💙', '1234', 'admin');
    console.log('✅ Usuários padrão criados: Rayza e Guilherme (PIN padrão: 1234)');
  }

  // Garante que a tabela de presentes existe limpa para o casal adicionar seus presentes

}

// Inicializa ao carregar o arquivo
initDatabase();

// Funções de manipulação de dados
function getUsers() {
  const stmt = db.prepare('SELECT id, name, avatar, role, created_at FROM users ORDER BY id ASC');
  return stmt.all();
}

function verifyUserPin(name, pin) {
  const stmt = db.prepare('SELECT id, name, avatar, role FROM users WHERE name = ? AND pin = ?');
  return stmt.get(name, pin);
}

function getUserByName(name) {
  const stmt = db.prepare('SELECT id, name, avatar, role FROM users WHERE name = ?');
  return stmt.get(name);
}

function updateUserPin(name, newPin) {
  const stmt = db.prepare('UPDATE users SET pin = ? WHERE name = ?');
  stmt.run(newPin, name);
  return true;
}

function updateUserAvatar(name, avatar) {
  const stmt = db.prepare('UPDATE users SET avatar = ? WHERE name = ?');
  stmt.run(avatar, name);
  return true;
}

function getGifts(filters = {}) {
  let query = 'SELECT * FROM gifts WHERE 1=1';
  const params = [];

  if (filters.for_who && filters.for_who !== 'Todos') {
    query += ' AND for_who = ?';
    params.push(filters.for_who);
  }

  if (filters.category && filters.category !== 'Todas') {
    query += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters.status) {
    if (filters.status === 'disponivel') {
      query += ' AND is_bought = 0 AND is_reserved = 0';
    } else if (filters.status === 'reservado') {
      query += ' AND is_reserved = 1 AND is_bought = 0';
    } else if (filters.status === 'comprado') {
      query += ' AND is_bought = 1';
    }
  }

  if (filters.search && filters.search.trim() !== '') {
    const term = `%${filters.search.trim()}%`;
    query += ' AND (title LIKE ? OR description LIKE ? OR category LIKE ?)';
    params.push(term, term, term);
  }

  // Ordenação
  if (filters.sort === 'price_asc') {
    query += ' ORDER BY price ASC';
  } else if (filters.sort === 'price_desc') {
    query += ' ORDER BY price DESC';
  } else if (filters.sort === 'priority') {
    query += ' ORDER BY priority DESC, id DESC';
  } else {
    // padrão: mais recentes
    query += ' ORDER BY id DESC';
  }

  const stmt = db.prepare(query);
  return stmt.all(...params);
}

function getGiftById(id) {
  const stmt = db.prepare('SELECT * FROM gifts WHERE id = ?');
  return stmt.get(id);
}

function createGift(data) {
  const stmt = db.prepare(`
    INSERT INTO gifts (
      title, url, image_url, price, category, priority, description, created_by, for_who, is_reserved, reserved_by, is_bought
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '', 0)
  `);

  const info = stmt.run(
    data.title,
    data.url,
    data.image_url || '',
    parseFloat(data.price) || 0,
    data.category || 'Geral',
    data.priority || '⭐⭐ Quero Muito',
    data.description || '',
    data.created_by || 'Anônimo',
    data.for_who || 'Rayza'
  );

  return getGiftById(info.lastInsertRowid);
}

function updateGift(id, data) {
  const stmt = db.prepare(`
    UPDATE gifts SET
      title = ?,
      url = ?,
      image_url = ?,
      price = ?,
      category = ?,
      priority = ?,
      description = ?,
      for_who = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(
    data.title,
    data.url,
    data.image_url || '',
    parseFloat(data.price) || 0,
    data.category || 'Geral',
    data.priority || '⭐⭐ Quero Muito',
    data.description || '',
    data.for_who || 'Rayza',
    id
  );

  return getGiftById(id);
}

function deleteGift(id) {
  const stmt = db.prepare('DELETE FROM gifts WHERE id = ?');
  stmt.run(id);
  return true;
}

function toggleReserve(id, userName) {
  const current = getGiftById(id);
  if (!current) return null;

  const newReserved = current.is_reserved ? 0 : 1;
  const newReservedBy = newReserved ? (userName || 'Alguém especial') : '';

  const stmt = db.prepare(`
    UPDATE gifts SET
      is_reserved = ?,
      reserved_by = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(newReserved, newReservedBy, id);
  return getGiftById(id);
}

function toggleBought(id) {
  const current = getGiftById(id);
  if (!current) return null;

  const newBought = current.is_bought ? 0 : 1;

  const stmt = db.prepare(`
    UPDATE gifts SET
      is_bought = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(newBought, id);
  return getGiftById(id);
}

function getStats() {
  const total = db.prepare('SELECT COUNT(*) as count FROM gifts').get().count;
  const forRayza = db.prepare("SELECT COUNT(*) as count FROM gifts WHERE for_who = 'Rayza'").get().count;
  const forGuilherme = db.prepare("SELECT COUNT(*) as count FROM gifts WHERE for_who = 'Guilherme'").get().count;
  const forBoth = db.prepare("SELECT COUNT(*) as count FROM gifts WHERE for_who = 'Nós Dois'").get().count;
  const reserved = db.prepare('SELECT COUNT(*) as count FROM gifts WHERE is_reserved = 1').get().count;
  const bought = db.prepare('SELECT COUNT(*) as count FROM gifts WHERE is_bought = 1').get().count;
  
  const sumPrice = db.prepare('SELECT SUM(price) as total FROM gifts').get().total || 0;

  return {
    total,
    forRayza,
    forGuilherme,
    forBoth,
    reserved,
    bought,
    sumPrice: Number(sumPrice.toFixed(2))
  };
}

module.exports = {
  db,
  getUsers,
  getUserByName,
  verifyUserPin,
  updateUserPin,
  updateUserAvatar,
  getGifts,
  getGiftById,
  createGift,
  updateGift,
  deleteGift,
  toggleReserve,
  toggleBought,
  getStats
};

