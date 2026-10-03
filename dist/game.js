import { createGame, PRODUCTS, SUPPLIERS, EVENTS, STAFF_TOTAL, RESERVE_CAPACITY, DAILY_COST, RESTOCK_EQUIPMENT, restockInTransit, selectRestockEquipment, quoteOrder, inventoryPosition, configureAutoOrder, currentEvent, reserveUsed, clock, setStaff, placeOrder, buyAutoCheckout, openStore, advance } from './engine.js';

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
  if (!['rayons', 'reserve', 'equipes', 'fournisseurs', 'finances'].includes(name)) throw new Error('Vue inconnue.');
  tab = name; lastPanel = '';
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  $('management-content').setAttribute('aria-labelledby', `tab-${tab}`); renderPanel(true);
}
function stockPanel() {
  const used = reserveUsed(state);
  const equipment = RESTOCK_EQUIPMENT[state.restockMode];
  return `<div class="reserve-card"><strong>Réserve · ${used} / ${RESERVE_CAPACITY} unités</strong><p>${state.staff.shelves} employés en rayon · ${state.staff.reserve} en préparation.<br>${equipment.name} · ${equipment.capacity} unités par chargement.</p><div class="stock-track"><span style="width:${used / RESERVE_CAPACITY * 100}%;background:#668c56"></span></div><div class="restock-overview"><span>${restockInTransit(state)} unités sur les équipements</span><button class="tiny-button" data-show-equipment>Équipement</button></div></div>${state.products.map(p => { const incoming = state.restockers.filter(w => w.productId === p.id && w.phase !== 'returning').reduce((sum, w) => sum + w.load + w.reserved, 0); return `<div class="shelf-card"${selected === p.id ? ' style="background:#f5f8ef;border-radius:6px;padding:12px 6px"' : ''}><div class="shelf-title"><button data-select="${p.id}"><span class="product-color" style="background:${p.color}"></span>${p.name}</button><span class="stock-level ${p.shelf < 12 ? 'low' : ''}">${p.shelf} / ${p.capacity}</span></div><div class="stock-track"><span style="width:${p.shelf / p.capacity * 100}%;background:${p.shelf < 12 ? '#d47545' : p.color}"></span></div><div class="shelf-meta"><span>Réserve : ${p.reserve} · Vente : ${euros(p.price)}</span><button class="tiny-button" data-order-product="${p.id}" aria-label="Commander pour ${p.name}">Commander</button></div>${incoming ? `<p class="restock-incoming">${incoming} unités en réapprovisionnement</p>` : ''}</div>`; }).join('')}`;
}
function equipmentPanel() {
  return `<section class="equipment-section" aria-label="Équipement de réapprovisionnement"><h3>Réserve → rayons</h3><p class="panel-intro">Un employé par équipement. Les achats équipent l’équipe ; les trajets en cours gardent leur matériel jusqu’au retour.</p>${Object.entries(RESTOCK_EQUIPMENT).map(([mode, equipment]) => {
    const unlocked = state.restockUnlocked[mode], active = state.restockMode === mode;
    const blocked = active || !['preparation', 'open'].includes(state.phase) || (!unlocked && (state.money < equipment.cost || !state.restockUnlocked[equipment.requires]));
    const button = active ? 'En service' : unlocked ? 'Utiliser' : !state.restockUnlocked[equipment.requires] ? 'Grand chariot requis' : `Équiper · ${euros(equipment.cost)}`;
    return `<div class="equipment-card ${active ? 'selected-equipment' : ''}"><div><strong>${equipment.name}</strong><p>${equipment.capacity} unités par trajet · ${mode === 'small' ? 'Inclus au départ' : mode === 'large' ? 'Équipe équipée pour 1 200 €' : 'Équipe équipée pour 3 600 €'}</p></div><button class="tiny-button" data-equipment="${mode}" ${blocked ? 'disabled' : ''}>${button}</button></div>`;
  }).join('')}</section>`;
}
function reservePanel() {
  const free = STAFF_TOTAL - Object.values(state.staff).reduce((a, b) => a + b, 0);
  return `<p class="panel-intro">Chaque produit a son emplacement en réserve. Les préparateurs chargent les chariots ; la réception range les nouvelles livraisons.</p><div class="staff-row"><div><strong>Préparation en réserve</strong><p>Un chargement préparé à la fois par employé.</p></div><div class="stepper"><button data-staff="reserve" data-delta="-1" aria-label="Retirer un préparateur en réserve" ${state.staff.reserve === 0 ? 'disabled' : ''}>−</button><strong>${state.staff.reserve}</strong><button data-staff="reserve" data-delta="1" aria-label="Ajouter un préparateur en réserve" ${free === 0 ? 'disabled' : ''}>+</button></div></div><p class="staff-free">${free} employé(s) disponible(s) · ${reserveUsed(state)} / ${RESERVE_CAPACITY} unités stockées.</p>${state.products.map(p => { const reserved = state.restockers.filter(w => w.productId === p.id).reduce((sum, w) => sum + w.reserved, 0); return `<div class="warehouse-product"><span class="product-color" style="background:${p.color}"></span><div><strong>${p.name}</strong><p>${reserved} unités réservées aux chargements</p></div><strong>${p.reserve}<small>en stock</small></strong></div>`; }).join('')}${state.staff.reserve === 0 ? '<p class="supply-warning">Sans préparateur en réserve, les chariots attendent leur chargement.</p>' : ''}`;
}
function staffPanel() {
  const free = STAFF_TOTAL - Object.values(state.staff).reduce((a, b) => a + b, 0);
  const roles = [['checkout', 'Encaissement', 'Une caisse par employé, jusqu’à quatre.'], ['shelves', 'Mise en rayon', 'Transport et remplissage des rayons.'], ['reserve', 'Préparation en réserve', 'Prépare et charge les équipements.'], ['receiving', 'Réception', 'Déchargement et rangement des palettes.']];
  return `<p class="panel-intro">Répartissez vos huit employés. Pour renforcer une équipe, libérez d’abord un poste ailleurs.</p>${roles.map(([role, name, description]) => `<div class="staff-row"><div><strong>${name}</strong><p>${description}</p></div><div class="stepper"><button data-staff="${role}" data-delta="-1" aria-label="Retirer un employé : ${name}" ${state.staff[role] === 0 ? 'disabled' : ''}>−</button><strong>${state.staff[role]}</strong><button data-staff="${role}" data-delta="1" aria-label="Ajouter un employé : ${name}" ${free === 0 ? 'disabled' : ''}>+</button></div></div>`).join('')}<p class="staff-free">${free} employé${free > 1 ? 's' : ''} disponible${free > 1 ? 's' : ''} · Salaires : ${euros(STAFF_TOTAL * 85)} / jour</p>${equipmentPanel()}<div class="investment"><h3>Caisse automatique</h3><p>Renforce l’encaissement. Un employé aux caisses doit rester disponible pour la superviser.</p><button id="buy-auto" ${state.autoCheckout || state.money < 3500 || ['closed', 'bankrupt'].includes(state.phase) ? 'disabled' : ''}>${state.autoCheckout ? 'Caisse automatique installée' : 'Installer · 3 500 €'}</button></div>`;
}
function deliveryCards() {
  const orders = state.orders.filter(o => o.status !== 'received').slice(-6);
  if (!orders.length) return '<p class="empty-delivery">Aucune livraison en cours. Les marchandises sont payées au moment de la commande.</p>';
  return orders.map(o => { const p = state.products.find(p => p.id === o.productId); return `<div class="delivery-card"><strong>${p.short} · ${o.quantity} unités${o.source === 'automatic' ? ' · Auto' : ''}</strong><p>${o.supplier} · ${o.status === 'transit' ? `Arrivée dans ${Math.max(0, o.eta - state.elapsed)} min` : `Au quai · ${o.remaining} unités à ranger`}</p><p>${euros(o.unitPrice)} / unité · Livraison ${euros(o.deliveryFee)}</p></div>`; }).join('');
}
function autoOrderForm(productId) {
  const rule = state.autoOrders[productId];
  return `<h3>Déclenchement automatique</h3><p class="panel-intro">Seuil sur les rayons, la réserve et les équipements. Les commandes en cours sont prises en compte.</p><form id="auto-order-form" data-product="${productId}"><label class="auto-enable"><input id="auto-enabled" type="checkbox" ${rule.enabled ? 'checked' : ''}>Activer pour ce produit</label><div class="auto-grid"><div><label for="auto-threshold">Seuil de stock</label><input id="auto-threshold" type="number" min="0" max="600" step="1" value="${rule.threshold}" required></div><div><label for="auto-quantity">Quantité à commander</label><input id="auto-quantity" type="number" min="12" max="240" step="12" value="${rule.quantity}" required></div></div><label for="auto-supplier">Fournisseur automatique</label><select id="auto-supplier">${Object.entries(SUPPLIERS).map(([id, s]) => `<option value="${id}" ${id === rule.supplierId ? 'selected' : ''}>${s.name} · ${euros(s.deliveryFee)} de livraison</option>`).join('')}</select><button type="submit">Enregistrer le seuil</button></form><p id="auto-order-status" class="auto-status"></p>`;
}
function supplierPanel() {
  const productId = selected || PRODUCTS[0].id;
  return `<p class="panel-intro">Le prix unitaire baisse avec les quantités. Les frais sont facturés une fois par commande.</p><form class="order-form" id="order-form"><label for="order-product">Produit</label><select id="order-product">${PRODUCTS.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.name}</option>`).join('')}</select><label for="order-supplier">Fournisseur</label><select id="order-supplier"><option value="regular">Centrale Nord · 90 min · Livraison 35 €</option><option value="express">Express Marché · 30 min · Livraison 75 €</option></select><label for="order-quantity">Quantité · cartons de 12</label><input id="order-quantity" type="number" min="12" max="240" step="12" value="48" required><div id="order-breakdown"></div><div class="price-preview"><span>Total à payer</span><strong id="order-total"></strong></div><div id="quantity-tiers"></div><button class="primary" type="submit">Commander</button></form><section class="auto-order-section" id="auto-order-section">${autoOrderForm(productId)}</section><h3 class="delivery-heading">Livraisons en cours</h3><div id="deliveries">${deliveryCards()}</div>`;
}
function financePanel() {
  return `<p class="panel-intro">Le stock et la livraison sont payés à la commande. Les ventes sont encaissées en caisse.</p><div class="finance-row"><span>Trésorerie disponible</span><strong>${euros(state.money)}</strong></div><div class="finance-row"><span>Ventes aujourd’hui</span><strong>${euros(state.sales)}</strong></div><div class="finance-row"><span>Commandes et investissements</span><strong>− ${euros(state.spending)}</strong></div><div class="finance-row"><span>Salaires à la fermeture</span><strong>− ${euros(STAFF_TOTAL * 85)}</strong></div><div class="finance-row"><span>Loyer et fonctionnement</span><strong>− 160 €</strong></div><p class="finance-note">Charges quotidiennes : <strong>${euros(DAILY_COST)}</strong>. Les journées s’enchaînent sans pause ; les bilans restent consultables.</p>${state.history.length ? `<h3 class="delivery-heading">Jour ${state.history.at(-1).day}</h3><div class="finance-row"><span>Flux de trésorerie</span><strong>${euros(state.history.at(-1).net)}</strong></div><button data-view-summary>Consulter le bilan</button>` : ''}`;
}
function previewOrder() {
  if (!$('order-total')) return;
  const p = PRODUCTS.find(p => p.id === $('order-product').value), supplierId = $('order-supplier').value;
  const quantity = Number($('order-quantity').value);
  try {
    const quote = quoteOrder(p.id, quantity, supplierId);
    $('order-total').textContent = euros(quote.totalCost);
    $('order-breakdown').innerHTML = `<div class="quote-row"><span>Prix unitaire · remise ${Math.round(quote.discountRate * 100)} %</span><strong>${euros(quote.unitPrice)}</strong></div><div class="quote-row"><span>Marchandises</span><strong>${euros(quote.goodsCost)}</strong></div><div class="quote-row"><span>Frais de livraison</span><strong>${euros(quote.deliveryFee)}</strong></div><div class="quote-row"><span>Coût livré par unité</span><strong>${euros(quote.landedUnitCost)}</strong></div>${quote.landedUnitCost > p.price ? '<p class="supply-warning">Le coût livré dépasse le prix de vente de ce produit.</p>' : ''}`;
  } catch { $('order-total').textContent = '—'; $('order-breakdown').innerHTML = '<p class="panel-intro">Choisissez un multiple de 12, entre 12 et 240.</p>'; }
  $('quantity-tiers').innerHTML = `<table class="quantity-tiers"><caption>Comparer les quantités</caption><thead><tr><th>Unités</th><th>Prix / unité</th><th>Livré / unité</th></tr></thead><tbody>${[12, 48, 120, 240].map(n => { const q = quoteOrder(p.id, n, supplierId); return `<tr${n === quantity ? ' class="selected-tier"' : ''}><td>${n}</td><td>${euros(q.unitPrice)}</td><td>${euros(q.landedUnitCost)}</td></tr>`; }).join('')}</tbody></table>`;
  updateAutoOrderStatus();
}
function updateAutoOrderStatus() {
  if (!$('auto-order-status')) return;
  const productId = $('order-product').value, rule = state.autoOrders[productId];
  $('auto-order-status').textContent = rule.lastError || `${rule.enabled ? `Actif : commande de ${rule.quantity} unités au seuil de ${rule.threshold}.` : 'Déclenchement désactivé.'} Stock suivi : ${inventoryPosition(state, productId)} unités.`;
  $('auto-order-status').classList.toggle('supply-warning', !!rule.lastError);
}
function renderPanel(force = false) {
  if (tab === 'fournisseurs' && !force && $('order-form')) { $('deliveries').innerHTML = deliveryCards(); previewOrder(); return; }
  const html = tab === 'rayons' ? stockPanel() : tab === 'reserve' ? reservePanel() : tab === 'equipes' ? staffPanel() : tab === 'finances' ? financePanel() : supplierPanel();
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
  if (state.phase === 'bankrupt' && state.summary && !$('day-summary').open) showSummary();
}
function showSummary() {
  const s = state.history.at(-1); if (!s) return;
  $('summary-title').textContent = `Bilan du jour ${s.day}`;
  $('summary-body').innerHTML = `<div class="finance-row"><span>Ventes encaissées</span><strong>${euros(s.sales)}</strong></div><div class="finance-row"><span>Commandes et équipements</span><strong>− ${euros(s.spending)}</strong></div><div class="finance-row"><span>Charges de la journée</span><strong>− ${euros(s.expenses)}</strong></div><div class="summary-result ${s.net < 0 ? 'negative' : ''}">Variation de trésorerie : <strong>${euros(s.net)}</strong></div><p class="summary-message">${s.sold} clients encaissés · ${s.lost} départs sans achat.<br>${state.phase === 'bankrupt' ? 'Le magasin ne peut plus couvrir ses charges. Commencez une nouvelle partie pour essayer une autre organisation.' : `Le magasin continue au jour ${state.day}. Trésorerie actuelle : ${euros(state.money)}.`}</p>`;
  $('summary-action').textContent = state.phase === 'bankrupt' ? 'Nouvelle partie' : 'Fermer le bilan';
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
  const staff = e.target.closest('[data-staff]'), order = e.target.closest('[data-order-product]'), select = e.target.closest('[data-select]'), equipment = e.target.closest('[data-equipment]');
  if (staff) act(() => setStaff(state, staff.dataset.staff, state.staff[staff.dataset.staff] + Number(staff.dataset.delta)));
  if (order) { selected = order.dataset.orderProduct; switchTab('fournisseurs'); }
  if (select) { selected = select.dataset.select; renderPanel(true); }
  if (e.target.closest('[data-show-equipment]')) switchTab('equipes');
  if (e.target.closest('[data-view-summary]')) showSummary();
  if (equipment) act(() => selectRestockEquipment(state, equipment.dataset.equipment), 'Équipement choisi pour les prochains chargements.');
  if (e.target.closest('#buy-auto')) act(() => buyAutoCheckout(state), 'Caisse automatique installée.');
});
$('management-content').addEventListener('input', previewOrder);
$('management-content').addEventListener('change', e => {
  if (e.target.id === 'order-product') { selected = e.target.value; $('auto-order-section').innerHTML = autoOrderForm(selected); }
  previewOrder();
});
$('management-content').addEventListener('submit', e => {
  if (e.target.id === 'order-form') { e.preventDefault(); act(() => placeOrder(state, $('order-product').value, Number($('order-quantity').value), $('order-supplier').value), 'Commande envoyée au fournisseur.'); }
  if (e.target.id === 'auto-order-form') { e.preventDefault(); act(() => configureAutoOrder(state, e.target.dataset.product, { enabled: $('auto-enabled').checked, threshold: Number($('auto-threshold').value), quantity: Number($('auto-quantity').value), supplierId: $('auto-supplier').value }), 'Seuil de commande enregistré.'); }
});
$('reset-camera').addEventListener('click', () => storeScene.resetCamera());
$('summary-action').addEventListener('click', () => {
  if (state.phase === 'bankrupt') { location.reload(); return; }
  $('day-summary').close(); render();
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
  register({ name: 'read_store_status', description: 'Lire les stocks, équipes, liquidités, équipements et livraisons du magasin.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ day: state.day, time: clock(state.minute), phase: state.phase, cash: state.money, staff: { ...state.staff }, products: state.products.map(p => ({ id: p.id, shelf: p.shelf, reserve: p.reserve })), autoOrders: structuredClone(state.autoOrders), restockMode: state.restockMode, restockUnlocked: { ...state.restockUnlocked }, restockers: state.restockers.map(({ id, phase, mode, productId, load, reserved }) => ({ id, phase, mode, productId, load, reserved })), deliveries: state.orders.filter(o => o.status !== 'received').map(o => ({ ...o })) }) });
  register({ name: 'select_restock_equipment', description: 'Acheter si nécessaire puis sélectionner le matériel de l’équipe de réapprovisionnement.', inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: Object.keys(RESTOCK_EQUIPMENT) } }, required: ['mode'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Équipement invalide.'); const result = selectRestockEquipment(state, input.mode); render(); return result; } });
  register({ name: 'quote_supplier_order', description: 'Calculer le prix, la remise et la livraison sans commander.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: 12, maximum: 240, multipleOf: 12 }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, required: ['productId', 'quantity', 'supplierId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); return quoteOrder(input.productId, input.quantity, input.supplierId); } });
  register({ name: 'configure_automatic_order', description: 'Enregistrer ou activer un seuil de commande. Un seuil actif peut déclencher des achats pendant l’ouverture du magasin.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, enabled: { type: 'boolean' }, threshold: { type: 'integer', minimum: 0, maximum: 600 }, quantity: { type: 'integer', minimum: 12, maximum: 240, multipleOf: 12 }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, required: ['productId', 'enabled', 'threshold', 'quantity', 'supplierId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Seuil invalide.'); const result = configureAutoOrder(state, input.productId, input); render(); if ($('auto-order-section') && $('order-product').value === input.productId) { $('auto-order-section').innerHTML = autoOrderForm(input.productId); updateAutoOrderStatus(); } return result; } });
  register({ name: 'place_supplier_order', description: 'Commander et payer des marchandises auprès d’un fournisseur.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: 12, maximum: 240, multipleOf: 12 }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, required: ['productId', 'quantity', 'supplierId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); const result = placeOrder(state, input.productId, input.quantity, input.supplierId); render(); return { orderId: result.id, cost: result.cost, cash: state.money }; } });
  register({ name: 'set_staff_allocation', description: 'Modifier le nombre d’employés affectés aux caisses, à la réserve, à la réception ou aux rayons, dans la limite des huit employés.', inputSchema: { type: 'object', properties: { role: { type: 'string', enum: ['checkout', 'shelves', 'reserve', 'receiving'] }, amount: { type: 'integer', minimum: 0, maximum: 8 } }, required: ['role', 'amount'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Affectation invalide.'); const staff = setStaff(state, input.role, input.amount); render(); return { staff }; } });
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
function frame(now) {
  const delta = Math.min(250, now - lastTime); lastTime = now;
  if (state.phase === 'open' && state.speed) {
    pendingMinutes += delta / 1000 * 3 * state.speed;
    if (pendingMinutes >= 1) { const minutes = Math.floor(pendingMinutes); pendingMinutes -= minutes; advance(state, minutes); }
  }
  storeScene.update(delta, now, selected, pendingMinutes);
  if (now - lastRender >= 300) { render(); lastRender = now; }
  requestAnimationFrame(frame);
}
render(); requestAnimationFrame(frame);
