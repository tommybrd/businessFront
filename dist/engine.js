import { stepCustomerMotion } from './customer-motion.js';
import { RESERVE_BACK_EXTENSION, SHELF_UNITS_PER_LEVEL, SHELF_INITIAL_LEVELS, shelfPosition, shelfRotation, shelfFixtureId, shelfFixtureCount, productShelfPosition, productShelfAccess, storeFrontExtension, reserveProductPosition } from './store-layout.js';
export { SHELF_UNITS_PER_LEVEL, SHELF_INITIAL_LEVELS, SHELF_MODULE_CAPACITY, shelfPosition, shelfRotation, shelfFixtureId, shelfFixtureCount, productShelfPosition, productShelfAccess, storeFrontExtension, reserveProductPosition } from './store-layout.js';
import { newOnlineState, onlineDaily, onlineReserved, onlineHeld, resizeOnlineStaff, onlineInstallationBusy, updateOnline } from './online-orders.js';
import { checkoutCount, checkoutSpace, activeCheckoutLanes, releaseClosedCheckouts, updateCheckouts } from './checkout-flow.js';
export { checkoutCount, activeCheckoutLanes } from './checkout-flow.js';
import { PALLETS_PER_TRUCK, DELIVERY_BAYS, palletPosition, outsidePalletPosition, outsidePallets, outsideCapacity, deliveryBayCount, freeOutsideSlot, updateShipments, finishShipments } from './delivery-logistics.js';
export { DELIVERY_BAYS, truckPose, OUTSIDE_PALLET_CAPACITY, outsidePalletPosition, outsidePallets, outsideSlotsUsed, outsideCapacity, deliveryBayCount } from './delivery-logistics.js';
export const ORDER_MAX_QUANTITY = 1000;
export const GROUPED_DELIVERY_FEE = 10;
export const ORDER_QUANTITIES = [12, 24, 48, 120, 240, 480, 720, 1000];
export const INITIAL_SHELF_STOCK = 480;
export const RESTOCK_TRIGGER_RATIO = .75;
export const PRODUCTS = [
  { id: 'produce', name: 'Fruits & légumes', short: 'Fruits', color: '#87bd59', cost: 1.8, price: 3.4, capacity: 3 * SHELF_UNITS_PER_LEVEL * SHELF_INITIAL_LEVELS },
  { id: 'bakery', name: 'Boulangerie', short: 'Pain', color: '#e9b85e', cost: 1.1, price: 2.5, capacity: 3 * SHELF_UNITS_PER_LEVEL * SHELF_INITIAL_LEVELS },
  { id: 'dairy', name: 'Produits frais', short: 'Frais', color: '#6bc2da', cost: 2.1, price: 4.2, capacity: 3 * SHELF_UNITS_PER_LEVEL * SHELF_INITIAL_LEVELS },
  { id: 'grocery', name: 'Épicerie', short: 'Épicerie', color: '#b4a3ed', cost: 2.3, price: 4.6, capacity: 3 * SHELF_UNITS_PER_LEVEL * SHELF_INITIAL_LEVELS },
  { id: 'drinks', name: 'Boissons', short: 'Boissons', color: '#6c9be5', cost: 1.9, price: 3.8, capacity: 3 * SHELF_UNITS_PER_LEVEL * SHELF_INITIAL_LEVELS },
  { id: 'home', name: 'Maison & entretien', short: 'Maison', color: '#ec88a5', cost: 3.3, price: 6.9, capacity: 3 * SHELF_UNITS_PER_LEVEL * SHELF_INITIAL_LEVELS },
];
export const SUPPLIERS = {
  regular: { name: 'Centrale Nord', lead: 90, multiplier: 1, deliveryFee: 35, discounts: [{ quantity: 48, rate: 0.04 }, { quantity: 120, rate: 0.08 }, { quantity: 240, rate: 0.12 }] },
  express: { name: 'Express Marché', lead: 30, multiplier: 1.18, deliveryFee: 150, discounts: [{ quantity: 48, rate: 0.02 }, { quantity: 120, rate: 0.05 }, { quantity: 240, rate: 0.08 }] },
};
export const EVENTS = [
  { name: 'Journée habituelle', factor: 1, hint: 'Rush de midi et sortie des bureaux.', focus: -1 },
  { name: 'Journée calme', factor: 0.72, hint: 'Une occasion de préparer les prochaines livraisons.', focus: -1 },
  { name: 'Samedi', factor: 1.6, hint: 'Les familles font leurs courses pour la semaine.', focus: -1 },
  { name: 'Black Friday', factor: 2.3, hint: 'Forte demande en maison et entretien.', focus: 5 },
  { name: 'Préparatifs des fêtes', factor: 1.9, hint: 'Les produits frais et les boissons sont très demandés.', focus: 4 },
];
export const RESERVE_PRODUCT_CAPACITY = 500;
export const RESERVE_EXPANSION_CAPACITY = 250;
export const RESERVE_CAPACITY = RESERVE_PRODUCT_CAPACITY * PRODUCTS.length;
export const STAFF_DAILY_WAGE = 85;
export const staffCount = s => Object.values(s.staff).reduce((sum, n) => sum + n, 0);
export const dailyCosts = s => staffCount(s) * STAFF_DAILY_WAGE + maintenanceCosts(s).total + 160;
export const STORE_EXPANSIONS = {
  checkout: { name: 'Zone de paiement', costs: [2000, 3500] },
  shelves: { name: 'Rayons', costs: [3000, 5000] },
  reserve: { name: 'Réserve', costs: [2500, 4500] },
};
export const checkoutDailyCosts = s => checkoutCount(s) * 5 + (s.autoCheckout ? 8 : 0);
export const INSTALLATIONS = {
  drive: { name: 'Zone de retrait drive', install: 2000, remove: 300, maintenance: 15 },
  web: { name: 'Poste d’emballage web', install: 1500, remove: 250, maintenance: 10 },
  checkouts: { name: 'Caisses', install: 900, remove: 120, maintenance: 5 },
  auto: { name: 'Caisse automatique', install: 3500, remove: 400, maintenance: 8 },
  shelves: { name: 'Modules de rayon', install: 120, remove: 30, maintenance: 1 },
  reserve: { name: 'Racks de réserve', install: 700, remove: 150, maintenance: 4 },
  bays: { name: 'Quais de déchargement', install: 1800, remove: 300, maintenance: 10 },
  outside: { name: 'Places de palettes dehors', install: 40, remove: 10, maintenance: .5 },
};
export function maintenanceCosts(s) {
  const counts = { drive: s.infrastructure.drive, web: s.infrastructure.web, checkouts: checkoutCount(s), auto: Number(s.autoCheckout), shelves: s.shelfLayout.filter(Boolean).length,
    reserve: s.products.reduce((sum, p) => sum + p.reserveRacks, 0), bays: deliveryBayCount(s), outside: outsideCapacity(s) };
  const rows = Object.entries(INSTALLATIONS).map(([kind, definition]) => ({ kind, name: definition.name, count: counts[kind], unitCost: definition.maintenance, cost: round(counts[kind] * definition.maintenance) }));
  return { rows, total: round(rows.reduce((sum, row) => sum + row.cost, 0)) };
}
export function installationCount(s, kind, productId) {
  if (!Object.hasOwn(INSTALLATIONS, kind)) throw new Error('Installation inconnue.');
  if (kind === 'shelves' || kind === 'reserve') {
    const p = s.products.find(p => p.id === productId); if (!p) throw new Error('Produit inconnu.');
    return kind === 'shelves' ? s.shelfLayout.filter(id => id === productId).length : p.reserveRacks;
  }
  return kind === 'auto' ? Number(s.autoCheckout) : s.infrastructure[kind];
}
export function installationLimit(s, kind, productId) {
  if (kind === 'checkouts') return checkoutSpace(s);
  if (['auto', 'drive', 'web'].includes(kind)) return 1;
  if (kind === 'reserve') return 1 + s.expansions.reserve;
  if (kind === 'bays') return 3 + s.expansions.reserve;
  if (kind === 'outside') return 30 + s.expansions.reserve * 15;
  if (kind === 'shelves') return installationCount(s, kind, productId) + s.shelfLayout.filter(id => id === null).length;
  throw new Error('Installation inconnue.');
}
export function quoteInstallation(s, kind, amount, productId) {
  const current = installationCount(s, kind, productId), limit = installationLimit(s, kind, productId);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > limit) throw new Error(`Choisissez un nombre entre 0 et ${limit}. Agrandissez la zone pour obtenir plus de place.`);
  const definition = INSTALLATIONS[kind], delta = amount - current;
  return { kind, productId, current, amount, limit, delta, totalCost: round(Math.abs(delta) * (delta >= 0 ? definition.install : definition.remove)), dailyMaintenance: round(amount * definition.maintenance) };
}
function payInstallation(s, quote) {
  if (!quote.delta) return;
  s.money = round(s.money - quote.totalCost); s.spending = round(s.spending + quote.totalCost);
  s.vatDeductible = round(s.vatDeductible + quote.totalCost / 6);
  log(s, `${INSTALLATIONS[quote.kind].name} : ${Math.abs(quote.delta)} ${quote.delta > 0 ? 'installé(s)' : 'retiré(s)'} · ${quote.totalCost} €.`, 'success');
}
export function setInstallation(s, kind, amount, productId) {
  if (!['preparation', 'open'].includes(s.phase)) throw new Error('Les travaux ne sont pas disponibles.');
  if (kind === 'shelves') return setShelfCount(s, productId, amount);
  const quote = quoteInstallation(s, kind, amount, productId);
  if (!quote.delta) return { ...quote, cash: s.money };
  if (quote.totalCost > s.money) throw new Error('Trésorerie insuffisante pour ces travaux.');
  if (quote.delta < 0) {
    if (['drive','web'].includes(kind) && onlineInstallationBusy(s,kind)) throw new Error('Terminez les commandes et attendez le départ des véhicules avant de retirer cette zone.');
    if (kind === 'checkouts' && s.customers.some(c => c.stage === 'checkout' && Number.isInteger(c.checkoutLane) && c.checkoutLane >= amount)) throw new Error('Cette caisse sert un client. Attendez la fin du paiement.');
    if (kind === 'auto' && s.customers.some(c => c.stage === 'checkout' && c.checkoutLane === 'auto')) throw new Error('La caisse automatique sert un client.');
    if (kind === 'bays' && s.shipments.some(t => t.bay >= amount && ['positioning', 'reversing', 'docked', 'departing'].includes(t.phase))) throw new Error('Un camion utilise ce quai. Attendez son départ.');
    if (kind === 'outside' && s.orders.some(o => o.pallets.some(p => p.outsideSlot !== null && p.outsideSlot !== undefined && p.outsideSlot >= amount))) throw new Error('Les dernières places sont occupées ou réservées à un transpalette. Libérez-les avant le retrait.');
    if (kind === 'reserve') {
      const p = s.products.find(p => p.id === productId), index = s.products.indexOf(p);
      const capacity = amount * (RESERVE_PRODUCT_CAPACITY + s.expansions.reserve * RESERVE_EXPANSION_CAPACITY);
      const held = s.customers.reduce((sum, c) => sum + c.basket.filter(item => item.index === index).reduce((n, item) => n + item.quantity, 0), 0);
      const carried = s.restockers.filter(w => w.productId === productId).reduce((sum, w) => sum + w.load, 0);
      const committed = s.receivers.filter(w => w.productId === productId && !w.toOutside).reduce((sum, w) => sum + w.load + w.reserved, 0);
      const busy = [...s.restockers, ...s.receivers].some(w => w.productId === productId && w.reserveRack >= amount && !['idle', 'returning'].includes(w.phase));
      if (p.reserve + held + carried + committed + onlineHeld(s, productId, 'reserve') > capacity || busy || s.online.workers.some(w => w.phase !== 'idle' && s.online.orders.find(o=>o.id===w.orderId)?.lines[w.line]?.productId === productId && w.source === 'reserve' && w.reserveRack >= amount)) throw new Error('Ce rack contient du stock ou sert à un transport en cours. Videz-le avant de le retirer.');
    }
  }
  payInstallation(s, quote);
  if (kind === 'reserve') { const p = s.products.find(p => p.id === productId); p.reserveRacks = amount; p.reserveCapacity = amount * (RESERVE_PRODUCT_CAPACITY + s.expansions.reserve * RESERVE_EXPANSION_CAPACITY); }
  else if (kind === 'auto') s.autoCheckout = Boolean(amount);
  else s.infrastructure[kind] = amount;
  if (['drive','web'].includes(kind)) s.online.enabled[kind] = Boolean(amount);
  if (kind === 'checkouts' || kind === 'auto') releaseClosedCheckouts(s);
  return { ...quote, cash: s.money };
}
export const receivingInTransit = s => s.receivers.reduce((sum, worker) => sum + worker.load, 0);
export const RESTOCK_EQUIPMENT = {
  small: { name: 'Petit chariot', capacity: 8, cost: 0, loading: 2, stockRate: 2, travelSpeed: 2.4, requires: null },
  medium: { name: 'Chariot moyen', capacity: 24, cost: 1200, loading: 3, stockRate: 4, travelSpeed: 2.3, requires: 'small' },
  large: { name: 'Grand chariot', capacity: 48, cost: 3600, loading: 5, stockRate: 6, travelSpeed: 2.1, requires: 'medium' },
};
export const RESTOCK_PICKUP = [-2.4, -4.65];
export function deliveryPalletPosition(s, order, pallet) {
  if (pallet.status === 'outside' || pallet.outsideOrigin) return outsidePalletPosition(s, pallet);
  return palletPosition(s, s.shipments.find(shipment => shipment.id === pallet.shipmentId), pallet);
}
const newRestocker = id => ({ id, phase: 'idle', mode: 'small', productId: null, load: 0, reserved: 0, remaining: 0, total: 0, pickup: [RESTOCK_PICKUP[0] + (id % 4) * 0.6, RESTOCK_PICKUP[1] - Math.floor(id / 4) * 0.65], destination: [...RESTOCK_PICKUP], path: [], completed: 0 });
const newReceiver = id => ({ id, phase: 'idle', productId: null, orderId: null, palletIndex: null, load: 0, reserved: 0, remaining: 0, total: 0, pickup: [5 + (id % 6) * 0.55, -5.3], destination: [5, -5.3], path: [] });
export const restockInTransit = s => s.restockers.reduce((sum, worker) => sum + worker.load, 0);
const round = n => Math.round(n * 100) / 100;
export const currentEvent = s => EVENTS[(s.day - 1) % EVENTS.length];
export const reserveUsed = s => s.products.reduce((sum, p) => sum + p.reserve, 0);
export const clock = minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}`;

export function createGame(seed = 73471) {
  return {
    day: 1, minute: 450, money: 8500, phase: 'preparation', speed: 0,
    seed, nextId: 1, staff: { checkout: 2, shelves: 5, receiving: 1, online: 0 }, online: newOnlineState(seed),
    products: PRODUCTS.map(p => ({ ...p, shelf: INITIAL_SHELF_STOCK, reserve: 30, reserveCapacity: RESERVE_PRODUCT_CAPACITY, reserveRacks: 1, soldToday: 0, restockedToday: 0 })),
    orders: [], shipments: [], eveningBasket: [], eveningError: null, customers: [], sold: 0, lost: 0, sales: 0, spending: 0,
    satisfaction: 100, autoCheckout: false, checkoutCredit: 0,
    directorSalary: 0, personalCash: 0, personalTransactions: [], ownerContribution: 0,
    vatCollected: 0, vatDeductible: 0, vatCredit: 0, vatDue: 0, profitTaxDue: 0, taxPaidToday: 0, autoPayTaxes: true,
    restockMode: 'small', restockUnlocked: { small: true, medium: false, large: false }, restockRequests: [],
    restockers: Array.from({ length: 5 }, (_, id) => newRestocker(id)),
    expansions: { checkout: 0, shelves: 0, reserve: 0 }, discarded: 0,
    shelfLayout: PRODUCTS.flatMap(p => [p.id,p.id,p.id]), infrastructure: { checkouts: 4, bays: 3, outside: 30, drive: 0, web: 0 },
    receivers: [newReceiver(0)],
    arrivalCredit: 0, elapsed: 0, history: [], summary: null,
    log: [{ text: 'Bienvenue, directeur. Préparez vos équipes et vos premières commandes.', kind: 'info', time: '07:30' }],
  };
}
function random(s) {
  s.seed = (Math.imul(1664525, s.seed) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function log(s, text, kind = 'info') {
  s.log.unshift({ text, kind, time: clock(s.minute) });
  s.log = s.log.slice(0, 16);
}
export function setStaff(s, role, amount) {
  if (!Object.hasOwn(s.staff, role) || !Number.isSafeInteger(amount) || amount < 0) throw new Error('Effectif invalide.');
  if (role === 'online') resizeOnlineStaff(s, amount);
  s.staff[role] = amount;
  const workers = role === 'shelves' ? s.restockers : role === 'receiving' ? s.receivers : null;
  if (workers) {
    for (const worker of workers.slice(amount)) (role === 'shelves' ? resetRestocker : resetReceiver)(s, worker);
    workers.length = Math.min(workers.length, amount);
    while (workers.length < amount) workers.push((role === 'shelves' ? newRestocker : newReceiver)(workers.length));
  }
  if (role === 'checkout') releaseClosedCheckouts(s);
  return { ...s.staff };
}
export function expandStore(s, zone) {
  if (!Object.hasOwn(STORE_EXPANSIONS, zone)) throw new Error('Zone inconnue.');
  if (!['preparation', 'open'].includes(s.phase)) throw new Error('Le magasin ne peut plus être agrandi.');
  const level = s.expansions[zone], cost = STORE_EXPANSIONS[zone].costs[level];
  if (cost === undefined) throw new Error('Cette zone est déjà agrandie au maximum.');
  if (s.money < cost) throw new Error('Trésorerie insuffisante pour cet agrandissement.');
  s.money = round(s.money - cost); s.spending = round(s.spending + cost); s.expansions[zone]++;
  s.vatDeductible = round(s.vatDeductible + cost / 6);
  if (zone === 'reserve') s.products.forEach(p => { p.reserveCapacity += RESERVE_EXPANSION_CAPACITY * p.reserveRacks; });
  if (zone === 'shelves') s.shelfLayout.push(...Array(18).fill(null));
  log(s, `${STORE_EXPANSIONS[zone].name} : agrandissement terminé, ${cost} €.`, 'success');
  return { zone, level: s.expansions[zone], cash: s.money };
}
export function setShelfCount(s, productId, amount) {
  if (!['preparation', 'open'].includes(s.phase)) throw new Error('Le magasin ne peut plus être aménagé.');
  const product = s.products.find(p => p.id === productId);
  if (!product || !Number.isSafeInteger(amount) || amount < 0) throw new Error('Nombre de modules invalide.');
  const slots = s.shelfLayout.map((id, slot) => id === productId ? slot : -1).filter(slot => slot >= 0);
  const quote = quoteInstallation(s, 'shelves', amount, productId);
  const capacity = amount * SHELF_UNITS_PER_LEVEL * SHELF_INITIAL_LEVELS;
  const committed = s.restockers.filter(w => w.productId === productId).reduce((sum, w) => sum + w.load + w.reserved, 0);
  const held = s.customers.reduce((sum, c) => sum + c.basket.filter(item => s.products[item.index].id === productId).reduce((n, item) => n + item.quantity, 0), 0);
  if (product.shelf + committed + held + onlineHeld(s,productId,'shelf') > capacity) throw new Error('Il reste trop d’articles ou de chargements pour retirer ce module. Attendez que le stock baisse.');
  const free = s.shelfLayout.map((id, slot) => id === null ? slot : -1).filter(slot => slot >= 0);
  if (amount - slots.length > free.length) throw new Error('Agrandissez la zone des rayons pour disposer de nouveaux emplacements.');
  if (amount < slots.length && s.online.workers.some(w => w.phase !== 'idle' && w.source === 'shelf' && s.online.orders.find(o=>o.id===w.orderId)?.lines[w.line]?.productId === productId)) throw new Error('Un préparateur utilise ce rayon. Attendez son retour.');
  if (amount < slots.length && s.restockers.some(w => w.productId === productId && !['idle', 'returning'].includes(w.phase))) throw new Error('Attendez la fin de la mise en rayon avant de retirer ce module.');
  if (quote.totalCost > s.money) throw new Error('Trésorerie insuffisante pour ces travaux.');
  payInstallation(s, quote);
  if (amount > slots.length) free.slice(0, amount - slots.length).forEach(slot => { s.shelfLayout[slot] = productId; });
  else slots.slice(amount).forEach(slot => { s.shelfLayout[slot] = null; });
  product.capacity = capacity;
  return { ...quote, productId, count: amount, capacity, freeSlots: s.shelfLayout.filter(id => id === null).length };
}
export function discardReserve(s, productId, quantity) {
  if (!['preparation', 'open'].includes(s.phase)) throw new Error('Le magasin ne peut plus être géré.');
  const product = s.products.find(p => p.id === productId);
  if (!product || !Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantité invalide.');
  const reserved = s.restockers.filter(w => w.productId === productId).reduce((sum, w) => sum + w.reserved, 0);
  if (quantity > product.reserve - reserved - onlineReserved(s,productId,'reserve')) throw new Error('Ces produits sont déjà réservés à un chargement ou indisponibles.');
  product.reserve -= quantity; s.discarded += quantity;
  log(s, `${quantity} unités de ${product.short.toLowerCase()} jetées pour libérer leur emplacement.`, 'warning');
  return { productId, quantity, remaining: product.reserve };
}
export function selectRestockEquipment(s, mode) {
  if (!Object.hasOwn(RESTOCK_EQUIPMENT, mode)) throw new Error('Équipement de réapprovisionnement inconnu.');
  if (!['preparation', 'open'].includes(s.phase)) throw new Error('Préparez la prochaine journée pour équiper l’équipe.');
  const equipment = RESTOCK_EQUIPMENT[mode];
  if (!s.restockUnlocked[mode]) {
    if (equipment.requires && !s.restockUnlocked[equipment.requires]) throw new Error('Débloquez d’abord le chariot moyen.');
    if (s.money < equipment.cost) throw new Error('Trésorerie insuffisante pour équiper l’équipe.');
    s.money = round(s.money - equipment.cost); s.spending = round(s.spending + equipment.cost);
    s.vatDeductible = round(s.vatDeductible + equipment.cost / 6);
    s.restockUnlocked[mode] = true;
    log(s, `${equipment.name} débloqué pour l’équipe : ${equipment.cost} €.`, 'success');
  }
  s.restockMode = mode;
  return { mode, capacity: equipment.capacity, cash: s.money };
}
export function requestRestock(s, productId) {
  if (!['preparation', 'open'].includes(s.phase)) throw new Error('Le magasin ne peut plus être réapprovisionné.');
  const product = s.products.find(p => p.id === productId);
  if (!product) throw new Error('Produit inconnu.');
  const jobs = s.restockers.filter(w => w.productId === productId && w.phase !== 'returning');
  if (product.reserve - onlineReserved(s,productId,'reserve') - jobs.reduce((sum, w) => sum + w.reserved, 0) <= 0) throw new Error('Aucun stock disponible pour ce produit en réserve. Commandez depuis la réserve.');
  if (product.capacity - product.shelf - onlineHeld(s,productId,'shelf') - jobs.reduce((sum, w) => sum + w.load + w.reserved, 0) <= 0) throw new Error('Le rayon est plein ou son remplissage est déjà en cours.');
  if (!s.restockRequests.includes(productId)) {
    s.restockRequests.push(productId);
    log(s, `Remplissage prioritaire demandé : ${product.name}.`);
  }
  return { productId, waitingForStaff: !s.staff.shelves };
}
function resetRestocker(s, worker) {
  if (worker.load > 0) s.products.find(p => p.id === worker.productId).reserve += worker.load;
  Object.assign(worker, { phase: 'idle', productId: null, load: 0, reserved: 0, remaining: 0, total: 0, path: [], destination: [...RESTOCK_PICKUP] });
}
function beginRestockPhase(worker, phase, duration) {
  worker.phase = phase; worker.remaining = duration; worker.total = duration;
}
const restockPickup = worker => worker.pickup || [...RESTOCK_PICKUP];
export function restockerPosition(worker, minuteFraction = 0) {
  if (worker.phase === 'idle' || worker.phase === 'loading') return worker.pickup ? [...worker.pickup] : restockPickup(worker);
  if (worker.phase === 'stocking') return [...worker.destination];
  const path = worker.path;
  if (!path.length) return worker.pickup ? [...worker.pickup] : [...RESTOCK_PICKUP];
  const progress = Math.max(0, Math.min(1, 1 - (worker.remaining - minuteFraction) / worker.total));
  const lengths = path.slice(1).map((point, i) => Math.hypot(point[0] - path[i][0], point[1] - path[i][1]));
  let distance = lengths.reduce((a, b) => a + b, 0) * progress;
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] && lengths[i] > 0) {
      const fraction = distance / lengths[i];
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * fraction, path[i][1] + (path[i + 1][1] - path[i][1]) * fraction];
    }
    distance -= lengths[i];
  }
  return [...path.at(-1)];
}
function restockTravel(worker, returning = false) {
  const [x, z] = worker.destination;
  const path = [restockPickup(worker), [11.65, worker.pickup[1]], [11.65, RESTOCK_PICKUP[1]], [0, RESTOCK_PICKUP[1]], [0, -3.75], [10.4, -3.75], [10.4, z], [x, z]];
  worker.path = returning ? path.reverse() : path;
  const distance = worker.path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - worker.path[i][0], p[1] - worker.path[i][1]), 0);
  beginRestockPhase(worker, returning ? 'returning' : 'outbound', Math.ceil(distance / RESTOCK_EQUIPMENT[worker.mode].travelSpeed));
}
function updateRestocking(s) {
  s.restockRequests = s.restockRequests.filter(id => {
    const p = s.products.find(product => product.id === id);
    const jobs = s.restockers.filter(w => w.productId === id && w.phase !== 'returning');
    return p.reserve - onlineReserved(s,id,'reserve') - jobs.reduce((sum, w) => sum + w.reserved, 0) > 0 && p.capacity - p.shelf - onlineHeld(s,id,'shelf') - jobs.reduce((sum, w) => sum + w.load + w.reserved, 0) > 0;
  });
  for (const worker of s.restockers.slice(0, s.staff.shelves)) {
    if (worker.phase === 'idle') {
      const candidates = s.products.map((p, index) => {
        const jobs = s.restockers.filter(w => w.productId === p.id && w.phase !== 'returning');
        const allocated = jobs.reduce((sum, w) => sum + w.load + w.reserved, 0);
        const reserved = jobs.reduce((sum, w) => sum + w.reserved, 0);
        return { p, index, available: p.reserve - reserved - onlineReserved(s,p.id,'reserve'), need: p.capacity - p.shelf - allocated - onlineHeld(s,p.id,'shelf') };
      }).filter(({ p, available, need }) => available > 0 && need > 0 &&
        (s.restockRequests.includes(p.id) || (p.shelf <= p.capacity * RESTOCK_TRIGGER_RATIO &&
          need >= Math.min(RESTOCK_EQUIPMENT[s.restockMode].capacity, available)))).sort((a, b) => {
        const priority = p => { const i = s.restockRequests.indexOf(p.id); return i < 0 ? Infinity : i; };
        const priorityDifference = priority(a.p) - priority(b.p);
        return (Number.isNaN(priorityDifference) ? 0 : priorityDifference) || a.p.shelf / a.p.capacity - b.p.shelf / b.p.capacity;
      });
      const target = candidates[0]; if (!target) continue;
      worker.mode = s.restockMode; worker.productId = target.p.id;
      worker.reserved = Math.min(RESTOCK_EQUIPMENT[worker.mode].capacity, target.available, target.need);
      const [x, z, side] = productShelfAccess(s, target.index, worker.completed); worker.destination = [x + .25, z + side * 1.45];
      worker.reserveRack = Math.max(0, Math.min(target.p.reserveRacks - 1, Math.ceil(target.available / (RESERVE_PRODUCT_CAPACITY + s.expansions.reserve * RESERVE_EXPANSION_CAPACITY)) - 1));
      const [rx, rz] = reserveProductPosition(target.index, worker.reserveRack); worker.pickup = [rx, rz + 1.25];
      beginRestockPhase(worker, 'loading', RESTOCK_EQUIPMENT[worker.mode].loading);
      continue;
    }
    if (worker.phase === 'stocking') {
      const product = s.products.find(p => p.id === worker.productId);
      const quantity = Math.min(worker.load, product.capacity - product.shelf - onlineHeld(s,product.id,'shelf'), RESTOCK_EQUIPMENT[worker.mode].stockRate);
      product.shelf += quantity; product.restockedToday += quantity; worker.load -= quantity;
      if (!worker.load || product.shelf === product.capacity) restockTravel(worker, true);
      continue;
    }
    worker.remaining--;
    if (worker.remaining > 0) continue;
    if (worker.phase === 'loading') {
      const product = s.products.find(p => p.id === worker.productId);
      product.reserve -= worker.reserved; worker.load = worker.reserved; worker.reserved = 0;
      restockTravel(worker);
    }
    else if (worker.phase === 'outbound') beginRestockPhase(worker, 'stocking', 0);
    else if (worker.phase === 'returning') { worker.completed++; resetRestocker(s, worker); }
  }
}
export function quoteOrder(productId, quantity, supplierId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product || !Object.hasOwn(SUPPLIERS, supplierId) || !Number.isInteger(quantity) || quantity < 12 || quantity > ORDER_MAX_QUANTITY) throw new Error(`Choisissez un produit, un fournisseur et une quantité entière entre 12 et ${ORDER_MAX_QUANTITY}.`);
  const supplier = SUPPLIERS[supplierId];
  const discountRate = supplier.discounts.filter(tier => quantity >= tier.quantity).at(-1)?.rate || 0;
  const unitPrice = round(product.cost * supplier.multiplier * (1 - discountRate));
  const goodsCost = round(unitPrice * quantity), deliveryFee = supplier.deliveryFee;
  const totalCost = round(goodsCost + deliveryFee);
  return { productId, supplierId, quantity, unitPrice, discountRate, goodsCost, deliveryFee, totalCost, landedUnitCost: round(totalCost / quantity) };
}
export function inventoryPosition(s, productId) {
  const product = s.products.find(p => p.id === productId);
  if (!product) throw new Error('Produit inconnu.');
  const carried = s.restockers.filter(w => w.productId === productId).reduce((sum, w) => sum + w.load, 0);
  const incoming = s.orders.filter(o => o.productId === productId && o.status !== 'received').reduce((sum, o) => sum + o.remaining, 0);
  const unloading = s.receivers.filter(w => w.productId === productId).reduce((sum, w) => sum + w.load, 0);
  return product.shelf + product.reserve + carried + incoming + unloading + onlineHeld(s,productId,'reserve') + onlineHeld(s,productId,'shelf');
}
function commitSupplierBatch(s, lines, supplierId, mode) {
  const supplier = SUPPLIERS[supplierId], quotes = lines.map(line => quoteOrder(line.productId, line.quantity, supplierId));
  const deliveryFee = mode === 'grouped' ? GROUPED_DELIVERY_FEE : supplier.deliveryFee;
  const cost = round(quotes.reduce((sum, q) => sum + q.goodsCost, 0) + deliveryFee);
  if (!['preparation', 'open'].includes(s.phase)) throw new Error('Le magasin ne peut plus commander.');
  if (cost > s.money) throw new Error('Trésorerie insuffisante pour cette commande.');
  const batchId = s.nextId++, orderList = [];
  quotes.forEach((q, index) => {
    const pallets = Array.from({ length: Math.ceil(q.quantity / 48) }, (_, index) => ({ index, quantity: Math.min(48, q.quantity - index * 48), remaining: Math.min(48, q.quantity - index * 48), status: 'dock', shipmentId: null, truckIndex: null, outsideSlot: null, outsideOrigin: false }));
    const fee = index === 0 ? deliveryFee : 0;
    const order = { ...q, id: s.nextId++, batchId, mode, remaining: q.quantity, cost: round(q.goodsCost + fee), deliveryFee: fee, source: 'manual', pallets, supplierId, supplier: supplier.name, eta: s.elapsed + supplier.lead, status: 'transit' };
    s.orders.push(order); orderList.push(order);
  });
  const refs = orderList.flatMap(o => o.pallets.map(p => ({ orderId: o.id, palletIndex: p.index })));
  for (let offset = 0; offset < refs.length; offset += PALLETS_PER_TRUCK) {
    const shipment = { id: s.nextId++, batchId, mode, supplierId, supplier: supplier.name, eta: s.elapsed + supplier.lead, phase: 'enroute', phaseStarted: s.elapsed, bay: null, pallets: refs.slice(offset, offset + PALLETS_PER_TRUCK) };
    shipment.pallets.forEach((ref, index) => { const p = s.orders.find(o => o.id === ref.orderId).pallets[ref.palletIndex]; p.shipmentId = shipment.id; p.truckIndex = index; });
    s.shipments.push(shipment);
  }
  s.money = round(s.money - cost); s.spending = round(s.spending + cost); s.vatDeductible = round(s.vatDeductible + cost / 6);
  log(s, `${mode === 'grouped' ? 'Groupage du soir' : 'Livraison spécifique'} : ${quotes.reduce((sum, q) => sum + q.quantity, 0)} unités chez ${supplier.name}. Livraison : ${deliveryFee} €.`, 'success');
  return { batchId, cost, orders: orderList, cash: s.money };
}
export function placeOrder(s, productId, quantity, supplierId) {
  return { ...commitSupplierBatch(s, [{ productId, quantity }], supplierId, 'flash').orders[0] };
}
export function queueEveningOrder(s, productId, quantity, supplierId = 'regular') {
  quoteOrder(productId, quantity, supplierId);
  if (!['preparation', 'open'].includes(s.phase)) throw new Error('Le magasin ne peut plus préparer de commandes.');
  const line = { productId, quantity, supplierId };
  const index = s.eveningBasket.findIndex(item => item.productId === productId);
  if (index < 0) s.eveningBasket.push(line); else s.eveningBasket[index] = line;
  s.eveningError = null;
  return { ...line, dispatchTime: '20:00', quote: quoteEveningBasket(s) };
}
export function removeEveningOrder(s, productId) {
  if (!s.eveningBasket.some(line => line.productId === productId)) throw new Error('Ce produit ne figure pas au groupage.');
  s.eveningBasket = s.eveningBasket.filter(line => line.productId !== productId); s.eveningError = null;
}
export function quoteEveningBasket(s) {
  const suppliers = [...new Set(s.eveningBasket.map(line => line.supplierId))];
  const groups = suppliers.map(supplierId => {
    const lines = s.eveningBasket.filter(line => line.supplierId === supplierId).map(line => quoteOrder(line.productId, line.quantity, supplierId));
    const goodsCost = round(lines.reduce((sum, q) => sum + q.goodsCost, 0)), deliveryFee = GROUPED_DELIVERY_FEE;
    return { supplierId, supplier: SUPPLIERS[supplierId].name, lines, goodsCost, deliveryFee, totalCost: round(goodsCost + deliveryFee) };
  });
  return { groups, totalCost: round(groups.reduce((sum, group) => sum + group.totalCost, 0)) };
}
function dispatchEveningBasket(s) {
  if (!s.eveningBasket.length) return;
  const quote = quoteEveningBasket(s);
  if (quote.totalCost > s.money) { s.eveningError = 'Trésorerie insuffisante à 20 h. Le panier est conservé pour le prochain soir.'; log(s, s.eveningError, 'warning'); return; }
  for (const group of quote.groups) commitSupplierBatch(s, group.lines, group.supplierId, 'grouped');
  s.eveningBasket = []; s.eveningError = null;
}
export function buyAutoCheckout(s) {
  if (s.autoCheckout) throw new Error('La caisse automatique est déjà installée.');
  return setInstallation(s, 'auto', 1);
}
export function openStore(s) {
  if (s.phase !== 'preparation') throw new Error('Le magasin ne peut pas ouvrir maintenant.');
  s.phase = 'open'; s.minute = 480; s.speed = 1;
  log(s, `Ouverture du magasin : ${currentEvent(s).name.toLowerCase()}.`, 'success');
}
export function setDirectorSalary(s, amount) {
  if (!Number.isInteger(amount) || amount < 0 || amount > 1000 || !['preparation', 'open'].includes(s.phase)) throw new Error('Choisissez un salaire entre 0 et 1 000 € par jour.');
  s.directorSalary = amount;
  return { dailySalary: amount };
}
export function reinvestPersonalCash(s, amount) {
  if (!['preparation', 'open'].includes(s.phase) || !Number.isFinite(amount) || amount <= 0 || round(amount) !== amount || amount > s.personalCash) throw new Error('Solde personnel insuffisant ou montant invalide.');
  s.personalCash = round(s.personalCash - amount); s.money = round(s.money + amount); s.ownerContribution = round(s.ownerContribution + amount);
  s.personalTransactions.unshift({ day: s.day, amount: -amount, label: 'Réinvestissement dans le magasin' }); s.personalTransactions = s.personalTransactions.slice(0, 16);
  log(s, `${amount} € réinvestis depuis le compte personnel.`, 'success');
  return { personalCash: s.personalCash, cash: s.money };
}
export function setAutomaticTaxPayment(s, enabled) {
  if (!['preparation', 'open'].includes(s.phase) || typeof enabled !== 'boolean') throw new Error('Réglage invalide.');
  s.autoPayTaxes = enabled; return { enabled };
}
function settleTaxes(s) {
  const vat = Math.min(Math.max(0, s.money), s.vatDue);
  s.money = round(s.money - vat); s.vatDue = round(s.vatDue - vat);
  const profit = Math.min(Math.max(0, s.money), s.profitTaxDue);
  s.money = round(s.money - profit); s.profitTaxDue = round(s.profitTaxDue - profit);
  s.taxPaidToday = round(s.taxPaidToday + vat + profit);
  return { paid: round(vat + profit), remaining: round(s.vatDue + s.profitTaxDue) };
}
export function payTaxes(s) {
  if (!['preparation', 'open'].includes(s.phase) || s.vatDue + s.profitTaxDue <= 0) throw new Error('Aucune taxe à payer.');
  if (s.money <= 0) throw new Error('Trésorerie insuffisante pour payer les taxes.');
  const result = settleTaxes(s); log(s, `Taxes payées : ${result.paid} €.`, 'success'); return result;
}
function recordSale(s, customer, channel = null) {
  customer.paid = true;
  for (const item of customer.basket) s.products[item.index].soldToday += item.quantity;
  s.money = round(s.money + customer.value); s.sales = round(s.sales + customer.value); if (!channel) s.sold++;
  s.vatCollected = round(s.vatCollected + customer.value / 6);
}
export function dailyProfitability(s, salaryPaid = round(Math.min(s.directorSalary, Math.max(0, s.money - dailyCosts(s))))) {
  const operatingCost = dailyCosts(s);
  const beforeTax = round(s.sales - s.vatCollected - (s.spending - s.vatDeductible) - operatingCost - salaryPaid);
  const profitTax = round(Math.max(0, beforeTax) * .2);
  return { operatingCost, salaryPaid, beforeTax, profitTax, netProfit: round(beforeTax - profitTax) };
}
export function nextDay(s) {
  if (s.phase !== 'closed') throw new Error('La journée doit être terminée.');
  s.day++; s.minute = 450; s.phase = 'preparation'; s.speed = 0;
  s.online.daily = onlineDaily();
  s.sold = 0; s.lost = 0; s.sales = 0; s.spending = 0; s.summary = null;
  s.products.forEach(p => { p.soldToday = 0; p.restockedToday = 0; });
  s.vatCollected = 0; s.vatDeductible = 0; s.taxPaidToday = 0; s.ownerContribution = 0;
  s.arrivalCredit = 0; s.checkoutCredit = 0;
  s.satisfaction = Math.min(100, s.satisfaction + 8);
  log(s, `Jour ${s.day} : ${currentEvent(s).name}. ${currentEvent(s).hint}`);
}
function closeStore(s) {
  const runningSpeed = s.speed || 1;
  for (const worker of s.restockers) resetRestocker(s, worker);
  for (const worker of s.receivers) resetReceiver(s, worker);
  for (const c of s.customers) {
    if (c.value > 0 && c.stage === 'checkout' && c.checkoutArrived !== false && (!c.motion || c.checkoutRemaining<=0) && activeCheckoutLanes(s).includes(c.checkoutLane)) recordSale(s, c);
    else { returnBasket(s, c); s.lost++; }
  }
  dispatchEveningBasket(s);
  const operatingCost = dailyCosts(s);
  s.customers = []; s.money = round(s.money - operatingCost); s.speed = 0;
  const salaryPaid = round(Math.min(s.directorSalary, Math.max(0, s.money)));
  s.money = round(s.money - salaryPaid); s.personalCash = round(s.personalCash + salaryPaid);
  if (salaryPaid) { s.personalTransactions.unshift({ day: s.day, amount: salaryPaid, label: 'Salaire du directeur' }); s.personalTransactions = s.personalTransactions.slice(0, 16); }
  if (salaryPaid < s.directorSalary) log(s, 'Le salaire du directeur est limité par la trésorerie disponible.', 'warning');
  const vatBalance = round(s.vatCollected - s.vatDeductible - s.vatCredit), vatCharged = Math.max(0, vatBalance);
  s.vatCredit = Math.max(0, -vatBalance); s.vatDue = round(s.vatDue + vatCharged);
  const profitability = dailyProfitability(s, salaryPaid), taxableProfit = Math.max(0, profitability.beforeTax);
  const profitTax = profitability.profitTax; s.profitTaxDue = round(s.profitTaxDue + profitTax);
  if (s.autoPayTaxes) settleTaxes(s);
  s.phase = s.money < -1000 ? 'bankrupt' : 'closed';
  s.summary = { day: s.day, online: { ...s.online.daily }, maintenance: maintenanceCosts(s).total, maintenanceDetails: maintenanceCosts(s).rows, sales: s.sales, spending: s.spending, expenses: operatingCost + salaryPaid, salaryPaid, beforeTax: profitability.beforeTax, netProfit: profitability.netProfit, vatCollected: s.vatCollected, vatDeductible: s.vatDeductible, vatCharged, profitTax, taxableProfit, taxPaid: s.taxPaidToday, contribution: s.ownerContribution, net: round(s.sales + s.ownerContribution - s.spending - operatingCost - salaryPaid - s.taxPaidToday), sold: s.sold, lost: s.lost };
  s.history.push({ ...s.summary });
  s.summary.products = s.products.map(p => ({ id: p.id, sold: p.soldToday, restocked: p.restockedToday }));
  s.history.at(-1).products = s.summary.products;
  log(s, `Fermeture. ${s.sold} clients encaissés. Charges : ${operatingCost} €.`, s.summary.net >= 0 ? 'success' : 'warning');
  if (s.phase === 'closed') {
    const completedDay = s.summary;
    nextDay(s); openStore(s); s.speed = runningSpeed; s.summary = completedDay;
  }
}
function returnBasket(s, customer) {
  for (const item of customer.basket) {
    const product = s.products[item.index];
    const returned = Math.min(Math.max(0, product.capacity - product.shelf - onlineHeld(s,product.id,'shelf')), item.quantity);
    product.shelf += returned; product.reserve += item.quantity - returned;
  }
  customer.basket = [];
}
function spawnCustomer(s) {
  const items = [];
  // A few quick visits, mostly weekly shopping across product families.
  const quickVisit = random(s) < .2;
  const count = quickVisit ? 2 + Math.floor(random(s) * 2) : 4 + Math.floor(random(s) * 3);
  for (let i = 0; i < count; i++) {
    let index = Math.floor(random(s) * s.products.length);
    if (currentEvent(s).focus >= 0 && random(s) < 0.38) index = currentEvent(s).focus;
    const quantity = quickVisit ? 1 + Math.floor(random(s) * 2) : 3 + Math.floor(random(s) * 4);
    items.push({ index, quantity });
  }
  s.customers.push({ id: s.nextId++, items, itemIndex: 0, basket: [], value: 0, stage: 'shopping', motion: {position:[9.5,10+storeFrontExtension(s.expansions)],path:[],key:'',facing:Math.PI}, progress: 0, wait: 0, x: 530, y: 590, color: ['#f8ba63', '#85d9c0', '#c1a7ff', '#f291a8'][Math.floor(random(s) * 4)] });
}
function receiverHome(worker) { return [5 + (worker.id % 6) * .55, -5.3]; }
function resetReceiver(s, worker) {
  const order = s.orders.find(o => o.id === worker.orderId), pallet = order?.pallets[worker.palletIndex];
  if (order && worker.load) { order.remaining += worker.load; order.status = 'unloading'; }
  if (pallet && (worker.load || worker.reserved)) {
    pallet.status = worker.fromOutside ? 'outside' : 'dock'; pallet.remaining = worker.load || worker.reserved;
    if (!worker.fromOutside) { pallet.outsideSlot = null; pallet.outsideOrigin = false; }
  }
  Object.assign(worker, { phase: 'idle', productId: null, orderId: null, palletIndex: null, load: 0, reserved: 0, remaining: 0, total: 0, path: [], pickup: receiverHome(worker), destination: receiverHome(worker), toOutside: false, fromOutside: false });
}
function receiverTravel(s, worker, returning = false) {
  const [x, z] = worker.destination, back = RESERVE_BACK_EXTENSION + s.expansions.reserve * 3;
  let path;
  if (returning) {
    path = worker.toOutside
      ? [[x, z], [x, -9.2 - back], [0, -9.2 - back], [0, -6.35 - back], receiverHome(worker)]
      : [[x, z], [11.65,z], [11.65, -4.65], receiverHome(worker)];
  } else if (worker.fromOutside) {
    path = [worker.pickup, [worker.pickup[0], -9.2 - back], [0, -9.2 - back], [0, -6.35 - back], [11.65, -6.35 - back], [11.65,z], [x,z]];
  } else {
    const bayX = DELIVERY_BAYS[worker.shipmentBay];
    path = worker.toOutside
      ? [worker.pickup, [bayX, -6.35 - back], [0, -6.35 - back], [0, -9.2 - back], [x, -9.2 - back], [x, z]]
      : [worker.pickup, [bayX, -6.35 - back], [11.65, -6.35-back], [11.65,z], [x,z]];
  }
  worker.path = path;
  const distance = path.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - path[i][0], point[1] - path[i][1]), 0);
  beginRestockPhase(worker, returning ? 'returning' : 'outbound', Math.max(1, Math.ceil(distance / 2.5)));
}
function updateReceiving(s) {
  const spaceFor = productId => {
    const product = s.products.find(p => p.id === productId), index = s.products.indexOf(product);
    const heldGoods = s.customers.reduce((sum, c) => sum + c.basket.filter(item => item.index === index).reduce((n, item) => n + item.quantity, 0), 0);
    const carried = s.restockers.filter(w => w.productId === productId).reduce((sum, w) => sum + w.load, 0);
    const committed = s.receivers.filter(w => w.productId === productId && !w.toOutside).reduce((sum, w) => sum + w.load + w.reserved, 0);
    return product.reserveCapacity - product.reserve - carried - heldGoods - committed - onlineHeld(s,productId,'reserve');
  };
  for (const worker of s.receivers.slice(0, s.staff.receiving)) {
    if (worker.phase === 'idle') {
      const outside = outsidePallets(s).find(({ order, pallet }) => pallet.status === 'outside' && pallet.remaining <= spaceFor(order.productId));
      let order = outside?.order, pallet = outside?.pallet;
      worker.fromOutside = !!outside; worker.toOutside = false;
      if (!outside) {
        const available = (o, p) => {
          const truck = s.shipments.find(t => t.id === p.shipmentId);
          return truck?.phase === 'docked' && p.status === 'dock' && (p.remaining <= spaceFor(o.productId) || freeOutsideSlot(s) !== null)
            && !s.receivers.some(w => !w.fromOutside && ['approaching', 'loading'].includes(w.phase) && s.orders.find(line => line.id === w.orderId)?.pallets[w.palletIndex]?.shipmentId === truck.id)
            && !truck.pallets.some(ref => { const prior = s.orders.find(line => line.id === ref.orderId).pallets[ref.palletIndex]; return prior.truckIndex < p.truckIndex && prior.truckIndex % 2 === p.truckIndex % 2 && ['dock', 'reserved'].includes(prior.status) && !prior.outsideOrigin; });
        };
        order = s.orders.find(o => o.status === 'unloading' && o.pallets.some(p => available(o, p)));
        if (!order) continue;
        pallet = order.pallets.find(p => available(order, p));
        worker.toOutside = pallet.remaining > spaceFor(order.productId);
        if (worker.toOutside) pallet.outsideSlot = freeOutsideSlot(s);
      }
      const start = restockerPosition(worker), back = RESERVE_BACK_EXTENSION + s.expansions.reserve * 3;
      const truck = s.shipments.find(t => t.id === pallet.shipmentId); worker.shipmentBay = truck.bay;
      worker.productId = order.productId; worker.orderId = order.id;
      worker.reserveRack = Math.min(Math.max(0, Math.floor(s.products.find(p => p.id === order.productId).reserve / (RESERVE_PRODUCT_CAPACITY + s.expansions.reserve * RESERVE_EXPANSION_CAPACITY))), Math.max(0, s.products.find(p => p.id === order.productId).reserveRacks - 1));
      worker.palletIndex = pallet.index; worker.reserved = pallet.remaining; pallet.status = 'reserved';
      const [px, pz] = deliveryPalletPosition(s, order, pallet); worker.pickup = [px, pz + 1];
      if (worker.toOutside) { const [ox, oz] = outsidePalletPosition(s, pallet); worker.destination = [ox, oz + 1]; }
      else { const [rx, rz] = reserveProductPosition(s.products.findIndex(p => p.id === order.productId), worker.reserveRack || 0); worker.destination = [rx, rz + 1.25]; }
      worker.path = outside
        ? [start, [0, -6.35 - back], [0, -9.2 - back], [px, -9.2 - back], worker.pickup]
        : [start, [DELIVERY_BAYS[truck.bay], -6.35 - back], worker.pickup];
      const distance = worker.path.slice(1).reduce((sum, point, index) => sum + Math.hypot(point[0] - worker.path[index][0], point[1] - worker.path[index][1]), 0);
      beginRestockPhase(worker, 'approaching', Math.max(1, Math.ceil(distance / 3)));
      continue;
    }
    if (worker.phase === 'storing') {
      const order = s.orders.find(o => o.id === worker.orderId), pallet = order.pallets[worker.palletIndex];
      if (worker.toOutside) {
        order.remaining += worker.load; pallet.remaining = worker.load; pallet.status = 'outside'; pallet.outsideOrigin = true; worker.load = 0;
        receiverTravel(s, worker, true);
      } else {
        const product = s.products.find(p => p.id === worker.productId), quantity = Math.min(12, worker.load);
        product.reserve += quantity; worker.load -= quantity; pallet.remaining = worker.load;
        if (!worker.load) { pallet.status = 'stored'; pallet.outsideSlot = null; receiverTravel(s, worker, true); }
      }
    } else {
      worker.remaining--; if (worker.remaining > 0) continue;
      if (worker.phase === 'approaching') beginRestockPhase(worker, 'loading', 3);
      else if (worker.phase === 'loading') {
        const order = s.orders.find(o => o.id === worker.orderId);
        if (worker.toOutside && worker.reserved <= spaceFor(worker.productId)) {
          worker.toOutside = false; order.pallets[worker.palletIndex].outsideSlot = null;
          const [rx, rz] = reserveProductPosition(s.products.findIndex(p => p.id === worker.productId));
          worker.destination = [rx, rz + 1.25];
        }
        order.remaining -= worker.reserved; worker.load = worker.reserved; worker.reserved = 0;
        order.pallets[worker.palletIndex].status = 'transport'; receiverTravel(s, worker);
      } else if (worker.phase === 'outbound') beginRestockPhase(worker, 'storing', 0);
      else if (worker.phase === 'returning') resetReceiver(s, worker);
    }
  }
  for (const order of s.orders) if (order.status === 'unloading' && order.pallets.every(p => p.status === 'stored')) {
    order.status = 'received'; log(s, 'Livraison entièrement déchargée et rangée en réserve.');
  }
}

function minuteStep(s) {
  s.minute++; s.elapsed++;
  updateShipments(s);
  updateReceiving(s);
  finishShipments(s);
  updateOnline(s, { reservePoint: reserveProductPosition, shelfPoint: productShelfAccess, sale: recordSale, demand: state => currentEvent(state).factor });
  updateRestocking(s);
  const peak = (s.minute >= 720 && s.minute < 840) ? 1.9 : (s.minute >= 1020 && s.minute < 1140) ? 1.55 : 1;
  if (s.minute < 1170) {
    s.arrivalCredit += 0.22 * peak * currentEvent(s).factor * (0.7 + random(s) * 0.6);
    while (s.arrivalCredit >= 1 && s.customers.length < 80) { spawnCustomer(s); s.arrivalCredit--; }
  }
  const abandoned = new Set();
  for (const customer of s.customers) {
    const arrived=stepCustomerMotion(s,customer);
    if (customer.stage === 'checkout') customer.checkoutArrived=arrived;
    if (customer.stage === 'shopping') {
      if(!arrived)continue;
      customer.progress++;
      if (customer.progress >= 6) {
        const item = customer.items[customer.itemIndex];
        const p = s.products[item.index];
        const qty = Math.min(Math.max(0,p.shelf - onlineReserved(s,p.id,'shelf')), item.quantity);
        p.shelf -= qty; customer.value = round(customer.value + qty * p.price);
        if (qty > 0) customer.basket.push({ index: item.index, quantity: qty });
        if (qty < item.quantity) s.satisfaction = Math.max(0, s.satisfaction - 0.12);
        customer.itemIndex++; customer.progress = 0;
        if (customer.itemIndex >= customer.items.length) {
          if (customer.value === 0) { abandoned.add(customer.id); s.lost++; }
          else { customer.stage = 'queue'; customer.wait = 0; }
        }
      }
    } else if (customer.stage === 'queue') {
      if(!arrived)continue;
      customer.wait++;
      if (customer.wait >= 18) {
        returnBasket(s, customer);
        abandoned.add(customer.id); s.lost++; s.satisfaction = Math.max(0, s.satisfaction - 0.7);
      }
    }
  }
  s.customers = s.customers.filter(c => !abandoned.has(c.id));
  updateCheckouts(s, customer => recordSale(s, customer));
  if (s.minute >= 1200) closeStore(s);
}
export function advance(s, minutes) {
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) throw new Error('Durée invalide.');
  if (s.phase !== 'open') return;
  for (let i = 0; i < Math.floor(minutes) && s.phase === 'open'; i++) minuteStep(s);
}
