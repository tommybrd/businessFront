export const PRODUCTS = [
  { id: 'produce', name: 'Fruits & légumes', short: 'Fruits', color: '#87bd59', cost: 1.8, price: 3.4, capacity: 64 },
  { id: 'bakery', name: 'Boulangerie', short: 'Pain', color: '#e9b85e', cost: 1.1, price: 2.5, capacity: 64 },
  { id: 'dairy', name: 'Produits frais', short: 'Frais', color: '#6bc2da', cost: 2.1, price: 4.2, capacity: 64 },
  { id: 'grocery', name: 'Épicerie', short: 'Épicerie', color: '#b4a3ed', cost: 2.3, price: 4.6, capacity: 64 },
  { id: 'drinks', name: 'Boissons', short: 'Boissons', color: '#6c9be5', cost: 1.9, price: 3.8, capacity: 64 },
  { id: 'home', name: 'Maison & entretien', short: 'Maison', color: '#ec88a5', cost: 3.3, price: 6.9, capacity: 64 },
];
export const SUPPLIERS = {
  regular: { name: 'Centrale Nord', lead: 90, multiplier: 1, deliveryFee: 35, discounts: [{ quantity: 48, rate: 0.04 }, { quantity: 120, rate: 0.08 }, { quantity: 240, rate: 0.12 }] },
  express: { name: 'Express Marché', lead: 30, multiplier: 1.18, deliveryFee: 75, discounts: [{ quantity: 48, rate: 0.02 }, { quantity: 120, rate: 0.05 }, { quantity: 240, rate: 0.08 }] },
};
export const EVENTS = [
  { name: 'Journée habituelle', factor: 1, hint: 'Rush de midi et sortie des bureaux.', focus: -1 },
  { name: 'Journée calme', factor: 0.72, hint: 'Une occasion de préparer les prochaines livraisons.', focus: -1 },
  { name: 'Samedi', factor: 1.6, hint: 'Les familles font leurs courses pour la semaine.', focus: -1 },
  { name: 'Black Friday', factor: 2.3, hint: 'Forte demande en maison et entretien.', focus: 5 },
  { name: 'Préparatifs des fêtes', factor: 1.9, hint: 'Les produits frais et les boissons sont très demandés.', focus: 4 },
];
export const STAFF_TOTAL = 8;
export const RESERVE_CAPACITY = 600;
export const DAILY_COST = STAFF_TOTAL * 85 + 160;
export const STORE_EXPANSIONS = {
  checkout: { name: 'Zone de paiement', costs: [2000, 3500] },
  shelves: { name: 'Rayons', costs: [3000, 5000] },
  reserve: { name: 'Réserve', costs: [2500, 4500] },
};
export const checkoutCount = s => 4 + s.expansions.checkout * 2;
export const receivingInTransit = s => s.receivers.reduce((sum, worker) => sum + worker.load, 0);
export const RESTOCK_EQUIPMENT = {
  small: { name: 'Petit chariot', capacity: 8, cost: 0, loading: 2, stockRate: 2, travelSpeed: 1.8, requires: null },
  large: { name: 'Grand chariot', capacity: 24, cost: 1200, loading: 3, stockRate: 4, travelSpeed: 1.7, requires: 'small' },
  pallet: { name: 'Lève-palette', capacity: 48, cost: 3600, loading: 5, stockRate: 6, travelSpeed: 1.5, requires: 'large' },
};
export const RESTOCK_PICKUP = [-2.4, -4.65];
export const RESTOCK_SHELVES = [[-6, -2], [0, -2], [6, -2], [-6, 2], [0, 2], [6, 2]];
export const restockInTransit = s => s.restockers.reduce((sum, worker) => sum + worker.load, 0);
const round = n => Math.round(n * 100) / 100;
export const currentEvent = s => EVENTS[(s.day - 1) % EVENTS.length];
export const reserveUsed = s => s.products.reduce((sum, p) => sum + p.reserve, 0);
export const clock = minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}`;

export function createGame(seed = 73471) {
  return {
    day: 1, minute: 450, money: 8500, phase: 'preparation', speed: 0,
    seed, nextId: 1, staff: { checkout: 2, shelves: 4, reserve: 1, receiving: 1 },
    products: PRODUCTS.map(p => ({ ...p, shelf: 42, reserve: 30, reserveCapacity: 100 })),
    autoOrders: Object.fromEntries(PRODUCTS.map(p => [p.id, { enabled: false, threshold: 24, quantity: 120, supplierId: 'regular', lastError: null }])),
    orders: [], customers: [], sold: 0, lost: 0, sales: 0, spending: 0,
    satisfaction: 100, autoCheckout: false, checkoutCredit: 0,
    directorSalary: 0, personalCash: 0, personalTransactions: [], ownerContribution: 0,
    vatCollected: 0, vatDeductible: 0, vatCredit: 0, vatDue: 0, profitTaxDue: 0, taxPaidToday: 0, autoPayTaxes: true,
    restockMode: 'small', restockUnlocked: { small: true, large: false, pallet: false }, restockRequests: [],
    restockers: Array.from({ length: STAFF_TOTAL }, (_, id) => ({ id, phase: 'idle', mode: 'small', productId: null, load: 0, reserved: 0, remaining: 0, total: 0, destination: [...RESTOCK_PICKUP], path: [], completed: 0 })),
    expansions: { checkout: 0, shelves: 0, reserve: 0 }, discarded: 0,
    receivers: Array.from({ length: STAFF_TOTAL }, (_, id) => ({ id, phase: 'idle', productId: null, orderId: null, load: 0, reserved: 0, remaining: 0, total: 0, pickup: [5 + id * 0.55, -5.3], destination: [5, -5.3], path: [] })),
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
  if (!Object.hasOwn(s.staff, role) || !Number.isInteger(amount) || amount < 0 || amount > STAFF_TOTAL) throw new Error('Affectation invalide.');
  if (Object.entries(s.staff).reduce((sum, [key, n]) => sum + (key === role ? amount : n), 0) > STAFF_TOTAL) throw new Error('Tous les employés sont déjà affectés. Libérez un poste avant de renforcer cette équipe.');
  s.staff[role] = amount;
  if (role === 'shelves') for (const worker of s.restockers.slice(amount)) resetRestocker(s, worker);
  if (role === 'receiving') for (const worker of s.receivers.slice(amount)) resetReceiver(s, worker);
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
  if (zone === 'reserve') s.products.forEach(p => { p.reserveCapacity += 50; });
  if (zone === 'shelves') s.products.forEach(p => { p.capacity += 32; });
  log(s, `${STORE_EXPANSIONS[zone].name} : agrandissement terminé, ${cost} €.`, 'success');
  return { zone, level: s.expansions[zone], cash: s.money };
}
export function discardReserve(s, productId, quantity) {
  if (!['preparation', 'open'].includes(s.phase)) throw new Error('Le magasin ne peut plus être géré.');
  const product = s.products.find(p => p.id === productId);
  if (!product || !Number.isInteger(quantity) || quantity <= 0) throw new Error('Quantité invalide.');
  const reserved = s.restockers.filter(w => w.productId === productId).reduce((sum, w) => sum + w.reserved, 0);
  if (quantity > product.reserve - reserved) throw new Error('Ces produits sont déjà réservés à un chargement ou indisponibles.');
  product.reserve -= quantity; s.discarded += quantity;
  log(s, `${quantity} unités de ${product.short.toLowerCase()} jetées pour libérer leur emplacement.`, 'warning');
  return { productId, quantity, remaining: product.reserve };
}
export function selectRestockEquipment(s, mode) {
  if (!Object.hasOwn(RESTOCK_EQUIPMENT, mode)) throw new Error('Équipement de réapprovisionnement inconnu.');
  if (!['preparation', 'open'].includes(s.phase)) throw new Error('Préparez la prochaine journée pour équiper l’équipe.');
  const equipment = RESTOCK_EQUIPMENT[mode];
  if (!s.restockUnlocked[mode]) {
    if (equipment.requires && !s.restockUnlocked[equipment.requires]) throw new Error('Débloquez d’abord le grand chariot.');
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
  if (product.reserve - jobs.reduce((sum, w) => sum + w.reserved, 0) <= 0) throw new Error('Aucun stock disponible pour ce produit en réserve. Commandez depuis la réserve.');
  if (product.capacity - product.shelf - jobs.reduce((sum, w) => sum + w.load + w.reserved, 0) <= 0) throw new Error('Le rayon est plein ou son remplissage est déjà en cours.');
  if (!s.restockRequests.includes(productId)) {
    s.restockRequests.push(productId);
    log(s, `Remplissage prioritaire demandé : ${product.name}.`);
  }
  return { productId, waitingForStaff: !s.staff.shelves || !s.staff.reserve };
}
function resetRestocker(s, worker) {
  if (worker.load > 0) s.products.find(p => p.id === worker.productId).reserve += worker.load;
  Object.assign(worker, { phase: 'idle', productId: null, load: 0, reserved: 0, remaining: 0, total: 0, path: [], destination: [...RESTOCK_PICKUP] });
}
function beginRestockPhase(worker, phase, duration) {
  worker.phase = phase; worker.remaining = duration; worker.total = duration;
}
const restockPickup = worker => [RESTOCK_PICKUP[0] + worker.id * 0.45, RESTOCK_PICKUP[1]];
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
  const path = [restockPickup(worker), [9.5, RESTOCK_PICKUP[1]], [9.5, z], [x, z]];
  worker.path = returning ? path.reverse() : path;
  const distance = worker.path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - worker.path[i][0], p[1] - worker.path[i][1]), 0);
  beginRestockPhase(worker, returning ? 'returning' : 'outbound', Math.ceil(distance / RESTOCK_EQUIPMENT[worker.mode].travelSpeed));
}
function updateRestocking(s) {
  s.restockRequests = s.restockRequests.filter(id => {
    const p = s.products.find(product => product.id === id);
    const jobs = s.restockers.filter(w => w.productId === id && w.phase !== 'returning');
    return p.reserve - jobs.reduce((sum, w) => sum + w.reserved, 0) > 0 && p.capacity - p.shelf - jobs.reduce((sum, w) => sum + w.load + w.reserved, 0) > 0;
  });
  let loadingSlots = s.staff.reserve;
  for (const worker of s.restockers.slice(0, s.staff.shelves)) {
    if (worker.phase === 'idle') {
      const candidates = s.products.map((p, index) => {
        const jobs = s.restockers.filter(w => w.productId === p.id && w.phase !== 'returning');
        const allocated = jobs.reduce((sum, w) => sum + w.load + w.reserved, 0);
        const reserved = jobs.reduce((sum, w) => sum + w.reserved, 0);
        return { p, index, available: p.reserve - reserved, need: p.capacity - p.shelf - allocated };
      }).filter(({ available, need }) => available > 0 && need > 0).sort((a, b) => {
        const priority = p => { const i = s.restockRequests.indexOf(p.id); return i < 0 ? Infinity : i; };
        const priorityDifference = priority(a.p) - priority(b.p);
        return (Number.isNaN(priorityDifference) ? 0 : priorityDifference) || a.p.shelf / a.p.capacity - b.p.shelf / b.p.capacity;
      });
      const target = candidates[0]; if (!target) continue;
      worker.mode = s.restockMode; worker.productId = target.p.id;
      worker.reserved = Math.min(RESTOCK_EQUIPMENT[worker.mode].capacity, target.available, target.need);
      const [x, z] = RESTOCK_SHELVES[target.index]; worker.destination = [x + 1.8, z + 2.4];
      beginRestockPhase(worker, 'loading', RESTOCK_EQUIPMENT[worker.mode].loading);
      continue;
    }
    if (worker.phase === 'stocking') {
      const product = s.products.find(p => p.id === worker.productId);
      const quantity = Math.min(worker.load, product.capacity - product.shelf, RESTOCK_EQUIPMENT[worker.mode].stockRate);
      product.shelf += quantity; worker.load -= quantity;
      if (!worker.load || product.shelf === product.capacity) restockTravel(worker, true);
      continue;
    }
    if (worker.phase === 'loading') { if (loadingSlots <= 0) continue; loadingSlots--; }
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
  if (!product || !Object.hasOwn(SUPPLIERS, supplierId) || !Number.isInteger(quantity) || quantity < 12 || quantity > 240 || quantity % 12 !== 0) throw new Error('Choisissez un produit, un fournisseur et un multiple de 12 entre 12 et 240.');
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
  return product.shelf + product.reserve + carried + incoming + unloading;
}
export function configureAutoOrder(s, productId, rule) {
  if (!Object.hasOwn(s.autoOrders, productId) || !rule || typeof rule.enabled !== 'boolean' || !Number.isInteger(rule.threshold) || rule.threshold < 0 || rule.threshold > 600) throw new Error('Le seuil doit être un entier entre 0 et 600.');
  quoteOrder(productId, rule.quantity, rule.supplierId);
  s.autoOrders[productId] = { enabled: rule.enabled, threshold: rule.threshold, quantity: rule.quantity, supplierId: rule.supplierId, lastError: null };
  return { ...s.autoOrders[productId] };
}
export function placeOrder(s, productId, quantity, supplierId, source = 'manual') {
  const quote = quoteOrder(productId, quantity, supplierId);
  const product = s.products.find(p => p.id === productId), supplier = SUPPLIERS[supplierId];
  if (s.phase === 'closed' || s.phase === 'bankrupt') throw new Error('Préparez la journée suivante avant de commander.');
  const cost = quote.totalCost;
  if (cost > s.money) throw new Error('Trésorerie insuffisante pour cette commande.');
  const order = { ...quote, id: s.nextId++, remaining: quantity, cost, source, supplier: supplier.name, eta: s.elapsed + supplier.lead, status: 'transit' };
  s.money = round(s.money - cost); s.spending = round(s.spending + cost); s.orders.push(order);
  s.vatDeductible = round(s.vatDeductible + cost / 6);
  log(s, `${source === 'automatic' ? 'Auto : ' : ''}${quantity} unités de ${product.short.toLowerCase()} chez ${supplier.name}. Livraison : ${quote.deliveryFee} €.`);
  return { ...order };
}
function triggerAutomaticOrders(s) {
  for (const product of s.products) {
    const rule = s.autoOrders[product.id]; if (!rule.enabled) continue;
    if (inventoryPosition(s, product.id) > rule.threshold || s.orders.some(o => o.productId === product.id && o.status !== 'received')) { rule.lastError = null; continue; }
    try { placeOrder(s, product.id, rule.quantity, rule.supplierId, 'automatic'); rule.lastError = null; }
    catch (error) {
      if (rule.lastError !== error.message) log(s, `Commande auto de ${product.short.toLowerCase()} bloquée : ${error.message}`, 'warning');
      rule.lastError = error.message;
    }
  }
}
export function buyAutoCheckout(s) {
  if (s.autoCheckout) throw new Error('La caisse automatique est déjà installée.');
  if (s.money < 3500) throw new Error('Il faut 3 500 € pour installer une caisse automatique.');
  if (s.phase === 'closed' || s.phase === 'bankrupt') throw new Error('Attendez la préparation de la prochaine journée.');
  s.money -= 3500; s.spending += 3500; s.autoCheckout = true;
  s.vatDeductible = round(s.vatDeductible + 3500 / 6);
  log(s, 'Caisse automatique installée. Elle fonctionne avec au moins un employé aux caisses.', 'success');
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
function recordSale(s, customer) {
  s.money = round(s.money + customer.value); s.sales = round(s.sales + customer.value); s.sold++;
  s.vatCollected = round(s.vatCollected + customer.value / 6);
}
export function nextDay(s) {
  if (s.phase !== 'closed') throw new Error('La journée doit être terminée.');
  s.day++; s.minute = 450; s.phase = 'preparation'; s.speed = 0;
  s.sold = 0; s.lost = 0; s.sales = 0; s.spending = 0; s.summary = null;
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
    if (c.value > 0 && s.staff.checkout > 0) recordSale(s, c);
    else { returnBasket(s, c); s.lost++; }
  }
  s.customers = []; s.money = round(s.money - DAILY_COST); s.speed = 0;
  const salaryPaid = round(Math.min(s.directorSalary, Math.max(0, s.money)));
  s.money = round(s.money - salaryPaid); s.personalCash = round(s.personalCash + salaryPaid);
  if (salaryPaid) { s.personalTransactions.unshift({ day: s.day, amount: salaryPaid, label: 'Salaire du directeur' }); s.personalTransactions = s.personalTransactions.slice(0, 16); }
  if (salaryPaid < s.directorSalary) log(s, 'Le salaire du directeur est limité par la trésorerie disponible.', 'warning');
  const vatBalance = round(s.vatCollected - s.vatDeductible - s.vatCredit), vatCharged = Math.max(0, vatBalance);
  s.vatCredit = Math.max(0, -vatBalance); s.vatDue = round(s.vatDue + vatCharged);
  const taxableProfit = round(Math.max(0, s.sales - s.vatCollected - (s.spending - s.vatDeductible) - DAILY_COST - salaryPaid));
  const profitTax = round(taxableProfit * 0.2); s.profitTaxDue = round(s.profitTaxDue + profitTax);
  if (s.autoPayTaxes) settleTaxes(s);
  s.phase = s.money < -1000 ? 'bankrupt' : 'closed';
  s.summary = { day: s.day, sales: s.sales, spending: s.spending, expenses: DAILY_COST + salaryPaid, salaryPaid, vatCollected: s.vatCollected, vatDeductible: s.vatDeductible, vatCharged, profitTax, taxableProfit, taxPaid: s.taxPaidToday, contribution: s.ownerContribution, net: round(s.sales + s.ownerContribution - s.spending - DAILY_COST - salaryPaid - s.taxPaidToday), sold: s.sold, lost: s.lost };
  s.history.push({ ...s.summary });
  log(s, `Fermeture. ${s.sold} clients encaissés. Charges : ${DAILY_COST} €.`, s.summary.net >= 0 ? 'success' : 'warning');
  if (s.phase === 'closed') {
    const completedDay = s.summary;
    nextDay(s); openStore(s); s.speed = runningSpeed; s.summary = completedDay;
  }
}
function returnBasket(s, customer) {
  for (const item of customer.basket) {
    const product = s.products[item.index];
    const returned = Math.min(product.capacity - product.shelf, item.quantity);
    product.shelf += returned; product.reserve += item.quantity - returned;
  }
}
function spawnCustomer(s) {
  const items = [];
  const count = 2 + Math.floor(random(s) * 3);
  for (let i = 0; i < count; i++) {
    let index = Math.floor(random(s) * s.products.length);
    if (currentEvent(s).focus >= 0 && random(s) < 0.38) index = currentEvent(s).focus;
    items.push({ index, quantity: random(s) < 0.2 ? 2 : 1 });
  }
  s.customers.push({ id: s.nextId++, items, itemIndex: 0, basket: [], value: 0, stage: 'shopping', progress: 0, wait: 0, x: 530, y: 590, color: ['#f8ba63', '#85d9c0', '#c1a7ff', '#f291a8'][Math.floor(random(s) * 4)] });
}
function resetReceiver(s, worker) {
  const order = s.orders.find(o => o.id === worker.orderId);
  if (order && worker.load) { order.remaining += worker.load; order.status = 'unloading'; }
  Object.assign(worker, { phase: 'idle', productId: null, orderId: null, load: 0, reserved: 0, remaining: 0, total: 0, path: [], destination: [...worker.pickup] });
}
function receiverTravel(worker, returning = false) {
  const [x, z] = worker.destination;
  const path = [worker.pickup, [0.1, -5.05], [x, -5.05], [x, z]];
  worker.path = returning ? [...path].reverse() : path;
  const distance = path.slice(1).reduce((sum, point, i) => sum + Math.hypot(point[0] - path[i][0], point[1] - path[i][1]), 0);
  beginRestockPhase(worker, returning ? 'returning' : 'outbound', Math.max(1, Math.ceil(distance / 2.5)));
}
function updateReceiving(s) {
  const spaceFor = productId => {
    const product = s.products.find(p => p.id === productId), index = s.products.indexOf(product);
    const heldGoods = s.customers.reduce((sum, c) => sum + c.basket.filter(item => item.index === index).reduce((n, item) => n + item.quantity, 0), 0);
    const carried = s.restockers.filter(w => w.productId === productId).reduce((sum, w) => sum + w.load, 0);
    const committed = s.receivers.filter(w => w.productId === productId).reduce((sum, w) => sum + w.load + w.reserved, 0);
    return product.reserveCapacity - product.reserve - carried - heldGoods - committed;
  };
  for (const worker of s.receivers.slice(0, s.staff.receiving)) {
    if (worker.phase === 'idle') {
      worker.pickup = [5 + worker.id * 0.55, -5.3 - s.expansions.reserve * 3];
      const order = s.orders.find(o => o.status === 'unloading' && spaceFor(o.productId) > 0 && o.remaining - s.receivers.filter(w => w.orderId === o.id).reduce((sum, w) => sum + w.reserved, 0) > 0);
      if (!order) continue;
      const space = spaceFor(order.productId);
      const allocated = s.receivers.filter(w => w.orderId === order.id).reduce((sum, w) => sum + w.reserved, 0);
      worker.productId = order.productId; worker.orderId = order.id;
      worker.reserved = Math.min(48, order.remaining - allocated, space);
      const i = s.products.findIndex(p => p.id === order.productId);
      worker.destination = [-9.2 + (i % 3) * 3.5, -5.9 + Math.floor(i / 3) * 1.75];
      beginRestockPhase(worker, 'loading', 3);
      continue;
    }
    if (worker.phase === 'storing') {
      const product = s.products.find(p => p.id === worker.productId), quantity = Math.min(12, worker.load);
      product.reserve += quantity; worker.load -= quantity;
      if (!worker.load) receiverTravel(worker, true);
    } else {
      worker.remaining--; if (worker.remaining > 0) continue;
      if (worker.phase === 'loading') {
        const order = s.orders.find(o => o.id === worker.orderId);
        order.remaining -= worker.reserved; worker.load = worker.reserved; worker.reserved = 0;
        receiverTravel(worker);
      } else if (worker.phase === 'outbound') beginRestockPhase(worker, 'storing', 0);
      else if (worker.phase === 'returning') resetReceiver(s, worker);
    }
  }
  for (const order of s.orders) if (order.status === 'unloading' && order.remaining === 0 && !s.receivers.some(w => w.orderId === order.id && (w.load || w.reserved))) {
    order.status = 'received'; log(s, 'Livraison entièrement déchargée et rangée en réserve.');
  }
}
function minuteStep(s) {
  s.minute++; s.elapsed++;
  for (const order of s.orders) if (order.status === 'transit' && order.eta <= s.elapsed) {
    order.status = 'unloading'; log(s, `Livraison de ${order.quantity} unités arrivée au quai.`, 'success');
  }
  updateReceiving(s);
  updateRestocking(s);
  const peak = (s.minute >= 720 && s.minute < 840) ? 1.9 : (s.minute >= 1020 && s.minute < 1140) ? 1.55 : 1;
  if (s.minute < 1170) {
    s.arrivalCredit += 0.22 * peak * currentEvent(s).factor * (0.7 + random(s) * 0.6);
    while (s.arrivalCredit >= 1 && s.customers.length < 80) { spawnCustomer(s); s.arrivalCredit--; }
  }
  const abandoned = new Set();
  for (const customer of s.customers) {
    if (customer.stage === 'shopping') {
      customer.progress++;
      if (customer.progress >= 6) {
        const item = customer.items[customer.itemIndex];
        const p = s.products[item.index];
        const qty = Math.min(p.shelf, item.quantity);
        p.shelf -= qty; customer.value = round(customer.value + qty * p.price);
        if (qty > 0) customer.basket.push({ index: item.index, quantity: qty });
        if (qty < item.quantity) s.satisfaction = Math.max(0, s.satisfaction - 0.12);
        customer.itemIndex++; customer.progress = 0;
        if (customer.itemIndex >= customer.items.length) {
          if (customer.value === 0) { abandoned.add(customer.id); s.lost++; }
          else { customer.stage = 'queue'; customer.wait = 0; }
        }
      }
    } else {
      customer.wait++;
      if (customer.wait >= 18) {
        returnBasket(s, customer);
        abandoned.add(customer.id); s.lost++; s.satisfaction = Math.max(0, s.satisfaction - 0.7);
      }
    }
  }
  s.customers = s.customers.filter(c => !abandoned.has(c.id));
  const queue = s.customers.filter(c => c.stage === 'queue');
  s.checkoutCredit += s.staff.checkout > 0 ? Math.min(checkoutCount(s), s.staff.checkout) * 0.18 + (s.autoCheckout ? 0.2 : 0) : 0;
  if (s.staff.checkout === 0) s.checkoutCredit = 0;
  while (s.checkoutCredit >= 1 && queue.length) {
    const customer = queue.shift();
    recordSale(s, customer); s.checkoutCredit--;
    s.customers = s.customers.filter(c => c.id !== customer.id);
    s.satisfaction = Math.min(100, s.satisfaction + 0.03);
  }
  if (!queue.length) s.checkoutCredit = Math.min(1, s.checkoutCredit);
  if (s.minute < 1200) triggerAutomaticOrders(s);
  if (s.minute >= 1200) closeStore(s);
}
export function advance(s, minutes) {
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) throw new Error('Durée invalide.');
  if (s.phase !== 'open') return;
  for (let i = 0; i < Math.floor(minutes) && s.phase === 'open'; i++) minuteStep(s);
}
