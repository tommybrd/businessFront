export const PRODUCTS = [
  { id: 'produce', name: 'Fruits & légumes', short: 'Fruits', color: '#87bd59', cost: 1.8, price: 3.4, capacity: 64 },
  { id: 'bakery', name: 'Boulangerie', short: 'Pain', color: '#e9b85e', cost: 1.1, price: 2.5, capacity: 64 },
  { id: 'dairy', name: 'Produits frais', short: 'Frais', color: '#6bc2da', cost: 2.1, price: 4.2, capacity: 64 },
  { id: 'grocery', name: 'Épicerie', short: 'Épicerie', color: '#b4a3ed', cost: 2.3, price: 4.6, capacity: 64 },
  { id: 'drinks', name: 'Boissons', short: 'Boissons', color: '#6c9be5', cost: 1.9, price: 3.8, capacity: 64 },
  { id: 'home', name: 'Maison & entretien', short: 'Maison', color: '#ec88a5', cost: 3.3, price: 6.9, capacity: 64 },
];
export const SUPPLIERS = {
  regular: { name: 'Centrale Nord', lead: 90, multiplier: 1 },
  express: { name: 'Express Marché', lead: 30, multiplier: 1.18 },
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
const round = n => Math.round(n * 100) / 100;
export const currentEvent = s => EVENTS[(s.day - 1) % EVENTS.length];
export const reserveUsed = s => s.products.reduce((sum, p) => sum + p.reserve, 0);
export const clock = minute => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(Math.floor(minute % 60)).padStart(2, '0')}`;

export function createGame(seed = 73471) {
  return {
    day: 1, minute: 450, money: 8500, phase: 'preparation', speed: 0,
    seed, nextId: 1, staff: { checkout: 2, shelves: 4, receiving: 2 },
    products: PRODUCTS.map(p => ({ ...p, shelf: 42, reserve: 30 })),
    orders: [], customers: [], sold: 0, lost: 0, sales: 0, spending: 0,
    satisfaction: 100, autoCheckout: false, checkoutCredit: 0, refillCredit: 0,
    receivingCredit: 0, arrivalCredit: 0, elapsed: 0, history: [], summary: null,
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
  return { ...s.staff };
}
export function placeOrder(s, productId, quantity, supplierId) {
  const product = s.products.find(p => p.id === productId);
  const supplier = SUPPLIERS[supplierId];
  if (!product || !supplier || !Number.isInteger(quantity) || quantity < 12 || quantity > 240 || quantity % 12 !== 0) throw new Error('Choisissez un produit, un fournisseur et un multiple de 12 entre 12 et 240.');
  if (s.phase === 'closed' || s.phase === 'bankrupt') throw new Error('Préparez la journée suivante avant de commander.');
  const cost = round(product.cost * supplier.multiplier * quantity);
  if (cost > s.money) throw new Error('Trésorerie insuffisante pour cette commande.');
  const order = { id: s.nextId++, productId, quantity, remaining: quantity, cost, supplier: supplier.name, eta: s.elapsed + supplier.lead, status: 'transit' };
  s.money = round(s.money - cost); s.spending = round(s.spending + cost); s.orders.push(order);
  log(s, `${quantity} unités de ${product.short.toLowerCase()} commandées chez ${supplier.name}.`);
  return { ...order };
}
export function buyAutoCheckout(s) {
  if (s.autoCheckout) throw new Error('La caisse automatique est déjà installée.');
  if (s.money < 3500) throw new Error('Il faut 3 500 € pour installer une caisse automatique.');
  if (s.phase === 'closed' || s.phase === 'bankrupt') throw new Error('Attendez la préparation de la prochaine journée.');
  s.money -= 3500; s.spending += 3500; s.autoCheckout = true;
  log(s, 'Caisse automatique installée. Elle fonctionne avec au moins un employé aux caisses.', 'success');
}
export function openStore(s) {
  if (s.phase !== 'preparation') throw new Error('Le magasin ne peut pas ouvrir maintenant.');
  s.phase = 'open'; s.minute = 480; s.speed = 1;
  log(s, `Ouverture du magasin : ${currentEvent(s).name.toLowerCase()}.`, 'success');
}
export function nextDay(s) {
  if (s.phase !== 'closed') throw new Error('La journée doit être terminée.');
  s.day++; s.minute = 450; s.phase = 'preparation'; s.speed = 0;
  s.sold = 0; s.lost = 0; s.sales = 0; s.spending = 0; s.summary = null;
  s.arrivalCredit = 0; s.checkoutCredit = 0;
  s.satisfaction = Math.min(100, s.satisfaction + 8);
  log(s, `Jour ${s.day} : ${currentEvent(s).name}. ${currentEvent(s).hint}`);
}
function closeStore(s) {
  for (const c of s.customers) {
    if (c.value > 0 && s.staff.checkout > 0) { s.sales = round(s.sales + c.value); s.money = round(s.money + c.value); s.sold++; }
    else { returnBasket(s, c); s.lost++; }
  }
  s.customers = []; s.money = round(s.money - DAILY_COST); s.speed = 0;
  s.phase = s.money < -1000 ? 'bankrupt' : 'closed';
  s.summary = { day: s.day, sales: s.sales, spending: s.spending, expenses: DAILY_COST, net: round(s.sales - s.spending - DAILY_COST), sold: s.sold, lost: s.lost };
  s.history.push({ ...s.summary });
  log(s, `Fermeture. ${s.sold} clients encaissés. Charges : ${DAILY_COST} €.`, s.summary.net >= 0 ? 'success' : 'warning');
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
function minuteStep(s) {
  s.minute++; s.elapsed++;
  for (const order of s.orders) if (order.status === 'transit' && order.eta <= s.elapsed) {
    order.status = 'unloading'; log(s, `Livraison de ${order.quantity} unités arrivée au quai.`, 'success');
  }
  s.receivingCredit += s.staff.receiving * 1.8;
  while (s.receivingCredit >= 1) {
    const order = s.orders.find(o => o.status === 'unloading');
    const heldGoods = s.customers.reduce((sum, c) => sum + c.basket.reduce((n, item) => n + item.quantity, 0), 0);
    if (!order || reserveUsed(s) + heldGoods >= RESERVE_CAPACITY) { s.receivingCredit = Math.min(1, s.receivingCredit); break; }
    s.products.find(p => p.id === order.productId).reserve++;
    order.remaining--; s.receivingCredit--;
    if (order.remaining === 0) { order.status = 'received'; log(s, 'Palette réceptionnée et rangée en réserve.'); }
  }
  s.refillCredit += s.staff.shelves * 0.65;
  while (s.refillCredit >= 1) {
    const product = s.products.filter(p => p.reserve > 0 && p.shelf < p.capacity).sort((a, b) => a.shelf / a.capacity - b.shelf / b.capacity)[0];
    if (!product) { s.refillCredit = Math.min(1, s.refillCredit); break; }
    product.reserve--; product.shelf++; s.refillCredit--;
  }
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
  s.checkoutCredit += s.staff.checkout > 0 ? Math.min(4, s.staff.checkout) * 0.18 + (s.autoCheckout ? 0.2 : 0) : 0;
  if (s.staff.checkout === 0) s.checkoutCredit = 0;
  while (s.checkoutCredit >= 1 && queue.length) {
    const customer = queue.shift();
    s.money = round(s.money + customer.value); s.sales = round(s.sales + customer.value);
    s.sold++; s.checkoutCredit--;
    s.customers = s.customers.filter(c => c.id !== customer.id);
    s.satisfaction = Math.min(100, s.satisfaction + 0.03);
  }
  if (!queue.length) s.checkoutCredit = Math.min(1, s.checkoutCredit);
  if (s.minute >= 1200) closeStore(s);
}
export function advance(s, minutes) {
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) throw new Error('Durée invalide.');
  if (s.phase !== 'open') return;
  for (let i = 0; i < Math.floor(minutes) && s.phase === 'open'; i++) minuteStep(s);
}
