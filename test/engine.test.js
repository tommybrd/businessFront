import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, openStore, setStaff, placeOrder, advance, nextDay, reserveUsed, RESERVE_CAPACITY, DAILY_COST, buyAutoCheckout } from '../dist/engine.js';

test('orders are paid once and reject invalid quantities or unavailable funds without changing the game', () => {
  const s = createGame(), before = s.money;
  const order = placeOrder(s, 'produce', 48, 'regular');
  assert.equal(s.money, before - order.cost);
  assert.equal(s.spending, order.cost);
  const snapshot = JSON.stringify(s);
  for (const args of [['produce', 13, 'regular'], ['unknown', 48, 'regular'], ['produce', 48, 'unknown'], ['produce', -12, 'regular']]) {
    assert.throws(() => placeOrder(s, ...args)); assert.equal(JSON.stringify(s), snapshot);
  }
  s.money = 1; assert.throws(() => placeOrder(s, 'produce', 48, 'regular'));
});

test('eight employees cannot be allocated twice, but can be reassigned', () => {
  const s = createGame();
  assert.throws(() => setStaff(s, 'checkout', 3));
  assert.throws(() => setStaff(s, 'shelves', -1));
  assert.throws(() => setStaff(s, 'unknown', 1));
  setStaff(s, 'shelves', 3); setStaff(s, 'checkout', 3);
  assert.equal(Object.values(s.staff).reduce((a, b) => a + b), 8);
});

test('deliveries wait for reception staff and do not overfill reserve', () => {
  const s = createGame(); setStaff(s, 'receiving', 0);
  const order = placeOrder(s, 'produce', 48, 'express'); openStore(s); advance(s, 40);
  assert.equal(s.orders[0].status, 'unloading'); assert.equal(s.orders[0].remaining, 48);
  setStaff(s, 'receiving', 2); advance(s, 30);
  assert.equal(s.orders.find(o => o.id === order.id).status, 'received');
  assert.ok(reserveUsed(s) <= RESERVE_CAPACITY);
  const full = createGame(); full.products.forEach(p => { p.reserve = 100; });
  setStaff(full, 'shelves', 0); setStaff(full, 'checkout', 0);
  placeOrder(full, 'produce', 48, 'express'); openStore(full); advance(full, 60);
  assert.equal(full.orders[0].remaining, 48); assert.ok(reserveUsed(full) <= RESERVE_CAPACITY);
});

test('a trading day closes exactly once and reconciles cash with purchases, sales and expenses', () => {
  const s = createGame(); const initial = s.money;
  placeOrder(s, 'dairy', 96, 'regular'); openStore(s); advance(s, 720);
  assert.equal(s.phase, 'closed'); assert.equal(s.minute, 1200); assert.equal(s.speed, 0);
  assert.ok(s.sales > 0); assert.ok(s.sold > 0); assert.equal(s.customers.length, 0);
  assert.equal(Math.round(s.money * 100), Math.round((initial + s.sales - s.spending - DAILY_COST) * 100));
  const cash = s.money; advance(s, 720); assert.equal(s.money, cash);
  const inventory = s.products.map(p => ({ shelf: p.shelf, reserve: p.reserve }));
  nextDay(s); assert.equal(s.day, 2); assert.equal(s.phase, 'preparation'); assert.equal(s.sales, 0);
  assert.deepEqual(s.products.map(p => ({ shelf: p.shelf, reserve: p.reserve })), inventory);
});

test('without cashiers, abandoned baskets return to stock and no sales are invented', () => {
  const s = createGame(); setStaff(s, 'checkout', 0); const stock = s.products.reduce((n, p) => n + p.shelf + p.reserve, 0);
  openStore(s); advance(s, 720);
  assert.equal(s.sales, 0); assert.equal(s.sold, 0); assert.ok(s.lost > 0);
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
    openStore(s);
    for (let minute = 0; minute < 720; minute++) {
      advance(s, 1);
      assert.ok(s.products.every(p => p.shelf >= 0 && p.shelf <= p.capacity && p.reserve >= 0));
      assert.ok(reserveUsed(s) <= RESERVE_CAPACITY);
    }
    assert.equal(Math.round(s.money * 100), Math.round((before + s.sales - s.spending - DAILY_COST) * 100));
    if (s.phase === 'bankrupt') break;
    nextDay(s);
  }
});
