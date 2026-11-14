const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const db = require('./database.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(PUBLIC_DIR, safePath);

  // Prevenção de Path Traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Acesso Proibido');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Se não achar o arquivo, tenta servir o index.html (SPA fallback)
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Página não encontrada');
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('Erro ao carregar arquivo');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
}

const server = http.createServer(async (req, res) => {
  // Configuração CORS pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  try {
    // ROTAS DE API
    if (pathname.startsWith('/api/')) {
      // 1. Lista de Usuários
      if (pathname === '/api/users' && method === 'GET') {
        const users = db.getUsers();
        return sendJSON(res, 200, { success: true, users });
      }

      // 2. Login / Verificação de PIN
      if (pathname === '/api/login' && method === 'POST') {
        const body = await parseBody(req);
        const { name, pin } = body;
        if (!name) {
          return sendJSON(res, 400, { error: 'Nome de usuário obrigatório' });
        }
        const user = db.verifyUserPin(name, pin || '');
        if (!user) {
          return sendJSON(res, 401, { error: 'PIN incorreto. Tente novamente!' });
        }
        return sendJSON(res, 200, { success: true, user });
      }

      // 3. Atualizar PIN
      if (pathname === '/api/users/pin' && method === 'POST') {
        const body = await parseBody(req);
        const { name, currentPin, newPin } = body;
        if (!name || !newPin) {
          return sendJSON(res, 400, { error: 'Dados incompletos' });
        }
        const user = db.verifyUserPin(name, currentPin || '');
        if (!user) {
          return sendJSON(res, 401, { error: 'PIN atual incorreto' });
        }
        db.updateUserPin(name, newPin);
        return sendJSON(res, 200, { success: true, message: 'PIN atualizado com sucesso!' });
      }

      // 4. Atualizar Avatar
      if (pathname === '/api/users/avatar' && method === 'POST') {
        const body = await parseBody(req);
        const { name, avatar } = body;
        if (!name || !avatar) {
          return sendJSON(res, 400, { error: 'Dados incompletos' });
        }
        db.updateUserAvatar(name, avatar);
        return sendJSON(res, 200, { success: true, message: 'Avatar atualizado!' });
      }

      // 5. Estatísticas
      if (pathname === '/api/stats' && method === 'GET') {
        const stats = db.getStats();
        return sendJSON(res, 200, { success: true, stats });
      }

      // 6. Listagem de Presentes
      if (pathname === '/api/gifts' && method === 'GET') {
        const gifts = db.getGifts(parsedUrl.query);
        return sendJSON(res, 200, { success: true, gifts });
      }

      // 7. Criar Presente
      if (pathname === '/api/gifts' && method === 'POST') {
        const body = await parseBody(req);
        if (!body.title || !body.title.trim()) {
          return sendJSON(res, 400, { error: 'O nome do presente é obrigatório!' });
        }
        if (!body.url || !body.url.trim()) {
          return sendJSON(res, 400, { error: 'O link do produto é obrigatório!' });
        }

        const newGift = db.createGift(body);
        return sendJSON(res, 201, { success: true, gift: newGift });
      }

      // Rotas com ID: /api/gifts/:id
      const giftIdMatch = pathname.match(/^\/api\/gifts\/(\d+)(?:\/(reserve|bought))?$/);
      if (giftIdMatch) {
        const id = parseInt(giftIdMatch[1], 10);
        const action = giftIdMatch[2];

        // Alternar reserva
        if (action === 'reserve' && method === 'POST') {
          const body = await parseBody(req);
          const updated = db.toggleReserve(id, body.userName);
          if (!updated) return sendJSON(res, 404, { error: 'Presente não encontrado' });
          return sendJSON(res, 200, { success: true, gift: updated });
        }

        // Alternar comprado
        if (action === 'bought' && method === 'POST') {
          const updated = db.toggleBought(id);
          if (!updated) return sendJSON(res, 404, { error: 'Presente não encontrado' });
          return sendJSON(res, 200, { success: true, gift: updated });
        }

        // Buscar por ID
        if (!action && method === 'GET') {
          const gift = db.getGiftById(id);
          if (!gift) return sendJSON(res, 404, { error: 'Presente não encontrado' });
          return sendJSON(res, 200, { success: true, gift });
        }

        // Atualizar Presente
        if (!action && method === 'PUT') {
          const body = await parseBody(req);
          if (!body.title || !body.title.trim()) {
            return sendJSON(res, 400, { error: 'O título do presente é obrigatório!' });
          }
          const updated = db.updateGift(id, body);
          if (!updated) return sendJSON(res, 404, { error: 'Presente não encontrado' });
          return sendJSON(res, 200, { success: true, gift: updated });
        }

        // Deletar Presente
        if (!action && method === 'DELETE') {
          db.deleteGift(id);
          return sendJSON(res, 200, { success: true, message: 'Presente removido com sucesso!' });
        }
      }

      // Rota da API não encontrada
      return sendJSON(res, 404, { error: 'Rota de API não encontrada' });
    }

    // ARQUIVOS ESTÁTICOS
    serveStatic(req, res, pathname);
  } catch (error) {
    console.error('Erro na requisição:', error);
    sendJSON(res, 500, { error: 'Erro interno no servidor: ' + error.message });
  }
});

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🎁 LISTA DE PRESENTES - RAYZA & GUILHERME 💖`);
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`📁 Banco de Dados SQLite: ${path.join(__dirname, 'presentes.db')}`);
  console.log(`=========================================`);
});

