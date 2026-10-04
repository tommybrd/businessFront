import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateDay } from '../scripts/balance.mjs';
import { createGame, setStaff, openStore, advance, requestRestock, expandStore, setShelfCount } from '../dist/engine.js';
import { checkoutProgress } from '../dist/checkout-flow.js';

const seeds = [73471, 9944, 2026];
test('a normal day requires shelf replenishment; prepared medium carts avoid shortages across seeds', () => {
  for (const seed of seeds) {
    const unattended = simulateDay({ seed, workers: 0 });
    const prepared = simulateDay({ seed, mode: 'medium' });
    assert.equal(prepared.requested, unattended.requested);
    assert.ok(unattended.shortfall > 300);
    assert.equal(prepared.shortfall, 0);
    assert.ok(prepared.restocked > 1000 && prepared.trips > 30);
    assert.ok(prepared.sold > unattended.sold + 300);
  }
});

test('Saturday demand rewards better equipment, while Black Friday needs targeted supplier deliveries too', () => {
  for (const seed of seeds) {
    const normal = simulateDay({ seed, mode: 'large' });
    const small = simulateDay({ seed, day: 3 });
    const medium = simulateDay({ seed, day: 3, mode: 'medium' });
    const large = simulateDay({ seed, day: 3, mode: 'large' });
    assert.ok(large.requested > normal.requested * 1.4);
    assert.ok(small.shortfall > medium.shortfall && medium.shortfall > large.shortfall);
    assert.ok(large.sold > medium.sold + 500 && medium.sold > small.sold + 500);
    const blackFriday = simulateDay({ seed, day: 4, mode: 'large' });
    assert.ok(blackFriday.requested > large.requested * 1.3 && blackFriday.shortfall > 1000);
  }
});

test('automatic trips wait for depletion; a manual request overrides the threshold even on expanded shelves', () => {
  const s = createGame(); setStaff(s, 'shelves', 1);
  s.arrivalCredit = -100000; s.products.forEach(p => { p.shelf = p.capacity; p.reserve = 240; });
  const p = s.products[0]; p.shelf = 480;
  openStore(s); advance(s, 10); assert.equal(s.restockers[0].phase, 'idle'); assert.equal(p.reserve, 240);
  requestRestock(s, p.id); advance(s, 1); assert.equal(s.restockers[0].productId, p.id);
  setStaff(s, 'shelves', 0); s.restockRequests = []; p.shelf = 450;
  setStaff(s, 'shelves', 1); advance(s, 1); assert.equal(s.restockers[0].productId, p.id);
  setStaff(s, 'shelves', 0); expandStore(s, 'shelves'); setShelfCount(s, p.id, 2); p.shelf = 901;
  setStaff(s, 'shelves', 1); advance(s, 1); assert.equal(s.restockers[0].phase, 'idle');
  p.shelf = 900; advance(s, 1); assert.equal(s.restockers[0].productId, p.id);
});

test('a full shopping basket still scans each article before charging once', () => {
  const s = createGame(); setStaff(s, 'shelves', 0); s.arrivalCredit = -100000;
  const customer = { id: 900, stage: 'queue', wait: 0, items: [], basket: [{ index: 0, quantity: 36 }], value: 122.4 };
  s.products[0].shelf -= 36; s.customers.push(customer); openStore(s); advance(s, 1);
  assert.equal(customer.checkoutDuration, 8);
  advance(s, 2); const progress = checkoutProgress(customer, .5);
  assert.ok(progress.scanned > 0 && progress.scanned < 36); assert.equal(s.sales, 0);
  advance(s, 5); assert.equal(checkoutProgress(customer).scanned, 36); assert.equal(s.sales, 0);
  advance(s, 1); assert.equal(s.sales, 122.4); assert.equal(s.products[0].soldToday, 36);
  advance(s, 5); assert.equal(s.sales, 122.4);
});
