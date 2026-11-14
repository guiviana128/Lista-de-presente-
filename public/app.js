const API_BASE = '/api';
const defaults = { Rayza: '🌸', Guilherme: '💙' };
const state = {
  currentUser: localStorage.getItem('giftList_user') || 'Rayza', users: [], gifts: [],
  filterRecipient: 'Todos', filterCategory: 'Todas', filterStatus: '', filterSort: 'recent', searchQuery: ''
};
let requestSequence = 0;
let searchTimeout;
const imageVersions = { gift: 0, profile: 0 };
let profileName = state.currentUser;
let imageBusy = 0;
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const safeUrl = value => {
  if (/^\/api\/images\/[a-f0-9-]+\.(png|jpg|webp|gif)$/.test(value || '')) return value;
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; }
};
async function api(route, method = 'GET', body) {
  const res = await fetch(API_BASE + route, {
    method, cache: 'no-store', headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const data = await res.json().catch(() => { throw new Error('O servidor não respondeu. Tente novamente.'); });
  if (!res.ok || data.success === false || data.error) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  $('toastContainer').append(toast);
  setTimeout(() => toast.remove(), 5000);
}
function avatar(element, value, name) {
  element.replaceChildren();
  const url = safeUrl(value);
  if (url) {
    const img = document.createElement('img');
    img.src = url; img.alt = 'Foto de ' + name;
    img.addEventListener('error', () => { element.textContent = defaults[name]; }, { once: true });
    element.append(img);
  } else element.textContent = defaults[name] || '♡';
}
async function loadUsers() {
  const data = await api('/users');
  state.users = data.users;
  updateUserHeader();
}
function updateUserHeader() {
  const user = state.users.find(u => u.name === state.currentUser);
  avatar($('headerAvatar'), user?.avatar, state.currentUser);
  $('headerUserName').textContent = state.currentUser;
  for (const name of Object.keys(defaults)) {
    const profile = state.users.find(u => u.name === name);
    document.querySelectorAll('[data-avatar="' + name + '"]').forEach(el => avatar(el, profile?.avatar, name));
    document.querySelectorAll('[data-profile="' + name + '"]').forEach(el => el.classList.toggle('selected', name === state.currentUser));
  }
}
function selectActiveUser(name) {
  state.currentUser = name;
  localStorage.setItem('giftList_user', name);
  updateUserHeader();
  closeProfileModal();
  loadGifts();
  showToast('Navegando como ' + name);
}
function openProfileModal(name = state.currentUser) {
  imageVersions.profile++;
  $('profileImageStatus').textContent = '';
  profileName = name;
  $('profileEditorName').textContent = 'Foto de ' + name;
  const user = state.users.find(u => u.name === name);
  $('profileImageUrl').value = safeUrl(user?.avatar) || '';
  $('profileImageFile').value = '';
  updateProfilePreview();
  openModal('profileModal');
}
function closeProfileModal() { closeModal('profileModal'); }
function updateProfilePreview() {
  avatar($('profileImagePreview'), $('profileImageUrl').value.trim(), profileName);
}
async function saveProfileImage() {
  if (imageBusy) return showToast('Aguarde a imagem terminar de carregar.');
  const value = $('profileImageUrl').value.trim();
  if (value && !safeUrl(value)) return showToast('Informe um link de imagem http/https válido.', 'error');
  const button = $('saveProfileBtn');
  button.disabled = true;
  button.textContent = 'Salvando foto…';
  try {
    await api('/users/avatar', 'POST', { name: profileName, avatar: value || defaults[profileName] });
    await loadUsers();
    closeProfileModal();
    showToast('Foto de ' + profileName + ' atualizada!', 'success');
  } catch (error) { showToast(error.message, 'error'); }
  finally { button.disabled = false; button.textContent = 'Salvar foto'; }
}
async function loadStats() {
  try {
    const { stats } = await api('/stats');
    for (const [id,key] of Object.entries({ statTotal:'total', statRayza:'forRayza', statGuilherme:'forGuilherme', statBoth:'forBoth', statBought:'bought' })) $(id).textContent = stats[key];
  } catch (error) { console.error(error); }
}
async function loadGifts() {
  const sequence = ++requestSequence;
  $('loadingIndicator').style.display = 'block';
  $('emptyState').style.display = 'none';
  $('loadError').hidden = true;
  const params = new URLSearchParams({
    for_who: state.filterRecipient, category: state.filterCategory, status: state.filterStatus,
    sort: state.filterSort, search: state.searchQuery
  });
  try {
    const { gifts } = await api('/gifts?' + params);
    if (sequence !== requestSequence) return;
    state.gifts = gifts;
    renderGifts();
  } catch (error) {
    if (sequence !== requestSequence) return;
    $('loadError').hidden = false;
    $('giftsGrid').replaceChildren();
    $('resultsCount').textContent = '';
  } finally { if (sequence === requestSequence) $('loadingIndicator').style.display = 'none'; }
}
function renderGifts() {
  const grid = $('giftsGrid');
  grid.replaceChildren();
  const filtered = state.searchQuery || state.filterRecipient !== 'Todos' || state.filterCategory !== 'Todas' || state.filterStatus;
  $('emptyTitle').textContent = filtered ? 'Nenhum desejo por aqui' : 'O próximo desejo começa aqui';
  $('emptyDescription').textContent = filtered ? 'Tente outra busca ou ajuste os filtros para encontrar seu presente.' : 'Guarde uma ideia, um sonho ou aquele presente que tem a cara de vocês.';
  $('emptyState').style.display = state.gifts.length ? 'none' : 'block';
  $('resultsCount').textContent = state.gifts.length + (state.gifts.length === 1 ? ' desejo' : ' desejos');
  for (const gift of state.gifts) {
    const card = document.createElement('article');
    card.className = 'gift-card' + (gift.is_bought ? ' is-bought' : '');
    card.dataset.giftId = gift.id;
    const image = safeUrl(gift.image_url);
    const store = safeUrl(gift.url);
    const forClass = gift.for_who === 'Rayza' ? 'rayza' : gift.for_who === 'Guilherme' ? 'guilherme' : 'both';
    const currency = Number(gift.price) > 0 ? Number(gift.price).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }) : 'Um carinho sem preço';
    card.innerHTML = `
      <div class="gift-card-media ${image ? '' : 'without-image'}">
        ${image ? '<img loading="lazy" src="' + esc(image) + '" alt="' + esc(gift.title) + '">' : '<div class="gift-placeholder"><span>♡</span><small>feito para surpreender</small></div>'}
        <span class="category-tag">${esc(gift.category)}</span>
        ${gift.is_bought ? '<span class="gift-status">✓ Desejo realizado</span>' : ''}
      </div>
      <div class="gift-card-body">
        <div class="recipient-badge-row"><span class="recipient-badge ${forClass}">Para ${esc(gift.for_who)}</span><span class="priority-stars" title="${esc(gift.priority)}">${esc((gift.priority.match(/⭐/g) || []).join(''))}</span></div>
        <h3 class="gift-title">${esc(gift.title)}</h3>
        <p class="gift-price-tag">${esc(currency)}</p>
        <p class="gift-desc">${esc(gift.description || 'Uma ideia especial para guardar com carinho.')}</p>
        ${gift.is_reserved && gift.reserved_by === state.currentUser ? '<div class="reservation-banner">♡ Você reservou este presente</div>' : ''}
        <div class="gift-card-actions">
          ${store ? '<a class="store-link-btn" href="' + esc(store) + '" target="_blank" rel="noopener noreferrer">Ver na loja <span>↗</span></a>' : ''}
          <div class="card-button-row">
            <button class="action-icon-btn ${gift.is_reserved ? 'active' : ''}" data-action="reserve">${gift.is_reserved ? 'Reservado' : 'Reservar'}</button>
            <button class="action-icon-btn ${gift.is_bought ? 'active' : ''}" data-action="bought">${gift.is_bought ? '✓ Comprado' : 'Marcar comprado'}</button>
          </div>
          <div class="card-edit-row"><button data-action="copy">Copiar link</button><div><button data-action="edit">Editar</button><button class="delete" data-action="delete">Apagar</button></div></div>
        </div>
      </div>`;
    card.querySelector('img')?.addEventListener('error', event => {
      event.currentTarget.remove();
      card.querySelector('.gift-card-media').classList.add('without-image');
      const fallback = document.createElement('div');
      fallback.className = 'gift-placeholder';
      fallback.textContent = '♡';
      card.querySelector('.gift-card-media').prepend(fallback);
    }, { once: true });
    grid.append(card);
  }
}
async function cardAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const card = button.closest('[data-gift-id]');
  const gift = state.gifts.find(g => String(g.id) === card.dataset.giftId);
  if (!gift) return;
  const action = button.dataset.action;
  if (action === 'edit') return openEditModal(gift.id);
  if (action === 'copy') {
    try { await navigator.clipboard.writeText(gift.url); showToast('Link copiado!', 'success'); }
    catch { showToast('Não foi possível copiar. Abra a loja e copie o endereço.', 'error'); }
    return;
  }
  if (action === 'delete' && !confirm('Apagar "' + gift.title + '" da lista?')) return;
  button.disabled = true;
  try {
    await api('/gifts/' + encodeURIComponent(gift.id) + (action === 'delete' ? '' : '/' + action),
      action === 'delete' ? 'DELETE' : 'POST', action === 'reserve' ? { userName: state.currentUser } : undefined);
    if (action === 'delete') {
      // Retire the legacy cache, which must never restore deleted records.
      localStorage.removeItem('cached_couple_gifts');
    }
    showToast(action === 'delete' ? 'Presente apagado.' : 'Presente atualizado!', 'success');
    await Promise.all([loadGifts(), loadStats()]);
  } catch (error) { showToast(error.message, 'error'); }
  finally { button.disabled = false; }
}
function openAddModal() {
  imageVersions.gift++;
  $('giftImageStatus').textContent = '';
  $('giftForm').reset();
  $('giftId').value = '';
  $('giftForWho').value = state.currentUser;
  $('giftImageFile').value = '';
  $('modalTitle').textContent = 'Um novo desejo';
  $('saveGiftBtn').textContent = 'Salvar presente';
  updateImagePreview();
  openModal('giftModal');
  $('giftTitle').focus();
}
async function openEditModal(id) {
  const version = ++imageVersions.gift;
  $('giftImageStatus').textContent = '';
  try {
    const { gift } = await api('/gifts/' + encodeURIComponent(id));
    if (version !== imageVersions.gift) return;
    $('giftForm').reset();
    for (const [element,key] of Object.entries({ giftId:'id', giftTitle:'title', giftUrl:'url', giftForWho:'for_who', giftPrice:'price', giftCategory:'category', giftPriority:'priority', giftImageUrl:'image_url', giftDescription:'description' })) $(element).value = gift[key] ?? '';
    $('modalTitle').textContent = 'Editar desejo';
    $('saveGiftBtn').textContent = 'Salvar alterações';
    updateImagePreview();
    openModal('giftModal');
  } catch (error) { showToast(error.message, 'error'); }
}
function closeGiftModal() { closeModal('giftModal'); }
function openModal(id) { $(id).classList.add('active'); document.body.classList.add('modal-open'); }
function closeModal(id) { imageVersions[id === 'giftModal' ? 'gift' : 'profile']++; $(id).classList.remove('active'); if (!document.querySelector('.modal-overlay.active')) document.body.classList.remove('modal-open'); }
function handleModalOverlayClick(event,id) { if (event.target.id === id) closeModal(id); }
function updateImagePreview() {
  const value = safeUrl($('giftImageUrl').value.trim());
  $('imagePreviewContainer').style.display = value ? 'block' : 'none';
  $('imagePreview').src = value;
}
function onImageUrlChange(target) {
  imageVersions[target]++;
  $(target + 'ImageStatus').textContent = '';
  target === 'gift' ? updateImagePreview() : updateProfilePreview();
}
function removeImage(target) {
  imageVersions[target]++;
  $(target + 'ImageStatus').textContent = '';
  $(target === 'gift' ? 'giftImageUrl' : 'profileImageUrl').value = '';
  $(target === 'gift' ? 'giftImageFile' : 'profileImageFile').value = '';
  target === 'gift' ? updateImagePreview() : updateProfilePreview();
}
function testUrl() {
  const input = $('giftUrl');
  let value = input.value.trim();
  if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
  if (!safeUrl(value)) return showToast('Cole um link de loja válido.', 'error');
  input.value = value;
  window.open(value, '_blank', 'noopener,noreferrer');
}
async function handleGiftFormSubmit(event) {
  event.preventDefault();
  if (imageBusy) return showToast('Aguarde a imagem terminar de carregar.');
  const id = $('giftId').value;
  const payload = {
    title: $('giftTitle').value.trim(), url: $('giftUrl').value.trim(), for_who: $('giftForWho').value,
    price: Number($('giftPrice').value) || 0, category: $('giftCategory').value, priority: $('giftPriority').value,
    image_url: $('giftImageUrl').value.trim(), description: $('giftDescription').value.trim(), created_by: state.currentUser
  };
  if (!/^https?:\/\//i.test(payload.url)) payload.url = 'https://' + payload.url;
  if (payload.image_url && !safeUrl(payload.image_url)) return showToast('Informe um link de imagem válido.', 'error');
  const button = $('saveGiftBtn');
  button.disabled = true;
  button.textContent = 'Salvando…';
  try {
    await api('/gifts' + (id ? '/' + encodeURIComponent(id) : ''), id ? 'PUT' : 'POST', payload);
    closeGiftModal();
    showToast(id ? 'Alterações salvas!' : 'Um novo desejo guardado!', 'success');
    await Promise.all([loadGifts(), loadStats()]);
  } catch (error) { showToast(error.message, 'error'); }
  finally { button.disabled = false; button.textContent = id ? 'Salvar alterações' : 'Salvar presente'; }
}
async function optimizeImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Escolha ou cole um arquivo de imagem.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Escolha uma imagem com até 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => { throw new Error('Não foi possível abrir a imagem. Tente JPG, PNG, WebP ou GIF.'); });
    const ratio = Math.min(1, 1400 / Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1,Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1,Math.round(image.naturalHeight * ratio));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    let data = canvas.toDataURL('image/webp',0.84);
    if (data.length > 2.7 * 1024 * 1024) data = canvas.toDataURL('image/jpeg',0.65);
    if (data.length > 2.7 * 1024 * 1024) throw new Error('A imagem ficou muito grande. Escolha uma versão menor.');
    return data;
  } finally { URL.revokeObjectURL(url); }
}
async function chooseImage(file, target) {
  if (!file) return;
  const version = ++imageVersions[target];
  imageBusy++;
  const status = $(target + 'ImageStatus');
  status.textContent = 'Preparando e enviando imagem…';
  try {
    const image = await optimizeImage(file);
    if (version !== imageVersions[target]) return;
    const data = await api('/images', 'POST', { image });
    if (version !== imageVersions[target]) return;
    $(target === 'gift' ? 'giftImageUrl' : 'profileImageUrl').value = data.url;
    target === 'gift' ? updateImagePreview() : updateProfilePreview();
    status.textContent = 'Imagem pronta. Salve para confirmar a alteração.';
  } catch (error) { if (version === imageVersions[target]) { status.textContent = error.message; showToast(error.message, 'error'); } }
  finally { imageBusy--; }
}
async function pasteImage(target) {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find(type => type.startsWith('image/'));
      if (type) return chooseImage(await item.getType(type),target);
    }
    showToast('Copie uma imagem primeiro ou cole seu link no campo.');
  } catch { showToast('Clique na área de imagem e use Ctrl+V, ou escolha um arquivo.'); }
}
function selectRecipientTab(recipient) {
  state.filterRecipient = recipient;
  document.querySelectorAll('#recipientTabs .segment-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.recipient === recipient));
  $('listHeading').textContent = recipient === 'Todos' ? 'Nossa coleção de desejos' : recipient === 'Nós Dois' ? 'Para viver a dois' : 'Desejos de ' + recipient;
  loadGifts();
}
function filterByRecipient(recipient) { selectRecipientTab(recipient); $('listHeading').scrollIntoView({ behavior:'smooth', block:'center' }); }
function filterByStatus(status) { $('statusSelect').value = status; applyFilters(); }
function applyFilters() {
  state.filterCategory = $('categorySelect').value;
  state.filterStatus = $('statusSelect').value;
  state.filterSort = $('sortSelect').value;
  loadGifts();
}
function handleSearch() {
  clearTimeout(searchTimeout);
  $('clearSearchBtn').style.display = $('searchInput').value ? 'block' : 'none';
  searchTimeout = setTimeout(() => { state.searchQuery = $('searchInput').value.trim(); loadGifts(); }, 250);
}
function clearSearch() { $('searchInput').value = ''; $('clearSearchBtn').style.display = 'none'; state.searchQuery = ''; loadGifts(); }
document.addEventListener('DOMContentLoaded', () => {
  if (!defaults[state.currentUser]) state.currentUser = 'Rayza';
  updateUserHeader();
  loadUsers().catch(error => showToast(error.message,'error'));
  loadStats(); loadGifts();
  $('giftsGrid').addEventListener('click',cardAction);
  for (const target of ['gift','profile']) {
    $(target + 'ImageFile').addEventListener('change',event => chooseImage(event.target.files[0],target));
    const zone = $(target + 'ImageZone');
    zone.addEventListener('paste',event => {
      const item = Array.from(event.clipboardData.items).find(item => item.type.startsWith('image/'));
      if (item) { event.preventDefault(); chooseImage(item.getAsFile(),target); }
    });
    zone.addEventListener('dragover',event => { event.preventDefault(); zone.classList.add('dragging'); });
    zone.addEventListener('dragleave',() => zone.classList.remove('dragging'));
    zone.addEventListener('drop',event => { event.preventDefault(); zone.classList.remove('dragging'); chooseImage(event.dataTransfer.files[0],target); });
  }
  document.addEventListener('keydown',event => { if (event.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(modal => closeModal(modal.id)); });
});


