import { createGame, PRODUCTS, SUPPLIERS, EVENTS, staffCount, dailyCosts, INSTALLATIONS, installationCount, installationLimit, quoteInstallation, setInstallation, maintenanceCosts, outsideCapacity, deliveryBayCount, checkoutDailyCosts, STAFF_DAILY_WAGE, STORE_EXPANSIONS, RESERVE_EXPANSION_CAPACITY, GROUPED_DELIVERY_FEE, dailyProfitability, setShelfCount, shelfFixtureCount, checkoutCount, expandStore, discardReserve, setDirectorSalary, reinvestPersonalCash, payTaxes, setAutomaticTaxPayment, RESTOCK_EQUIPMENT, RESTOCK_TRIGGER_RATIO, SHELF_UNITS_PER_LEVEL, ORDER_MAX_QUANTITY, ORDER_QUANTITIES, OUTSIDE_PALLET_CAPACITY, outsidePallets, outsideSlotsUsed, restockInTransit, selectRestockEquipment, requestRestock, quoteOrder, queueEveningOrder, removeEveningOrder, quoteEveningBasket, currentEvent, clock, setStaff, placeOrder, buyAutoCheckout, openStore, advance } from './engine.js';

import { createStoreScene } from './scene.js';

const state = createGame();
const $ = id => document.getElementById(id);
const sectionMarkup = new WeakMap();
function updateSection(id, html) {
  const element = $(id);
  if (sectionMarkup.get(element) === html) return;
  const openPalettes = new Set([...element.querySelectorAll('details[data-pallets][open]')].map(d => d.dataset.pallets));
  element.innerHTML = html; sectionMarkup.set(element, html);
  element.querySelectorAll('details[data-pallets]').forEach(d => { d.open = openPalettes.has(d.dataset.pallets); });
}
const euros = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
let tab = 'rayons', selected = null, lastPanel = '', pendingMinutes = 0, lastTime = performance.now(), lastRender = 0, noticeTimer;
const canvas = $('store-map');
const reserveQuantities = new Map();
let checkoutSound = true;
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
function installationControl(kind, productId, step = 1) {
  const definition = INSTALLATIONS[kind], count = installationCount(state, kind, productId), limit = installationLimit(state, kind, productId);
  const product = productId ? state.products.find(p => p.id === productId) : null;
  const action = (target, add) => {
    const quote = quoteInstallation(state, kind, target, productId);
    const disabled = target === count || quote.totalCost > state.money || !['preparation', 'open'].includes(state.phase);
    return `<button class="tiny-button" data-install-kind="${kind}" data-install-count="${target}" ${productId ? `data-install-product="${productId}"` : ''} aria-label="${add ? 'Installer' : 'Retirer'} ${definition.name}${product ? ` · ${product.name}` : ''}" ${disabled ? 'disabled' : ''}>${add ? '+' : '−'}${step > 1 ? Math.abs(target - count) : ''} · ${euros(quote.totalCost)}</button>`;
  };
  return `<section class="installation-control" data-install-section="${kind}"><div class="installation-title"><strong>${definition.name}</strong><span>${count} / ${limit}</span></div><p>Installation : ${euros(definition.install)} · retrait : ${euros(definition.remove)} par unité.<br>Maintenance : ${euros(definition.maintenance)} / unité / jour · total ${euros(count * definition.maintenance)} / jour.</p><div class="installation-actions">${action(Math.max(0, count - step), false)}${action(Math.min(limit, count + step), true)}</div>${count === limit && kind !== 'auto' ? '<small>Agrandissez la zone pour installer davantage.</small>' : ''}</section>`;
}
function shelfAllocation(product) { return installationControl('shelves', product.id); }
function stockPanel() {
  const equipment = RESTOCK_EQUIPMENT[state.restockMode];
  return `${allProductsButton()}${productScope().map(p => {
    const jobs = state.restockers.filter(w => w.productId === p.id && w.phase !== 'returning');
    const incoming = jobs.reduce((sum, w) => sum + w.load + w.reserved, 0), available = p.reserve - jobs.reduce((sum, w) => sum + w.reserved, 0);
    const pending = state.restockRequests.includes(p.id), blocked = p.shelf + incoming >= p.capacity || available <= 0 || pending || !['preparation', 'open'].includes(state.phase);
    return `<div class="shelf-card ${selected === p.id ? 'selected-shelf' : ''}"><div class="shelf-title"><button data-select="${p.id}"><span class="product-color" style="background:${p.color}"></span>${p.name}</button><span class="stock-level ${p.shelf < 12 ? 'low' : ''}">${p.shelf} / ${p.capacity} articles en rayon</span></div><div class="stock-track"><span style="width:${(p.capacity ? p.shelf / p.capacity * 100 : 0)}%;background:${p.shelf < 12 ? '#e78e5a' : p.color}"></span></div><div class="shelf-meta"><span>En réserve : ${p.reserve} · Vente : ${euros(p.price)}</span><button class="tiny-button" data-fill-product="${p.id}" ${blocked ? 'disabled' : ''}>${pending ? 'Demandé' : 'Réapprovisionner'}</button><button class="tiny-button" data-view-reserve="${p.id}">Voir la réserve</button></div>${shelfAllocation(p)}${incoming ? `<p class="restock-incoming">${incoming} unités en réapprovisionnement</p>` : ''}</div>`;
  }).join('')}<div class="reserve-card"><strong>Réapprovisionnement</strong><p>${state.staff.shelves} employés : chargement, transport et mise en rayon.<br>${equipment.name} · ${equipment.capacity} unités par chargement.<br>Départs automatiques à ${RESTOCK_TRIGGER_RATIO * 100} % de remplissage ou moins. « Réapprovisionner » donne la priorité au rayon et permet de le remplir avant ce seuil.</p><div class="restock-overview"><span>${restockInTransit(state)} unités transportées</span><button class="tiny-button" data-show-equipment>Équipement</button></div></div>${!state.staff.shelves ? '<p class="supply-warning">Affectez au moins un employé à la mise en rayon pour charger et remplir les rayons.</p>' : ''}<p class="panel-intro">${shelfFixtureCount(state)} meubles installés · ${state.shelfLayout.filter(id => id !== null).length} / ${state.shelfLayout.length} faces affectées. Deux gondoles réunissent chacune deux familles sur leurs faces opposées. Chaque face contient jusqu’à 600 articles. Les agrandissements ajoutent 6 emplacements libres. L’installation des meubles est payée séparément.</p>${expansionPanel('shelves')}`;
}
function equipmentPanel() {
  return `<section class="equipment-section" aria-label="Équipement de réapprovisionnement"><h3>Réserve → rayons</h3><p class="panel-intro">Un employé par équipement. Les achats équipent l’équipe ; les trajets en cours gardent leur matériel jusqu’au retour.</p>${Object.entries(RESTOCK_EQUIPMENT).map(([mode, equipment]) => {
    const unlocked = state.restockUnlocked[mode], active = state.restockMode === mode;
    const blocked = active || !['preparation', 'open'].includes(state.phase) || (!unlocked && (state.money < equipment.cost || !state.restockUnlocked[equipment.requires]));
    const button = active ? 'En service' : unlocked ? 'Utiliser' : !state.restockUnlocked[equipment.requires] ? 'Chariot moyen requis' : `Équiper · ${euros(equipment.cost)}`;
    return `<div class="equipment-card ${active ? 'selected-equipment' : ''}"><div><strong>${equipment.name}</strong><p>${equipment.capacity} unités par trajet · ${mode === 'small' ? 'Inclus au départ' : mode === 'medium' ? 'Équipe équipée pour 1 200 €' : 'Équipe équipée pour 3 600 €'}</p></div><button class="tiny-button" data-equipment="${mode}" ${blocked ? 'disabled' : ''}>${button}</button></div>`;
  }).join('')}</section>`;
}
function quickReserveOrder(product) {
  const quantity = reserveQuantities.get(product.id) || 48, quote = quoteOrder(product.id, quantity, 'regular');
  const planned = state.eveningBasket.find(line => line.productId === product.id);
  return `<details class="reserve-quick-order" data-product="${product.id}"><summary>Commande rapide · groupage du soir${planned ? ` · ${planned.quantity} prévus` : ''}</summary><fieldset class="quantity-picker"><legend>Quantité pour ${product.short}</legend><div class="quantity-grid">${ORDER_QUANTITIES.map(n => `<label class="quantity-tile"><input type="radio" name="reserve-quantity-${product.id}" data-reserve-quantity="${product.id}" value="${n}" ${n === quantity ? 'checked' : ''}><span class="quantity-face"><strong>${n}</strong><small>unités</small></span></label>`).join('')}</div></fieldset><p>Centrale Nord · marchandises ${euros(quote.goodsCost)}<br>Livraison : ${euros(GROUPED_DELIVERY_FEE)} partagés avec ses autres produits.</p><button data-quick-grouped="${product.id}" ${!['preparation', 'open'].includes(state.phase) ? 'disabled' : ''}>${planned ? 'Mettre à jour' : 'Ajouter'} · ${quantity} unités · ${euros(quote.goodsCost)}</button><small>Paiement et envoi à 20 h. Ce choix remplace le lot de ce produit déjà prévu.</small></details>`;
}
function reservePanel() {
  return `${allProductsButton()}${productScope().map(p => { const reserved = state.restockers.filter(w => w.productId === p.id).reduce((sum, w) => sum + w.reserved, 0), outside = outsidePallets(state).filter(line => line.order.productId === p.id), lastDay = state.history.at(-1), activity = lastDay?.products.find(item => item.id === p.id); return `<div class="warehouse-product"><span class="product-color" style="background:${p.color}"></span><div><strong>${p.name}</strong><p>${reserved} unités réservées aux chargements</p>${outside.length ? `<p class="outside-stock">Dehors : ${outside.length} palette${outside.length > 1 ? 's' : ''} · ${outside.reduce((sum, line) => sum + line.pallet.remaining, 0)} unités</p>` : ''}</div><strong>${p.reserve}<small>/ ${p.reserveCapacity} articles en réserve</small></strong><button class="tiny-button warehouse-order" data-order-product="${p.id}" aria-label="Commander pour ${p.name}">Commander</button>${activity ? `<p class="reserve-activity">Jour ${lastDay.day} : ${activity.restocked} unités vers les rayons · ${activity.sold} vendues</p>` : `<p class="reserve-activity">Aucune journée terminée.</p>`}${installationControl('reserve', p.id)}${quickReserveOrder(p)}${discardControls(p, reserved)}</div>`; }).join('')}<p class="panel-intro">Les employés de mise en rayon prennent eux-mêmes les articles dans leur emplacement et chargent leur chariot.</p>${expansionPanel('reserve')}`;
}
function checkoutPanel() {
  const queue = state.customers.filter(c => c.stage === 'queue').length;
  return `${installationControl('checkouts')}<label class="checkout-sound"><input type="checkbox" id="checkout-sound" ${checkoutSound ? 'checked' : ''}> Bips de scan</label><div class="checkout-status">${Array.from({ length: checkoutCount(state) }, (_, i) => `<span class="checkout-lane"><i class="lane-light ${state.phase === 'open' && i < state.staff.checkout ? 'open' : ''}" aria-hidden="true"></i>Caisse ${i + 1} · ${state.phase === 'open' && i < state.staff.checkout ? state.customers.some(c => c.stage === 'checkout' && c.checkoutLane === i) ? 'encaissement' : 'libre' : 'fermée'}</span>`).join('')}</div><div class="staff-row"><div><strong>Encaissement</strong><p>Une caisse par employé, jusqu’à ${checkoutCount(state)}. Un client à la fois par caisse, puis sortie après paiement. Chaque caisse installée coûte 5 € / jour.</p></div><div class="stepper"><button data-staff="checkout" data-delta="-1" aria-label="Retirer un employé aux caisses" ${state.staff.checkout === 0 ? 'disabled' : ''}>−</button><strong>${state.staff.checkout}</strong><button data-staff="checkout" data-delta="1" aria-label="Ajouter un employé aux caisses">+</button></div></div><div class="finance-row"><span>En attente de caisse</span><strong>${queue} clients</strong></div><div class="finance-row"><span>En cours d’encaissement</span><strong>${state.customers.filter(c => c.stage === 'checkout').length} clients</strong></div><div class="finance-row"><span>Clients encaissés aujourd’hui</span><strong>${state.sold}</strong></div><div class="finance-row"><span>Départs sans achat</span><strong>${state.lost}</strong></div>${installationControl('auto')}<p class="panel-intro">Un employé aux caisses reste nécessaire pour superviser la caisse automatique.</p>${expansionPanel('checkout')}`;
}
function staffPanel() {
  const roles = [['checkout', 'Encaissement', `Une caisse par employé, jusqu’à ${checkoutCount(state)}. 5 € / jour par caisse installée.`], ['shelves', 'Mise en rayon', 'Prend les articles en réserve, charge son chariot et remplit les rayons.'], ['receiving', 'Déchargement des livraisons', 'Transporte une palette entière au transpalette, puis range ses cartons par produit.']];
  return `<p class="panel-intro">Choisissez librement vos effectifs par équipe. Chaque employé coûte 85 € par jour, facturés à la fermeture.</p>${roles.map(([role, name, description]) => `<div class="staff-row"><div><strong>${name}</strong><p>${description}</p></div><div class="stepper"><button data-staff="${role}" data-delta="-1" aria-label="Retirer un employé : ${name}" ${state.staff[role] === 0 ? 'disabled' : ''}>−</button><strong>${state.staff[role]}</strong><button data-staff="${role}" data-delta="1" aria-label="Ajouter un employé : ${name}">+</button></div></div>`).join('')}<p class="staff-free">${staffCount(state)} employés · Salaires : ${euros(staffCount(state) * STAFF_DAILY_WAGE)} / jour</p>${equipmentPanel()}${installationControl('auto')}`;
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
    const palletDetails = cargo.map(({ order, index }, position) => {
      const pallet = order.pallets[index], product = state.products.find(p => p.id === order.productId);
      const cartons = Math.floor(pallet.quantity / 12), partial = pallet.quantity % 12;
      const status = { dock: t.phase === 'enroute' ? 'À livrer' : 'Dans le camion', reserved: pallet.outsideOrigin ? 'Reprise dehors' : 'Prise en cours', transport: 'En transport', outside: 'Dehors', stored: 'Rangée' }[pallet.status];
      return `<li><strong>Palette ${position + 1} · ${product.short}</strong><span>${pallet.quantity} articles · ${cartons} carton${cartons > 1 ? 's' : ''}${partial ? ` + 1 carton de ${partial} articles` : ''}</span><small>${status}${pallet.status === 'stored' ? '' : ` · ${pallet.remaining} articles restants`}</small></li>`;
    }).join('');
    const blocked = t.phase === 'docked' && cargo.some(({ order, index }) => { const pallet = order.pallets[index], p = state.products.find(p => p.id === order.productId); return pallet.status === 'dock' && p.reserveCapacity - p.reserve < pallet.remaining; });
    return `<div class="delivery-card"><strong>${t.mode === 'grouped' ? 'Groupage du soir' : 'Livraison spécifique'} · ${t.pallets.length} palette${t.pallets.length > 1 ? 's' : ''}</strong><p>${t.supplier}</p><ul class="delivery-contents" aria-label="Contenu du camion">${contents}</ul><details class="pallet-breakdown" data-pallets="${t.id}"><summary>${t.pallets.length === 1 ? 'Contenu de la palette' : `Contenu des ${t.pallets.length} palettes`}</summary><ol>${palletDetails}</ol></details><p>${t.phase === 'enroute' ? `Arrivée dans ${Math.max(0, t.eta - state.elapsed)} min` : `${names[t.phase]}${t.bay !== null ? ` · Quai ${t.bay + 1}` : ''}`}</p>${t.phase === 'docked' ? `<p>${remaining} unités dans le camion · ${carried} en transport ou rangement</p>` : ''}${blocked ? `<p class="supply-warning">${outsideSlotsUsed(state) >= outsideCapacity(state) ? 'Tampon extérieur plein. Libérez le stock du produit pour poursuivre.' : 'Stock saturé : les palettes seront déposées dans le tampon extérieur.'}</p>` : ''}</div>`;
  }).join('');
}
function outsidePanel() {
  const outside = outsidePallets(state);
  return `${installationControl('bays')}${installationControl('outside', undefined, 5)}<h3 class="delivery-heading">Tampon extérieur · ${outside.length} / ${outsideCapacity(state)} palettes</h3><p class="panel-intro">${outsideSlotsUsed(state) - outside.length} place(s) réservée(s) aux trajets. Les palettes attendent dehors si l’emplacement du produit est plein. Le déchargement continue ; les employés les rangent dès qu’une palette entière peut entrer.</p>${outside.length ? `<ul class="delivery-contents">${[...new Set(outside.map(line => line.order.productId))].map(id => { const lines = outside.filter(line => line.order.productId === id); return `<li><span>${PRODUCTS.find(p => p.id === id).name} · ${lines.length} palette(s)</span><strong>${lines.reduce((sum, line) => sum + line.pallet.remaining, 0)} unités</strong></li>`; }).join('')}</ul>` : ''}`;
}
function eveningBasketPanel() {
  const quote = quoteEveningBasket(state);
  return `<h3 class="delivery-heading">Commande groupée · envoi à 20 h</h3>${quote.groups.length ? quote.groups.map(group => `<div class="evening-group"><strong>${group.supplier}</strong>${group.lines.map(line => `<div class="evening-line"><span>${PRODUCTS.find(p => p.id === line.productId).short} · ${line.quantity} unités</span><button class="tiny-button" data-remove-evening="${line.productId}" aria-label="Retirer ${PRODUCTS.find(p => p.id === line.productId).name} du groupage">Retirer</button></div>`).join('')}<p>Marchandises ${euros(group.goodsCost)} + livraison mutualisée ${euros(group.deliveryFee)}</p></div>`).join('') + `<div class="price-preview"><span>À payer ce soir</span><strong>${euros(quote.totalCost)}</strong></div>` : '<p class="panel-intro">Panier vide. Ajoutez les produits depuis leur stock en réserve. Aucun achat n’est déclenché sans article prévu.</p>'}${state.eveningError ? `<p class="supply-warning">${state.eveningError}</p>` : ''}`;
}
const orderMode = () => document.querySelector('input[name="order-mode"]:checked')?.value || 'grouped';
const orderQuantity = () => Number(document.querySelector('input[name="order-quantity"]:checked')?.value);
function quantityChoices(value = 48) {
  return `<fieldset class="quantity-picker"><legend>Quantité · unités</legend><div class="quantity-grid">${ORDER_QUANTITIES.map(n => `<label class="quantity-tile"><input type="radio" name="order-quantity" value="${n}" ${n === value ? 'checked' : ''} required aria-label="${n} unités"><span class="quantity-face"><strong>${n}</strong><small>${Math.ceil(n / 12)} carton${n > 12 ? 's' : ''}</small></span></label>`).join('')}</div></fieldset>`;
}
function supplierPanel() {
  const productId = selected || PRODUCTS[0].id;
  return `<button class="tiny-button dock-camera" data-focus-dock>Voir les quais</button><section class="delivery-list"><h3 class="delivery-heading">Camions et livraisons en cours</h3><div id="deliveries">${deliveryCards()}</div></section><section id="outside-stock">${outsidePanel()}</section><section id="evening-basket">${eveningBasketPanel()}</section><h3 class="delivery-heading">Commander pour la réserve</h3><form class="order-form" id="order-form"><fieldset class="delivery-mode-picker"><legend>Type de commande</legend><label><input type="radio" name="order-mode" value="grouped" checked><span><strong>Groupée ce soir</strong><small>Envoi à 20 h · livraison 10 €</small></span></label><label><input type="radio" name="order-mode" value="flash"><span><strong>Flash</strong><small>30 min · livraison 150 €</small></span></label></fieldset><label for="order-product">Produit</label><select id="order-product">${PRODUCTS.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.name}</option>`).join('')}</select><label for="order-supplier">Fournisseur</label><select id="order-supplier"><option value="regular">Centrale Nord · 90 min</option><option value="express">Express Marché · 30 min</option></select>${quantityChoices()}<div id="order-breakdown"></div><div class="price-preview"><span id="order-total-label">Panier du soir après ce choix</span><strong id="order-total"></strong></div><div id="quantity-tiers"></div><button class="primary" type="submit">Ajouter au groupage du soir</button><p class="panel-intro" id="order-mode-hint"></p></form>`;
}
function expansionPanel(zone) {
  const level = state.expansions[zone], cost = STORE_EXPANSIONS[zone].costs[level];
  const benefit = zone === 'checkout' ? `${4 + (state.expansions.checkout + 1) * 2} emplacements de caisse, à équiper séparément` : zone === 'shelves' ? `6 emplacements supplémentaires, avec installation des meubles séparée` : `${1 + state.expansions.reserve + 1} racks possibles par famille, un niveau supplémentaire par rack, un quai supplémentaire et 15 places extérieures possibles. Installation séparée.`;
  return `<div class="investment"><h3>Agrandir · ${STORE_EXPANSIONS[zone].name}</h3><p>${cost === undefined ? 'Agrandissement maximal atteint.' : benefit}</p><button data-expand="${zone}" ${cost === undefined || state.money < cost || !['preparation', 'open'].includes(state.phase) ? 'disabled' : ''}>${cost === undefined ? 'Zone agrandie au maximum' : `Agrandir · ${euros(cost)}`}</button></div>`;
}
function discardControls(product, reserved) {
  const available = product.reserve - reserved;
  if (available <= 0) return '';
  const quantities = [...new Set([1, 12, 24, 48, available])].filter(n => n <= available).sort((a, b) => a - b);
  return `<details class="discard-controls" data-product="${product.id}"><summary>Jeter du stock</summary><p>Sans remboursement. Les articles déjà réservés aux chargements sont protégés.</p><div><select id="discard-quantity-${product.id}" aria-label="Quantité à jeter : ${product.name}">${quantities.map(n => `<option value="${n}">${n === available ? `Tout le stock disponible · ${n}` : `${n} unité${n > 1 ? 's' : ''}`}</option>`).join('')}</select><button data-discard="${product.id}">Jeter</button></div></details>`;
}
function financeHistory() {
  return `<section class="finance-history"><h3>Suivi des journées précédentes</h3>${state.history.length ? `<div class="finance-table-scroll" tabindex="0" role="region" aria-label="Historique financier, défilement horizontal"><table><caption>Journées clôturées · montants en euros</caption><thead><tr><th scope="col">Jour</th><th scope="col">Résultat net</th><th scope="col">Ventes HT</th><th scope="col">Achats HT</th><th scope="col">Charges + salaire</th><th scope="col">Dont maintenance</th><th scope="col">Impôt</th><th scope="col">TVA due</th><th scope="col">Trésorerie Δ</th></tr></thead><tbody>${[...state.history].reverse().map(day => `<tr><th scope="row">${day.day}</th><td class="${day.netProfit < 0 ? 'negative' : 'positive'}">${euros(day.netProfit)}</td><td>${euros(day.sales - day.vatCollected)}</td><td>${euros(day.spending - day.vatDeductible)}</td><td>${euros(day.expenses)}</td><td>${euros(day.maintenance || 0)}</td><td>${euros(day.profitTax)}</td><td>${euros(day.vatCharged)}</td><td>${euros(day.net)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="panel-intro">Le premier bilan apparaîtra à la clôture de la journée.</p>'}<p class="finance-note">Résultat net : ventes hors TVA, moins achats, investissements, charges, salaire et impôt du jour. La variation de trésorerie inclut les apports et les taxes effectivement payées, même celles des jours précédents.</p></section>`;
}
function financePanel() {
  const profit = dailyProfitability(state);
  const taxes = state.vatDue + state.profitTaxDue, salaryOptions = [...new Set([0, 100, 200, 300, 500, 1000, state.directorSalary])].sort((a, b) => a - b);
  return `<div class="finance-row profit-row"><span>Résultat net du jour · estimé</span><strong class="${profit.netProfit < 0 ? 'negative' : 'positive'}">${euros(profit.netProfit)}</strong></div><p class="panel-intro">Toutes les charges prévues pour la journée sont incluses, ainsi que le salaire estimé du directeur et l’impôt.</p>${financeHistory()}<div class="finance-row"><span>Trésorerie du magasin</span><strong>${euros(state.money)}</strong></div><div class="finance-row"><span>Ventes TTC aujourd’hui</span><strong>${euros(state.sales)}</strong></div><div class="finance-row"><span>Achats et investissements TTC</span><strong>− ${euros(state.spending)}</strong></div><div class="finance-row"><span>Salaires de l’équipe</span><strong>− ${euros(staffCount(state) * STAFF_DAILY_WAGE)}</strong></div><section class="maintenance-details"><h3>Maintenance des installations · ${euros(maintenanceCosts(state).total)} / jour</h3>${maintenanceCosts(state).rows.map(row => `<div class="finance-row"><span>${row.name}<small>${row.count} × ${euros(row.unitCost)} / jour</small></span><strong>− ${euros(row.cost)}</strong></div>`).join('')}<p class="panel-intro">Facturée une fois à la fermeture selon les installations présentes, même inutilisées. Les salaires sont séparés.</p></section><div class="finance-row"><span>Loyer et fonctionnement</span><strong>− 160 €</strong></div><section class="personal-account"><h3>Compte personnel du directeur</h3><div class="finance-row"><span>Solde personnel</span><strong>${euros(state.personalCash)}</strong></div><label for="director-salary">Salaire à la fermeture</label><select id="director-salary">${salaryOptions.map(n => `<option value="${n}" ${n === state.directorSalary ? 'selected' : ''}>${n ? `${euros(n)} / jour` : 'Aucun salaire versé'}</option>`).join('')}</select><p class="panel-intro">Versé depuis le magasin, dans la limite de sa trésorerie.</p>${state.personalCash > 0 ? `<label for="personal-reinvest">Réinvestir dans le magasin</label><div class="personal-transfer"><select id="personal-reinvest">${[...new Set([100, 250, 500, state.personalCash])].filter(n => n <= state.personalCash).sort((a, b) => a - b).map(n => `<option value="${n}">${euros(n)}</option>`).join('')}</select><button data-reinvest>Réinvestir</button></div>` : ''}${state.personalTransactions.length ? `<details><summary>Mouvements du compte</summary>${state.personalTransactions.slice(0, 6).map(t => `<div class="finance-row"><span>Jour ${t.day} · ${t.label}</span><strong>${t.amount > 0 ? '+' : '−'} ${euros(Math.abs(t.amount))}</strong></div>`).join('')}</details>` : ''}</section><section class="tax-account"><h3>TVA et impôt</h3><p class="panel-intro">TVA de 20 % incluse dans les ventes et les achats. Le crédit de TVA est reporté. L’impôt du jeu est de 20 % sur le résultat quotidien positif hors TVA, après achats, investissements, charges et salaire du directeur.</p><div class="finance-row"><span>TVA collectée aujourd’hui</span><strong>${euros(state.vatCollected)}</strong></div><div class="finance-row"><span>TVA déductible aujourd’hui</span><strong>${euros(state.vatDeductible)}</strong></div><div class="finance-row"><span>Crédit de TVA reporté</span><strong>${euros(state.vatCredit)}</strong></div><div class="finance-row"><span>TVA à payer</span><strong>${euros(state.vatDue)}</strong></div><div class="finance-row"><span>Impôt à payer</span><strong>${euros(state.profitTaxDue)}</strong></div><label class="auto-enable"><input id="auto-pay-taxes" type="checkbox" ${state.autoPayTaxes ? 'checked' : ''}>Payer automatiquement à la fermeture</label><button data-pay-taxes ${taxes <= 0 || state.money <= 0 ? 'disabled' : ''}>Payer les taxes · ${euros(taxes)}</button></section>${state.history.length ? `<h3 class="delivery-heading">Bilan du jour ${state.history.at(-1).day}</h3><div class="finance-row"><span>Variation de trésorerie</span><strong>${euros(state.history.at(-1).net)}</strong></div><button data-view-summary>Consulter le bilan</button>` : ''}`;
}
function previewOrder() {
  if (!$('order-total')) return;
  const p = PRODUCTS.find(p => p.id === $('order-product').value), supplierId = $('order-supplier').value;
  const quantity = orderQuantity();
  try {
    const grouped = orderMode() === 'grouped';
    const baseQuote = quoteOrder(p.id, quantity, supplierId), fee = grouped ? GROUPED_DELIVERY_FEE : baseQuote.deliveryFee;
    const quote = { ...baseQuote, deliveryFee: fee, totalCost: baseQuote.goodsCost + fee, landedUnitCost: Math.round((baseQuote.goodsCost + fee) / quantity * 100) / 100 };
    const basket = { eveningBasket: [...state.eveningBasket.filter(line => line.productId !== p.id), { productId: p.id, quantity, supplierId }] };
    $('order-total').textContent = euros(grouped ? quoteEveningBasket(basket).totalCost : quote.totalCost);
    $('order-total-label').textContent = grouped ? 'Panier du soir après ce choix' : 'À payer maintenant';
    $('order-supplier').disabled = !grouped;
    $('order-form').querySelector('button[type="submit"]').textContent = grouped ? state.eveningBasket.some(line => line.productId === p.id) ? 'Mettre à jour le groupage du soir' : 'Ajouter au groupage du soir' : 'Commander la livraison flash';
    $('order-mode-hint').textContent = grouped ? 'Paiement et envoi à 20 h. Un lot par produit : un nouveau choix remplace sa quantité prévue. Livraison au prochain jour de jeu, après le délai du fournisseur.' : 'Paiement immédiat. Le camion arrive après 30 minutes, puis manœuvre et décharge au quai.';
    $('order-breakdown').innerHTML = `<div class="quote-row"><span>Prix unitaire TTC · remise ${Math.round(quote.discountRate * 100)} %</span><strong>${euros(quote.unitPrice)}</strong></div><div class="quote-row"><span>Marchandises</span><strong>${euros(quote.goodsCost)}</strong></div><div class="quote-row"><span>${grouped ? 'Livraison mutualisée par fournisseur' : 'Frais de livraison'}</span><strong>${euros(quote.deliveryFee)}</strong></div><div class="quote-row"><span>${grouped ? 'Coût livré si commandé seul' : 'Coût livré par unité'}</span><strong>${euros(quote.landedUnitCost)}</strong></div>${quote.landedUnitCost > p.price ? '<p class="supply-warning">Le coût livré dépasse le prix de vente de ce produit.</p>' : ''}`;
  } catch { $('order-total').textContent = '—'; $('order-breakdown').innerHTML = '<p class="panel-intro">Choisissez une quantité entière, entre 12 et 1 000.</p>'; }
  $('quantity-tiers').innerHTML = `<table class="quantity-tiers"><caption>Comparer les quantités · commande seule</caption><thead><tr><th>Unités</th><th>Prix / unité</th><th>Livré / unité</th></tr></thead><tbody>${ORDER_QUANTITIES.map(n => { const base = quoteOrder(p.id, n, supplierId), fee = orderMode() === 'grouped' ? GROUPED_DELIVERY_FEE : base.deliveryFee, q = { ...base, landedUnitCost: Math.round((base.goodsCost + fee) / n * 100) / 100 }; return `<tr${n === quantity ? ' class="selected-tier"' : ''}><td>${n}</td><td>${euros(q.unitPrice)}</td><td>${euros(q.landedUnitCost)}</td></tr>`; }).join('')}</tbody></table>`;
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
  const profit = dailyProfitability(state);
  $('daily-profit').textContent = euros(profit.netProfit);
  $('daily-profit').classList.toggle('negative', profit.netProfit < 0);
  $('daily-profit').classList.toggle('positive', profit.netProfit >= 0);
  $('daily-profit').parentElement.title = 'Résultat net estimé : ventes HT moins achats HT, charges de toute la journée, salaire et impôt.';
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
  const expected = state.shipments.filter(t => !['complete', 'departing'].includes(t.phase)).flatMap(t => t.pallets.map(ref => ({ order: state.orders.find(o => o.id === ref.orderId), index: ref.palletIndex }))).filter(({ order, index }) => ['dock', 'reserved'].includes(order.pallets[index].status) && !order.pallets[index].outsideOrigin);
  const cargoSummary = [...new Set(expected.map(item => item.order.productId))].map(id => {
    const product = PRODUCTS.find(p => p.id === id), pallets = expected.filter(item => item.order.productId === id);
    return `${product.short} : ${pallets.length} palette${pallets.length > 1 ? 's' : ''} · ${pallets.reduce((sum, { order, index }) => sum + order.pallets[index].remaining, 0)} articles`;
  }).join(' / ');
  const transit = state.shipments.filter(t => ['enroute', 'waiting', 'positioning', 'reversing'].includes(t.phase)).length, unloading = state.shipments.filter(t => ['docked', 'departing'].includes(t.phase)).length, planned = state.eveningBasket.length, outside = outsidePallets(state).length;
  $('delivery-status').hidden = transit + unloading + planned + outside === 0;
  $('delivery-status').innerHTML = `<strong>${transit + unloading ? `${transit + unloading} livraison${transit + unloading > 1 ? 's' : ''}` : outside ? `${outside} palette${outside > 1 ? 's' : ''} dehors` : 'Groupage ce soir'}</strong><span>${transit} en route / attente · ${unloading} au quai${planned ? ` · ${planned} produit${planned > 1 ? 's' : ''} prévu${planned > 1 ? 's' : ''} ce soir` : ''}${outside && transit + unloading ? ` · ${outside} palettes dehors` : ''}</span>${cargoSummary ? `<small class="delivery-cargo-summary">${cargoSummary}</small>` : ''}`;
  renderPanel();
  if (state.phase === 'bankrupt' && state.summary && !$('day-summary').open) showSummary();
}
function showSummary() {
  const s = state.history.at(-1); if (!s) return;
  $('summary-title').textContent = `Bilan du jour ${s.day}`;
  $('summary-body').innerHTML = `<div class="finance-row"><span>Ventes encaissées TTC</span><strong>${euros(s.sales)}</strong></div>${s.contribution ? `<div class="finance-row"><span>Apport du compte personnel</span><strong>+ ${euros(s.contribution)}</strong></div>` : ''}<div class="finance-row"><span>Achats et investissements TTC</span><strong>− ${euros(s.spending)}</strong></div><div class="finance-row"><span>Charges de fonctionnement</span><strong>− ${euros(s.expenses - s.salaryPaid)}</strong></div><div class="finance-row"><span>Salaire versé au directeur</span><strong>− ${euros(s.salaryPaid)}</strong></div><div class="finance-row"><span>Taxes effectivement payées</span><strong>− ${euros(s.taxPaid)}</strong></div><p class="finance-note">Taxes calculées pour ce jour : TVA ${euros(s.vatCharged)} · impôt ${euros(s.profitTax)}. Les montants impayés restent dans Finances.</p><div class="finance-row"><span>Résultat net après impôt</span><strong class="${s.netProfit < 0 ? 'negative' : 'positive'}">${euros(s.netProfit)}</strong></div><div class="summary-result ${s.net < 0 ? 'negative' : ''}">Variation de trésorerie : <strong>${euros(s.net)}</strong></div><p class="summary-message">${s.sold} clients encaissés · ${s.lost} départs sans achat.<br>${state.phase === 'bankrupt' ? 'Le magasin ne peut plus couvrir ses charges. Commencez une nouvelle partie pour essayer une autre organisation.' : `Le magasin continue au jour ${state.day}. Trésorerie actuelle : ${euros(state.money)}.`}</p>`;
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
  const installation = e.target.closest('[data-install-kind]');
  if (installation) act(() => setInstallation(state, installation.dataset.installKind, Number(installation.dataset.installCount), installation.dataset.installProduct), 'Installations mises à jour.');
  const fixture = e.target.closest('[data-fixtures]');
  if (fixture) act(() => setShelfCount(state, fixture.dataset.fixtures, state.shelfLayout.filter(id => id === fixture.dataset.fixtures).length + Number(fixture.dataset.delta)), 'Affectation du mobilier mise à jour.');
  const quick = e.target.closest('[data-quick-grouped]');
  if (quick) act(() => queueEveningOrder(state, quick.dataset.quickGrouped, reserveQuantities.get(quick.dataset.quickGrouped) || 48, 'regular'), 'Lot ajouté au groupage du soir. Paiement à 20 h.');
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
  if (e.target.dataset.reserveQuantity) { reserveQuantities.set(e.target.dataset.reserveQuantity, Number(e.target.value)); renderPanel(); }
  if (e.target.id === 'checkout-sound') { checkoutSound = e.target.checked; storeScene.setCheckoutSound(checkoutSound); }
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
  register({ name: 'read_store_status', description: 'Lire les stocks, équipes, liquidités, équipements et livraisons du magasin.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ day: state.day, time: clock(state.minute), phase: state.phase, cash: state.money, profitability: dailyProfitability(state), history: structuredClone(state.history), staff: { ...state.staff }, maintenance: maintenanceCosts(state), infrastructure: { ...state.infrastructure }, dailyCosts: { wages: staffCount(state) * STAFF_DAILY_WAGE, checkouts: checkoutDailyCosts(state), otherMaintenance: maintenanceCosts(state).total - checkoutDailyCosts(state), overhead: 160, total: dailyCosts(state) }, products: state.products.map(p => ({ id: p.id, shelf: p.shelf, reserve: p.reserve, shelfCapacity: p.capacity, reserveCapacity: p.reserveCapacity, reserveRacks: p.reserveRacks })), expansions: { ...state.expansions }, shelfLayout: [...state.shelfLayout], personalCash: state.personalCash, directorSalary: state.directorSalary, taxes: { vatCollected: state.vatCollected, vatDeductible: state.vatDeductible, vatCredit: state.vatCredit, vatDue: state.vatDue, profitTaxDue: state.profitTaxDue, autoPay: state.autoPayTaxes }, receivers: state.receivers.map(({ id, phase, productId, orderId, palletIndex, load, reserved }) => ({ id, phase, productId, orderId, palletIndex, load, reserved })), restockMode: state.restockMode, restockUnlocked: { ...state.restockUnlocked }, restockRequests: [...state.restockRequests], restockers: state.restockers.map(({ id, phase, mode, productId, load, reserved }) => ({ id, phase, mode, productId, load, reserved })), eveningBasket: structuredClone(state.eveningBasket), eveningQuote: quoteEveningBasket(state), eveningError: state.eveningError, checkouts: state.customers.filter(c => c.stage === 'checkout').map(({ id, checkoutLane, checkoutRemaining }) => ({ customerId: id, lane: checkoutLane, remaining: checkoutRemaining })), shipments: structuredClone(state.shipments), outside: { capacity: outsideCapacity(state), reservedSlots: outsideSlotsUsed(state), pallets: outsidePallets(state).map(({ order, pallet }) => ({ orderId: order.id, productId: order.productId, index: pallet.index, quantity: pallet.remaining, slot: pallet.outsideSlot })) }, deliveries: state.orders.filter(o => o.status !== 'received').map(o => ({ ...o })) }) });
  register({ name: 'set_installation_count', description: 'Installer ou retirer des équipements, avec coût des travaux et maintenance. Réserve et rayons nécessitent un produit. Les opérations et stocks en cours sont protégés.', inputSchema: {type:'object',properties:{kind:{type:'string',enum:Object.keys(INSTALLATIONS)},amount:{type:'integer',minimum:0},productId:{type:'string',enum:PRODUCTS.map(p=>p.id)}},required:['kind','amount'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute: input => {const result=setInstallation(state,input.kind,input.amount,input.productId);render();return result;} });
  register({ name: 'quote_installation_count', description: 'Voir le coût de travaux et la maintenance pour un nombre d’installations sans payer.', inputSchema: {type:'object',properties:{kind:{type:'string',enum:Object.keys(INSTALLATIONS)},amount:{type:'integer',minimum:0},productId:{type:'string',enum:PRODUCTS.map(p=>p.id)}},required:['kind','amount'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute: input => quoteInstallation(state,input.kind,input.amount,input.productId) });
  register({ name: 'set_product_shelf_count', description: 'Affecter des meubles de rayon ou des étals à une famille, dans la limite des emplacements installés.', inputSchema: { type:'object', properties:{productId:{type:'string',enum:PRODUCTS.map(p=>p.id)}, amount:{type:'integer',minimum:0}}, required:['productId','amount'], additionalProperties:false }, annotations:{readOnlyHint:false,untrustedContentHint:false}, execute: input => { const result = setShelfCount(state,input.productId,input.amount); render(); return result; } });
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
  register({ name: 'quote_supplier_order', description: 'Calculer le prix, la remise et la livraison sans commander.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: 12, maximum: ORDER_MAX_QUANTITY }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, required: ['productId', 'quantity', 'supplierId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); return quoteOrder(input.productId, input.quantity, input.supplierId); } });
  for (const tool of [
    { name: 'plan_evening_order', description: 'Prévoir un lot de produit dans la commande groupée envoyée à 20 h. Un nouveau choix remplace le lot prévu pour ce produit ; aucun paiement avant l’envoi.', schema: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: 12, maximum: ORDER_MAX_QUANTITY }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, action: input => queueEveningOrder(state, input.productId, input.quantity, input.supplierId) },
    { name: 'remove_evening_order', description: 'Retirer un produit du panier groupé du soir avant son envoi.', schema: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) } }, action: input => removeEveningOrder(state, input.productId) },
  ]) register({ name: tool.name, description: tool.description, inputSchema: { type: 'object', properties: tool.schema, required: Object.keys(tool.schema), additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); const result = tool.action(input); render(); return result; } });
  register({ name: 'place_supplier_order', description: 'Commander et payer des marchandises auprès d’un fournisseur.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: 12, maximum: ORDER_MAX_QUANTITY }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, required: ['productId', 'quantity', 'supplierId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); const result = placeOrder(state, input.productId, input.quantity, input.supplierId); render(); return { orderId: result.id, cost: result.cost, cash: state.money }; } });
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
