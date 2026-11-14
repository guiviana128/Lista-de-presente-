// ==========================================================================
// LISTA DE PRESENTES - RAYZA & GUILHERME (FRONTEND APP)
// ==========================================================================

const API_BASE = '/api';

// Imagens padrão elegantes por categoria caso o usuário não informe imagem
const CATEGORY_DEFAULT_IMAGES = {
  'Beleza & Perfumaria': 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop&q=80',
  'Roupas & Acessórios': 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&auto=format&fit=crop&q=80',
  'Eletrônicos & Tech': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
  'Livros & Papelaria': 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80',
  'Experiências & Encontros': 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80',
  'Casa & Decoração': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80',
  'Geral': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80'
};

// Estado da Aplicação
const state = {
  currentUser: localStorage.getItem('giftList_user') || 'Rayza',
  userAvatar: localStorage.getItem('giftList_avatar') || '🌸',
  filterRecipient: 'Todos',
  filterCategory: 'Todas',
  filterStatus: '',
  filterSort: 'recent',
  searchQuery: '',
  gifts: [],
  stats: {}
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  updateUserHeader();
  loadStats();
  loadGifts();
});

// ==========================================================================
// Gestão de Usuário Ativo
// ==========================================================================
function updateUserHeader() {
  const headerAvatar = document.getElementById('headerAvatar');
  const headerUserName = document.getElementById('headerUserName');
  
  if (headerAvatar) headerAvatar.textContent = state.userAvatar;
  if (headerUserName) headerUserName.textContent = state.currentUser;
  
  // Atualiza default do formulário para o usuário atual
  const giftForWho = document.getElementById('giftForWho');
  if (giftForWho && !document.getElementById('giftId').value) {
    giftForWho.value = state.currentUser;
  }
}

function openProfileModal() {
  const modal = document.getElementById('profileModal');
  modal.classList.add('active');
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  modal.classList.remove('active');
}

function selectActiveUser(userName) {
  const avatar = userName === 'Rayza' ? '🌸' : '💙';
  state.currentUser = userName;
  state.userAvatar = avatar;
  
  localStorage.setItem('giftList_user', userName);
  localStorage.setItem('giftList_avatar', avatar);
  
  updateUserHeader();
  closeProfileModal();
  showToast(`Você agora está conectado como ${userName} ${avatar}`, 'info');
  loadGifts(); // Recarrega para ajustar botões de reserva/ações
}

function togglePinVisibility() {
  const pinInput = document.getElementById('pinInput');
  if (pinInput.type === 'password') {
    pinInput.type = 'text';
  } else {
    pinInput.type = 'password';
  }
}

// ==========================================================================
// Carregamento de Dados (API)
// ==========================================================================
async function loadStats() {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    const data = await res.json();
    if (data.success && data.stats) {
      state.stats = data.stats;
      document.getElementById('statTotal').textContent = data.stats.total;
      document.getElementById('statRayza').textContent = data.stats.forRayza;
      document.getElementById('statGuilherme').textContent = data.stats.forGuilherme;
      document.getElementById('statBoth').textContent = data.stats.forBoth;
      document.getElementById('statBought').textContent = data.stats.bought;
    }
  } catch (err) {
    console.error('Erro ao buscar estatísticas:', err);
  }
}

async function loadGifts() {
  const loading = document.getElementById('loadingIndicator');
  const emptyState = document.getElementById('emptyState');
  const grid = document.getElementById('giftsGrid');

  loading.style.display = 'block';
  emptyState.style.display = 'none';

  try {
    const params = new URLSearchParams();
    if (state.filterRecipient && state.filterRecipient !== 'Todos') {
      params.append('for_who', state.filterRecipient);
    }
    if (state.filterCategory && state.filterCategory !== 'Todas') {
      params.append('category', state.filterCategory);
    }
    if (state.filterStatus) {
      params.append('status', state.filterStatus);
    }
    if (state.filterSort) {
      params.append('sort', state.filterSort);
    }
    if (state.searchQuery) {
      params.append('search', state.searchQuery);
    }

    const res = await fetch(`${API_BASE}/gifts?${params.toString()}`);
    const data = await res.json();

    loading.style.display = 'none';

    if (data.success && Array.isArray(data.gifts)) {
      // Se a lista no servidor estiver vazia mas houver backup no navegador (ex: após cold-start do Vercel)
      if (data.gifts.length === 0 && !state.searchQuery && state.filterRecipient === 'Todos' && state.filterCategory === 'Todas' && !state.filterStatus) {
        const cached = localStorage.getItem('cached_couple_gifts');
        if (cached) {
          try {
            const cachedGifts = JSON.parse(cached);
            if (Array.isArray(cachedGifts) && cachedGifts.length > 0) {
              // Restaura automaticamente no servidor
              const syncRes = await fetch(`${API_BASE}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gifts: cachedGifts })
              });
              const syncData = await syncRes.json();
              if (syncData.success && syncData.gifts && syncData.gifts.length > 0) {
                state.gifts = syncData.gifts;
                renderGifts(syncData.gifts);
                updateResultsCount(syncData.gifts.length);
                loadStats();
                return;
              }
            }
          } catch (e) {
            console.warn('Erro ao restaurar cache local:', e);
          }
        }
      }

      // Se temos presentes carregados, atualiza o backup local
      if (data.gifts.length > 0 && !state.searchQuery && state.filterRecipient === 'Todos') {
        localStorage.setItem('cached_couple_gifts', JSON.stringify(data.gifts));
      }

      state.gifts = data.gifts;
      renderGifts(data.gifts);
      updateResultsCount(data.gifts.length);
    } else {
      showToast('Erro ao carregar presentes', 'error');
    }
  } catch (err) {
    loading.style.display = 'none';
    console.error('Erro ao carregar lista de presentes:', err);
    showToast('Não foi possível conectar ao servidor', 'error');
  }
}

// ==========================================================================
// Renderização dos Cards de Presente
// ==========================================================================
function renderGifts(gifts) {
  const grid = document.getElementById('giftsGrid');
  const emptyState = document.getElementById('emptyState');

  grid.innerHTML = '';

  if (gifts.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  gifts.forEach(gift => {
    const card = createGiftCardElement(gift);
    grid.appendChild(card);
  });
}

function createGiftCardElement(gift) {
  const card = document.createElement('div');
  card.className = `gift-card ${gift.is_bought ? 'is-bought' : ''}`;
  card.id = `gift-card-${gift.id}`;

  // Imagem com fallback
  const imgUrl = (gift.image_url && gift.image_url.trim()) ? gift.image_url : (CATEGORY_DEFAULT_IMAGES[gift.category] || CATEGORY_DEFAULT_IMAGES['Geral']);

  // Formatador de preço
  const priceFormatted = gift.price > 0 
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(gift.price)
    : 'Preço a consultar';

  // Badge do destinatário
  let recipientClass = 'both';
  let recipientIcon = '💑';
  if (gift.for_who === 'Rayza') {
    recipientClass = 'rayza';
    recipientIcon = '🌸';
  } else if (gift.for_who === 'Guilherme') {
    recipientClass = 'guilherme';
    recipientIcon = '💙';
  }

  // Verifica se o parceiro reservou
  let reservationHtml = '';
  if (gift.is_reserved && !gift.is_bought) {
    reservationHtml = `
      <div class="reservation-banner">
        <span>🤫</span>
        <span>Reservado em segredo por <strong>${escapeHtml(gift.reserved_by || 'Alguém especial')}</strong>!</span>
      </div>
    `;
  }

  // Ribbon de Comprado
  const boughtRibbon = gift.is_bought ? `<div class="bought-ribbon">Comprado 🎉</div>` : '';

  card.innerHTML = `
    ${boughtRibbon}
    <div class="gift-card-media">
      <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(gift.title)}" loading="lazy" onerror="this.onerror=null; this.src='${CATEGORY_DEFAULT_IMAGES['Geral']}';">
      <span class="category-tag">${escapeHtml(gift.category)}</span>
      <span class="priority-tag">${escapeHtml(gift.priority)}</span>
    </div>

    <div class="gift-card-body">
      <div class="recipient-badge-row">
        <span class="recipient-badge ${recipientClass}">
          ${recipientIcon} Para ${escapeHtml(gift.for_who)}
        </span>
        <span class="created-by-text">por ${escapeHtml(gift.created_by)}</span>
      </div>

      <h3 class="gift-title" title="${escapeHtml(gift.title)}">${escapeHtml(gift.title)}</h3>
      <div class="gift-price-tag">${priceFormatted}</div>

      <p class="gift-desc">${escapeHtml(gift.description || 'Sem observações adicionais.')}</p>

      ${reservationHtml}

      <div class="gift-card-actions">
        <!-- Link para abrir direto na loja -->
        <a href="${escapeHtml(gift.url)}" target="_blank" rel="noopener noreferrer" class="store-link-btn">
          <span>Ver na Loja</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </a>

        <!-- Botões de Ações Rápidas -->
        <div class="card-button-row">
          <button class="action-icon-btn ${gift.is_reserved ? 'btn-reserve active' : 'btn-reserve'}" onclick="toggleReserve(${gift.id})" title="${gift.is_reserved ? 'Cancelar Reserva' : 'Reservar em Segredo'}">
            <span>${gift.is_reserved ? '🤫 Reservado' : '🎁 Reservar'}</span>
          </button>

          <button class="action-icon-btn ${gift.is_bought ? 'btn-bought active' : 'btn-bought'}" onclick="toggleBought(${gift.id})" title="Marcar como Comprado">
            <span>${gift.is_bought ? '✅ Ganho!' : '✔ Comprei'}</span>
          </button>

          <button class="action-icon-btn" onclick="copyGiftLink('${escapeHtml(gift.url)}')" title="Copiar Link">
            <span>📋</span>
          </button>

          <div class="card-controls-right">
            <button class="icon-btn-ghost" onclick="openEditModal(${gift.id})" title="Editar Detalhes">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="icon-btn-ghost delete" onclick="confirmDelete(${gift.id}, '${escapeHtml(gift.title)}')" title="Remover da Lista">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  return card;
}

// ==========================================================================
// Ações de Reserva, Compra, Cópia e Exclusão
// ==========================================================================
async function toggleReserve(giftId) {
  try {
    const res = await fetch(`${API_BASE}/gifts/${giftId}/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName: state.currentUser })
    });
    const data = await res.json();
    if (data.success) {
      if (data.gift.is_reserved) {
        showToast(`Presente reservado por você em segredo! 🤫🎁`, 'success');
      } else {
        showToast('Reserva cancelada!', 'info');
      }
      loadGifts();
      loadStats();
    }
  } catch (err) {
    showToast('Erro ao atualizar reserva', 'error');
  }
}

async function toggleBought(giftId) {
  try {
    const res = await fetch(`${API_BASE}/gifts/${giftId}/bought`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.success) {
      if (data.gift.is_bought) {
        showToast('Parabéns! Mais um desejo realizado! 🎉💖', 'success');
      } else {
        showToast('Marcado como não comprado.', 'info');
      }
      loadGifts();
      loadStats();
    }
  } catch (err) {
    showToast('Erro ao atualizar status', 'error');
  }
}

function copyGiftLink(url) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('Link do produto copiado com sucesso! 📋', 'success');
    }).catch(() => fallbackCopy(url));
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand('copy');
    showToast('Link do produto copiado! 📋', 'success');
  } catch (err) {
    prompt('Copie o link manualmente:', text);
  }
  document.body.removeChild(textArea);
}

async function confirmDelete(giftId, title) {
  const confirmed = confirm(`Tem certeza que deseja remover o presente "${title}" da lista?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/gifts/${giftId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      // Remove também do backup local
      const cached = localStorage.getItem('cached_couple_gifts');
      if (cached) {
        try {
          const list = JSON.parse(cached).filter(g => g.id !== giftId && g.title !== title);
          localStorage.setItem('cached_couple_gifts', JSON.stringify(list));
        } catch (e) {}
      }

      showToast('Presente removido da lista!', 'info');
      loadGifts();
      loadStats();
    }
  } catch (err) {
    showToast('Erro ao excluir presente', 'error');
  }
}

// ==========================================================================
// Modal de Cadastro / Edição
// ==========================================================================
function openAddModal() {
  document.getElementById('modalTitle').textContent = '💝 Adicionar Novo Presente';
  document.getElementById('giftForm').reset();
  document.getElementById('giftId').value = '';
  document.getElementById('giftForWho').value = state.currentUser;
  document.getElementById('imagePreviewContainer').style.display = 'none';
  document.getElementById('saveGiftBtn').textContent = 'Salvar Presente 💖';

  const modal = document.getElementById('giftModal');
  modal.classList.add('active');
  document.getElementById('giftTitle').focus();
}

async function openEditModal(giftId) {
  try {
    const res = await fetch(`${API_BASE}/gifts/${giftId}`);
    const data = await res.json();
    if (!data.success || !data.gift) {
      return showToast('Não foi possível carregar os dados para edição', 'error');
    }

    const gift = data.gift;
    document.getElementById('modalTitle').textContent = '✏️ Editar Presente';
    document.getElementById('giftId').value = gift.id;
    document.getElementById('giftTitle').value = gift.title;
    document.getElementById('giftUrl').value = gift.url;
    document.getElementById('giftForWho').value = gift.for_who;
    document.getElementById('giftPrice').value = gift.price > 0 ? gift.price : '';
    document.getElementById('giftCategory').value = gift.category;
    document.getElementById('giftPriority').value = gift.priority;
    document.getElementById('giftImageUrl').value = gift.image_url || '';
    document.getElementById('giftDescription').value = gift.description || '';
    document.getElementById('saveGiftBtn').textContent = 'Atualizar Presente ✨';

    updateImagePreview();

    const modal = document.getElementById('giftModal');
    modal.classList.add('active');
  } catch (err) {
    showToast('Erro ao abrir edição', 'error');
  }
}

function closeGiftModal() {
  const modal = document.getElementById('giftModal');
  modal.classList.remove('active');
}

function handleModalOverlayClick(event, modalId) {
  if (event.target.id === modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
  }
}

function updateImagePreview() {
  const url = document.getElementById('giftImageUrl').value.trim();
  const container = document.getElementById('imagePreviewContainer');
  const img = document.getElementById('imagePreview');

  if (url) {
    img.src = url;
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

function testUrl() {
  const urlInput = document.getElementById('giftUrl');
  let url = urlInput.value.trim();
  if (!url) {
    return showToast('Por favor, cole um link antes de testar.', 'info');
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
    urlInput.value = url;
  }
  window.open(url, '_blank');
}

async function handleGiftFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('giftId').value;
  let url = document.getElementById('giftUrl').value.trim();

  // Garante que o link comece com protocolo http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  const payload = {
    title: document.getElementById('giftTitle').value.trim(),
    url: url,
    for_who: document.getElementById('giftForWho').value,
    price: parseFloat(document.getElementById('giftPrice').value) || 0,
    category: document.getElementById('giftCategory').value,
    priority: document.getElementById('giftPriority').value,
    image_url: document.getElementById('giftImageUrl').value.trim(),
    description: document.getElementById('giftDescription').value.trim(),
    created_by: state.currentUser
  };

  const isEditing = !!id;
  const endpoint = isEditing ? `${API_BASE}/gifts/${id}` : `${API_BASE}/gifts`;
  const method = isEditing ? 'PUT' : 'POST';

  try {
    const res = await fetch(endpoint, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      closeGiftModal();
      showToast(isEditing ? 'Presente atualizado com sucesso! ✨' : 'Presente salvo com amor! 💝', 'success');
      loadGifts();
      loadStats();
    } else {
      showToast(data.error || 'Erro ao salvar presente', 'error');
    }
  } catch (err) {
    showToast('Erro ao comunicar com o servidor', 'error');
  }
}

// ==========================================================================
// Filtros e Pesquisa
// ==========================================================================
function selectRecipientTab(recipient) {
  state.filterRecipient = recipient;
  
  // Atualiza classes ativas
  const buttons = document.querySelectorAll('#recipientTabs .segment-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.recipient === recipient);
  });

  // Atualiza título da seção
  const heading = document.getElementById('listHeading');
  if (recipient === 'Todos') heading.textContent = 'Todos os Presentes';
  else if (recipient === 'Rayza') heading.textContent = 'Desejos da Rayza 🌸';
  else if (recipient === 'Guilherme') heading.textContent = 'Desejos do Guilherme 💙';
  else heading.textContent = 'Desejos para Nós Dois 💑';

  loadGifts();
}

function filterByRecipient(recipient) {
  selectRecipientTab(recipient);
  // Rola suave até a lista
  document.querySelector('.action-bar-card').scrollIntoView({ behavior: 'smooth' });
}

function filterByStatus(status) {
  const statusSelect = document.getElementById('statusSelect');
  statusSelect.value = status;
  applyFilters();
  document.querySelector('.action-bar-card').scrollIntoView({ behavior: 'smooth' });
}

function applyFilters() {
  state.filterCategory = document.getElementById('categorySelect').value;
  state.filterStatus = document.getElementById('statusSelect').value;
  state.filterSort = document.getElementById('sortSelect').value;
  loadGifts();
}

let searchTimeout = null;
function handleSearch() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const query = input.value.trim();

  clearBtn.style.display = query ? 'block' : 'none';

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.searchQuery = query;
    loadGifts();
  }, 300);
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  input.value = '';
  document.getElementById('clearSearchBtn').style.display = 'none';
  state.searchQuery = '';
  loadGifts();
}

function updateResultsCount(count) {
  const badge = document.getElementById('resultsCount');
  if (badge) {
    badge.textContent = `${count} ${count === 1 ? 'presente encontrado' : 'presentes encontrados'}`;
  }
}

// ==========================================================================
// Toasts
// ==========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

// Utilitário para escapar caracteres perigosos no HTML
function escapeHtml(string) {
  if (string === null || string === undefined) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

