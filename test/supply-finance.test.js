import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, openStore, setStaff, advance, placeOrder, inventoryPosition, receivingInTransit, restockerPosition, requestRestock, expandStore, checkoutCount, discardReserve, setDirectorSalary, reinvestPersonalCash, payTaxes, setAutomaticTaxPayment, selectRestockEquipment } from '../dist/engine.js';

function quietGame() {
  const s = createGame(); setStaff(s, 'shelves', 0); setStaff(s, 'checkout', 0); setStaff(s, 'reserve', 0);
  s.arrivalCredit = -10000; return s;
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
  const s = quietGame(); s.products[0].reserve = 100;
  placeOrder(s, 'produce', 48, 'express'); placeOrder(s, 'bakery', 48, 'express');
  openStore(s); advance(s, 90);
  assert.equal(s.orders[0].remaining, 48); assert.equal(s.orders[0].status, 'unloading');
  assert.equal(s.orders[1].status, 'received'); assert.equal(s.products[1].reserve, 78);
  assert.ok(s.products.every(p => p.reserve <= p.reserveCapacity));
});

test('human pallet transport preserves incoming goods through reallocation, capacity limits and disposal', () => {
  const s = quietGame(); s.products[0].reserve = 0; setStaff(s, 'receiving', 2);
  placeOrder(s, 'produce', 120, 'express'); const total = inventoryPosition(s, 'produce'), cash = s.money;
  openStore(s); advance(s, 40); assert.ok(receivingInTransit(s) > 0);
  assert.equal(inventoryPosition(s, 'produce'), total);
  assert.ok(s.receivers.every(w => w.load <= 48)); assert.ok(restockerPosition(s.receivers[0]).every(Number.isFinite));
  setStaff(s, 'receiving', 0); assert.equal(receivingInTransit(s), 0); assert.equal(inventoryPosition(s, 'produce'), total);
  setStaff(s, 'receiving', 2); advance(s, 80);
  assert.equal(s.products[0].reserve, 100); assert.equal(s.orders[0].remaining, 20);
  discardReserve(s, 'produce', 20); advance(s, 80);
  assert.equal(s.products[0].reserve, 100); assert.equal(s.orders[0].status, 'received');
  assert.equal(inventoryPosition(s, 'produce'), total - 20); assert.equal(s.money, cash);
});

test('discarding reserve goods protects prepared loads and does not refund paid merchandise', () => {
  const s = createGame(); s.arrivalCredit = -10000; openStore(s); advance(s, 1);
  const p = s.products.find(p => s.restockers.some(w => w.productId === p.id && w.reserved));
  const reserved = s.restockers.filter(w => w.productId === p.id).reduce((sum, w) => sum + w.reserved, 0);
  const cash = s.money; assert.throws(() => discardReserve(s, p.id, p.reserve));
  discardReserve(s, p.id, p.reserve - reserved); assert.equal(p.reserve, reserved); assert.equal(s.money, cash);
  assert.throws(() => discardReserve(s, p.id, -1));
});

test('independent expansions charge once per level, increase real capacities and reject unaffordable or capped upgrades', () => {
  const s = createGame(), staff = { ...s.staff };
  for (const zone of ['checkout', 'shelves', 'reserve']) expandStore(s, zone);
  assert.equal(s.money, 1000); assert.equal(s.spending, 7500); assert.equal(checkoutCount(s), 6);
  assert.ok(s.products.every(p => p.capacity === 96 && p.reserveCapacity === 150)); assert.deepEqual(s.staff, staff);
  const snapshot = JSON.stringify(s); assert.throws(() => expandStore(s, 'checkout')); assert.throws(() => expandStore(s, '__proto__')); assert.equal(JSON.stringify(s), snapshot);
  s.money = 20000; expandStore(s, 'checkout'); assert.equal(checkoutCount(s), 8);
  const full = JSON.stringify(s); assert.throws(() => expandStore(s, 'checkout')); assert.equal(JSON.stringify(s), full);
});

test('VAT, profit tax and salary settle once at closing and personal reinvestment stays separate from sales', () => {
  const s = quietGame(); const initial = s.money; setDirectorSalary(s, 100); placeOrder(s, 'produce', 12, 'regular');
  const summary = finishDay(s, 1200);
  assert.equal(summary.vatCollected, 200); assert.equal(summary.vatDeductible, 9.43); assert.equal(summary.vatCharged, 190.57);
  assert.equal(summary.taxableProfit, 12.83); assert.equal(summary.profitTax, 2.57); assert.equal(summary.taxPaid, 193.14);
  assert.equal(summary.salaryPaid, 100); assert.equal(s.personalCash, 100);
  assert.equal(Math.round(s.money * 100), Math.round((initial + summary.net) * 100));
  const cash = s.money; advance(s, 0); assert.equal(s.money, cash); assert.equal(s.personalCash, 100);
  reinvestPersonalCash(s, 40); assert.equal(s.personalCash, 60); assert.equal(s.ownerContribution, 40); assert.equal(s.sales, 0);
  assert.equal(Math.round(s.money * 100), Math.round((cash + 40) * 100)); assert.throws(() => reinvestPersonalCash(s, 100));
});

test('manual tax payment clears liabilities without charging them again on the next closing', () => {
  const s = quietGame(); setAutomaticTaxPayment(s, false); const first = finishDay(s, 1200);
  assert.equal(first.taxPaid, 0); assert.equal(s.vatDue, 200); assert.equal(s.profitTaxDue, 32);
  const cash = s.money, payment = payTaxes(s); assert.equal(payment.paid, 232); assert.equal(s.money, cash - 232);
  assert.equal(s.vatDue + s.profitTaxDue, 0); assert.throws(() => payTaxes(s));
  const next = finishDay(s, 0); assert.equal(next.taxPaid, 232); assert.equal(next.net, -840 - 232);
  assert.equal(s.money, cash - 232 - 840);
});

test('deductible VAT is carried forward and offsets later collected VAT', () => {
  const s = quietGame(); selectRestockEquipment(s, 'large'); const first = finishDay(s);
  assert.equal(first.vatCharged, 0); assert.equal(s.vatCredit, 200);
  const next = finishDay(s, 1200); assert.equal(next.vatCharged, 0); assert.equal(s.vatCredit, 0); assert.equal(next.profitTax, 32);
});

test('closing returns pallet cargo to the dock while preserving a continuous day and paid order', () => {
  const s = quietGame(); s.products[0].reserve = 0; placeOrder(s, 'produce', 48, 'express');
  openStore(s); advance(s, 35); assert.ok(receivingInTransit(s) > 0);
  const total = inventoryPosition(s, 'produce'); s.minute = 1199; advance(s, 1);
  assert.equal(s.phase, 'open'); assert.equal(s.day, 2); assert.equal(receivingInTransit(s), 0);
  assert.equal(inventoryPosition(s, 'produce'), total); assert.equal(s.orders[0].remaining, 48);
});

test('two busy continuous days keep per-product capacity and cash reconciliation with both transport teams', () => {
  const s = createGame(723), initial = 100000; s.money = initial;
  setStaff(s, 'shelves', 2); setStaff(s, 'reserve', 2); setStaff(s, 'receiving', 2);
  selectRestockEquipment(s, 'large'); selectRestockEquipment(s, 'pallet');
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
      assert.ok(p.reserve >= 0 && p.reserve + restocking + unloading + baskets <= p.reserveCapacity);
    }
  }
  assert.equal(s.day, 3); assert.equal(s.history.length, 2); assert.equal(s.personalCash, 400);
  assert.equal(Math.round(s.money * 100), Math.round((initial + s.history.reduce((sum, day) => sum + day.net, 0)) * 100));
});
