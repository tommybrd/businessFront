import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, openStore, setStaff, advance, placeOrder, inventoryPosition, receivingInTransit, restockerPosition, requestRestock, expandStore, checkoutCount, discardReserve, setDirectorSalary, setDirectorAnnualSalary, setDirectorProfitShare, dailyProfitability, startDayOnLoad, reinvestPersonalCash, payTaxes, setAutomaticTaxPayment, selectRestockEquipment, dailyCosts, setInstallation, checkoutDailyCosts, buyAutoCheckout } from '../dist/engine.js';

function quietGame() {
  const s = createGame(); setStaff(s, 'shelves', 0); setStaff(s, 'checkout', 0);
  s.arrivalCredit = -10000; return s;
}
function advanceUntil(s, predicate, limit = 160) {
  for (let i = 0; i < limit && !predicate(); i++) advance(s, 1);
  assert.ok(predicate(), 'Expected handling phase was not reached.');
}
function finishDay(s, saleValue = 0) {
  if (s.phase === 'preparation') openStore(s);
  s.arrivalCredit = -10000; s.minute = 1199; setStaff(s, 'checkout', 1); s.checkoutCredit = 1;
  s.customers = saleValue ? [{ id: 99999, stage: 'queue', wait: 0, value: saleValue, basket: [], items: [] }] : [];
  advance(s, 1); return s.history.at(-1);
}

test('requested shelf filling prioritizes that product without creating or instantly moving goods', () => {
  const s = createGame(); setStaff(s, 'shelves', 1); s.arrivalCredit = -10000;
  s.products[0].shelf = 0; const before = s.products.map(p => [p.shelf, p.reserve]);
  requestRestock(s, 'bakery'); requestRestock(s, 'bakery');
  assert.deepEqual(s.restockRequests, ['bakery']); assert.deepEqual(s.products.map(p => [p.shelf, p.reserve]), before);
  const snapshot = JSON.stringify(s); assert.throws(() => requestRestock(s, 'unknown')); assert.equal(JSON.stringify(s), snapshot);
  openStore(s); advance(s, 1); assert.equal(s.restockers[0].productId, 'bakery'); assert.equal(s.restockers[0].phase, 'loading');
});

test('a full product reserve blocks only its own delivery, not the next product at the dock', () => {
  const s = quietGame(); s.products[0].reserve = s.products[0].reserveCapacity;
  placeOrder(s, 'produce', 48, 'express'); placeOrder(s, 'bakery', 48, 'express');
  openStore(s); advance(s, 90);
  assert.equal(s.orders[0].remaining, 48); assert.equal(s.orders[0].status, 'unloading');
  assert.equal(s.orders[1].status, 'received'); assert.equal(s.products[1].reserve, 78);
  assert.ok(s.products.every(p => p.reserve <= p.reserveCapacity));
});

test('human pallet transport preserves incoming goods through reallocation, capacity limits and disposal', () => {
  const s = quietGame(); s.products[0].reserve = 0; s.products[0].reserveCapacity = 400; setStaff(s, 'receiving', 2);
  placeOrder(s, 'produce', 480, 'express'); const total = inventoryPosition(s, 'produce'), cash = s.money;
  openStore(s); advanceUntil(s, () => receivingInTransit(s) > 0);
  assert.equal(inventoryPosition(s, 'produce'), total);
  assert.ok(s.receivers.every(w => w.load <= 240)); assert.ok(restockerPosition(s.receivers[0]).every(Number.isFinite));
  setStaff(s, 'receiving', 0); assert.equal(receivingInTransit(s), 0); assert.equal(inventoryPosition(s, 'produce'), total);
  setStaff(s, 'receiving', 2); advance(s, 80);
  assert.equal(s.products[0].reserve, 240); assert.equal(s.orders[0].remaining, 240);
  discardReserve(s, 'produce', 80); advance(s, 80);
  assert.equal(s.products[0].reserve, 400); assert.equal(s.orders[0].status, 'received');
  assert.equal(inventoryPosition(s, 'produce'), total - 80); assert.equal(s.money, cash);
});

test('discarding reserve goods protects prepared loads and does not refund paid merchandise', () => {
  const s = createGame(); setStaff(s, 'shelves', 1); s.arrivalCredit = -10000; requestRestock(s, 'produce'); openStore(s); advance(s, 1);
  const p = s.products.find(p => s.restockers.some(w => w.productId === p.id && w.reserved));
  const reserved = s.restockers.filter(w => w.productId === p.id).reduce((sum, w) => sum + w.reserved, 0);
  const cash = s.money; assert.throws(() => discardReserve(s, p.id, p.reserve));
  discardReserve(s, p.id, p.reserve - reserved); assert.equal(p.reserve, reserved); assert.equal(s.money, cash);
  assert.throws(() => discardReserve(s, p.id, -1));
});

test('independent expansions charge once per level, increase real capacities and reject unaffordable or capped upgrades', () => {
  const s = createGame(), staff = { ...s.staff };
  for (const zone of ['checkout', 'shelves', 'reserve']) expandStore(s, zone);
  assert.equal(s.money, 1000); assert.equal(s.spending, 7500); assert.equal(checkoutCount(s), 4);
  assert.ok(s.products.every(p => p.capacity === 600 && p.reserveCapacity === 750)); assert.deepEqual(s.staff, staff);
  const snapshot = JSON.stringify(s); assert.throws(() => expandStore(s, 'checkout')); assert.throws(() => expandStore(s, '__proto__')); assert.equal(JSON.stringify(s), snapshot);
  s.money = 20000; expandStore(s, 'checkout'); assert.equal(checkoutCount(s), 4); setInstallation(s, 'checkouts', 8); assert.equal(checkoutCount(s), 8);
  const full = JSON.stringify(s); assert.throws(() => expandStore(s, 'checkout')); assert.equal(JSON.stringify(s), full);
});

test('VAT, profit tax and salary settle once at closing and personal reinvestment stays separate from sales', () => {
  const s = quietGame(); const initial = s.money; setDirectorSalary(s, 100); placeOrder(s, 'produce', 12, 'regular');
  const summary = finishDay(s, 2400);
  assert.equal(summary.vatCollected, 400); assert.equal(summary.vatDeductible, 9.43); assert.equal(summary.vatCharged, 390.57);
  assert.equal(summary.taxableProfit, 873.83); assert.equal(summary.profitTax, 174.77); assert.equal(summary.taxPaid, 565.34);
  assert.equal(summary.salaryPaid, 100); assert.equal(s.personalCash, 100);
  assert.equal(Math.round(s.money * 100), Math.round((initial + summary.net) * 100));
  const cash = s.money; advance(s, 0); assert.equal(s.money, cash); assert.equal(s.personalCash, 100);
  reinvestPersonalCash(s, 40); assert.equal(s.personalCash, 60); assert.equal(s.ownerContribution, 40); assert.equal(s.sales, 0);
  assert.equal(Math.round(s.money * 100), Math.round((cash + 40) * 100)); assert.throws(() => reinvestPersonalCash(s, 100));
});

test('manual tax payment clears liabilities without charging them again on the next closing', () => {
  const s = quietGame(); setAutomaticTaxPayment(s, false); const first = finishDay(s, 1200);
  assert.equal(first.taxPaid, 0); assert.equal(s.vatDue, 200); assert.equal(s.profitTaxDue, 0.6);
  const cash = s.money, payment = payTaxes(s); assert.equal(payment.paid, 200.6); assert.equal(s.money, cash - 200.6);
  assert.equal(s.vatDue + s.profitTaxDue, 0); assert.throws(() => payTaxes(s));
  const next = finishDay(s, 0); assert.equal(next.taxPaid, 200.6); assert.equal(next.net, -997 - 200.6);
  assert.equal(s.money, cash - 200.6 - 997);
});

test('deductible VAT is carried forward and offsets later collected VAT', () => {
  const s = quietGame(); selectRestockEquipment(s, 'medium'); const first = finishDay(s);
  assert.equal(first.vatCharged, 0); assert.equal(s.vatCredit, 200);
  const next = finishDay(s, 1200); assert.equal(next.vatCharged, 0); assert.equal(s.vatCredit, 0); assert.equal(next.profitTax, 0.6);
});

test('closing returns pallet cargo to the dock while preserving a continuous day and paid order', () => {
  const s = quietGame(); s.products[0].reserve = 0; placeOrder(s, 'produce', 48, 'express');
  openStore(s); advanceUntil(s, () => receivingInTransit(s) > 0);
  const total = inventoryPosition(s, 'produce'); s.minute = 1199; advance(s, 1);
  assert.equal(s.phase, 'open'); assert.equal(s.day, 2); assert.equal(receivingInTransit(s), 0);
  assert.equal(inventoryPosition(s, 'produce'), total); assert.equal(s.orders[0].remaining, 48);
});

test('two busy continuous days keep per-product capacity and cash reconciliation with both transport teams', () => {
  const s = createGame(723), initial = 100000; s.money = initial;
  setStaff(s, 'shelves', 2); setStaff(s, 'receiving', 2);
  selectRestockEquipment(s, 'medium'); selectRestockEquipment(s, 'large');
  expandStore(s, 'reserve'); setDirectorSalary(s, 200);
  for (const p of s.products) placeOrder(s, p.id, 120, 'regular');
  openStore(s);
  for (let minute = 0; minute < 1440; minute++) {
    advance(s, 1);
    for (const [index, p] of s.products.entries()) {
      const restocking = s.restockers.filter(w => w.productId === p.id).reduce((sum, w) => sum + w.load, 0);
      const unloading = s.receivers.filter(w => w.productId === p.id).reduce((sum, w) => sum + w.load + w.reserved, 0);
      const baskets = s.customers.reduce((sum, c) => sum + c.basket.filter(item => item.index === index).reduce((n, item) => n + item.quantity, 0), 0);
      assert.ok(p.shelf >= 0 && p.shelf <= p.capacity);
      // Baskets can return to the vacancies left in the shelf; only overflow needs reserve space.
      const prepared = s.restockers.filter(w => w.productId === p.id).reduce((sum, w) => sum + w.reserved, 0);
      const basketOverflow = Math.max(0, baskets - Math.max(0, p.capacity - p.shelf - restocking - prepared));
      assert.ok(p.reserve >= 0 && p.reserve + restocking + unloading + basketOverflow <= p.reserveCapacity);
    }
  }
  assert.equal(s.day, 3); assert.equal(s.history.length, 2); assert.equal(s.personalCash, 400);
  assert.equal(Math.round(s.money * 100), Math.round((initial + s.history.reduce((sum, day) => sum + day.net, 0)) * 100));
});


test('receivers lift whole pallets and unpack only at the reserve', () => {
  const s = quietGame(); s.products[0].reserve = 52; s.products[0].reserveCapacity = 100;
  const order = placeOrder(s, 'produce', 48, 'express'); openStore(s);
  advanceUntil(s, () => s.receivers[0].reserved > 0);
  assert.equal(s.receivers[0].reserved, 48); assert.equal(s.orders[0].remaining, 48);
  advanceUntil(s, () => s.receivers[0].phase === 'outbound');
  assert.equal(s.receivers[0].load, 48); assert.equal(s.orders[0].remaining, 0);
  assert.equal(s.orders[0].pallets[0].status, 'transport'); assert.equal(s.products[0].reserve, 52);
  for (let i = 0; i < 50 && s.receivers[0].phase !== 'storing'; i++) advance(s, 1);
  assert.equal(s.receivers[0].load, 48); advance(s, 1);
  assert.equal(s.receivers[0].load, 36); assert.equal(s.orders[0].pallets[0].remaining, 36); assert.equal(s.products[0].reserve, 64);
  advance(s, 30); assert.equal(s.orders.find(o => o.id === order.id).status, 'received'); assert.equal(s.products[0].reserve, 100);
});

test('a trailer admits one pallet pickup at a time and releases reservations when the handler is reassigned', () => {
  const s = quietGame(); s.products[0].reserve = 0; expandStore(s, 'reserve'); setStaff(s, 'receiving', 12);
  placeOrder(s, 'produce', 120, 'express'); openStore(s);
  advanceUntil(s, () => s.receivers.some(w => w.reserved));
  assert.deepEqual(s.receivers.filter(w => w.reserved).map(w => w.reserved), [120]);
  setStaff(s, 'receiving', 0);
  assert.ok(s.orders[0].pallets.every(p => p.status === 'dock')); assert.equal(s.orders[0].remaining, 120);
  setStaff(s, 'receiving', 3); advance(s, 100);
  assert.equal(s.orders[0].status, 'received'); assert.equal(s.products[0].reserve, 120);
});

test('cash-register operating costs and staff wages are charged once at closing and follow equipment and headcount', () => {
  const s = quietGame(); assert.equal(checkoutDailyCosts(s), 20);
  expandStore(s, 'checkout'); assert.equal(checkoutDailyCosts(s), 20); setInstallation(s, 'checkouts', 6); assert.equal(checkoutDailyCosts(s), 30);
  buyAutoCheckout(s); assert.equal(checkoutDailyCosts(s), 38);
  setStaff(s, 'checkout', 12); const cash = s.money, costs = dailyCosts(s);
  openStore(s); s.minute = 1199; s.arrivalCredit = -10000; advance(s, 1);
  assert.equal(s.history[0].expenses, 13 * 85 + 125 + 821.94);
  assert.equal(s.money, cash - costs); assert.equal(s.history[0].net, -costs - 7300);
  advance(s, 0); assert.equal(s.money, cash - costs);
});


test('annual gross director salary converts to daily pay and closes without a rounding warning',()=>{
  const s=quietGame();setDirectorAnnualSalary(s,30000);
  assert.equal(s.directorSalary,30000/365);
  const summary=finishDay(s);
  assert.equal(summary.salaryPaid,82.19);assert.equal(s.personalCash,82.19);
  assert.ok(!s.log.some(entry=>entry.text?.includes('salaire du directeur est limité')));
});
test('invalid annual salaries leave the existing salary intact and zero stops payment',()=>{
  const s=quietGame();setDirectorAnnualSalary(s,40000);
  for(const amount of [-1,365001,Infinity,NaN,100.5]){assert.throws(()=>setDirectorAnnualSalary(s,amount));assert.equal(s.directorSalary,40000/365);}
  setDirectorAnnualSalary(s,0);assert.equal(finishDay(s).salaryPaid,0);
});

test('profit sharing pays once, deducts the bonus before tax and reconciles the personal balance',()=>{
 const s=quietGame();setStaff(s,'checkout',1);setDirectorAnnualSalary(s,36500);setDirectorProfitShare(s,10);
 const base=2000-dailyCosts(s)-100,bonus=Math.round(base*.1*100)/100,summary=finishDay(s,2400);
 assert.equal(summary.profitSharePaid,bonus);assert.equal(s.personalCash,100+bonus);
 assert.equal(summary.expenses,dailyCosts(s)+100+bonus);assert.equal(summary.beforeTax,Math.round((base-bonus)*100)/100);
 assert.equal(summary.profitTax,Math.round(summary.beforeTax*.2*100)/100);
 const paid=s.personalCash;advance(s,1);assert.equal(s.personalCash,paid);
});
test('profit sharing never pays on a loss or beyond the available cash',()=>{
 const loss=quietGame();setDirectorProfitShare(loss,100);assert.equal(finishDay(loss).profitSharePaid,0);
 const s=quietGame();setStaff(s,'checkout',1);setDirectorAnnualSalary(s,36500);setDirectorProfitShare(s,100);
 s.sales=2400;s.vatCollected=400;s.money=dailyCosts(s)+105;
 const estimate=dailyProfitability(s);assert.equal(estimate.profitSharePaid,5);
 const summary=finishDay(s);assert.equal(summary.profitSharePaid,5);assert.equal(s.personalCash,105);assert.ok(s.money<=0);
 for(const n of [-1,101,NaN,1.5])assert.throws(()=>setDirectorProfitShare(s,n));
});
test('loaded player games enforce the 240 unit minimum for express and evening purchases',()=>{
 const s=quietGame();startDayOnLoad(s);
 for(const quantity of [12,48,120,239]){const before=JSON.stringify(s);assert.throws(()=>placeOrder(s,'produce',quantity,'express'));assert.equal(JSON.stringify(s),before);}
 assert.equal(placeOrder(s,'produce',240,'express').quantity,240);
});
