import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, openStore, setStaff, placeOrder, advance, nextDay, reserveUsed, RESERVE_CAPACITY, dailyCosts, staffCount, buyAutoCheckout, selectRestockEquipment, restockInTransit, restockerPosition, quoteOrder, inventoryPosition, INITIAL_SHELF_STOCK } from '../dist/engine.js';

test('orders are paid once and reject invalid quantities or unavailable funds without changing the game', () => {
  const s = createGame(), before = s.money;
  const order = placeOrder(s, 'produce', 48, 'regular');
  assert.equal(s.money, before - order.cost);
  assert.equal(s.spending, order.cost);
  const snapshot = JSON.stringify(s);
  for (const args of [['produce', 11, 'regular'], ['unknown', 48, 'regular'], ['produce', 48, 'unknown'], ['produce', -12, 'regular']]) {
    assert.throws(() => placeOrder(s, ...args)); assert.equal(JSON.stringify(s), snapshot);
  }
  s.money = 1; assert.throws(() => placeOrder(s, 'produce', 48, 'regular'));
});

test('staff can exceed eight without taking workers from another team and payroll follows actual headcount', () => {
  const s = createGame();
  setStaff(s, 'checkout', 12); setStaff(s, 'shelves', 24); setStaff(s, 'receiving', 10);
  assert.equal(staffCount(s), 46); assert.equal(s.restockers.length, 24); assert.equal(s.receivers.length, 10);
  assert.equal(dailyCosts(s), 46 * 85 + 107 + 160);
  const before = JSON.stringify(s);
  for (const [role, amount] of [['shelves', -1], ['shelves', 1.5], ['reserve', 1], ['unknown', 1]]) assert.throws(() => setStaff(s, role, amount));
  assert.equal(JSON.stringify(s), before);
  setStaff(s, 'shelves', 0); assert.equal(s.restockers.length, 0); assert.equal(s.staff.checkout, 12);
});

test('deliveries wait for reception staff and do not overfill reserve', () => {
  const s = createGame(); setStaff(s, 'receiving', 0);
  const order = placeOrder(s, 'produce', 48, 'express'); openStore(s); advance(s, 40);
  assert.equal(s.orders[0].status, 'unloading'); assert.equal(s.orders[0].remaining, 48);
  setStaff(s, 'receiving', 1); advance(s, 30);
  assert.equal(s.orders.find(o => o.id === order.id).status, 'received');
  assert.ok(reserveUsed(s) <= RESERVE_CAPACITY);
  const full = createGame(); full.products.forEach(p => { p.reserve = p.reserveCapacity; });
  setStaff(full, 'shelves', 0); setStaff(full, 'checkout', 0);
  placeOrder(full, 'produce', 48, 'express'); openStore(full); advance(full, 60);
  assert.equal(full.orders[0].remaining, 48); assert.ok(reserveUsed(full) <= RESERVE_CAPACITY);
});

test('days roll over without a pause and reconcile cash exactly once per closing', () => {
  const s = createGame(); const initial = s.money;
  placeOrder(s, 'dairy', 96, 'regular'); openStore(s); s.speed = 6; advance(s, 720);
  assert.equal(s.phase, 'open'); assert.equal(s.day, 2); assert.equal(s.minute, 480); assert.equal(s.speed, 6);
  const summary = s.history.at(-1);
  assert.ok(summary.sales > 0); assert.ok(summary.sold > 0); assert.equal(s.customers.length, 0);
  assert.equal(Math.round(s.money * 100), Math.round((initial + summary.net) * 100));
  const cash = s.money; advance(s, 0); assert.equal(s.money, cash); assert.equal(s.history.length, 1);
  assert.throws(() => nextDay(s));
  assert.ok(s.products.some(p => p.shelf !== INITIAL_SHELF_STOCK || p.reserve !== 30));
});

test('without cashiers, abandoned baskets return to stock and no sales are invented', () => {
  const s = createGame(); setStaff(s, 'checkout', 0); const stock = s.products.reduce((n, p) => n + p.shelf + p.reserve, 0);
  openStore(s); advance(s, 720);
  assert.equal(s.sales, 0); assert.equal(s.sold, 0); assert.ok(s.history.at(-1).lost > 0);
  assert.equal(s.products.reduce((n, p) => n + p.shelf + p.reserve, 0), stock);
  assert.ok(s.products.every(p => p.shelf >= 0 && p.shelf <= p.capacity && p.reserve >= 0));
});

test('automatic checkout charges once and needs a cashier to operate', () => {
  const s = createGame(); buyAutoCheckout(s); assert.equal(s.money, 5000); assert.throws(() => buyAutoCheckout(s));
  setStaff(s, 'checkout', 0); openStore(s); advance(s, 720); assert.equal(s.sales, 0);
});

test('several demand cycles preserve stock capacities and cash accounting', () => {
  const s = createGame(9944);
  for (let day = 0; day < 10; day++) {
    const before = s.money;
    for (const p of s.products) if (s.money > 1000) placeOrder(s, p.id, 96, 'regular');
    if (day === 0) openStore(s);
    for (let minute = 0; minute < 720; minute++) {
      advance(s, 1);
      assert.ok(s.products.every(p => p.shelf >= 0 && p.shelf <= p.capacity && p.reserve >= 0));
      assert.ok(reserveUsed(s) <= RESERVE_CAPACITY);
    }
    assert.equal(Math.round(s.money * 100), Math.round((before + s.history.at(-1).net) * 100));
    if (s.phase === 'bankrupt') break;
    assert.equal(s.phase, 'open');
  }
});

function isolatedRestocking(mode = 'small', workers = 1) {
  const s = createGame();
  setStaff(s, 'shelves', workers);
  s.products.forEach(p => { p.shelf = p.capacity; p.reserve = 0; });
  s.products[0].shelf = 0; s.products[0].reserve = 160;
  s.arrivalCredit = -10000;
  if (mode !== 'small') selectRestockEquipment(s, 'medium');
  if (mode === 'large') selectRestockEquipment(s, 'large');
  openStore(s); return s;
}

test('restocking needs a human and goods reach a shelf only after loading and transport', () => {
  const unmanned = isolatedRestocking('small', 0); advance(unmanned, 100);
  assert.equal(unmanned.products[0].shelf, 0); assert.equal(restockInTransit(unmanned), 0);
  const s = isolatedRestocking(); advance(s, 1);
  assert.equal(s.restockers[0].phase, 'loading'); assert.equal(s.restockers[0].reserved, 8); assert.equal(s.restockers[0].load, 0);
  assert.equal(s.products[0].reserve, 160); assert.equal(s.products[0].shelf, 0);
  advance(s, 5);
  assert.equal(s.restockers[0].phase, 'outbound'); assert.equal(s.products[0].shelf, 0);
  const position = restockerPosition(s.restockers[0]); assert.ok(position.every(Number.isFinite));
  for (let i = 0; i < 80 && s.products[0].shelf === 0; i++) advance(s, 1);
  assert.ok(s.products[0].shelf > 0);
  assert.equal(s.products[0].shelf + s.products[0].reserve + restockInTransit(s), 160);
});

test('equipment unlocks are sequential, charge once, and fail without changing state', () => {
  const s = createGame(), initial = JSON.stringify(s);
  assert.throws(() => selectRestockEquipment(s, 'large')); assert.equal(JSON.stringify(s), initial);
  assert.throws(() => selectRestockEquipment(s, '__proto__')); assert.equal(JSON.stringify(s), initial);
  selectRestockEquipment(s, 'medium'); assert.equal(s.money, 7300); assert.equal(s.spending, 1200);
  selectRestockEquipment(s, 'small'); selectRestockEquipment(s, 'medium'); assert.equal(s.money, 7300);
  const snapshot = JSON.stringify(s); s.money = 100;
  assert.throws(() => selectRestockEquipment(s, 'large')); assert.equal(s.money, 100); assert.equal(s.restockMode, 'medium');
  Object.assign(s, JSON.parse(snapshot));
  selectRestockEquipment(s, 'large'); assert.equal(s.money, 3700); assert.equal(s.spending, 4800);
});

test('larger equipment carries more stock in the same working period without creating goods', () => {
  const results = ['small', 'medium', 'large'].map(mode => {
    const s = isolatedRestocking(mode); advance(s, 150);
    assert.equal(s.products[0].shelf + s.products[0].reserve + restockInTransit(s), 160);
    assert.ok(s.restockers.every(w => w.load >= 0));
    return s.products[0].shelf;
  });
  assert.ok(results[1] > results[0], results.join(','));
  assert.ok(results[2] > results[1], results.join(','));
});

test('an equipment change applies to the next trip and does not enlarge a current load', () => {
  const s = isolatedRestocking(); advance(s, 1); selectRestockEquipment(s, 'medium');
  assert.equal(s.restockers[0].mode, 'small'); assert.equal(s.restockers[0].reserved, 8);
  for (let i = 0; i < 100 && !s.restockers[0].completed; i++) advance(s, 1);
  advance(s, 1);
  assert.equal(s.restockers[0].mode, 'medium'); assert.equal(s.restockers[0].reserved, 24);
});

test('reassigning a restocker returns carried goods and closing clears transport jobs', () => {
  const s = isolatedRestocking('large'); advance(s, 8); assert.equal(restockInTransit(s), 48);
  setStaff(s, 'shelves', 0); assert.equal(restockInTransit(s), 0); assert.equal(s.products[0].reserve, 160);
  setStaff(s, 'shelves', 1); advance(s, 712);
  assert.equal(s.phase, 'open'); assert.equal(s.day, 2); assert.equal(restockInTransit(s), 0);
  assert.ok(s.restockers.every(w => w.phase === 'idle'));
  assert.equal(s.products[0].shelf + s.products[0].reserve, 160);
  assert.equal(s.restockMode, 'large'); assert.equal(s.restockUnlocked.large, true);
});

test('several restockers coordinate loads and reserve capacity during deliveries and returns', () => {
  const s = isolatedRestocking('large', 4);
  s.products.forEach(p => { p.reserve = 100; });
  placeOrder(s, 'dairy', 120, 'express');
  for (let i = 0; i < 720; i++) {
    advance(s, 1);
    assert.ok(reserveUsed(s) + restockInTransit(s) <= RESERVE_CAPACITY);
    assert.ok(s.products.every(p => p.shelf <= p.capacity && p.shelf >= 0 && p.reserve >= 0));
    if (i === 35) { setStaff(s, 'shelves', 0); setStaff(s, 'shelves', 4); }
  }
  assert.equal(restockInTransit(s), 0);
});

test('quantity discounts and delivery fees are reflected in the actual cost of a paid order', () => {
  const quotes = [12, 48, 120, 240].map(n => quoteOrder('produce', n, 'regular'));
  for (let i = 1; i < quotes.length; i++) {
    assert.ok(quotes[i].unitPrice < quotes[i - 1].unitPrice);
    assert.ok(quotes[i].landedUnitCost < quotes[i - 1].landedUnitCost);
  }
  assert.equal(quotes[0].deliveryFee, 35); assert.equal(quoteOrder('produce', 48, 'express').deliveryFee, 150);
  assert.equal(quotes[0].totalCost, 56.6);
  const s = createGame(), before = s.money, order = placeOrder(s, 'produce', 120, 'regular');
  assert.equal(order.cost, quotes[2].totalCost); assert.equal(s.money, before - order.cost);
  assert.throws(() => quoteOrder('produce', 48, '__proto__'));
});

test('low or empty stocks never trigger supplier purchases without an explicit order', () => {
  const s = createGame(); s.products.forEach(p => { p.shelf = 0; p.reserve = 0; });
  openStore(s); advance(s, 1440);
  assert.equal(s.orders.length, 0); assert.equal(s.history.length, 2);
  assert.ok(s.history.every(day => day.spending === 0)); assert.equal(s.money, 8500 - 2 * dailyCosts(s));
  const order = placeOrder(s, 'produce', 24, 'regular'); assert.equal(s.orders.length, 1); assert.equal(order.source, 'manual');
});

test('shelf workers load their own carts concurrently, with no separate preparation team', () => {
  const s = isolatedRestocking('large', 2); s.products[0].capacity = 128;
  setStaff(s, 'receiving', 0); setStaff(s, 'checkout', 0); advance(s, 1);
  assert.ok(s.restockers.every(w => w.phase === 'loading' && w.reserved === 48 && w.load === 0));
  assert.equal(s.products[0].reserve, 160);
  advance(s, 5);
  assert.ok(s.restockers.every(w => w.phase === 'outbound' && w.load === 48));
  assert.equal(s.products[0].reserve, 64); assert.equal(inventoryPosition(s, 'produce'), 160);
});

test('restocking, staffing and manual ordering persist across continuous days', () => {
  const s = createGame(); placeOrder(s, 'produce', 120, 'regular');
  setStaff(s, 'shelves', 12); const teams = { ...s.staff };
  openStore(s); s.speed = 3; advance(s, 1440);
  assert.equal(s.day, 3); assert.equal(s.phase, 'open'); assert.equal(s.speed, 3); assert.equal(s.history.length, 2);
  assert.deepEqual(s.staff, teams); assert.equal(s.orders.length, 1);
  assert.equal(restockInTransit(s), 0); assert.ok(s.products.every(p => p.reserve >= 0 && p.shelf <= p.capacity));
});
