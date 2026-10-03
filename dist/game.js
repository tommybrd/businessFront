import { createGame, PRODUCTS, SUPPLIERS, EVENTS, STAFF_TOTAL, RESERVE_CAPACITY, DAILY_COST, currentEvent, reserveUsed, clock, setStaff, placeOrder, buyAutoCheckout, openStore, nextDay, advance } from './engine.js';

import { createStoreScene } from './scene.js';

const state = createGame();
const $ = id => document.getElementById(id);
const euros = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
let tab = 'rayons', selected = null, lastPanel = '', pendingMinutes = 0, lastTime = performance.now(), lastRender = 0, noticeTimer;
const canvas = $('store-map');
const storeScene = createStoreScene(canvas, state, productId => { selected = productId; switchTab('rayons'); });

function notice(text, error = false) {
  clearTimeout(noticeTimer); $('notice').textContent = text; $('notice').classList.toggle('error', error); $('notice').hidden = false;
  noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5000);
}
function act(action, message) {
  try { const result = action(); if (message) notice(message); render(true); return result; }
  catch (error) { notice(error.message, true); return null; }
}
function switchTab(name) {
  if (!['rayons', 'equipes', 'fournisseurs', 'finances'].includes(name)) throw new Error('Vue inconnue.');
  tab = name; lastPanel = '';
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $('management-content').setAttribute('aria-labelledby', `tab-${tab}`); renderPanel(true);
}
function stockPanel() {
  const used = reserveUsed(state);
  return `<div class="reserve-card"><strong>Réserve · ${used} / ${RESERVE_CAPACITY} unités</strong><p>${state.staff.shelves} employés réapprovisionnent les rayons.</p><div class="stock-track"><span style="width:${used / RESERVE_CAPACITY * 100}%;background:#668c56"></span></div></div>${state.products.map(p => `<div class="shelf-card"${selected === p.id ? ' style="background:#f5f8ef;border-radius:6px;padding:12px 6px"' : ''}><div class="shelf-title"><button data-select="${p.id}"><span class="product-color" style="background:${p.color}"></span>${p.name}</button><span class="stock-level ${p.shelf < 12 ? 'low' : ''}">${p.shelf} / ${p.capacity}</span></div><div class="stock-track"><span style="width:${p.shelf / p.capacity * 100}%;background:${p.shelf < 12 ? '#d47545' : p.color}"></span></div><div class="shelf-meta"><span>Réserve : ${p.reserve} · Vente : ${euros(p.price)}</span><button class="tiny-button" data-order-product="${p.id}" aria-label="Commander pour ${p.name}">Commander</button></div></div>`).join('')}`;
}
function staffPanel() {
  const free = STAFF_TOTAL - Object.values(state.staff).reduce((a, b) => a + b, 0);
  const roles = [['checkout', 'Encaissement', 'Une caisse par employé, jusqu’à quatre.'], ['shelves', 'Mise en rayon', 'De la réserve jusqu’aux rayons.'], ['receiving', 'Réception', 'Déchargement et rangement des palettes.']];
  return `<p class="panel-intro">Répartissez vos huit employés. Pour renforcer une équipe, libérez d’abord un poste ailleurs.</p>${roles.map(([role, name, description]) => `<div class="staff-row"><div><strong>${name}</strong><p>${description}</p></div><div class="stepper"><button data-staff="${role}" data-delta="-1" aria-label="Retirer un employé : ${name}" ${state.staff[role] === 0 ? 'disabled' : ''}>−</button><strong>${state.staff[role]}</strong><button data-staff="${role}" data-delta="1" aria-label="Ajouter un employé : ${name}" ${free === 0 ? 'disabled' : ''}>+</button></div></div>`).join('')}<p class="staff-free">${free} employé${free > 1 ? 's' : ''} disponible${free > 1 ? 's' : ''} · Salaires : ${euros(STAFF_TOTAL * 85)} / jour</p><div class="investment"><h3>Caisse automatique</h3><p>Renforce l’encaissement. Un employé aux caisses doit rester disponible pour la superviser.</p><button id="buy-auto" ${state.autoCheckout || state.money < 3500 || ['closed', 'bankrupt'].includes(state.phase) ? 'disabled' : ''}>${state.autoCheckout ? 'Caisse automatique installée' : 'Installer · 3 500 €'}</button></div>`;
}
function deliveryCards() {
  const orders = state.orders.filter(o => o.status !== 'received').slice(-6);
  if (!orders.length) return '<p class="empty-delivery">Aucune livraison en cours. Les marchandises sont payées au moment de la commande.</p>';
  return orders.map(o => { const p = state.products.find(p => p.id === o.productId); return `<div class="delivery-card"><strong>${p.short} · ${o.quantity} unités</strong><p>${o.supplier} · ${o.status === 'transit' ? `Arrivée dans ${Math.max(0, o.eta - state.elapsed)} min` : `Au quai · ${o.remaining} unités à ranger`}</p></div>`; }).join('');
}
function supplierPanel() {
  return `<p class="panel-intro">Anticipez les ruptures. Vos employés à la réception rangent les palettes en réserve.</p><form class="order-form" id="order-form"><label for="order-product">Produit</label><select id="order-product">${PRODUCTS.map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${p.name}</option>`).join('')}</select><label for="order-supplier">Fournisseur</label><select id="order-supplier"><option value="regular">Centrale Nord · 90 min</option><option value="express">Express Marché · 30 min · +18 %</option></select><label for="order-quantity">Quantité · cartons de 12</label><input id="order-quantity" type="number" min="12" max="240" step="12" value="48" required><div class="price-preview"><span>Montant de la commande</span><strong id="order-total"></strong></div><button class="primary" type="submit">Commander</button></form><h3 class="delivery-heading">Livraisons en cours</h3><div id="deliveries">${deliveryCards()}</div>`;
}
function financePanel() {
  return `<p class="panel-intro">Le stock est payé à la commande. Les ventes sont encaissées au passage en caisse.</p><div class="finance-row"><span>Trésorerie disponible</span><strong>${euros(state.money)}</strong></div><div class="finance-row"><span>Ventes aujourd’hui</span><strong>${euros(state.sales)}</strong></div><div class="finance-row"><span>Commandes et investissements</span><strong>− ${euros(state.spending)}</strong></div><div class="finance-row"><span>Salaires à la fermeture</span><strong>− ${euros(STAFF_TOTAL * 85)}</strong></div><div class="finance-row"><span>Loyer et fonctionnement</span><strong>− 160 €</strong></div><p class="finance-note">Charges quotidiennes : <strong>${euros(DAILY_COST)}</strong>. Conservez de quoi payer vos équipes et renouveler les marchandises avant d’investir.</p>${state.history.length ? `<h3 class="delivery-heading">Dernière journée</h3><div class="finance-row"><span>Flux de trésorerie</span><strong>${euros(state.history.at(-1).net)}</strong></div>` : ''}`;
}
function previewOrder() {
  if (!$('order-total')) return;
  const p = PRODUCTS.find(p => p.id === $('order-product').value), supplier = SUPPLIERS[$('order-supplier').value];
  const quantity = Number($('order-quantity').value);
  $('order-total').textContent = p && supplier && Number.isFinite(quantity) ? euros(Math.round(p.cost * supplier.multiplier * quantity * 100) / 100) : '—';
}
function renderPanel(force = false) {
  if (tab === 'fournisseurs' && !force && $('order-form')) { $('deliveries').innerHTML = deliveryCards(); previewOrder(); return; }
  const html = tab === 'rayons' ? stockPanel() : tab === 'equipes' ? staffPanel() : tab === 'finances' ? financePanel() : supplierPanel();
  if (force || html !== lastPanel) { $('management-content').innerHTML = html; lastPanel = html; }
  if (tab === 'fournisseurs') previewOrder();
}
function render() {
  $('day-label').textContent = `Jour ${state.day}`; $('clock').textContent = clock(state.minute);
  $('phase-label').textContent = { preparation: 'Préparation', open: state.speed ? 'Ouvert' : 'En pause', closed: 'Fermé', bankrupt: 'Trésorerie épuisée' }[state.phase];
  $('money').textContent = euros(state.money); $('money').classList.toggle('negative', state.money < 0);
  $('sales').textContent = euros(state.sales); $('sold').textContent = `${state.sold} clients encaissés`;
  $('customers').innerHTML = `${state.customers.length} <em>clients</em>`;
  const queueCount = state.customers.filter(c => c.stage === 'queue').length;
  $('queue').textContent = `${queueCount} en attente de caisse`; $('satisfaction').innerHTML = `${Math.round(state.satisfaction)} <em>%</em>`;
  $('lost').textContent = `${state.lost} départs sans achat`;
  $('cash-change').textContent = `Charges à prévoir : ${euros(DAILY_COST)} / jour`;
  const empty = state.products.filter(p => p.shelf < 12).length;
  $('store-status').textContent = state.phase === 'preparation' ? 'Préparez les commandes et les équipes avant l’ouverture.' : state.phase === 'open' ? empty ? `${empty} rayon${empty > 1 ? 's' : ''} à court de produits. Vérifiez la réserve et les livraisons.` : queueCount >= 8 ? 'Les files s’allongent. Renforcez les équipes aux caisses.' : 'Le magasin est ouvert. Cliquez sur un rayon pour suivre son stock.' : 'La journée est terminée. Consultez le bilan.';
  document.querySelectorAll('[data-speed]').forEach(b => { b.classList.toggle('active', Number(b.dataset.speed) === state.speed); b.disabled = state.phase !== 'open'; });
  $('main-action').textContent = { preparation: 'Ouvrir le magasin', open: state.speed ? 'Mettre en pause' : 'Reprendre la journée', closed: 'Voir le bilan', bankrupt: 'Voir le bilan' }[state.phase];
  const event = currentEvent(state); $('event-title').textContent = event.name; $('event-hint').textContent = event.hint;
  $('event-next').textContent = `Demain : ${EVENTS[state.day % EVENTS.length].name} · ${Math.round(EVENTS[state.day % EVENTS.length].factor * 100)} % d’affluence habituelle`;
  $('log').innerHTML = state.log.slice(0, 3).map(item => `<li class="${item.kind}"><time>${item.time}</time><span>${item.text}</span></li>`).join('');
  renderPanel();
  if (state.summary && !$('day-summary').open) showSummary();
}
function showSummary() {
  const s = state.summary; if (!s) return;
  $('summary-title').textContent = `Bilan du jour ${s.day}`;
  $('summary-body').innerHTML = `<div class="finance-row"><span>Ventes encaissées</span><strong>${euros(s.sales)}</strong></div><div class="finance-row"><span>Commandes et équipements</span><strong>− ${euros(s.spending)}</strong></div><div class="finance-row"><span>Charges de la journée</span><strong>− ${euros(s.expenses)}</strong></div><div class="summary-result ${s.net < 0 ? 'negative' : ''}">Variation de trésorerie : <strong>${euros(s.net)}</strong></div><p class="summary-message">${s.sold} clients encaissés · ${s.lost} départs sans achat.<br>${state.phase === 'bankrupt' ? 'Le magasin ne peut plus couvrir ses charges. Commencez une nouvelle partie pour essayer une autre organisation.' : `Trésorerie restante : ${euros(state.money)}. Préparez les stocks pour ${EVENTS[state.day % EVENTS.length].name.toLowerCase()}.`}</p>`;
  $('summary-action').textContent = state.phase === 'bankrupt' ? 'Nouvelle partie' : 'Préparer le lendemain';
  $('day-summary').showModal();
}
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => { if (state.phase === 'open') { state.speed = Number(b.dataset.speed); render(); } }));
document.querySelector('.tabs').addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const buttons = [...document.querySelectorAll('[data-tab]')], i = buttons.indexOf(document.activeElement);
  const index = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  e.preventDefault(); buttons[index].focus(); switchTab(buttons[index].dataset.tab);
});
$('main-action').addEventListener('click', () => {
  if (state.phase === 'preparation') act(() => openStore(state));
  else if (state.phase === 'open') { state.speed = state.speed ? 0 : 1; render(); }
  else showSummary();
});
$('management-content').addEventListener('click', e => {
  const staff = e.target.closest('[data-staff]'), order = e.target.closest('[data-order-product]'), select = e.target.closest('[data-select]');
  if (staff) act(() => setStaff(state, staff.dataset.staff, state.staff[staff.dataset.staff] + Number(staff.dataset.delta)));
  if (order) { selected = order.dataset.orderProduct; switchTab('fournisseurs'); }
  if (select) { selected = select.dataset.select; renderPanel(true); }
  if (e.target.closest('#buy-auto')) act(() => buyAutoCheckout(state), 'Caisse automatique installée.');
});
$('management-content').addEventListener('input', previewOrder);
$('management-content').addEventListener('change', previewOrder);
$('management-content').addEventListener('submit', e => {
  if (e.target.id !== 'order-form') return; e.preventDefault();
  act(() => placeOrder(state, $('order-product').value, Number($('order-quantity').value), $('order-supplier').value), 'Commande envoyée au fournisseur.');
});
$('summary-action').addEventListener('click', () => {
  if (state.phase === 'bankrupt') { location.reload(); return; }
  act(() => nextDay(state)); $('day-summary').close(); pendingMinutes = 0; render();
});
$('day-summary').addEventListener('cancel', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(document.activeElement.tagName) && state.phase === 'open') {
    e.preventDefault(); state.speed = state.speed ? 0 : 1; render();
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state.phase === 'open') { state.speed = 0; render(); } lastTime = performance.now(); });

// Browser agents use the same validated actions as the director's controls.
const context = document.modelContext;
if (context?.registerTool) {
  const lifecycle = new AbortController();
  const register = tool => { try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} };
  register({ name: 'read_store_status', description: 'Lire les stocks, équipes, liquidités et livraisons du magasin.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ day: state.day, time: clock(state.minute), phase: state.phase, cash: state.money, staff: { ...state.staff }, products: state.products.map(p => ({ id: p.id, shelf: p.shelf, reserve: p.reserve })), deliveries: state.orders.filter(o => o.status !== 'received').map(o => ({ ...o })) }) });
  register({ name: 'place_supplier_order', description: 'Commander et payer des marchandises auprès d’un fournisseur.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: 12, maximum: 240, multipleOf: 12 }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, required: ['productId', 'quantity', 'supplierId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); const result = placeOrder(state, input.productId, input.quantity, input.supplierId); render(); return { orderId: result.id, cost: result.cost, cash: state.money }; } });
  register({ name: 'set_staff_allocation', description: 'Modifier le nombre d’employés affectés à une fonction, dans la limite des huit employés.', inputSchema: { type: 'object', properties: { role: { type: 'string', enum: ['checkout', 'shelves', 'receiving'] }, amount: { type: 'integer', minimum: 0, maximum: 8 } }, required: ['role', 'amount'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Affectation invalide.'); const staff = setStaff(state, input.role, input.amount); render(); return { staff }; } });
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
function frame(now) {
  const delta = Math.min(250, now - lastTime); lastTime = now;
  if (state.phase === 'open' && state.speed) {
    pendingMinutes += delta / 1000 * 3 * state.speed;
    if (pendingMinutes >= 1) { const minutes = Math.floor(pendingMinutes); pendingMinutes -= minutes; advance(state, minutes); }
  }
  storeScene.update(delta, now, selected);
  if (now - lastRender >= 300) { render(); lastRender = now; }
  requestAnimationFrame(frame);
}
render(); requestAnimationFrame(frame);
