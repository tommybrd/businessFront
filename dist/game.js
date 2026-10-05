import { startOfflineSupport } from './offline.js';
import {reserveStockProjection} from './reserve-stock.js';
import {postCollectionMinute} from './store-hours.js';
import {deliveryVehicle} from './delivery-logistics.js';
import {newSupplierPayments} from './supplier-payments.js';
import {ARTICLES_PER_PALLET} from './delivery-logistics.js';
import {stockAlerts} from './stock-alerts.js';
import {newTheftState,SECURITY_LEVELS,theftReport,setSecurityLevel} from './theft.js';
import {checkoutStatus} from './checkout-flow.js';
import { STORE_SIZES,shopArea,autoCheckoutCount,autoCheckoutLane } from './store-layout.js';
import { createLayoutEditor } from './layout-editor.js';
import { makeSave } from './save-format.js';
import { createSaveManager } from './save-manager.js';
import { ONLINE_CHANNELS, ONLINE_STATUSES, activeOnlineOrder, onlineUnits, onlinePicked, onlineReserved, createOnlineOrder, cancelOnlineOrder, setOnlineEnabled } from './online-orders.js';
import { setStoreHours,storeHours,nextStoreHours,stockValuation,setSupplierPaymentTerm,paySupplierInvoices,supplierPaymentReport,restockLoad,restockReserved,workerHasProduct,satisfactionReport, createStarterGame, startDayOnLoad, premisesCosts, setStoreSize, moveFixture, createGame, PRODUCTS, SUPPLIERS, EVENTS, staffCount, dailyCosts, INSTALLATIONS, installationCount, installationLimit, quoteInstallation, setInstallation, maintenanceCosts, outsideCapacity, deliveryBayCount, checkoutDailyCosts, STAFF_DAILY_WAGE, STORE_EXPANSIONS, RESERVE_EXPANSION_CAPACITY, GROUPED_DELIVERY_FEE, dailyProfitability, setShelfCount, shelfFixtureCount, checkoutCount, expandStore, discardReserve, setDirectorAnnualSalary, setDirectorProfitShare, reinvestPersonalCash, payTaxes, setAutomaticTaxPayment, RESTOCK_EQUIPMENT, RESTOCK_TRIGGER_RATIO, SHELF_UNITS_PER_LEVEL, ORDER_MAX_QUANTITY, ORDER_MIN_QUANTITY, ORDER_QUANTITIES, OUTSIDE_PALLET_CAPACITY, outsidePallets, outsideSlotsUsed, restockInTransit, selectRestockEquipment, requestRestock, quoteOrder, queueEveningOrder, removeEveningOrder, quoteEveningBasket, currentEvent, clock, setStaff, placeOrder, buyAutoCheckout, openStore, advance } from './engine.js';

import { createStoreScene } from './scene.js';

const state = createStarterGame();
let saveManager = null, saveUi = null, offlineSupportStatus='';
const $ = id => document.getElementById(id);
let panelPointerHeld=false;
$('management-content').addEventListener('pointerdown',()=>{panelPointerHeld=true;});
const releasePanelPointer=()=>{setTimeout(()=>{panelPointerHeld=false;},0);};
document.addEventListener('pointerup',releasePanelPointer);
document.addEventListener('pointercancel',releasePanelPointer);
window.addEventListener('blur',()=>{panelPointerHeld=false;});
const sectionMarkup = new WeakMap();
function updateSection(id, html) {
  const element = $(id);
  if (sectionMarkup.get(element) === html) return;
  const openPalettes = new Set([...element.querySelectorAll('details[data-pallets][open]')].map(d => d.dataset.pallets));
  element.innerHTML = html; sectionMarkup.set(element, html);
  element.querySelectorAll('details[data-pallets]').forEach(d => { d.open = openPalettes.has(d.dataset.pallets); });
}
const euros = value => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value);
let stockAlertKeys=new Set();
let tab = 'rayons', selected = null, lastPanel = '', pendingMinutes = 0, lastTime = performance.now(), lastRender = 0, noticeTimer;
const canvas = $('store-map');
const historyDialog=document.createElement('dialog');historyDialog.id='history-dialog';historyDialog.setAttribute('aria-labelledby','history-title');historyDialog.innerHTML='<header><h2 id="history-title">Suivi des journées</h2><button aria-label="Fermer le suivi des journées">✕</button></header><div class="history-body"></div>';document.body.append(historyDialog);historyDialog.querySelector('button').addEventListener('click',()=>historyDialog.close());
const reserveQuantities = new Map();
const checkoutSound = true;
const viewNames = {satisfaction:'Satisfaction', rayons: 'Rayons', reserve: 'Réserve', caisses: 'Caisses', equipes: 'Équipes', fournisseurs: 'Commandes et livraisons', finances: 'Finances', personnel:'Mon argent', online: 'Drive & e-commerce' };
const roleNames = { checkout: 'Encaissement', shelves: 'Mise en rayon', receiving: 'Déchargement des livraisons', online: 'Préparation drive / web' };
const storeScene = createStoreScene(canvas, state, selection => {
  selected = selection.productId || null; switchTab(selection.view);
  if (selection.role) $('panel-context').textContent = roleNames[selection.role];
});

const layoutEditor=createLayoutEditor(state,{move:(...args)=>act(()=>moveFixture(state,...args),'Agencement enregistré.'),error:()=>$('notice').textContent,changed:()=>{saveManager?.changed();render();},ready:()=>Boolean(saveManager?.ready),notice});
$('layout-toggle').addEventListener('click',()=>layoutEditor.open());

function notice(text, error = false) {
  clearTimeout(noticeTimer); $('notice').textContent = text; $('notice').classList.toggle('error', error); $('notice').hidden = false;
  noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 5000);
}
function act(action, message) {
  try { if (!saveManager?.ready) throw new Error('Chargez la sauvegarde avant de modifier la partie.'); const result = action(); saveManager.changed(); if (message) notice(message); render(true); return result; }
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
  return `<section class="installation-control" data-install-section="${kind}"><div class="installation-title"><strong>${definition.name}</strong><span>${count} / ${limit}</span></div><p>Installation : ${euros(definition.install)} · retrait : ${euros(definition.remove)} par unité.<br>Maintenance : ${euros(definition.maintenance)} / unité / jour · total ${euros(count * definition.maintenance)} / jour.${kind === 'checkouts' ? `<br>${count} employé(s) inclus · ${euros(count * STAFF_DAILY_WAGE)} de salaires / jour.` : ''}</p><div class="installation-actions">${action(Math.max(0, count - step), false)}${action(Math.min(limit, count + step), true)}</div>${count === limit && !['drive','web'].includes(kind) ? '<small>Agrandissez la zone pour installer davantage.</small>' : ''}</section>`;
}
function shelfAllocation(product) {
  const count=installationCount(state,'shelves',product.id),limit=installationLimit(state,'shelves',product.id),definition=INSTALLATIONS.shelves;
  const button=(add)=>{
    const target=Math.max(0,Math.min(limit,count+(add?1:-1))),quote=quoteInstallation(state,'shelves',target,product.id);
    const label=`${add?'Ajouter':'Retirer'} un rayon · ${product.name} · ${euros(quote.totalCost)}`;
    const disabled=target===count||quote.totalCost>state.money||!['preparation','open'].includes(state.phase);
    return `<button class="shelf-count-button" data-install-kind="shelves" data-install-count="${target}" data-install-product="${product.id}" aria-label="${label}" title="${label}" ${disabled?'disabled':''}>${add?'+':'−'}</button>`;
  };
  return `<div class="shelf-count-control" role="group" aria-label="Nombre de rayons · ${product.name}"><span>Rayons</span><div>${button(false)}<strong title="${count} / ${limit} emplacements · maintenance ${euros(count*definition.maintenance)} / jour" aria-label="${count} rayon${count===1?'':'s'}, maximum ${limit}">${count}</strong>${button(true)}</div></div>`;
}
function reserveStockBar(product,extraClass='') {
  const r=reserveStockProjection(state,product),description=`${r.stock} articles en réserve${r.ordered?`, ${r.ordered} unités en commande`:''}${r.planned?`, ${r.planned} unités prévues ce soir`:''}`;
  return `<div class="reserve-gauge ${extraClass}"><div class="stock-track reserve-projection" role="meter" aria-label="Réserve · ${product.name}" aria-valuemin="0" aria-valuemax="${r.capacity}" aria-valuenow="${r.stock}" aria-valuetext="${description}" title="${description}${r.overflow?` · capacité dépassée de ${r.overflow} articles`:''}"><span class="reserve-present" style="width:${r.stock/r.scale*100}%;background:${product.color}"></span>${r.ordered?`<span class="reserve-ordered" style="width:${r.ordered/r.scale*100}%"></span>`:''}${r.planned?`<span class="reserve-planned" style="width:${r.planned/r.scale*100}%"></span>`:''}${r.overflow?`<i class="reserve-capacity-mark" style="left:${r.capacity/r.scale*100}%" aria-hidden="true"></i>`:''}</div>${r.ordered?`<p class="supplier-incoming"><span class="order-color-dot" aria-hidden="true"></span>${r.ordered} unités en commande</p>`:''}${r.planned?`<p class="supplier-planned"><span class="order-color-dot planned" aria-hidden="true"></span>${r.planned} unités prévues ce soir</p>`:''}${r.overflow?`<p class="reserve-overflow">${r.overflow} articles au-delà de la capacité</p>`:''}</div>`;
}
function stockPanel() {
  const alerts=stockAlerts(state);
  return `${allProductsButton()}${productScope().map(p => {
    const jobs = state.restockers.filter(w => workerHasProduct(w,p.id) && w.phase !== 'returning');
    const incoming = jobs.reduce((sum,w)=>sum+restockLoad(w,p.id)+restockReserved(w,p.id),0), available = p.reserve - onlineReserved(state,p.id,'reserve') - jobs.reduce((sum,w)=>sum+restockReserved(w,p.id),0);
    const days=state.history.map(day=>day.products?.find(product=>product.id===p.id)).filter(product=>Number.isFinite(product?.sold));
    const average=days.length?days.reduce((sum,day)=>sum+day.sold,0)/days.length:null;
    const pending = state.restockRequests.includes(p.id), blocked = p.shelf + incoming >= p.capacity || available <= 0 || pending || !['preparation', 'open'].includes(state.phase);
    return `<div class="shelf-card ${selected === p.id ? 'selected-shelf' : ''}" data-shelf-product="${p.id}"><div class="shelf-title"><button data-select="${p.id}"><span class="product-color" style="background:${p.color}"></span>${p.name}</button><span class="stock-level ${p.shelf < 12 ? 'low' : ''}">${p.shelf} / ${p.capacity} articles en rayon</span></div>${stockAlertPanel(alerts.filter(a=>a.productId===p.id),p.name)}<div class="stock-track"><span style="width:${(p.capacity ? p.shelf / p.capacity * 100 : 0)}%;background:${p.shelf < 12 ? '#e78e5a' : p.color}"></span></div><div class="shelf-meta"><span>En réserve : ${p.reserve} / ${p.reserveCapacity} · Vente : ${euros(p.price)}</span><button class="tiny-button" data-fill-product="${p.id}" ${blocked ? 'disabled' : ''}>${pending ? 'Demandé' : 'Réapprovisionner'}</button><button class="tiny-button" data-view-reserve="${p.id}">Voir la réserve · ${p.reserve} articles</button></div>${reserveStockBar(p)}<div class="shelf-sales"><span>Ventes moyennes / jour</span><strong>${average===null?'—':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(average)+' articles'}</strong><small>${days.length?days.length+' journée(s) clôturée(s)':'Disponible après la première clôture'}</small></div>${shelfAllocation(p)}${incoming ? `<p class="restock-incoming">${incoming} unités en réapprovisionnement</p>` : ''}</div>`;
  }).join('')}${!state.staff.shelves && !robotCount(state) ? '<p class="supply-warning">Affectez un employé ou installez un robot pour remplir les rayons.</p>' : ''}<p class="panel-intro">${shelfFixtureCount(state)} meubles courts installés · ${state.shelfLayout.filter(id => id !== null).length} / ${state.shelfLayout.length} modules affectés. Chaque meuble contient 200 articles. Les agrandissements ajoutent 18 emplacements libres. L’installation des meubles est payée séparément.</p>${expansionPanel('shelves')}`;
}
function equipmentPanel() {
  return `<section class="equipment-section" aria-label="Équipement de réapprovisionnement"><h3>Réserve → rayons</h3><p class="panel-intro">Un employé par équipement. Les achats équipent l’équipe ; les trajets en cours gardent leur matériel jusqu’au retour.</p>${Object.entries(RESTOCK_EQUIPMENT).map(([mode, equipment]) => {
    const unlocked = state.restockUnlocked[mode], active = state.restockMode === mode;
    const blocked = active || !['preparation', 'open'].includes(state.phase) || (!unlocked && (state.money < equipment.cost || !state.restockUnlocked[equipment.requires]));
    const button = active ? 'En service' : unlocked ? 'Utiliser' : !state.restockUnlocked[equipment.requires] ? `${RESTOCK_EQUIPMENT[equipment.requires].name} requis` : `Équiper · ${euros(equipment.cost)}`;
    return `<div class="equipment-card ${active ? 'selected-equipment' : ''}"><div><strong>${equipment.name}</strong><p>${equipment.capacity} unités par trajet · ${mode === 'small' ? 'Inclus au départ' : mode === 'medium' ? 'Inclus au départ' : `Équipe équipée pour ${euros(equipment.cost)}`}</p></div><button class="tiny-button" data-equipment="${mode}" ${blocked ? 'disabled' : ''}>${button}</button></div>`;
  }).join('')}</section>`;
}
function robotPanel() {
  const count=robotCount(state),closed=!['preparation','open'].includes(state.phase);
  const statuses={idle:'Disponible',collecting:'Vers la réserve',loading:'Chargement',outbound:'Vers les rayons',stocking:'Mise en rayon',returning:'Retour'};
  return `<section class="equipment-section robot-section" aria-label="Robots de mise en rayon"><h3>Robots autonomes</h3><div class="equipment-card"><div><strong>Flotte de mise en rayon</strong><p>${RESTOCK_ROBOT.capacity} articles / robot · sans employé</p></div><div class="stepper"><button data-robot-count="${count-1}" aria-label="Retirer un robot" title="Retrait : ${euros(RESTOCK_ROBOT.removal)}" ${closed||!count||state.money<RESTOCK_ROBOT.removal?'disabled':''}>−</button><strong>${count} / ${RESTOCK_ROBOT.limit}</strong><button data-robot-count="${count+1}" aria-label="Acheter un robot" title="Achat : ${euros(RESTOCK_ROBOT.cost)}" ${closed||count===RESTOCK_ROBOT.limit||state.money<RESTOCK_ROBOT.cost?'disabled':''}>+</button></div></div><div class="finance-row"><span>Achat / robot</span><strong>${euros(RESTOCK_ROBOT.cost)}</strong></div><div class="finance-row"><span>Maintenance / robot / jour</span><strong>${euros(RESTOCK_ROBOT.maintenance)}</strong></div><div class="finance-row"><span>Électricité / robot / jour</span><strong>${euros(RESTOCK_ROBOT.electricity)}</strong></div>${count?`<div class="finance-row"><span>Charges de la flotte / jour</span><strong>${euros(count*(RESTOCK_ROBOT.maintenance+RESTOCK_ROBOT.electricity))}</strong></div>${robotWorkers(state).map(w=>`<div class="finance-row"><span>Robot ${w.id-999} · ${statuses[w.phase]}</span><strong>${w.load} / ${RESTOCK_ROBOT.capacity}</strong></div>`).join('')}`:''}</section>`;
}
function quickReserveOrder(product) {
  const quantity = reserveQuantities.get(product.id) || ORDER_MIN_QUANTITY, quote = quoteOrder(product.id, quantity, 'regular');
  const planned = state.eveningBasket.find(line => line.productId === product.id);
  const express=quoteOrder(product.id,quantity,'express'),closed=!['preparation','open'].includes(state.phase);
  return `<section class="reserve-quick-order"><fieldset class="quantity-picker"><legend>Commander · ${product.short}</legend><div class="quantity-grid">${ORDER_QUANTITIES.map(n => `<label class="quantity-tile"><input type="radio" name="reserve-quantity-${product.id}" data-reserve-quantity="${product.id}" value="${n}" ${n === quantity ? 'checked' : ''}><span class="quantity-face"><strong>${n}</strong><small>articles</small></span></label>`).join('')}</div></fieldset><div class="reserve-order-actions"><button data-reserve-express="${product.id}" ${closed||(!state.supplierPayments?.termDays&&express.totalCost>state.money)?'disabled':''}>Express · ${euros(express.totalCost)}<small>30 min · livraison comprise</small></button><button data-quick-grouped="${product.id}" ${closed?'disabled':''}>Ce soir · ${euros(quote.goodsCost)}<small>+ ${euros(GROUPED_DELIVERY_FEE)} de livraison partagée${planned?' · '+planned.quantity+' prévus':''}</small></button></div></section>`;
}
function reservePanel() {
  return `${allProductsButton()}${productScope().map(p => { const reserved = state.restockers.filter(w => workerHasProduct(w,p.id)).reduce((sum,w)=>sum+restockReserved(w,p.id),0) + onlineReserved(state,p.id,'reserve'), outside = outsidePallets(state).filter(line => line.order.productId === p.id), lastDay = state.history.at(-1), activity = lastDay?.products.find(item => item.id === p.id); return `<div class="warehouse-product"><span class="product-color" style="background:${p.color}"></span><div><strong>${p.name}</strong><p>${reserved} unités réservées (rayons et commandes clients)</p>${outside.length ? `<p class="outside-stock">Dehors : ${outside.length} palette${outside.length > 1 ? 's' : ''} · ${outside.reduce((sum, line) => sum + line.pallet.remaining, 0)} unités</p>` : ''}</div><strong>${p.reserve}<small>/ ${p.reserveCapacity} articles en réserve</small></strong>${reserveStockBar(p,'warehouse-reserve-gauge')}${activity ? `<p class="reserve-activity">Jour ${lastDay.day} : ${activity.restocked} unités vers les rayons · ${activity.sold} vendues</p>` : `<p class="reserve-activity">Aucune journée terminée.</p>`}${installationControl('reserve', p.id)}${quickReserveOrder(p)}${discardControls(p, reserved)}</div>`; }).join('')}<p class="panel-intro">Les employés de mise en rayon prennent eux-mêmes les articles dans leur emplacement et chargent leur chariot.</p>${expansionPanel('reserve')}`;
}
function checkoutPanel() {
  const queue=state.customers.filter(c=>c.stage==='queue').length;
  const status=lane=>{const value=checkoutStatus(state,lane);return `<i class="lane-light ${value}" aria-hidden="true"></i>${{available:'libre',busy:'encaissement',unavailable:'indisponible'}[value]}`;};
  return `${installationControl('checkouts')}<div class="checkout-status">${Array.from({length:checkoutCount(state)},(_,i)=>`<span class="checkout-lane">Caisse ${i+1} · ${status(i)}</span>`).join('')}</div>${installationControl('auto')}<div class="checkout-status">${Array.from({length:autoCheckoutCount(state)},(_,i)=>`<span class="checkout-lane">Auto ${i+1} · ${status(autoCheckoutLane(i))}</span>`).join('')}</div><p class="panel-intro">10 articles maximum · supervision par un employé des caisses.</p><div class="finance-row"><span>En attente</span><strong>${queue} clients</strong></div><div class="finance-row"><span>Encaissés aujourd’hui</span><strong>${state.sold} clients</strong></div>${expansionPanel('checkout')}`;
}
function onlineStaffControl() {
  return `<div class="staff-row"><div><strong>Préparation drive / web</strong><p>Prélève les articles, emballe les commandes et remet les sacs aux voitures. ${euros(STAFF_DAILY_WAGE)} / personne / jour.</p></div><div class="stepper"><button data-staff="online" data-delta="-1" aria-label="Retirer un préparateur" ${!state.staff.online ? 'disabled' : ''}>−</button><strong>${state.staff.online}</strong><button data-staff="online" data-delta="1" aria-label="Ajouter un préparateur">+</button></div></div>`;
}
function onlineOrderCard(o) {
  const active = activeOnlineOrder(o), overdue = state.elapsed > o.due;
  const deadline = Math.max(0, o.due - state.elapsed);
  return `<article class="online-order ${overdue && active ? 'late' : ''}"><div class="online-order-title"><strong>${o.channel === 'drive' ? 'Drive' : 'Web'} #${o.id}</strong><span>${ONLINE_STATUSES[o.status]}</span></div><ul class="delivery-contents">${o.lines.map(l => `<li><span>${state.products[l.index].short}</span><strong>${l.quantity} articles</strong></li>`).join('')}</ul><p>${active ? `${onlinePicked(o)} / ${onlineUnits(o)} articles préparés · ${overdue ? 'En retard' : `Échéance dans ${deadline} min`}` : o.paid ? `${o.channel === 'drive' ? 'Remise et encaissée' : 'Expédiée et encaissée'}` : 'Articles libérés ou remis en stock'}${o.car && o.car !== 'departing' ? `<br>Voiture ${o.car === 'arriving' ? 'en approche' : 'au retrait'} · place ${o.slot + 1}` : ''}</p><div class="online-order-title"><strong>${euros(o.value)} TTC${o.fee ? ` · dont ${euros(o.fee)} de livraison` : ''}</strong>${active && o.status !== 'dispatching' ? `<button class="tiny-button" data-cancel-online="${o.id}" aria-label="Annuler la commande ${o.id}">Annuler</button>` : ''}</div></article>`;
}
function onlinePanel() {
  const online = state.online, active = online.orders.filter(activeOnlineOrder), carrier = online.carrier;
  return `<p class="panel-intro">Deux circuits clients alimentés par les mêmes articles que le magasin. Le stock est réservé dès que le panier complet est disponible, puis prélevé article par article. Aucun encaissement à la prise de commande.</p>${Object.entries(ONLINE_CHANNELS).map(([channel,service]) => `<section class="online-service"><h3>${service.name}</h3>${installationControl(channel)}${state.infrastructure[channel] ? `<label class="auto-enable"><input id="online-${channel}" type="checkbox" data-online-enabled="${channel}" ${online.enabled[channel] ? 'checked' : ''}> Accepter de nouvelles commandes</label><p>${channel === 'drive' ? '2 places de retrait dédiées. Le client vient après 75 min ; un préparateur remet ses sacs. Retard maximal : 45 min.' : `Collecte La Poste à ${clock(postCollectionMinute(state))}, une fois par jour. Les colis prêts après le passage partent le lendemain.`}<br>Emballage : ${euros(service.packaging)} / commande.${channel === 'web' ? `<br>Livraison facturée au client : ${euros(service.customerFee)} · transport payé : ${euros(service.transport)} / commande.` : ''}</p><button class="tiny-button" data-test-online="${channel}" ${!online.enabled[channel] ? 'disabled' : ''}>Simuler une commande client</button>` : '<p>Installez cette zone pour ouvrir le service.</p>'}</section>`).join('')}${onlineStaffControl()}${!state.staff.online && active.length ? '<p class="supply-warning">Aucun préparateur affecté : les commandes attendent.</p>' : ''}<div class="finance-row"><span>Commandes terminées aujourd’hui</span><strong>${online.daily.drive} drive · ${online.daily.web} web</strong></div><div class="finance-row"><span>Ventes drive / web TTC</span><strong>${euros(online.daily.sales)}</strong></div><div class="finance-row"><span>Emballage et transport TTC</span><strong>− ${euros(online.daily.expenses)}</strong></div>${carrier ? `<p class="online-carrier">La Poste : ${{arriving:'en approche',loading:'chargement des colis',departing:'en route vers les clients'}[carrier.phase]} · ${carrier.ids.length} commande(s).</p>` : ''}<h3>Commandes en cours · ${active.length}</h3>${active.length ? active.map(onlineOrderCard).join('') : '<p class="panel-intro">Les paniers clients arriveront pendant la journée après ouverture du service. Vous pouvez aussi simuler une commande pour tester la chaîne.</p>'}<details class="online-history"><summary>Dernières commandes terminées ou annulées</summary>${online.orders.filter(o=>!activeOnlineOrder(o)).slice(-10).reverse().map(onlineOrderCard).join('') || '<p>Aucune commande terminée.</p>'}</details>`;
}
function staffPanel() {
  const roles = [['online', 'Préparation drive / web', 'Prélève le panier client, emballe les articles et assure la remise au drive.'], ['shelves', 'Mise en rayon', 'Prend les articles en réserve, charge son chariot et remplit les rayons.'], ['receiving', 'Déchargement des livraisons', 'Transporte une palette entière au transpalette, puis range ses cartons par produit.']];
  return `<p class="panel-intro">Choisissez librement vos effectifs par équipe. Chaque employé coûte 85 € par jour, facturés à la fermeture.</p>${roles.map(([role, name, description]) => `<div class="staff-row"><div><strong>${name}</strong><p>${description}</p></div><div class="stepper"><button data-staff="${role}" data-delta="-1" aria-label="Retirer un employé : ${name}" ${state.staff[role] === 0 ? 'disabled' : ''}>−</button><strong>${state.staff[role]}</strong><button data-staff="${role}" data-delta="1" aria-label="Ajouter un employé : ${name}">+</button></div></div>`).join('')}<p class="staff-free">${staffCount(state)} employés · Salaires : ${euros(staffCount(state) * STAFF_DAILY_WAGE)} / jour</p>${equipmentPanel()}${robotPanel()}`;
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
    return `<div class="delivery-card"><strong>${deliveryVehicle(t).name} · ${t.mode === 'grouped' ? 'Groupage du soir' : t.supplierId==='regular'?'Tournée standard':'Urgence'} · ${t.pallets.length} palette${t.pallets.length > 1 ? 's' : ''}</strong><p>${t.supplier}</p><ul class="delivery-contents" aria-label="Contenu du camion">${contents}</ul><details class="pallet-breakdown" data-pallets="${t.id}"><summary>${t.pallets.length === 1 ? 'Contenu de la palette' : `Contenu des ${t.pallets.length} palettes`}</summary><ol>${palletDetails}</ol></details><p>${t.phase === 'enroute' ? t.arrivalDay?`Arrivée · ${t.arrivalDay===state.day?'aujourd’hui':t.arrivalDay===state.day+1?'demain':'jour '+t.arrivalDay} à ${clock(t.arrivalMinute)}`:`Arrivée dans ${Math.max(0,t.eta-state.elapsed)} min` : `${names[t.phase]}${t.bay !== null ? ` · Quai ${t.bay + 1}` : ''}`}</p>${t.phase === 'docked' ? `<p>${remaining} unités dans le camion · ${carried} en transport ou rangement</p>` : ''}${blocked ? `<p class="supply-warning">${outsideSlotsUsed(state) >= outsideCapacity(state) ? 'Tampon extérieur plein. Libérez le stock du produit pour poursuivre.' : 'Stock saturé : les palettes seront déposées dans le tampon extérieur.'}</p>` : ''}</div>`;
  }).join('');
}
function outsidePanel() {
  const outside = outsidePallets(state);
  return `${installationControl('bays')}${installationControl('outside', undefined, 5)}<h3 class="delivery-heading">Tampon extérieur · ${outside.length} / ${outsideCapacity(state)} palettes</h3><p class="panel-intro">${outsideSlotsUsed(state) - outside.length} place(s) réservée(s) aux trajets. Les palettes attendent dehors si l’emplacement du produit est plein. Le déchargement continue ; les employés les rangent dès qu’une palette entière peut entrer.</p>${outside.length ? `<ul class="delivery-contents">${[...new Set(outside.map(line => line.order.productId))].map(id => { const lines = outside.filter(line => line.order.productId === id); return `<li><span>${PRODUCTS.find(p => p.id === id).name} · ${lines.length} palette(s)</span><strong>${lines.reduce((sum, line) => sum + line.pallet.remaining, 0)} unités</strong></li>`; }).join('')}</ul>` : ''}`;
}
function eveningBasketPanel() {
  const quote = quoteEveningBasket(state);
  return `<h3 class="delivery-heading">Commande groupée · envoi à la fermeture</h3>${quote.groups.length ? quote.groups.map(group => `<div class="evening-group"><strong>${group.supplier}</strong>${group.lines.map(line => `<div class="evening-line"><span>${PRODUCTS.find(p => p.id === line.productId).short} · ${line.quantity} unités</span><button class="tiny-button" data-remove-evening="${line.productId}" aria-label="Retirer ${PRODUCTS.find(p => p.id === line.productId).name} du groupage">Retirer</button></div>`).join('')}<p>Marchandises ${euros(group.goodsCost)} + livraison mutualisée ${euros(group.deliveryFee)}</p></div>`).join('') + `<div class="price-preview"><span>À payer ce soir</span><strong>${euros(quote.totalCost)}</strong></div>` : '<p class="panel-intro">Panier vide. Ajoutez les produits depuis leur stock en réserve. Aucun achat n’est déclenché sans article prévu.</p>'}${state.eveningError ? `<p class="supply-warning">${state.eveningError}</p>` : ''}`;
}
const orderMode = () => document.querySelector('input[name="order-mode"]:checked')?.value || 'grouped';
const orderQuantity = () => Number(document.querySelector('input[name="order-quantity"]:checked')?.value);
function quantityChoices(value = ORDER_MIN_QUANTITY) {
  return `<fieldset class="quantity-picker"><legend>Quantité · articles</legend><p>${ARTICLES_PER_PALLET} articles · ${ARTICLES_PER_PALLET/12} cartons · 1 palette complète</p><div class="quantity-grid">${ORDER_QUANTITIES.map(n => `<label class="quantity-tile"><input type="radio" name="order-quantity" value="${n}" ${n === value ? 'checked' : ''} required aria-label="${n} unités"><span class="quantity-face"><strong>${n}</strong><small>${Math.ceil(n/12)} carton${n>12?'s':''}</small><small>${n<ARTICLES_PER_PALLET?'Palette partielle':`${Math.floor(n/ARTICLES_PER_PALLET)} palette${n>=ARTICLES_PER_PALLET*2?'s':''}${n%ARTICLES_PER_PALLET?' + reste':''}`}</small></span></label>`).join('')}</div></fieldset>`;
}
function supplierPanel() {
  const productId = selected || PRODUCTS[0].id;
  return `<button class="tiny-button dock-camera" data-focus-dock>Voir les quais</button><section class="delivery-list"><h3 class="delivery-heading">Camions et livraisons en cours</h3><div id="deliveries">${deliveryCards()}</div></section><section id="outside-stock">${outsidePanel()}</section><section id="evening-basket">${eveningBasketPanel()}</section><h3 class="delivery-heading">Commander pour la réserve</h3><form class="order-form" id="order-form"><fieldset class="delivery-mode-picker"><legend>Type de commande</legend><label><input type="radio" name="order-mode" value="grouped" checked><span><strong>Groupée ce soir</strong><small>Envoi à la fermeture · livraison 10 € · demain matin</small></span></label><label><input type="radio" name="order-mode" value="flash"><span><strong>Flash</strong><small>30 min · livraison 150 €</small></span></label></fieldset><label for="order-product">Produit</label><select id="order-product">${PRODUCTS.map(p => `<option value="${p.id}" ${p.id === productId ? 'selected' : ''}>${p.name}</option>`).join('')}</select><label for="order-supplier">Fournisseur</label><select id="order-supplier"><option value="regular">Centrale Nord · tournée du matin</option><option value="express">Express Marché · urgence · 30 min</option></select>${quantityChoices()}<div id="order-breakdown"></div><div class="price-preview"><span id="order-total-label">Panier du soir après ce choix</span><strong id="order-total"></strong></div><div id="quantity-tiers"></div><button class="primary" type="submit">Ajouter au groupage du soir</button><p class="panel-intro" id="order-mode-hint"></p></form>`;
}
function expansionPanel(zone) {
  const level = state.expansions[zone], cost = STORE_EXPANSIONS[zone].costs[level];
  const benefit = zone === 'checkout' ? `${4 + (state.expansions.checkout + 1) * 2} emplacements de caisse, à équiper séparément` : zone === 'shelves' ? `18 modules supplémentaires de 200 articles, à installer séparément` : `${1 + state.expansions.reserve + 1} racks possibles par famille, un niveau supplémentaire par rack, un quai supplémentaire et 15 places extérieures possibles. Installation séparée.`;
  return `<div class="investment"><h3>Agrandir · ${STORE_EXPANSIONS[zone].name}</h3><p>${cost === undefined ? 'Agrandissement maximal atteint.' : benefit}</p><button data-expand="${zone}" ${cost === undefined || state.money < cost || !['preparation', 'open'].includes(state.phase) ? 'disabled' : ''}>${cost === undefined ? 'Zone agrandie au maximum' : `Agrandir · ${euros(cost)}`}</button></div>`;
}
function discardControls(product, reserved) {
  const available = product.reserve - reserved;
  if (available <= 0) return '';
  const quantities = [...new Set([1, 12, 24, 48, available])].filter(n => n <= available).sort((a, b) => a - b);
  return `<details class="discard-controls" data-product="${product.id}"><summary>Jeter du stock</summary><p>Sans remboursement. Les articles déjà réservés aux chargements sont protégés.</p><div><select id="discard-quantity-${product.id}" aria-label="Quantité à jeter : ${product.name}">${quantities.map(n => `<option value="${n}">${n === available ? `Tout le stock disponible · ${n}` : `${n} unité${n > 1 ? 's' : ''}`}</option>`).join('')}</select><button data-discard="${product.id}">Jeter</button></div></details>`;
}
function financeHistory() {
  const marginCell=(day,afterCharges=false)=>{
    if(!day.stock)return '<td>—</td>';
    const salesHT=day.sales-day.vatCollected,margin=salesHT-day.stock.costOfSalesHT-(afterCharges?day.expenses:0);
    const rate=salesHT>0?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(margin/salesHT*100)+' %':'—';
    return `<td class="${margin<0?'negative':'positive'}">${euros(margin)}<small style="display:block">${rate}</small></td>`;
  };
  return `<section class="finance-history"><h3>Suivi des journées précédentes</h3>${state.history.length ? `<div class="finance-table-scroll" tabindex="0" role="region" aria-label="Historique financier, défilement horizontal"><table><caption>Journées clôturées · montants en euros · marges en % des ventes HT</caption><thead><tr><th scope="col">Jour</th><th scope="col">Résultat net</th><th scope="col">Ventes HT</th><th scope="col" title="Ventes HT moins coût des articles vendus">Marge brute</th><th scope="col" title="Marge brute moins charges quotidiennes et rémunération du directeur, avant les autres frais et l’impôt">Marge après charges communes</th><th scope="col">Drive / web TTC</th><th scope="col">Commandes drive / web</th><th scope="col">Achats facturés HT</th><th scope="col">Stock restant HT</th><th scope="col">Coût des ventes HT</th><th scope="col">Charges + salaire</th><th scope="col">Dont maintenance</th><th scope="col">Impôt</th><th scope="col">TVA due</th><th scope="col">Trésorerie Δ</th></tr></thead><tbody>${[...state.history].reverse().map(day => `<tr><th scope="row">${day.day}</th><td class="${day.netProfit < 0 ? 'negative' : 'positive'}">${euros(day.netProfit)}</td><td>${euros(day.sales - day.vatCollected)}</td>${marginCell(day)}${marginCell(day,true)}<td>${euros(day.online?.sales || 0)}</td><td>${day.online?.drive || 0} / ${day.online?.web || 0}</td><td>${euros(day.spending - day.vatDeductible)}</td><td>${day.stock?euros(day.stock.closingHT):'—'}</td><td>${day.stock?euros(day.stock.costOfSalesHT):'—'}</td><td>${euros(day.expenses)}</td><td>${euros(day.maintenance || 0)}</td><td>${euros(day.profitTax)}</td><td>${euros(day.vatCharged)}</td><td>${euros(day.net)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="panel-intro">Le premier bilan apparaîtra à la clôture de la journée.</p>'}<p class="finance-note">Résultat net : ventes HT moins coût des articles vendus, pertes de stock, transport, services, investissements, charges, salaire et impôt. Le stock restant est valorisé séparément. La variation de trésorerie inclut les apports et les taxes effectivement payées, même celles des jours précédents.</p></section>`;
}
function stockAlertPanel(alerts,productName) {
 if(!alerts.length)return '';
 return `<div class="shelf-alerts" role="group" aria-label="Alertes · ${productName}">${alerts.map(a=>{const message=a.message.split(' · ')[1];return `<span class="shelf-alert ${a.severity}"><span aria-hidden="true">⚠</span> ${message[0].toUpperCase()+message.slice(1)}</span>`;}).join('')}</div>`;
}

function securityPanel() {
 const r=theftReport(state),d=r.daily;
 return `<section class="security-panel"><h3>Vol et surveillance</h3><div class="finance-row"><span>Taux de vol par article · caisses</span><strong>${(r.rates.staffed*100).toFixed(1)} %</strong></div><div class="finance-row"><span>Caisse automatique</span><strong>${(r.rates.automatic*100).toFixed(1)} %</strong></div><div class="size-options">${Object.entries(SECURITY_LEVELS).map(([key,level])=>`<button data-security="${key}" aria-pressed="${r.level===key}" ${r.level===key?'disabled':''}><strong>${level.name}</strong><span>${euros(level.daily)} / jour</span><small>${euros(Math.max(0,level.install-SECURITY_LEVELS[r.level].install))} à installer</small></button>`).join('')}</div><div class="finance-row"><span>Articles volés aujourd’hui</span><strong>${d.stolen} / ${d.checked} articles passés en caisse</strong></div><div class="finance-row"><span>Dont caisse automatique</span><strong>${d.autoStolen}</strong></div><div class="finance-row"><span>Ventes perdues TTC</span><strong>${euros(d.lostRevenue)}</strong></div><div class="finance-row"><span>Valeur d’achat des articles volés</span><strong>${euros(d.lostCost)}</strong></div><p class="panel-intro">Les articles volés sortent du stock sans être payés. Les ventes affichées intègrent déjà cette perte.</p></section>`;
}
function gradeScale(grade,label) {
 return `<div class="grade-scale" role="img" aria-label="${label} : note ${grade} sur une échelle de A à E">${['A','B','C','D','E'].map(letter=>`<span class="grade-cell grade-${letter.toLowerCase()} ${letter===grade?'is-active':''}" aria-hidden="true">${letter}</span>`).join('')}</div>`;
}
function satisfactionPanel() {
 const r=satisfactionReport(state),number=n=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(n);
 return `<div class="satisfaction-global"><h3>Note globale</h3>${gradeScale(r.grade,'Satisfaction globale')}</div><section class="satisfaction-card"><h3>Disponibilité des articles</h3>${gradeScale(r.indicators.availability.grade,'Disponibilité des articles')}<p>${r.unavailable.length?`${r.unavailable.length} rayon(s) en rupture.`:'Tous les rayons ont du stock.'}</p></section><section class="satisfaction-card"><h3>Attente aux caisses</h3>${gradeScale(r.indicators.waiting.grade,'Attente aux caisses')}<p>${number(r.averageWait)} min d’attente moyenne · ${r.currentQueue} client(s) en file.</p></section><section class="satisfaction-card"><h3>Achats aboutis</h3>${gradeScale(r.indicators.purchases.grade,'Achats aboutis')}<p>${state.lost} départ(s) sans achat aujourd’hui.</p></section>`;
}

function sizePicker() {
  return `<section class="size-picker"><h3>Local · ${new Intl.NumberFormat('fr-FR').format(shopArea(state))} m²</h3><div class="size-options">${Object.entries(STORE_SIZES).map(([key,size])=>{const candidate={...state,storeSize:key},cost=Math.max(0,size.lease-STORE_SIZES[state.storeSize||'standard'].lease);return `<button data-store-size="${key}" aria-pressed="${key===state.storeSize}" ${key===state.storeSize?'disabled':''}><strong>${size.name}</strong><span>${new Intl.NumberFormat('fr-FR').format(shopArea(candidate))} m² · ${euros(premisesCosts(candidate).total)} / jour</span><small>${cost?euros(cost)+' de travaux':'Sans frais de changement'}</small></button>`;}).join('')}</div></section>`;
}
function stockAccountingRows(stock) {
 if(!stock)return '';
 return `<div class="finance-row"><span>Valorisation du stock</span><strong>${euros(stock.closingHT)}</strong></div>`;
}
function supplierInvoicesPanel() {
 const p=supplierPaymentReport(state);
 return `<section class="supplier-invoices"><h3>Paiement des fournisseurs</h3><label for="supplier-term">Prochaines commandes</label><select id="supplier-term">${[0,7,30].map(days=>`<option value="${days}" ${days===p.termDays?'selected':''}>${days?'À J+'+days:'Comptant'}</option>`).join('')}</select><div class="finance-row"><span>Factures restant à payer</span><strong>${euros(p.outstanding)}</strong></div><div class="finance-row"><span>Dont échues</span><strong>${euros(p.due)}</strong></div><div class="finance-row"><span>Fournisseurs réglés aujourd’hui</span><strong>${euros(p.paidToday)}</strong></div>${p.invoices.length?`<details><summary>Voir les ${p.invoices.length} facture${p.invoices.length===1?'':'s'}</summary>${p.invoices.map(i=>`<div class="supplier-invoice"><div><strong>${SUPPLIERS[i.supplierId].name} · #${i.id}</strong><small>${i.dueDay<state.day?'En retard depuis le jour '+i.dueDay:i.dueDay===state.day?'À payer ce soir':'Échéance · jour '+i.dueDay}</small></div><strong>${euros(i.remaining)}</strong><button class="tiny-button" data-pay-supplier="${i.id}" ${state.money<=0?'disabled':''}>Régler</button></div>`).join('')}</details>`:''}</section>`;
}
function personalMoneyPanel() {
  const profit=dailyProfitability(state);
  return `<section class="personal-account"><h3>Mon compte</h3><div class="finance-row"><span>Solde personnel</span><strong>${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:5}).format(state.personalCash/1000)} k€</strong></div><form id="director-salary-form"><label for="director-salary">Salaire brut annuel · k€</label><div class="personal-transfer"><input id="director-salary" type="number" min="0" max="365" step="0.001" required value="${Math.round(state.directorSalary*365)/1000}"><button type="submit">Enregistrer</button></div></form><div class="finance-row"><span>Brut par jour · base 365 jours</span><strong>${euros(state.directorSalary)}</strong></div><form id="director-profit-share-form"><label for="director-profit-share">Part du bénéfice avant impôt · %</label><div class="personal-transfer"><input id="director-profit-share" type="number" min="0" max="100" step="1" required value="${state.directorProfitShare??0}"><button type="submit">Enregistrer</button></div></form><div class="finance-row"><span>Prime du jour · estimée</span><strong>${euros(profit.profitSharePaid)}</strong></div><div class="finance-row"><span>Total du jour · estimé</span><strong>${euros(profit.salaryPaid+profit.profitSharePaid)}</strong></div><p class="panel-intro">Versement à la fermeture, selon la trésorerie. Prime sur le bénéfice positif après charges et salaire fixe, avant impôt.</p><form id="personal-reinvest-form"><label for="personal-reinvest">Investir dans le magasin · k€</label><div class="personal-transfer"><input id="personal-reinvest" type="number" min="0.00001" max="${state.personalCash/1000}" step="0.00001" required placeholder="Montant libre" aria-label="Investissement dans le magasin en k€"><button type="submit" ${state.personalCash<=0?'disabled':''}>Investir</button></div></form>${state.personalTransactions.length ? `<details><summary>Mouvements du compte</summary>${state.personalTransactions.slice(0, 6).map(t => `<div class="finance-row"><span>Jour ${t.day} · ${t.label}</span><strong>${t.amount > 0 ? '+' : '−'} ${euros(Math.abs(t.amount))}</strong></div>`).join('')}</details>` : ''}</section>`;
}
function hoursPanel() {
  const configured=nextStoreHours(state),today=storeHours(state),pending=today.open!==configured.open||today.close!==configured.close;
  return `<section class="store-hours"><h3>Horaires du magasin</h3><form id="store-hours-form"><div class="hours-fields"><label>Ouverture<input id="store-opening" type="time" min="05:00" max="22:00" step="900" required value="${clock(configured.open)}"></label><label>Fermeture<input id="store-closing" type="time" min="06:00" max="23:00" step="900" required value="${clock(configured.close)}"></label></div><button type="submit">Enregistrer</button></form><p class="panel-intro">Aujourd’hui : ${clock(today.open)} – ${clock(today.close)}.${pending?` Dès demain : ${clock(configured.open)} – ${clock(configured.close)}.`:''}</p></section>`;
}
function financePanel() {
  const profit=dailyProfitability(state),taxes=state.vatDue+state.profitTaxDue;
  const row=(label,value)=>`<div class="finance-row"><span>${label}</span><strong>${euros(value)}</strong></div>`;
  return `<div class="finance-row profit-row"><span>Résultat du jour · estimé</span><strong class="${profit.netProfit<0?'negative':'positive'}">${euros(profit.netProfit)}</strong></div>${row('Trésorerie',state.money)}${row('Ventes aujourd’hui',state.sales)}${stockAccountingRows(profit.stock)}${row('Charges quotidiennes',dailyCosts(state))}<details class="finance-details"><summary>Détail des charges</summary>${row('Salaires de l’équipe',staffCount(state)*STAFF_DAILY_WAGE)}${row('Maintenance des installations',maintenanceCosts(state).total)}${premisesCosts(state).rows.map(r=>row(r.name,r.cost)).join('')}</details><button class="history-open" data-history-open>Suivi des journées · ${state.history.length} bilan(s)</button>${supplierInvoicesPanel()}<section class="tax-account"><h3>TVA et impôt</h3>${row('TVA à payer',state.vatDue)}${row('Impôt à payer',state.profitTaxDue)}<details><summary>Détail de la TVA</summary>${row('TVA collectée',state.vatCollected)}${row('TVA déductible',state.vatDeductible)}${row('Crédit de TVA',state.vatCredit)}</details><label class="auto-enable"><input id="auto-pay-taxes" type="checkbox" ${state.autoPayTaxes?'checked':''}>Paiement automatique à la fermeture</label><button data-pay-taxes ${taxes<=0||state.money<=0?'disabled':''}>Payer · ${euros(taxes)}</button></section><details class="finance-settings"><summary>Local et horaires</summary>${sizePicker()}${hoursPanel()}</details><details class="finance-settings"><summary>Surveillance</summary>${securityPanel()}</details>${state.history.length?'<button data-view-summary>Dernier bilan</button>':''}`;
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
    $('order-total-label').textContent = grouped ? 'Panier du soir après ce choix' : 'Facturé maintenant';
    $('order-supplier').disabled = !grouped;
    $('order-form').querySelector('button[type="submit"]').textContent = grouped ? state.eveningBasket.some(line => line.productId === p.id) ? 'Mettre à jour le groupage du soir' : 'Ajouter au groupage du soir' : 'Commander la livraison flash';
    $('order-mode-hint').textContent = grouped ? 'Facturation et envoi à la fermeture. Un lot par produit : un nouveau choix remplace sa quantité prévue. Livraison le lendemain matin.' : 'Arrivée après 30 minutes en camionnette ou petit porteur, selon le volume. Règlement selon le délai choisi dans Finances.';
    $('order-breakdown').innerHTML = `<div class="quote-row"><span>Prix unitaire TTC · remise ${Math.round(quote.discountRate * 100)} %</span><strong>${euros(quote.unitPrice)}</strong></div><div class="quote-row"><span>Marchandises</span><strong>${euros(quote.goodsCost)}</strong></div><div class="quote-row"><span>${grouped ? 'Livraison mutualisée par fournisseur' : 'Frais de livraison'}</span><strong>${euros(quote.deliveryFee)}</strong></div><div class="quote-row"><span>${grouped ? 'Coût livré si commandé seul' : 'Coût livré par unité'}</span><strong>${euros(quote.landedUnitCost)}</strong></div>${quote.landedUnitCost > p.price ? '<p class="supply-warning">Le coût livré dépasse le prix de vente de ce produit.</p>' : ''}`;
  } catch { $('order-total').textContent = '—'; $('order-breakdown').innerHTML = '<p class="panel-intro">Choisissez une quantité entière, entre 240 et 1 000.</p>'; }
  $('quantity-tiers').innerHTML = `<table class="quantity-tiers"><caption>Comparer les quantités · commande seule</caption><thead><tr><th>Unités</th><th>Prix / unité</th><th>Livré / unité</th></tr></thead><tbody>${ORDER_QUANTITIES.map(n => { const base = quoteOrder(p.id, n, supplierId), fee = orderMode() === 'grouped' ? GROUPED_DELIVERY_FEE : base.deliveryFee, q = { ...base, landedUnitCost: Math.round((base.goodsCost + fee) / n * 100) / 100 }; return `<tr${n === quantity ? ' class="selected-tier"' : ''}><td>${n}</td><td>${euros(q.unitPrice)}</td><td>${euros(q.landedUnitCost)}</td></tr>`; }).join('')}</tbody></table>`;
}
function renderPanel(force = false) {
  if ($('management-panel').hidden) return;
  if(!force&&(panelPointerHeld||$('management-content').contains(document.activeElement)&&document.activeElement.matches('input:not([type=checkbox]):not([type=radio]),select,textarea')))return;
  if (tab === 'fournisseurs' && !force && $('order-form')) {
    updateSection('deliveries', deliveryCards());
    updateSection('evening-basket', eveningBasketPanel());
    updateSection('outside-stock', outsidePanel());
    previewOrder(); return;
  }
  const html = tab === 'satisfaction' ? satisfactionPanel() : tab === 'rayons' ? stockPanel() : tab === 'reserve' ? reservePanel() : tab === 'caisses' ? checkoutPanel() : tab === 'equipes' ? staffPanel() : tab === 'finances' ? financePanel() : tab === 'personnel' ? personalMoneyPanel() : tab === 'online' ? onlinePanel() : supplierPanel();
  if (force || html !== lastPanel) {
    const content = $('management-content'), preserve = !!lastPanel;
    const values = preserve ? [...content.querySelectorAll(force?'select[id]':'select[id],input[id]:not([type=checkbox]):not([type=radio]),textarea[id]')].map(input => [input.id, input.value]) : [];
    const openDetails = new Set(preserve ? [...content.querySelectorAll('details[open]')].map(d => d.dataset.product || d.querySelector('summary').textContent) : []);
    const focusId = content.contains(document.activeElement) ? document.activeElement.id : null;
    content.innerHTML = html; lastPanel = html;
    for (const [id, value] of values) { const input = $(id); if (input && (input.tagName!=='SELECT'||[...input.options].some(option => option.value === value))) input.value = value; }
    content.querySelectorAll('details').forEach(d => { d.open = openDetails.has(d.dataset.product || d.querySelector('summary').textContent); });
    if (focusId && $(focusId)) $(focusId).focus({ preventScroll: true });
  }
  if (tab === 'fournisseurs') previewOrder();
}
function render(force=false) {
  const alerts=stockAlerts(state),keys=new Set(alerts.map(a=>a.key)),fresh=alerts.filter(a=>a.severity==='critical'&&!stockAlertKeys.has(a.key));
  $('stock-alert-status').hidden=!alerts.length;$('stock-alert-status').textContent=alerts.length?`⚠ ${alerts.length} alerte(s) · ${alerts.slice(0,2).map(a=>a.message).join(' · ')}`:'';
  $('stock-alert-status').classList.toggle('critical',alerts.some(a=>a.severity==='critical'));
  if(saveManager?.ready&&fresh.length)notice(fresh.map(a=>a.message).join(' · '),true);stockAlertKeys=keys;

  $('day-label').textContent = `Jour ${state.day}`; $('clock').textContent = clock(state.minute);
  $('phase-label').textContent = { preparation: 'Préparation', open: state.speed ? 'Ouvert' : 'En pause', closed: 'Fermé', bankrupt: 'Trésorerie épuisée' }[state.phase];
  $('money').textContent = euros(state.money); $('money').classList.toggle('negative', state.money < 0);
  $('sales').textContent = euros(state.sales);
  const profit = dailyProfitability(state);
  $('daily-profit').textContent = euros(profit.netProfit);
  $('daily-profit').classList.toggle('negative', profit.netProfit < 0);
  $('daily-profit').classList.toggle('positive', profit.netProfit >= 0);
  $('daily-profit').parentElement.title = 'Résultat net estimé : ventes HT moins coût des articles vendus, pertes, services, charges et impôt. Le stock restant est valorisé.';
  $('customers').textContent = state.customers.length;
  const queueCount = state.customers.filter(c => c.stage === 'queue').length;
  const satisfaction=satisfactionReport(state);
  $('satisfaction').textContent = satisfaction.grade;
  $('satisfaction').dataset.grade=satisfaction.grade.toLowerCase();
  $('customers').parentElement.title = `${queueCount} en attente de caisse · ${state.sold} clients encaissés`;
  $('money').parentElement.title = `Charges quotidiennes : ${euros(dailyCosts(state))}`;
  $('satisfaction').parentElement.title = `Note globale ${satisfaction.grade} · disponibilité ${satisfaction.indicators.availability.grade}, attente ${satisfaction.indicators.waiting.grade}, achats aboutis ${satisfaction.indicators.purchases.grade}`;
  const empty = state.products.filter(p => p.capacity>0 && p.shelf < 12).length;
  $('store-status').textContent = state.phase === 'preparation' ? `Préparation du magasin · ouverture à ${clock(storeHours(state).open)}.` : ['preparation','open'].includes(state.phase) ? empty ? `${empty} rayon${empty > 1 ? 's' : ''} à court de produits. Vérifiez la réserve et les livraisons.` : queueCount >= 8 ? 'Les files s’allongent. Renforcez les équipes aux caisses.' : 'Le magasin est ouvert. Cliquez sur un rayon pour suivre son stock.' : 'La journée est terminée. Consultez le bilan.';
  document.querySelectorAll('[data-speed]').forEach(b => { b.classList.toggle('active', Number(b.dataset.speed) === state.speed); b.disabled = !['preparation','open'].includes(state.phase); });
  $('main-action').textContent = { preparation: state.speed?'Mettre en pause':'Reprendre la préparation', open: state.speed ? 'Mettre en pause' : 'Reprendre la journée', closed: 'Voir le bilan', bankrupt: 'Voir le bilan' }[state.phase];
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
  renderPanel(force);
  if (state.phase === 'bankrupt' && state.summary && !$('day-summary').open) showSummary();
}
function showSummary() {
  const s = state.history.at(-1); if (!s) return;
  $('summary-title').textContent = `Bilan du jour ${s.day}`;
  $('summary-body').innerHTML = `<div class="finance-row"><span>Ventes encaissées TTC</span><strong>${euros(s.sales)}</strong></div>${s.contribution ? `<div class="finance-row"><span>Apport du compte personnel</span><strong>+ ${euros(s.contribution)}</strong></div>` : ''}<div class="finance-row"><span>Achats facturés, transport et investissements TTC</span><strong>${euros(s.spending)}</strong></div><div class="finance-row"><span>Achats et services effectivement payés TTC</span><strong>− ${euros(s.cashSpending??s.spending)}</strong></div><div class="finance-row"><span>Charges de fonctionnement</span><strong>− ${euros(s.expenses - s.salaryPaid - (s.profitSharePaid||0))}</strong></div><div class="finance-row"><span>Salaire versé au directeur</span><strong>− ${euros(s.salaryPaid)}</strong></div><div class="finance-row"><span>Part des bénéfices versée au directeur</span><strong>− ${euros(s.profitSharePaid||0)}</strong></div><div class="finance-row"><span>Taxes effectivement payées</span><strong>− ${euros(s.taxPaid)}</strong></div><p class="finance-note">Taxes calculées pour ce jour : TVA ${euros(s.vatCharged)} · impôt ${euros(s.profitTax)}. Les montants impayés restent dans Finances.</p>${stockAccountingRows(s.stock,s.otherExpensesHT)}${s.suppliers?`<div class="finance-row"><span>Fournisseurs réglés TTC</span><strong>${euros(s.suppliers.paidToday)}</strong></div><div class="finance-row"><span>Factures fournisseurs restantes</span><strong>${euros(s.suppliers.outstanding)}</strong></div>`:''}<div class="finance-row"><span>Résultat net après impôt</span><strong class="${s.netProfit < 0 ? 'negative' : 'positive'}">${euros(s.netProfit)}</strong></div><div class="summary-result ${s.net < 0 ? 'negative' : ''}">Variation de trésorerie : <strong>${euros(s.net)}</strong></div><p class="summary-message">${s.sold} clients encaissés · ${s.lost} départs sans achat.<br>${state.phase === 'bankrupt' ? 'Le magasin ne peut plus couvrir ses charges. Commencez une nouvelle partie pour essayer une autre organisation.' : `Le magasin continue au jour ${state.day}. Trésorerie actuelle : ${euros(state.money)}.`}</p>`;
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
document.querySelectorAll('[data-speed]').forEach(b => b.addEventListener('click', () => { if (['preparation','open'].includes(state.phase) && saveManager?.ready) { state.speed = Number(b.dataset.speed); render(); saveManager.changed(); } }));
document.querySelector('.tabs').addEventListener('keydown', e => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  const buttons = [...document.querySelectorAll('[data-tab]')], i = buttons.indexOf(document.activeElement);
  const index = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
  e.preventDefault(); buttons[index].focus(); switchTab(buttons[index].dataset.tab);
});
$('main-action').addEventListener('click', () => {
  if (!saveManager?.ready) return;
  if (['preparation','open'].includes(state.phase)) { state.speed = state.speed ? 0 : 1; render(); saveManager?.changed(); }
  else showSummary();
});
$('management-content').addEventListener('click', e => {
  if(e.target.closest('[data-history-open]')){historyDialog.querySelector('.history-body').innerHTML=financeHistory();historyDialog.showModal();}
  const supplierPay=e.target.closest('[data-pay-supplier]');if(supplierPay)act(()=>{if(state.money<=0)throw new Error('Trésorerie insuffisante.');return paySupplierInvoices(state,Number(supplierPay.dataset.paySupplier));},'Facture réglée selon la trésorerie disponible.');
  const testOnline = e.target.closest('[data-test-online]'), cancelOnline = e.target.closest('[data-cancel-online]');
  if (testOnline) act(() => createOnlineOrder(state,testOnline.dataset.testOnline,[{productId:'produce',quantity:3},{productId:'grocery',quantity:4},{productId:'drinks',quantity:2}]), 'Commande client reçue.');
  if (cancelOnline) act(() => cancelOnlineOrder(state,Number(cancelOnline.dataset.cancelOnline)), 'Commande annulée et articles libérés.');
  const alert=e.target.closest('[data-stock-alert-product]');if(alert){selected=alert.dataset.stockAlertProduct;switchTab(alert.dataset.stockAlertView);}
  const security=e.target.closest('[data-security]');if(security)act(()=>setSecurityLevel(state,security.dataset.security),'Surveillance mise à jour.');
  const size=e.target.closest('[data-store-size]');if(size){const previous=state.speed;state.speed=0;const result=act(()=>setStoreSize(state,size.dataset.storeSize),'Local mis à jour.');if(!result)state.speed=previous;}
  const express=e.target.closest('[data-reserve-express]');if(express)act(()=>placeOrder(state,express.dataset.reserveExpress,reserveQuantities.get(express.dataset.reserveExpress)||ORDER_MIN_QUANTITY,'express'),'Commande express envoyée.');
  const installation = e.target.closest('[data-install-kind]');
  if (installation) act(() => setInstallation(state, installation.dataset.installKind, Number(installation.dataset.installCount), installation.dataset.installProduct), 'Installations mises à jour.');
  const fixture = e.target.closest('[data-fixtures]');
  if (fixture) act(() => setShelfCount(state, fixture.dataset.fixtures, state.shelfLayout.filter(id => id === fixture.dataset.fixtures).length + Number(fixture.dataset.delta)), 'Affectation du mobilier mise à jour.');
  const quick = e.target.closest('[data-quick-grouped]');
  if (quick) act(() => queueEveningOrder(state, quick.dataset.quickGrouped, reserveQuantities.get(quick.dataset.quickGrouped) || ORDER_MIN_QUANTITY, 'regular'), 'Lot ajouté au groupage du soir. Facturation à la fermeture.');
  const expansion = e.target.closest('[data-expand]'), discard = e.target.closest('[data-discard]');
  if (expansion) act(() => expandStore(state, expansion.dataset.expand), 'Agrandissement terminé.');
  if (discard) act(() => discardReserve(state, discard.dataset.discard, Number($(`discard-quantity-${discard.dataset.discard}`).value)), 'Stock jeté.');
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
    if (result) notice(result.waitingForStaff ? 'Remplissage demandé. Affectez un employé ou installez un robot.' : 'Remplissage prioritaire demandé.');
  }
  if (reserve) { selected = reserve.dataset.viewReserve; switchTab('reserve'); }
  if (e.target.closest('[data-all-products]')) { selected = null; switchTab(tab); }
  if (e.target.closest('[data-view-summary]')) showSummary();
  if (equipment) act(() => selectRestockEquipment(state, equipment.dataset.equipment), 'Équipement choisi pour les prochains chargements.');
  const robot=e.target.closest('[data-robot-count]');
  if(robot)act(()=>setRobotCount(state,Number(robot.dataset.robotCount)),'Flotte de robots mise à jour.');
  if (e.target.closest('#buy-auto')) act(() => buyAutoCheckout(state), 'Caisse automatique installée.');
});
$('management-content').addEventListener('input', previewOrder);
$('management-content').addEventListener('change', e => {
  if(e.target.id==='supplier-term')act(()=>setSupplierPaymentTerm(state,Number(e.target.value)),'Délai appliqué aux prochaines commandes.');
  if (e.target.dataset.onlineEnabled) act(() => setOnlineEnabled(state,e.target.dataset.onlineEnabled,e.target.checked));
  if (e.target.dataset.reserveQuantity) { reserveQuantities.set(e.target.dataset.reserveQuantity, Number(e.target.value)); renderPanel(); }
  if (e.target.id === 'auto-pay-taxes') act(() => setAutomaticTaxPayment(state, e.target.checked));
  if (e.target.id === 'order-product') selected = e.target.value;
  if (e.target.name === 'order-mode') $('order-supplier').value = e.target.value === 'flash' ? 'express' : 'regular';
  previewOrder();
});
$('management-content').addEventListener('submit', e => {
  if(e.target.id==='personal-reinvest-form'){e.preventDefault();act(()=>reinvestPersonalCash(state,Math.round(Number($('personal-reinvest').value)*100000)/100),'Argent investi dans le magasin.');}
  if(e.target.id==='director-profit-share-form'){e.preventDefault();act(()=>setDirectorProfitShare(state,Number($('director-profit-share').value)),'Part des bénéfices enregistrée.');}
  if(e.target.id==='store-hours-form'){e.preventDefault();const minute=id=>{const [h,m]=$(id).value.split(':').map(Number);return h*60+m;};act(()=>setStoreHours(state,minute('store-opening'),minute('store-closing')),state.phase==='open'?'Horaires enregistrés pour demain.':'Horaires enregistrés pour aujourd’hui.');}
  if(e.target.id==='director-salary-form'){e.preventDefault();act(()=>setDirectorAnnualSalary(state,Math.round(Number($('director-salary').value)*1000)),'Salaire brut annuel enregistré.');}
  if (e.target.id === 'order-form') { e.preventDefault(); const grouped = orderMode() === 'grouped'; act(() => grouped ? queueEveningOrder(state, $('order-product').value, orderQuantity(), $('order-supplier').value) : placeOrder(state, $('order-product').value, orderQuantity(), 'express'), grouped ? 'Produit prévu pour le groupage de la fermeture.' : 'Commande flash envoyée au fournisseur.'); }
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
  if (saveManager?.ready && !document.querySelector('dialog[open]') && e.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(document.activeElement.tagName) && ['preparation','open'].includes(state.phase)) {
    e.preventDefault(); state.speed = state.speed ? 0 : 1; render(); saveManager?.changed();
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (['preparation','open'].includes(state.phase)) state.speed = 0; saveManager?.changed(); saveManager?.flush(true); render(); } lastTime = performance.now(); });
window.addEventListener('pagehide', () => { saveManager?.changed(); saveManager?.flush(true); });

// Browser agents use the same validated actions as the director's controls.
const context = document.modelContext;
if (context?.registerTool) {
  const lifecycle = new AbortController();
  const register = tool => { const execute = tool.execute; tool.execute = async input => { if (!tool.annotations?.readOnlyHint && !saveManager?.ready) throw new Error('La sauvegarde doit être chargée.'); const result = await execute(input); if (!tool.annotations?.readOnlyHint) saveManager?.changed(); return result; }; try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} };
  register({ name: 'read_store_status', description: 'Lire les stocks, équipes, liquidités, équipements et livraisons du magasin.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ day: state.day, storeHours:{...nextStoreHours(state)},dayHours:{...storeHours(state)}, time: clock(state.minute), phase: state.phase, cash: state.money, alerts:stockAlerts(state), theft:theftReport(state), satisfaction:satisfactionReport(state), profitability: dailyProfitability(state), suppliers:supplierPaymentReport(state), history: structuredClone(state.history), staff: { ...state.staff }, online: structuredClone(state.online), maintenance: maintenanceCosts(state), storeSize: state.storeSize, layout: structuredClone(state.layout), infrastructure: { ...state.infrastructure }, dailyCosts: { wages: staffCount(state) * STAFF_DAILY_WAGE, checkouts: checkoutDailyCosts(state), otherMaintenance: maintenanceCosts(state).total - checkoutDailyCosts(state), premises: premisesCosts(state), overhead: premisesCosts(state).total, total: dailyCosts(state) }, products: state.products.map(p => ({ id: p.id, shelf: p.shelf, reserve: p.reserve, shelfCapacity: p.capacity, reserveCapacity: p.reserveCapacity, reserveRacks: p.reserveRacks })), expansions: { ...state.expansions }, shelfLayout: [...state.shelfLayout], autoCheckoutCount:autoCheckoutCount(state), robotCount:robotCount(state), personalCash: state.personalCash, directorSalary: state.directorSalary, directorAnnualGrossSalary: Math.round(state.directorSalary*365), directorProfitShare:state.directorProfitShare??0, taxes: { vatCollected: state.vatCollected, vatDeductible: state.vatDeductible, vatCredit: state.vatCredit, vatDue: state.vatDue, profitTaxDue: state.profitTaxDue, autoPay: state.autoPayTaxes }, receivers: state.receivers.map(({ id, phase, productId, orderId, palletIndex, load, reserved }) => ({ id, phase, productId, orderId, palletIndex, load, reserved })), restockMode: state.restockMode, restockUnlocked: { ...state.restockUnlocked }, restockRequests: [...state.restockRequests], restockers: state.restockers.map(({ id, robot, phase, mode, productId, load, reserved, cargo }) => ({ id, robot:robot===true, phase, mode, productId, load, reserved, cargo:structuredClone(cargo||[]) })), eveningBasket: structuredClone(state.eveningBasket), eveningQuote: quoteEveningBasket(state), eveningError: state.eveningError, checkouts: state.customers.filter(c => c.stage === 'checkout').map(({ id, checkoutLane, checkoutRemaining }) => ({ customerId: id, lane: checkoutLane, remaining: checkoutRemaining })), shipments: structuredClone(state.shipments), outside: { capacity: outsideCapacity(state), reservedSlots: outsideSlotsUsed(state), pallets: outsidePallets(state).map(({ order, pallet }) => ({ orderId: order.id, productId: order.productId, index: pallet.index, quantity: pallet.remaining, slot: pallet.outsideSlot })) }, deliveries: state.orders.filter(o => o.status !== 'received').map(o => ({ ...o })) }) });
  register({name:'read_online_orders',description:'Lire les commandes drive et web, leur contenu, état, effectifs et recettes.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>structuredClone(state.online)});
  register({name:'set_online_service',description:'Ouvrir ou fermer la prise de commandes drive ou web. La zone doit être installée ; les commandes existantes continuent.',inputSchema:{type:'object',properties:{channel:{type:'string',enum:['drive','web']},enabled:{type:'boolean'}},required:['channel','enabled'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{const result=setOnlineEnabled(state,input.channel,input.enabled);render();return result;}});
  register({name:'simulate_online_customer',description:'Simuler un panier client drive ou web, sans achat fournisseur et sans paiement avant remise ou expédition.',inputSchema:{type:'object',properties:{channel:{type:'string',enum:['drive','web']},basket:{type:'array',minItems:1,maxItems:6,items:{type:'object',properties:{productId:{type:'string',enum:PRODUCTS.map(p=>p.id)},quantity:{type:'integer',minimum:1,maximum:24}},required:['productId','quantity'],additionalProperties:false}}},required:['channel','basket'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{const result=createOnlineOrder(state,input.channel,input.basket);render();return structuredClone(result);}});
  register({name:'cancel_online_order',description:'Annuler une commande client non expédiée et rendre les articles au stock.',inputSchema:{type:'object',properties:{id:{type:'integer',minimum:1}},required:['id'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{const result=cancelOnlineOrder(state,input.id);render();return result;}});
  register({name:'move_store_fixture',description:'Déplacer ou tourner un rayon, une caisse, un rack ou le poste de préparation pendant la pause, en protégeant les passages et les opérations.',inputSchema:{type:'object',properties:{id:{type:'string'},x:{type:'number'},z:{type:'number'},rotation:{type:'number'}},required:['id','x','z','rotation'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:i=>moveFixture(state,i.id,i.x,i.z,i.rotation)});
  register({name:'set_store_size',description:'Changer la taille du local pendant la pause. Les équipements et charges suivent la surface.',inputSchema:{type:'object',properties:{size:{type:'string',enum:Object.keys(STORE_SIZES)}},required:['size'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:i=>{const result=setStoreSize(state,i.size);render();return result;}});
  register({name:'set_store_security',description:'Choisir la surveillance pour réduire le vol, notamment aux caisses automatiques.',inputSchema:{type:'object',properties:{level:{type:'string',enum:Object.keys(SECURITY_LEVELS)}},required:['level'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:i=>{const result=setSecurityLevel(state,i.level);render();return result;}});
  register({ name: 'set_installation_count', description: 'Installer ou retirer des équipements, avec coût des travaux et maintenance. Réserve et rayons nécessitent un produit. Les opérations et stocks en cours sont protégés.', inputSchema: {type:'object',properties:{kind:{type:'string',enum:Object.keys(INSTALLATIONS)},amount:{type:'integer',minimum:0},productId:{type:'string',enum:PRODUCTS.map(p=>p.id)}},required:['kind','amount'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute: input => {const result=setInstallation(state,input.kind,input.amount,input.productId);render();return result;} });
  register({ name: 'quote_installation_count', description: 'Voir le coût de travaux et la maintenance pour un nombre d’installations sans payer.', inputSchema: {type:'object',properties:{kind:{type:'string',enum:Object.keys(INSTALLATIONS)},amount:{type:'integer',minimum:0},productId:{type:'string',enum:PRODUCTS.map(p=>p.id)}},required:['kind','amount'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute: input => quoteInstallation(state,input.kind,input.amount,input.productId) });
  register({ name: 'set_product_shelf_count', description: 'Affecter des meubles de rayon ou des étals à une famille, dans la limite des emplacements installés.', inputSchema: { type:'object', properties:{productId:{type:'string',enum:PRODUCTS.map(p=>p.id)}, amount:{type:'integer',minimum:0}}, required:['productId','amount'], additionalProperties:false }, annotations:{readOnlyHint:false,untrustedContentHint:false}, execute: input => { const result = setShelfCount(state,input.productId,input.amount); render(); return result; } });
  register({ name: 'select_restock_equipment', description: 'Acheter si nécessaire puis sélectionner le matériel de l’équipe de réapprovisionnement.', inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['small','medium','large','hyper'] } }, required: ['mode'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Équipement invalide.'); const result = selectRestockEquipment(state, input.mode); render(); return result; } });
  register({ name: 'set_restock_robots', description: 'Acheter ou retirer des robots autonomes de mise en rayon, avec leurs frais d’achat et de maintenance.', inputSchema: { type: 'object', properties: { count: { type: 'integer', minimum: 0, maximum: RESTOCK_ROBOT.limit } }, required: ['count'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { const result = setRobotCount(state, input?.count); render(); return result; } });
  register({ name: 'request_shelf_restock', description: 'Demander le remplissage prioritaire d’un rayon à partir de son stock en réserve, pris en charge par les employés ou les robots.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) } }, required: ['productId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Produit invalide.'); const result = requestRestock(state, input.productId); render(); return result; } });
  for (const tool of [
    { name: 'expand_store_zone', description: 'Payer un agrandissement pour augmenter la capacité d’une zone du magasin.', schema: { zone: { type: 'string', enum: Object.keys(STORE_EXPANSIONS) } }, action: input => expandStore(state, input.zone) },
    { name: 'discard_reserve_stock', description: 'Jeter sans remboursement des articles non réservés de la réserve d’un produit.', schema: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: 1 } }, action: input => discardReserve(state, input.productId, input.quantity) },
    { name: 'set_store_hours', description: 'Choisir les horaires du magasin, entre 5h et 23h, au moins une heure. En préparation pour aujourd’hui, après ouverture pour demain.', schema:{openingMinute:{type:'integer',minimum:300,maximum:1320},closingMinute:{type:'integer',minimum:360,maximum:1380}},action:input=>setStoreHours(state,input.openingMinute,input.closingMinute) },
    { name: 'set_director_profit_share', description: 'Définir le pourcentage de rémunération variable sur le bénéfice journalier positif après charges et salaire fixe, avant impôt.', schema: { percent: { type: 'integer', minimum: 0, maximum: 100 } }, action: input => setDirectorProfitShare(state,input.percent) },
    { name: 'set_director_salary', description: 'Définir le salaire brut annuel du directeur en euros. Le versement quotidien correspond à un 365e, dans la limite de la trésorerie.', schema: { amount: { type: 'integer', minimum: 0, maximum: 365000 } }, action: input => setDirectorAnnualSalary(state, input.amount) },
    { name: 'reinvest_personal_cash', description: 'Transférer de l’argent du compte personnel au magasin.', schema: { amount: { type: 'number', exclusiveMinimum: 0 } }, action: input => reinvestPersonalCash(state, input.amount) },
    { name: 'pay_store_taxes', description: 'Payer les taxes dues dans la limite de la trésorerie.', schema: {}, action: () => payTaxes(state) },
    { name: 'set_automatic_tax_payment', description: 'Activer ou désactiver le paiement des taxes à chaque fermeture.', schema: { enabled: { type: 'boolean' } }, action: input => setAutomaticTaxPayment(state, input.enabled) },
  ]) register({ name: tool.name, description: tool.description, inputSchema: { type: 'object', properties: tool.schema, required: Object.keys(tool.schema), additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Action invalide.'); const result = tool.action(input); render(); return result; } });
  register({ name: 'quote_supplier_order', description: 'Calculer le prix, la remise et la livraison sans commander.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: ORDER_MIN_QUANTITY, maximum: ORDER_MAX_QUANTITY }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, required: ['productId', 'quantity', 'supplierId'], additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); return quoteOrder(input.productId, input.quantity, input.supplierId); } });
  for (const tool of [
    { name: 'plan_evening_order', description: 'Prévoir un lot de produit dans la commande groupée envoyée à la fermeture. Un nouveau choix remplace le lot prévu pour ce produit ; facturation à l’envoi puis règlement selon le délai choisi.', schema: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: ORDER_MIN_QUANTITY, maximum: ORDER_MAX_QUANTITY }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, action: input => queueEveningOrder(state, input.productId, input.quantity, input.supplierId) },
    { name: 'remove_evening_order', description: 'Retirer un produit du panier groupé du soir avant son envoi.', schema: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) } }, action: input => removeEveningOrder(state, input.productId) },
  ]) register({ name: tool.name, description: tool.description, inputSchema: { type: 'object', properties: tool.schema, required: Object.keys(tool.schema), additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); const result = tool.action(input); render(); return result; } });
  register({ name: 'place_supplier_order', description: 'Commander des marchandises, facturées avec le délai de paiement choisi dans Finances.', inputSchema: { type: 'object', properties: { productId: { type: 'string', enum: PRODUCTS.map(p => p.id) }, quantity: { type: 'integer', minimum: ORDER_MIN_QUANTITY, maximum: ORDER_MAX_QUANTITY }, supplierId: { type: 'string', enum: Object.keys(SUPPLIERS) } }, required: ['productId', 'quantity', 'supplierId'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Commande invalide.'); const result = placeOrder(state, input.productId, input.quantity, input.supplierId); render(); return { orderId: result.id, cost: result.cost, cash: state.money }; } });
  register({ name: 'set_staff_allocation', description: 'Choisir les effectifs de mise en rayon, de déchargement et de préparation drive / web. Les salaires suivent les effectifs.', inputSchema: { type: 'object', properties: { role: { type: 'string', enum: ['shelves', 'receiving', 'online'] }, amount: { type: 'integer', minimum: 0 } }, required: ['role', 'amount'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: input => { if (!input || typeof input !== 'object') throw new Error('Affectation invalide.'); const staff = setStaff(state, input.role, input.amount); render(); return { staff }; } });
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
function frame(now) {
  const delta = Math.min(250, now - lastTime); lastTime = now;
  if (saveManager?.ready && ['preparation','open'].includes(state.phase) && state.speed) {
    pendingMinutes += delta / 1000 * state.speed;
    if (pendingMinutes >= 1) { const minutes = Math.floor(pendingMinutes); pendingMinutes -= minutes; advance(state, minutes); saveManager.changed(); }
  }
  storeScene.update(delta, now, selected, pendingMinutes);
  if (now - lastRender >= 300) { render(); lastRender = now; }
  requestAnimationFrame(frame);
}
function saveStatus(info) {
  saveUi=info;
  if(info.ready)$('offline-status').textContent=info.localAvailable?offlineSupportStatus:'Sauvegarde locale indisponible sur cet appareil.';
  if(!info.ready)state.speed=0;
  const names={loading:'Chargement…',pending:'À sauvegarder',saving:'Sauvegarde…',saved:'Sauvegardé',error:'Échec de sauvegarde',conflict:'Partie modifiée ailleurs','load-error':'Chargement impossible',offline:'Sauvegardé sur cet appareil'};
  $('save-status').textContent=info.message||`${names[info.status]}${info.savedAt ? ' · '+new Date(info.savedAt).toLocaleString('fr-FR') : ''}`;
  $('save-toggle').title=names[info.status];$('save-toggle').classList.toggle('save-error',['error','conflict','load-error'].includes(info.status));
  $('save-local').hidden=info.status!=='conflict';$('save-reload').textContent=info.status==='conflict'?'Reprendre la partie en ligne':'Recharger la sauvegarde';$('save-recovery').hidden=!info.hasRecovery;
  $('save-now').disabled=!info.ready||info.status==='saving';$('save-previous').disabled=!info.hasPrevious||!info.ready;$('save-new').disabled=!info.ready;
  $('save-return').disabled=!info.ready;$('save-close').disabled=!info.ready;
  if(['load-error','conflict'].includes(info.status)&&!$('save-dialog').open)$('save-dialog').showModal();
}
saveManager=createSaveManager({snapshot:()=>makeSave(state,{checkoutSound}),apply:record=>{storeScene.resetSimulation();selected=null;$('layout-dialog').close();for(const key of Object.keys(state))delete state[key];Object.assign(state,record.state);state.morningPreparation=true;if(state.phase==='preparation')state.minute=Math.max(300,state.minute);state.supplierPayments||=newSupplierPayments();state.mixedRestock=true;state.restockUnlocked.medium=true;state.restockUnlocked.hyper??=false;if(state.restockMode==='small')state.restockMode='medium';state.restockers.forEach(w=>{if(w.mode==='small')w.mode='medium';});state.theft||=newTheftState(state.seed);state.storeSize||='standard';state.layout||={};setStaff(state,'checkout',checkoutCount(state));storeScene.setCheckoutSound(true);pendingMinutes=0;lastTime=performance.now();lastPanel='';render();},notify:saveStatus});
$('save-toggle').addEventListener('click',()=>{state.speed=0;saveManager.changed();saveManager.flush();$('save-dialog').showModal();});
for(const id of ['save-close','save-return'])$(id).addEventListener('click',()=>{$('save-dialog').close();canvas.focus();});
$('save-dialog').addEventListener('cancel',e=>{if(!saveManager.ready)e.preventDefault();});
$('save-now').addEventListener('click',()=>saveManager.flush());
$('save-reload').addEventListener('click',async()=>{if(await saveManager.load()){startDayOnLoad(state);saveManager.changed();render();$('save-dialog').close();}});
$('save-previous').addEventListener('click',()=>saveManager.load(true));
$('save-new').addEventListener('click',()=>{$('save-confirm').hidden=false;$('save-confirm-text').hidden=false;});
$('save-cancel-new').addEventListener('click',()=>{$('save-confirm').hidden=true;$('save-confirm-text').hidden=true;});
$('save-confirm-new').addEventListener('click',async()=>{if(await saveManager.newGame(makeSave(createStarterGame(),{checkoutSound}))) {startDayOnLoad(state);saveManager.changed();render();$('save-confirm').hidden=true;$('save-confirm-text').hidden=true;$('save-dialog').close();}});
$('save-dialog').showModal();render();requestAnimationFrame(frame);
if(await saveManager.load()){startDayOnLoad(state);saveManager.changed();render();$('save-dialog').close();}
startOfflineSupport({notify:message=>{offlineSupportStatus=message;$('offline-status').textContent=saveUi?.ready&&!saveUi.localAvailable?'Sauvegarde locale indisponible sur cet appareil.':message;},onAuthRequired:()=>saveManager.lockAuth()});
window.addEventListener('online',()=>saveManager.ready?saveManager.flush():undefined);
window.addEventListener('offline',()=>{saveManager.changed();saveManager.flush();});
$('save-local').addEventListener('click',async()=>{if(await saveManager.keepLocal()){startDayOnLoad(state);saveManager.changed();render();$('save-dialog').close();}});
$('save-recovery').addEventListener('click',async()=>{if(await saveManager.recoverLocal()){startDayOnLoad(state);saveManager.changed();render();$('save-dialog').close();}});
setInterval(()=>saveManager.flush(),5000);
import { RESTOCK_ROBOT, robotCount, robotWorkers } from './restock-robots.js';
import { setRobotCount } from './engine.js';
