import { createGame, PRODUCTS, SUPPLIERS, EVENTS, staffCount, dailyCosts, checkoutDailyCosts, STAFF_DAILY_WAGE, STORE_EXPANSIONS, checkoutCount, expandStore, discardReserve, setDirectorSalary, reinvestPersonalCash, payTaxes, setAutomaticTaxPayment, RESTOCK_EQUIPMENT, SHELF_UNITS_PER_LEVEL, OUTSIDE_PALLET_CAPACITY, outsidePallets, outsideSlotsUsed, restockInTransit, selectRestockEquipment, requestRestock, quoteOrder, queueEveningOrder, removeEveningOrder, quoteEveningBasket, currentEvent, clock, setStaff, placeOrder, buyAutoCheckout, openStore, advance } from './engine.js';

import { createStoreScene } from './scene.js';

const state = createGame();
const $ = id => document.getElementById(id);
const sectionMarkup = new WeakMap();
function updateSection(id, html) {
  const element = $(id);
  if (sectionMarkup.get(element) === html) return;
  element.innerHTML = html; sectionMarkup.set(element, html);
}
const euros = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
let tab = 'rayons', selected = null, lastPanel = '', pendingMinutes = 0, lastTime = performance.now(), lastRender = 0, noticeTimer;
const canvas = $('store-map');
const viewNames = { rayons: 'Rayons', reserve: 'Réserve', caisses: 'Caisses', equipes: 'Équipes', fournisseurs: 'Commandes et livraisons', finances: 'Finances' };
const roleNames = { checkout: 'Encaissement', shelves: 'Mise en rayon', receiving: 'Déchargement des livraisons' };
const storeScene = createStoreScene(canvas, state, selection => {
  selected = selection.productId || null; switchTab(selection.view);
  if (selection.role) $('panel-context').textContent = roleNames[selection.role];
});

function notice(text, error = false) {
  clearTimeout(noticeTimer); $('notice').textContent = text; $('notice').classList.toggle('error', error); $('notice').hidden = false;
  noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5000);
}
function act(action, message) {
  try { const result = action(); if (message) notice(message); render(true); return result; }
  catch (error) { notice(error.message, true); return null; }
}
function switchTab(name) {
  if (!Object.hasOwn(viewNames, name)) throw new Error('Vue inconnue.');
  tab = name; lastPanel = '';
  $('management-panel').hidden = false; $('journal-panel').hidden = true;
  $('panel-heading').textContent = selected && ['rayons', 'reserve'].includes(tab) ? state.products.find(p => p.id === selected).name : viewNames[tab];
  $('panel-context').textContent = tab === 'rayons' ? 'STOCK EN RAYON' : tab === 'reserve' ? 'STOCK PAR PRODUIT' : 'DIRECTION DU MAGASIN';
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  document.querySelectorAll('[data-open]').forEach(b => { b.classList.toggle('active', b.dataset.open === tab); b.setAttribute('aria-expanded', String(b.dataset.open === tab)); });
  $('journal-toggle').setAttribute('aria-expanded', 'false'); $('event-toggle').setAttribute('aria-expanded', 'false');
  $('management-content').setAttribute('aria-labelledby', `tab-${tab}`); renderPanel(true);
  $(`tab-${tab}`).scrollIntoView({ block: 'nearest', inline: 'nearest' });
  $('management-content').scrollTop = 0;
}
function closePanel() {
  $('management-panel').hidden = true; selected = null;
  document.querySelectorAll('[data-open]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-expanded', 'false'); });
  canvas.focus({ preventScroll: true });
}
function toggleJournal() {
  const open = $('journal-panel').hidden; closePanel(); $('journal-panel').hidden = !open;
  $('journal-toggle').setAttribute('aria-expanded', String(open)); $('event-toggle').setAttribute('aria-expanded', String(open));
}
const productScope = () => selected ? state.products.filter(p => p.id === selected) : state.products;
const allProductsButton = () => selected ? '<button class="tiny-button panel-back" data-all-products>Tous les produits</button>' : '';
function stockPanel() {
  const equipment = RESTOCK_EQUIPMENT[state.restockMode];
  return `${allProductsButton()}${productScope().map(p => {
    const jobs = state.restockers.filter(w => w.productId === p.id && w.phase !== 'returning');
    const incoming = jobs.reduce((sum, w) => sum + w.load + w.reserved, 0), available = p.reserve - jobs.reduce((sum, w) => sum + w.reserved, 0);
    const pending = state.restockRequests.includes(p.id), blocked = p.shelf + incoming >= p.capacity || available <= 0 || pending || !['preparation', 'open'].includes(state.phase);
    return `<div class="shelf-card ${selected === p.id ? 'selected-shelf' : ''}"><div class="shelf-title"><button data-select="${p.id}"><span class="product-color" style="background:${p.color}"></span>${p.name}</button><span class="stock-level ${p.shelf < 12 ? 'low' : ''}">${p.shelf} / ${p.capacity}</span></div><div class="stock-track"><span style="width:${p.shelf / p.capacity * 100}%;background:${p.shelf < 12 ? '#e78e5a' : p.color}"></span></div><div class="shelf-meta"><span>En réserve : ${p.reserve} · Vente : ${euros(p.price)}</span><button class="tiny-button" data-fill-product="${p.id}" ${blocked ? 'disabled' : ''}>${pending ? 'Demandé' : 'Réapprovisionner'}</button><button class="tiny-button" data-view-reserve="${p.id}">Voir la réserve</button></div>${incoming ? `<p class="restock-incoming">${incoming} unités en réapprovisionnement</p>` : ''}</div>`;
  }).join('')}<div class="reserve-card"><strong>Réapprovisionnement</strong><p>${state.staff.shelves} employés : chargement, transport et mise en rayon.<br>${equipment.name} · ${equipment.capacity} unités par chargement.</p><div class="restock-overview"><span>${restockInTransit(state)} unités transportées</span><button class="tiny-button" data-show-equipment>Équipement</button></div></div>${!state.staff.shelves ? '<p class="supply-warning">Affectez au moins un employé à la mise en rayon pour charger et remplir les rayons.</p>' : ''}${expansionPanel('shelves')}`;
}
function equipmentPanel() {
  return `<section class="equipment-section" aria-label="Équipement de réapprovisionnement"><h3>Réserve → rayons</h3><p class="panel-intro">Un employé par équipement. Les achats équipent l’équipe ; les trajets en cours gardent leur matériel jusqu’au retour.</p>${Object.entries(RESTOCK_EQUIPMENT).map(([mode, equipment]) => {
    const unlocked = state.restockUnlocked[mode], active = state.restockMode === mode;
    const blocked = active || !['preparation', 'open'].includes(state.phase) || (!unlocked && (state.money < equipment.cost || !state.restockUnlocked[equipment.requires]));
    const button = active ? 'En service' : unlocked ? 'Utiliser' : !state.restockUnlocked[equipment.requires] ? 'Chariot moyen requis' : `Équiper · ${euros(equipment.cost)}`;
    return `<div class="equipment-card ${active ? 'selected-equipment' : ''}"><div><strong>${equipment.name}</strong><p>${equipment.capacity} unités par trajet · ${mode === 'small' ? 'Inclus au départ' : mode === 'medium' ? 'Équipe équipée pour 1 200 €' : 'Équipe équipée pour 3 600 €'}</p></div><button class="tiny-button" data-equipment="${mode}" ${blocked ? 'disabled' : ''}>${button}</button></div>`;
  }).join('')}</section>`;
}
function reservePanel() {
  return `${allProductsButton()}${productScope().map(p => { const reserved = state.restockers.filter(w => w.productId === p.id).reduce((sum, w) => sum + w.reserved, 0), outside = outsidePallets(state).filter(line => line.order.productId === p.id); return `<div class="warehouse-product"><span class="product-color" style="background:${p.color}"></span><div><strong>${p.name}</strong><p>${reserved} unités réservées aux chargements</p>${outside.length ? `<p class="outside-stock">Dehors : ${outside.length} palette${outside.length > 1 ? 's' : ''} · ${outside.reduce((sum, line) => sum + line.pallet.remaining, 0)} unités</p>` : ''}</div><strong>${p.reserve}<small>/ ${p.reserveCapacity} en réserve</small></strong><button class="tiny-button warehouse-order" data-order-product="${p.id}" aria-label="Commander pour ${p.name}">Commander</button>${discardControls(p, reserved)}</div>`; }).join('')}<p class="panel-intro">Les employés de mise en rayon prennent eux-mêmes les articles dans leur emplacement et chargent leur chariot.</p>${expansionPanel('reserve')}`;
}
function checkoutPanel() {
  const queue = state.customers.filter(c => c.stage === 'queue').length;
  return `<div class="checkout-status">${Array.from({ length: checkoutCount(state) }, (_, i) => `<span class="checkout-lane"><i class="lane-light ${state.phase === 'open' && i < state.staff.checkout ? 'open' : ''}" aria-hidden="true"></i>Caisse ${i + 1} · ${state.phase === 'open' && i < state.staff.checkout ? 'ouverte' : 'fermée'}</span>`).join('')}</div><div class="staff-row"><div><strong>Encaissement</strong><p>Une caisse par employé, jusqu’à ${checkoutCount(state)}. Chaque caisse installée coûte 5 € / jour.</p></div><div class="stepper"><button data-staff="checkout" data-delta="-1" aria-label="Retirer un employé aux caisses" ${state.staff.checkout === 0 ? 'disabled' : ''}>−</button><strong>${state.staff.checkout}</strong><button data-staff="checkout" data-delta="1" aria-label="Ajouter un employé aux caisses">+</button></div></div><div class="finance-row"><span>En attente de caisse</span><strong>${queue} clients</strong></div><div class="finance-row"><span>Clients encaissés aujourd’hui</span><strong>${state.sold}</strong></div><div class="finance-row"><span>Départs sans achat</span><strong>${state.lost}</strong></div><div class="investment"><h3>Caisse automatique</h3><p>Un employé aux caisses reste nécessaire pour la superviser. Fonctionnement : 8 € / jour.</p><button id="buy-auto" ${state.autoCheckout || state.money < 3500 || !['preparation', 'open'].includes(state.phase) ? 'disabled' : ''}>${state.autoCheckout ? 'Caisse automatique installée' : 'Installer · 3 500 €'}</button></div>${expansionPanel('checkout')}`;
}
function staffPanel() {
  const roles = [['checkout', 'Encaissement', `Une caisse par employé, jusqu’à ${checkoutCount(state)}. 5 € / jour par caisse installée.`], ['shelves', 'Mise en rayon', 'Prend les articles en réserve, charge son chariot et remplit les rayons.'], ['receiving', 'Déchargement des livraisons', 'Transporte une palette entière au transpalette, puis range ses cartons par produit.']];
  return `<p class="panel-intro">Choisissez librement vos effectifs par équipe. Chaque employé coûte 85 € par jour, facturés à la fermeture.</p>${roles.map(([role, name, description]) => `<div class="staff-row"><div><strong>${name}</strong><p>${description}</p></div><div class="stepper"><button data-staff="${role}" data-delta="-1" aria-label="Retirer un employé : ${name}" ${state.staff[role] === 0 ? 'disabled' : ''}>−</button><strong>${state.staff[role]}</strong><button data-staff="${role}" data-delta="1" aria-label="Ajouter un employé : ${name}">+</button></div></div>`).join('')}<p class="staff-free">${staffCount(state)} employés · Salaires : ${euros(staffCount(state) * STAFF_DAILY_WAGE)} / jour</p>${equipmentPanel()}<div class="investment"><h3>Caisse automatique</h3><p>Renforce l’encaissement. Un employé aux caisses doit rester disponible pour la superviser. Fonctionnement : 8 € / jour.</p><button id="buy-auto" ${state.autoCheckout || state.money < 3500 || ['closed', 'bankrupt'].includes(state.phase) ? 'disabled' : ''}>${state.autoCheckout ? 'Caisse automatique installée' : 'Installer · 3 500 €'}</button></div>`;
}
function deliveryCards() {
  const shipments = state.shipments.filter(t => t.phase !== 'complete').sort((a, b) => a.eta - b.eta || a.id - b.id);
  if (!shipments.length) return '<p class="empty-delivery">Aucun camion en cours.</p>';
  const names = { waiting: 'En attente d’un quai libre', positioning: 'Manœuvre d’alignement', reversing: 'Marche arrière', docked: 'Déchargement au transpalette', departing: 'Camion en départ' };
  return shipments.map(t => {
    const cargo = t.pallets.map(ref => ({ order: state.orders.find(o => o.id === ref.orderId), index: ref.palletIndex }));
    const remaining = cargo.filter(({ order, index }) => ['dock', 'reserved'].includes(order.pallets[index].status)).reduce((n, { order, index }) => n + order.pallets[index].remaining, 0);
    const carried = state.receivers.filter(w => state.orders.find(o => o.id === w.orderId)?.pallets[w.palletIndex]?.shipmentId === t.id).reduce((n, w) => n + w.load, 0);
    const contents = [...new Set(cargo.map(c => c.order.productId))].map(id => {
      const product = state.products.find(p => p.id === id);
      const quantity = cargo.filter(c => c.order.productId === id).reduce((sum, { order, index }) => sum + order.pallets[index].quantity, 0);
      return `<li><span>${product.name}</span><strong>${quantity} unités</strong></li>`;
    }).join('');
    const blocked = t.phase === 'docked' && cargo.some(({ order, index }) => { const pallet = order.pallets[index], p = state.products.find(p => p.id === order.productId); return pallet.status === 'dock' && p.reserveCapacity - p.reserve < pallet.remaining; });
    return `<div class="delivery-card"><strong>${t.mode === 'grouped' ? 'Groupage du soir' : 'Livraison spécifique'} · ${t.pallets.length} palette${t.pallets.length > 1 ? 's' : ''}</strong><p>${t.supplier}</p><ul class="delivery-contents" aria-label="Contenu du camion">${contents}</ul><p>${t.phase === 'enroute' ? `Arrivée dans ${Math.max(0, t.eta - state.elapsed)} min` : `${names[t.phase]}${t.bay !== null ? ` · Quai ${t.bay + 1}` : ''}`}</p>${t.phase === 'docked' ? `<p>${remaining} unités dans le camion · ${carried} en transport ou rangement</p>` : ''}${blocked ? `<p class="supply-warning">${outsideSlotsUsed(state) >= OUTSIDE_PALLET_CAPACITY ? 'Tampon extérieur plein. Libérez le stock du produit pour poursuivre.' : 'Stock saturé : les palettes seront déposées dans le tampon extérieur.'}</p>` : ''}</div>`;
  }).join('');
}
function outsidePanel() {
  const outside = outsidePallets(state);
  return `<h3 class="delivery-heading">Tampon extérieur · ${outside.length} / ${OUTSIDE_PALLET_CAPACITY} palettes</h3><p class="panel-intro">${outsideSlotsUsed(state) - outside.length} place(s) réservée(s) aux trajets. Les palettes attendent dehors si l’emplacement du produit est plein. Le déchargement continue ; les employés les rangent dès qu’une palette entière peut entrer.</p>${outside.length ? `<ul class="delivery-contents">${[...new Set(outside.map(line => line.order.productId))].map(id => { const lines = outside.filter(line => line.order.productId === id); return `<li><span>${PRODUCTS.find(p => p.id === id).name} · ${lines.length} palette(s)</span><strong>${lines.reduce((sum, line) => sum + line.pallet.remaining, 0)} unités</strong></li>`; }).join('')}</ul>` : ''}`;
}
function eveningBasketPanel() {
  const quote = quoteEveningBasket(state);
  return `<h3 class="delivery-heading">Commande groupée · envoi à 20 h</h3>${quote.groups.length ? quote.groups.map(group => `<div class="evening-group"><strong>${group.supplier}</strong>${group.lines.map(line => `<div class="evening-line"><span>${PRODUCTS.find(p => p.id === line.productId).short} · ${line.quantity} unités</span><button class="tiny-button" data-remove-evening="${line.productId}" aria-label="Retirer ${PRODUCTS.find(p => p.id === line.productId).name} du groupage">Retirer</button></div>`).join('')}<p>Marchandises ${euros(group.goodsCost)} + livraison mutualisée ${euros(group.deliveryFee)}</p></div>`).join('') + `<div class="price-preview"><span>À payer ce soir</span><strong>${euros(quote.totalCost)}</strong></div>` : '<p class="panel-intro">Panier vide. Ajoutez les produits depuis leur stock en réserve. Aucun achat n’est déclenché sans article prévu.</p>'}${state.eveningError ? `<p class="supply-warning">${state.eveningError}</p>` : ''}`;
}
const orderMode = () => document.querySelector('input[name="order-mode"]:checked')?.value || 'grouped';
const orderQuantity = () => Number(document.querySelector('input[name="order-quantity"]:checked')?.value);
function quantityChoices(value = 48) {
  return `<fieldset class="quantity-picker"><legend>Quantité · unités</legend><div class="quantity-grid">${[12, 24, 48, 120, 240].map(n => `<label class="quantity-tile"><input type="radio" name="order-quantity" value="${n}" ${n === value ? 'checked' : ''} required aria-label="${n} unités"><span class="quantity-face"><strong>${n}</strong><small>${n / 12} carton${n > 12 ? 's' : ''}</small></span></label>`).join('')}</div></fieldset>`;
}
function supplierPanel() {
  const productId = selected || PRODUCTS[0].id;
  return `<button class="tiny-button dock-camera" data-focus-dock>Voir les quais</button><section class="delivery-list"><h3 class="delivery-heading">Camions et livraisons en cours</h3><div id="deliveries">${deliveryCards()}</div></section><section id="outside-stock">${outsidePanel()}</section><section id="evening-basket">${eveningBasketPanel()}</section><h3 class="delivery-heading">Commander pour la réserve</h3><form class="order-form" id="order-form"><fieldset class="delivery-mode-picker"><legend>Type de commande</legend><label><input type="radio" name="order-mode" value="grouped" checked><span><strong>Groupée ce soir</strong><small>Envoi à 20 h · frais mutualisés</small></span></label><label><input type="radio" name="order-mode" value="flash"><span><strong>Flash</strong><small>Commande immédiate · 30 min</small></span></label></fieldset><label for="order-product">Produit</label><select id="order-product">${PRODUCTS.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.name}</option>`).join('')}</select><label for="order-supplier">Fournisseur</label><select id="order-supplier"><option value="regular">Centrale Nord · 90 min · Livraison 35 €</option><option value="express">Express Marché · 30 min · Livraison 75 €</option></select>${quantityChoices()}<div id="order-breakdown"></div><div class="price-preview"><span id="order-total-label">Panier du soir après ce choix</span><strong id="order-total"></strong></div><div id="quantity-tiers"></div><button class="primary" type="submit">Ajouter au groupage du soir</button><p class="panel-intro" id="order-mode-hint"></p></form>`;
}
function expansionPanel(zone) {
  const level = state.expansions[zone], cost = STORE_EXPANSIONS[zone].costs[level];
  const benefit = zone === 'checkout' ? `${checkoutCount(state) + 2} caisses disponibles` : zone === 'shelves' ? `${state.products[0].capacity + SHELF_UNITS_PER_LEVEL} articles par rayon` : `${state.products[0].reserveCapacity + 50} unités par famille de produits`;
  return `<div class="investment"><h3>Agrandir · ${STORE_EXPANSIONS[zone].name}</h3><p>${cost === undefined ? 'Agrandissement maximal atteint.' : benefit}</p><button data-expand="${zone}" ${cost === undefined || state.money < cost || !['preparation', 'open'].includes(state.phase) ? 'disabled' : ''}>${cost === undefined ? 'Zone agrandie au maximum' : `Agrandir · ${euros(cost)}`}</button></div>`;
}
function discardControls(product, reserved) {
  const available = product.reserve - reserved;
  if (available <= 0) return '';
  const quantities = [...new Set([1, 12, 24, 48, available])].filter(n => n <= available).sort((a, b) => a - b);
  return `<details class="discard-controls" data-product="${product.id}"><summary>Jeter du stock</summary><p>Sans remboursement. Les articles déjà réservés aux chargements sont protégés.</p><div><select id="discard-quantity-${product.id}" aria-label="Quantité à jeter : ${product.name}">${quantities.map(n => `<option value="${n}">${n === available ? `Tout le stock disponible · ${n}` : `${n} unité${n > 1 ? 's' : ''}`}</option>`).join('')}</select><button data-discard="${product.id}">Jeter</button></div></details>`;
}
function financePanel() {
  const taxes = state.vatDue + state.profitTaxDue, salaryOptions = [...new Set([0, 100, 200, 300, 500, 1000, state.directorSalary])].sort((a, b) => a - b);
  return `<div class="finance-row"><span>Trésorerie du magasin</span><strong>${euros(state.money)}</strong></div><div class="finance-row"><span>Ventes TTC aujourd’hui</span><strong>${euros(state.sales)}</strong></div><div class="finance-row"><span>Achats et investissements TTC</span><strong>− ${euros(state.spending)}</strong></div><div class="finance-row"><span>Salaires de l’équipe</span><strong>− ${euros(staffCount(state) * STAFF_DAILY_WAGE)}</strong></div><div class="finance-row"><span>Fonctionnement des caisses</span><strong>− ${euros(checkoutDailyCosts(state))}</strong></div><p class="panel-intro">${checkoutCount(state)} caisses × 5 € / jour${state.autoCheckout ? ' + caisse automatique : 8 € / jour' : ''}, même fermées. Les salaires sont facturés séparément.</p><div class="finance-row"><span>Loyer et fonctionnement</span><strong>− 160 €</strong></div><section class="personal-account"><h3>Compte personnel du directeur</h3><div class="finance-row"><span>Solde personnel</span><strong>${euros(state.personalCash)}</strong></div><label for="director-salary">Salaire à la fermeture</label><select id="director-salary">${salaryOptions.map(n => `<option value="${n}" ${n === state.directorSalary ? 'selected' : ''}>${n ? `${euros(n)} / jour` : 'Aucun salaire versé'}</option>`).join('')}</select><p class="panel-intro">Versé depuis le magasin, dans la limite de sa trésorerie.</p>${state.personalCash > 0 ? `<label for="personal-reinvest">Réinvestir dans le magasin</label><div class="personal-transfer"><select id="personal-reinvest">${[...new Set([100, 250, 500, state.personalCash])].filter(n => n <= state.personalCash).sort((a, b) => a - b).map(n => `<option value="${n}">${euros(n)}</option>`).join('')}</select><button data-reinvest>Réinvestir</button></div>` : ''}${state.personalTransactions.length ? `<details><summary>Mouvements du compte</summary>${state.personalTransactions.slice(0, 6).map(t => `<div class="finance-row"><span>Jour ${t.day} · ${t.label}</span><strong>${t.amount > 0 ? '+' : '−'} ${euros(Math.abs(t.amount))}</strong></div>`).join('')}</details>` : ''}</section><section class="tax-account"><h3>TVA et impôt</h3><p class="panel-intro">TVA de 20 % incluse dans les ventes et les achats. Le crédit de TVA est reporté. L’impôt du jeu est de 20 % sur le résultat quotidien positif hors TVA, après achats, investissements, charges et salaire du directeur.</p><div class="finance-row"><span>TVA collectée aujourd’hui</span><strong>${euros(state.vatCollected)}</strong></div><div class="finance-row"><span>TVA déductible aujourd’hui</span><strong>${euros(state.vatDeductible)}</strong></div><div class="finance-row"><span>Crédit de TVA reporté</span><strong>${euros(state.vatCredit)}</strong></div><div class="finance-row"><span>TVA à payer</span><strong>${euros(state.vatDue)}</strong></div><div class="finance-row"><span>Impôt à payer</span><strong>${euros(state.profitTaxDue)}</strong></div><label class="auto-enable"><input id="auto-pay-taxes" type="checkbox" ${state.autoPayTaxes ? 'checked' : ''}>Payer automatiquement à la fermeture</label><button data-pay-taxes ${taxes <= 0 || state.money <= 0 ? 'disabled' : ''}>Payer les taxes · ${euros(taxes)}</button></section>${state.history.length ? `<h3 class="delivery-heading">Bilan du jour ${state.history.at(-1).day}</h3><div class="finance-row"><span>Variation de trésorerie</span><strong>${euros(state.history.at(-1).net)}</strong></div><button data-view-summary>Consulter le bilan</button>` : ''}`;
}
function previewOrder() {
  if (!$('order-total')) return;
  const p = PRODUCTS.find(p => p.id === $('order-product').value), supplierId = $('order-supplier').value;
  const quantity = orderQuantity();
  try {
    const quote = quoteOrder(p.id, quantity, supplierId);
    const grouped = orderMode() === 'grouped';
    const basket = { eveningBasket: [...state.eveningBasket.filter(line => line.productId !== p.id), { productId: p.id, quantity, supplierId }] };
    $('order-total').textContent = euros(grouped ? quoteEveningBasket(basket).totalCost : quote.totalCost);
    $('order-total-label').textContent = grouped ? 'Panier du soir après ce choix' : 'À payer maintenant';
    $('order-supplier').disabled = !grouped;
    $('order-form').querySelector('button[type="submit"]').textContent = grouped ? state.eveningBasket.some(line => line.productId === p.id) ? 'Mettre à jour le groupage du soir' : 'Ajouter au groupage du soir' : 'Commander la livraison flash';
    $('order-mode-hint').textContent = grouped ? 'Paiement et envoi à 20 h. Un lot par produit : un nouveau choix remplace sa quantité prévue. Livraison au prochain jour de jeu, après le délai du fournisseur.' : 'Paiement immédiat. Le camion arrive après 30 minutes, puis manœuvre et décharge au quai.';
    $('order-breakdown').innerHTML = `<div class="quote-row"><span>Prix unitaire TTC · remise ${Math.round(quote.discountRate * 100)} %</span><strong>${euros(quote.unitPrice)}</strong></div><div class="quote-row"><span>Marchandises</span><strong>${euros(quote.goodsCost)}</strong></div><div class="quote-row"><span>${grouped ? 'Livraison mutualisée par fournisseur' : 'Frais de livraison'}</span><strong>${euros(quote.deliveryFee)}</strong></div><div class="quote-row"><span>${grouped ? 'Coût livré si commandé seul' : 'Coût livré par unité'}</span><strong>${euros(quote.landedUnitCost)}</strong></div>${quote.landedUnitCost > p.price ? '<p class="supply-warning">Le coût livré dépasse le prix de vente de ce produit.</p>' : ''}`;
  } catch { $('order-total').textContent = '—'; $('order-breakdown').innerHTML = '<p class="panel-intro">Choisissez un multiple de 12, entre 12 et 240.</p>'; }
  $('quantity-tiers').innerHTML = `<table class="quantity-tiers"><caption>Comparer les quantités · commande seule</caption><thead><tr><th>Unités</th><th>Prix / unité</th><th>Livré / unité</th></tr></thead><tbody>${[12, 24, 48, 120, 240].map(n => { const q = quoteOrder(p.id, n, supplierId); return `<tr${n === quantity ? ' class="selected-tier"' : ''}><td>${n}</td><td>${euros(q.unitPrice)}</td><td>${euros(q.landedUnitCost)}</td></tr>`; }).join('')}</tbody></table>`;
}
function renderPanel(force = false) {
  if ($('management-panel').hidden) return;
  if (tab === 'fournisseurs' && !force && $('order-form')) {
    updateSection('deliveries', deliveryCards());
    updateSection('evening-basket', eveningBasketPanel());
    updateSection('outside-stock', outsidePanel());
    previewOrder(); return;
  }
  const html = tab === 'rayons' ? stockPanel() : tab === 'reserve' ? reservePanel() : tab === 'caisses' ? checkoutPanel() : tab === 'equipes' ? staffPanel() : tab === 'finances' ? financePanel() : supplierPanel();
  if (force || html !== lastPanel) {
    const content = $('management-content'), preserve = !!lastPanel;
    const values = preserve ? [...content.querySelectorAll('select[id]')].map(input => [input.id, input.value]) : [];
    const openDetails = new Set(preserve ? [...content.querySelectorAll('details[open]')].map(d => d.dataset.product || d.querySelector('summary').textContent) : []);
    const focusId = content.contains(document.activeElement) ? document.activeElement.id : null;
    content.innerHTML = html; lastPanel = html;
    for (const [id, value] of values) { const input = $(id); if (input && [...input.options].some(option => option.value === value)) input.value = value; }
    content.querySelectorAll('details').forEach(d => { d.open = openDetails.has(d.dataset.product || d.querySelector('summary').textContent); });
    if (focusId && $(focusId)) $(focusId).focus({ preventScroll: true });
  }
  if (tab === 'fournisseurs') previewOrder();
}
function render() {
  $('day-label').textContent = `Jour ${state.day}`; $('clock').textContent = clock(state.minute);
  $('phase-label').textContent = { preparation: 'Préparation', open: state.speed ? 'Ouvert' : 'En pause', closed: 'Fermé', bankrupt: 'Trésorerie épuisée' }[state.phase];
  $('money').textContent = euros(state.money); $('money').classList.toggle('negative', state.money < 0);
  $('sales').textContent = euros(state.sales);
  $('customers').textContent = state.customers.length;
  const queueCount = state.customers.filter(c => c.stage === 'queue').length;
  $('satisfaction').textContent = `${Math.round(state.satisfaction)} %`;
  $('customers').parentElement.title = `${queueCount} en attente de caisse · ${state.sold} clients encaissés`;
  $('money').parentElement.title = `Charges quotidiennes : ${euros(dailyCosts(state))}`;
  $('satisfaction').parentElement.title = `${state.lost} départs sans achat`;
  const empty = state.products.filter(p => p.shelf < 12).length;
  $('store-status').textContent = state.phase === 'preparation' ? 'Préparez les commandes et les équipes avant l’ouverture.' : state.phase === 'open' ? empty ? `${empty} rayon${empty > 1 ? 's' : ''} à court de produits. Vérifiez la réserve et les livraisons.` : queueCount >= 8 ? 'Les files s’allongent. Renforcez les équipes aux caisses.' : 'Le magasin est ouvert. Cliquez sur un rayon pour suivre son stock.' : 'La journée est terminée. Consultez le bilan.';
  document.querySelectorAll('[data-speed]').forEach(b => { b.classList.toggle('active', Number(b.dataset.speed) === state.speed); b.disabled = state.phase !== 'open'; });
  $('main-action').textContent = { preparation: 'Ouvrir le magasin', open: state.speed ? 'Mettre en pause' : 'Reprendre la journée', closed: 'Voir le bilan', bankrupt: 'Voir le bilan' }[state.phase];
  const event = currentEvent(state); $('event-title').textContent = event.name; $('event-hint').textContent = event.hint;
  $('event-next').textContent = `Demain : ${EVENTS[state.day % EVENTS.length].name} · ${Math.round(EVENTS[state.day % EVENTS.length].factor * 100)} % d’affluence habituelle`;
  $('log').innerHTML = state.log.slice(0, 12).map(item => `<li class="${item.kind}"><time>${item.time}</time><span>${item.text}</span></li>`).join('');
  const transit = state.shipments.filter(t => ['enroute', 'waiting', 'positioning', 'reversing'].includes(t.phase)).length, unloading = state.shipments.filter(t => ['docked', 'departing'].includes(t.phase)).length, planned = state.eveningBasket.length, outside = outsidePallets(state).length;
  $('delivery-status').hidden = transit + unloading + planned + outside === 0;
  $('delivery-status').innerHTML = `<strong>${transit + unloading ? `${transit + unloading} livraison${transit + unloading > 1 ? 's' : ''}` : outside ? `${outside} palette${outside > 1 ? 's' : ''} dehors` : 'Groupage ce soir'}</strong><span>${transit} en route / attente · ${unloading} au quai${planned ? ` · ${planned} produits prévus ce soir` : ''}${outside && transit + unloading ? ` · ${outside} palettes dehors` : ''}</span>`;
  renderPanel();
  if (state.phase === 'bankrupt' && state.summary && !$('day-summary').open) showSummary();
}
function showSummary() {
  const s = state.history.at(-1); if (!s) return;
  $('summary-title').textContent = `Bilan du jour ${s.day}`;
  $('summary-body').innerHTML = `<div class="finance-row"><span>Ventes encaissées TTC</span><strong>${euros(s.sales)}</strong></div>${s.contribution ? `<div class="finance-row"><span>Apport du compte personnel</span><strong>+ ${euros(s.contribution)}</strong></div>` : ''}<div class="finance-row"><span>Achats et investissements TTC</span><strong>− ${euros(s.spending)}</strong></div><div class="finance-row"><span>Charges de fonctionnement</span><strong>− ${euros(s.expenses - s.salaryPaid)}</strong></div><div class="finance-row"><span>Salaire versé au directeur</span><strong>− ${euros(s.salaryPaid)}</strong></div><div class="finance-row"><span>Taxes effectivement payées</span><strong>− ${euros(s.taxPaid)}</strong></div><p class="finance-note">Taxes calculées pour ce jour : TVA ${euros(s.vatCharged)} · impôt ${euros(s.profitTax)}. Les montants impayés restent dans Finances.</p><div class="summary-result ${s.net < 0 ? 'negative' : ''}">Variation de trésorerie : <strong>${euros(s.net)}</strong></div><p class="summary-message">${s.sold} clients encaissés · ${s.lost} départs sans achat.<br>${state.phase === 'bankrupt' ? 'Le magasin ne peut plus couvrir ses charges. Commencez une nouvelle partie pour essayer une autre organisation.' : `Le magasin continue au jour ${state.day}. Trésorerie actuelle : ${euros(state.money)}.`}</p>`;
  $('summary-action').textContent = state.phase === 'bankrupt' ? 'Nouvelle partie' : 'Fermer le bilan';
  $('day-summary').showModal();
}
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { if (b.dataset.tab !== tab) selected = null; switchTab(b.dataset.tab); }));
document.querySelectorAll('[data-open]').forEach(b => {
  b.setAttribute('aria-controls', 'management-panel'); b.setAttribute('aria-expanded', 'false');
  b.addEventListener('click', () => { selected = null; switchTab(b.dataset.open); });
});
$('close-panel').addEventListener('click', closePanel);
$('journal-toggle').addEventListener('click', toggleJournal); $('event-toggle').addEventListener('click', toggleJournal);
$('close-journal').addEventListener('click', toggleJournal);
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
  const expansion = e.target.closest('[data-expand]'), discard = e.target.closest('[data-discard]');
  if (expansion) act(() => expandStore(state, expansion.dataset.expand), 'Agrandissement terminé.');
  if (discard) act(() => discardReserve(state, discard.dataset.discard, Number($(`discard-quantity-${discard.dataset.discard}`).value)), 'Stock jeté.');
  if (e.target.closest('[data-reinvest]')) act(() => reinvestPersonalCash(state, Number($('personal-reinvest').value)), 'Argent réinvesti dans le magasin.');
  const removeEvening = e.target.closest('[data-remove-evening]');
  if (removeEvening) act(() => removeEveningOrder(state, removeEvening.dataset.removeEvening), 'Produit retiré du groupage.');
  if (e.target.closest('[data-focus-dock]')) { storeScene.focusDocks(); closePanel(); }
  if (e.target.closest('[data-pay-taxes]')) act(() => payTaxes(state), 'Paiement des taxes effectué.');
  const staff = e.target.closest('[data-staff]'), order = e.target.closest('[data-order-product]'), select = e.target.closest('[data-select]'), equipment = e.target.closest('[data-equipment]');
  if (staff) act(() => setStaff(state, staff.dataset.staff, state.staff[staff.dataset.staff] + Number(staff.dataset.delta)));
  if (order) { selected = order.dataset.orderProduct; switchTab('fournisseurs'); }
  if (select) { selected = select.dataset.select; switchTab('rayons'); }
  const fill = e.target.closest('[data-fill-product]'), reserve = e.target.closest('[data-view-reserve]');
  if (fill) {
    const result = act(() => requestRestock(state, fill.dataset.fillProduct));
    if (result) notice(result.waitingForStaff ? 'Remplissage demandé. Affectez un employé à la mise en rayon.' : 'Remplissage prioritaire demandé. Les employés prépareront puis transporteront les produits.');
  }
  if (reserve) { selected = reserve.dataset.viewReserve; switchTab('reserve'); }
  if (e.target.closest('[data-all-products]')) { selected = null; switchTab(tab); }
  if (e.target.closest('[data-show-equipment]')) switchTab('equipes');
  if (e.target.closest('[data-view-summary]')) showSummary();
  if (equipment) act(() => selectRestockEquipment(state, equipment.dataset.equipment), 'Équipement choisi pour les prochains chargements.');
  if (e.target.closest('#buy-auto')) act(() => buyAutoCheckout(state), 'Caisse automatique installée.');
});
$('management-content').addEventListener('input', previewOrder);
$('management-content').addEventListener('change', e => {
  if (e.target.id === 'director-salary') act(() => setDirectorSalary(state, Number(e.target.value)), 'Salaire du directeur enregistré.');
  if (e.target.id === 'auto-pay-taxes') act(() => setAutomaticTaxPayment(state, e.target.checked));
  if (e.target.id === 'order-product') selected = e.target.value;
  if (e.target.name === 'order-mode') $('order-supplier').value = e.target.value === 'flash' ? 'express' : 'regular';
  previewOrder();
});
$('management-content').addEventListener('submit', e => {
  if (e.target.id === 'order-form') { e.preventDefault(); const grouped = orderMode() === 'grouped'; act(() => grouped ? queueEveningOrder(state, $('order-product').value, orderQuantity(), $('order-supplier').value) : placeOrder(state, $('order-product').value, orderQuantity(), 'express'), grouped ? 'Produit prévu pour le groupage de 20 h.' : 'Commande flash envoyée au fournisseur.'); }
});
$('reset-camera').addEventListener('click', () => storeScene.resetCamera());
$('summary-action').addEventListener('click', () => {
  if (state.phase === 'bankrupt') { location.reload(); return; }
  $('day-summary').close(); render();
});
$('day-summary').addEventListener('cancel', e => { if (state.phase === 'bankrupt') e.preventDefault(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('day-summary').open) {
    if (!$('management-panel').hidden) closePanel();
    else if (!$('journal-panel').hidden) toggleJournal();
  }
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
  register({ name: 'read_store_status', description: 'Lire les stocks, équipes, liquidités, équipements et livraisons du magasin.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ day: state.day, time: clock(state.minute), phase: state.phase, cash: state.money, staff: { ...state.staff }, dailyCosts: { wages: staffCount(state) * STAFF_DAILY_WAGE, checkouts: checkoutDailyCosts(state), overhead: 160, total: dailyCosts(state) }, products: state.products.map(p => ({ id: p.id, shelf: p.shelf, reserve: p.reserve, shelfCapacity: p.capacity, reserveCapacity: p.reserveCapacity })), expansions: { ...state.expansions }, personalCash: state.personalCash, directorSalary: state.directorSalary, taxes: { vatCollected: state.vatCollected, vatDeductible: state.vatDeductible, vatCredit: state.vatCredit, vatDue: state.vatDue, profitTaxDue: state.profitTaxDue, autoPay: state.autoPayTaxes }, receivers: state.receivers.map(({ id, phase, productId, orderId, palletIndex, load, reserved }) => ({ id, phase, productId, orderId, palletIndex, load, reserved })), restockMode: state.restockMode, restockUnlocked: { ...state.restockUnlocked }, restockRequests: [...state.restockRequests], restockers: state.restockers.map(({ id, phase, mode, productId, load, reserved }) => ({ id, phase, mode, productId, load, reserved })), eveningBasket: structuredClone(state.eveningBasket), eveningQuote: quoteEveningBasket(state), eveningError: state.eveningError, shipments: structuredClone(state.shipments), outside: { capacity: OUTSIDE_PALLET_CAPACITY, reservedSlots: outsideSlotsUsed(state), pallets: outsidePallets(state).map(({ order, pallet }) => ({ orderId: order.id, productId: order.productId, index: pallet.index, quantity: pallet.remaining, slot: pallet.outsideSlot })) }, deliveries: state.orders.filter(o => o.status !== 'received').map(o => ({ ...o })) }) });
  register({ name: 'select_restock_equipment', description: 'Acheter si nécessaire puis sélectionner le matériel de l’équipe de réapprovisionnement.', inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: Object.keys(RESTOCK_EQUIPMENT) } }, required: ['mode'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Équipement invalide.'); const result = selectRestockEquipment(state, input.mode); render(); return result; } });
  register({ name: 'request_shelf_restock', description: 'Demander le remplissage prioritaire d’un rayon à partir de son stock en réserve, avec préparation et transport humains.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) } }, required: ['productId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Produit invalide.'); const result = requestRestock(state, input.productId); render(); return result; } });
  for (const tool of [
    { name: 'expand_store_zone', description: 'Payer un agrandissement pour augmenter la capacité d’une zone du magasin.', schema: { zone: { type: 'string', enum: Object.keys(STORE_EXPANSIONS) } }, action: input => expandStore(state, input.zone) },
    { name: 'discard_reserve_stock', description: 'Jeter sans remboursement des articles non réservés de la réserve d’un produit.', schema: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: 1 } }, action: input => discardReserve(state, input.productId, input.quantity) },
    { name: 'set_director_salary', description: 'Définir le salaire quotidien du directeur versé depuis le magasin sur son compte personnel.', schema: { amount: { type: 'integer', minimum: 0, maximum: 1000 } }, action: input => setDirectorSalary(state, input.amount) },
    { name: 'reinvest_personal_cash', description: 'Transférer de l’argent du compte personnel au magasin.', schema: { amount: { type: 'number', exclusiveMinimum: 0 } }, action: input => reinvestPersonalCash(state, input.amount) },
    { name: 'pay_store_taxes', description: 'Payer les taxes dues dans la limite de la trésorerie.', schema: {}, action: () => payTaxes(state) },
    { name: 'set_automatic_tax_payment', description: 'Activer ou désactiver le paiement des taxes à chaque fermeture.', schema: { enabled: { type: 'boolean' } }, action: input => setAutomaticTaxPayment(state, input.enabled) },
  ]) register({ name: tool.name, description: tool.description, inputSchema: { type: 'object', properties: tool.schema, required: Object.keys(tool.schema), additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Action invalide.'); const result = tool.action(input); render(); return result; } });
  register({ name: 'quote_supplier_order', description: 'Calculer le prix, la remise et la livraison sans commander.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: 12, maximum: 240, multipleOf: 12 }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, required: ['productId', 'quantity', 'supplierId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); return quoteOrder(input.productId, input.quantity, input.supplierId); } });
  for (const tool of [
    { name: 'plan_evening_order', description: 'Prévoir un lot de produit dans la commande groupée envoyée à 20 h. Un nouveau choix remplace le lot prévu pour ce produit ; aucun paiement avant l’envoi.', schema: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: 12, maximum: 240, multipleOf: 12 }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, action: input => queueEveningOrder(state, input.productId, input.quantity, input.supplierId) },
    { name: 'remove_evening_order', description: 'Retirer un produit du panier groupé du soir avant son envoi.', schema: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) } }, action: input => removeEveningOrder(state, input.productId) },
  ]) register({ name: tool.name, description: tool.description, inputSchema: { type: 'object', properties: tool.schema, required: Object.keys(tool.schema), additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); const result = tool.action(input); render(); return result; } });
  register({ name: 'place_supplier_order', description: 'Commander et payer des marchandises auprès d’un fournisseur.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: 12, maximum: 240, multipleOf: 12 }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, required: ['productId', 'quantity', 'supplierId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); const result = placeOrder(state, input.productId, input.quantity, input.supplierId); render(); return { orderId: result.id, cost: result.cost, cash: state.money }; } });
  register({ name: 'set_staff_allocation', description: 'Choisir sans plafond les effectifs aux caisses, à la mise en rayon et au déchargement des livraisons. Les salaires suivent les effectifs.', inputSchema: { type: 'object', properties: { role: { type: 'string', enum: ['checkout', 'shelves', 'receiving'] }, amount: { type: 'integer', minimum: 0 } }, required: ['role', 'amount'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Affectation invalide.'); const staff = setStaff(state, input.role, input.amount); render(); return { staff }; } });
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
