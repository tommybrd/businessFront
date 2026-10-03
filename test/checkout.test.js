import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, setStaff, openStore, advance, buyAutoCheckout } from '../dist/engine.js';

function store(cashiers = 1) {
  const state = createGame();
  setStaff(state, 'shelves', 0); setStaff(state, 'receiving', 0); setStaff(state, 'checkout', cashiers);
  state.arrivalCredit = -100000; openStore(state); return state;
}
function buyer(state, id) {
  state.products[0].shelf--;
  state.customers.push({ id, stage: 'queue', wait: 0, value: 3.4, basket: [{ index: 0, quantity: 1 }], items: [] });
}

test('a cashier serves one customer at a time in queue order and charges only once after scanning', () => {
  const s = store(); buyer(s, 101); buyer(s, 102); const cash = s.money;
  advance(s, 1); assert.equal(s.sales, 0); assert.equal(s.customers.filter(c => c.stage === 'checkout').length, 1);
  assert.equal(s.customers[0].id, 101); assert.equal(s.customers[1].stage, 'queue');
  advance(s, 3); assert.equal(s.sold, 0);
  advance(s, 1); assert.equal(s.sold, 1); assert.equal(s.sales, 3.4); assert.equal(s.customers[0].id, 102); assert.equal(s.customers[0].stage, 'checkout');
  advance(s, 4); assert.equal(s.sold, 2); assert.equal(s.sales, 6.8); assert.equal(s.money, cash + 6.8);
  const vat = s.vatCollected; advance(s, 20); assert.equal(s.sales, 6.8); assert.equal(s.vatCollected, vat);
});

test('each open checkout has its own customer and more cashiers allow parallel service', () => {
  const s = store(2); buyer(s, 101); buyer(s, 102); buyer(s, 103); advance(s, 1);
  const active = s.customers.filter(c => c.stage === 'checkout');
  assert.equal(active.length, 2); assert.equal(new Set(active.map(c => c.checkoutLane)).size, 2);
  advance(s, 4); assert.equal(s.sold, 2); assert.equal(s.customers.length, 1); assert.equal(s.customers[0].stage, 'checkout');
});

test('closing a busy checkout sends its customer back to the queue and abandonment returns the actual goods', () => {
  const s = store(), initial = s.products[0].shelf; buyer(s, 101); advance(s, 2);
  setStaff(s, 'checkout', 0); assert.equal(s.customers[0].stage, 'queue'); assert.equal(s.customers[0].checkoutLane, null);
  const customer = s.customers[0]; advance(s, 18);
  assert.equal(s.sales, 0); assert.equal(s.sold, 0); assert.equal(s.products[0].shelf, initial); assert.equal(customer.basket.length, 0);
});

test('at day end only the customer being served is charged; unserved baskets return to stock', () => {
  const s = store(), initial = s.products[0].shelf;
  buyer(s, 101); buyer(s, 102); buyer(s, 103); advance(s, 1); s.minute = 1199; advance(s, 1);
  assert.equal(s.history[0].sold, 1); assert.equal(s.history[0].sales, 3.4); assert.equal(s.history[0].lost, 2);
  assert.equal(s.products[0].shelf, initial - 1); assert.equal(s.day, 2); assert.equal(s.customers.length, 0);
});

test('the automatic checkout serves its own customer and closes when no cashier can supervise it', () => {
  const s = store(); buyAutoCheckout(s); buyer(s, 101); buyer(s, 102); advance(s, 1);
  assert.deepEqual(s.customers.map(c => c.checkoutLane), [0, 'auto']);
  setStaff(s, 'checkout', 0); assert.ok(s.customers.every(c => c.stage === 'queue' && c.checkoutLane === null));
  advance(s, 18); assert.equal(s.sold, 0);
});
