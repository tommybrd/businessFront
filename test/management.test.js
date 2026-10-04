import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, setStaff, openStore, advance, expandStore, setShelfCount, productShelfPosition, productShelfAccess, shelfFixtureCount, dailyProfitability, placeOrder, queueEveningOrder, quoteEveningBasket, outsidePallets, inventoryPosition, payTaxes, setAutomaticTaxPayment } from '../dist/engine.js';
import { checkoutProgress } from '../dist/checkout-flow.js';

function quiet() {
  const s = createGame(); for (const role of ['checkout', 'shelves', 'receiving']) setStaff(s, role, 0);
  s.arrivalCredit = -100000; return s;
}

test('500 articles fit per family; expansion opens 750 then 1000 without sharing family capacity', () => {
  const s = quiet(); s.money = 50000; s.products[0].reserve = 0; setStaff(s, 'receiving', 6);
  assert.ok(s.products.every(p => p.reserveCapacity === 500));
  placeOrder(s, 'produce', 500, 'express'); const inventory = inventoryPosition(s, 'produce'); openStore(s);
  advance(s, 350);
  assert.equal(s.products[0].reserve, 500); assert.equal(s.orders[0].status, 'received');
  assert.equal(outsidePallets(s).length, 0); assert.equal(inventoryPosition(s, 'produce'), inventory);
  expandStore(s, 'reserve'); assert.ok(s.products.every(p => p.reserveCapacity === 750));
  expandStore(s, 'reserve'); assert.ok(s.products.every(p => p.reserveCapacity === 1000));
});

test('floor expansion adds empty furniture; theme choices occupy distinct slots and protect real stock', () => {
  const s = quiet(); const snapshot = JSON.stringify(s);
  assert.throws(() => setShelfCount(s, 'produce', 2)); assert.equal(JSON.stringify(s), snapshot);
  expandStore(s, 'shelves'); assert.equal(s.shelfLayout.length, 36); assert.equal(s.products[0].capacity, 600);
  setShelfCount(s, 'produce', 12); setShelfCount(s, 'drinks', 9);
  assert.equal(s.shelfLayout.filter(id => id === 'produce').length, 12); assert.equal(s.products[0].capacity, 2400);
  assert.equal(s.shelfLayout.filter(id => id === null).length, 3);
  const locations = Array.from({length:12}, (_, i) => productShelfPosition(s, 0, i));
  assert.equal(new Set(locations.map(JSON.stringify)).size, 12);
  s.products[0].shelf = 1801; const protectedState = JSON.stringify(s);
  assert.throws(() => setShelfCount(s, 'produce', 9)); assert.equal(JSON.stringify(s), protectedState);
  s.products[0].shelf = 600; setShelfCount(s, 'produce', 3); assert.equal(s.products[0].capacity, 600);
  assert.throws(() => setShelfCount(s, 'produce', 0)); assert.throws(() => setShelfCount(s, 'produce', -1));
});

test('profit excludes VAT, owner cash and prior tax repayments, preserving signed daily losses', () => {
  const s = quiet(); setStaff(s, 'checkout', 1); setAutomaticTaxPayment(s, false); openStore(s);
  s.sales = 1200; s.money += 1200; s.vatCollected = 200; s.ownerContribution = 300; s.money += 300;
  const estimate = dailyProfitability(s); assert.equal(estimate.beforeTax, 648); assert.equal(estimate.netProfit, 518.4);
  s.minute = 1199; advance(s, 1); const first = s.history[0];
  assert.equal(first.netProfit, estimate.netProfit); assert.equal(first.net, 1148);
  payTaxes(s); const secondEstimate = dailyProfitability(s); assert.equal(secondEstimate.netProfit, -352);
  s.minute = 1199; advance(s, 1); const second = s.history[1];
  assert.equal(second.netProfit, -352); assert.equal(second.taxPaid, 329.6); assert.equal(second.net, -681.6);
});

test('last-day product activity records only goods placed in shelves and actual paid baskets', () => {
  const s = quiet(); setStaff(s, 'shelves', 1); setStaff(s, 'checkout', 1); s.products[0].shelf = 0; openStore(s);
  advance(s, 100); assert.ok(s.products[0].restockedToday > 0);
  setStaff(s, 'shelves', 0); const restocked = s.products[0].restockedToday;
  s.products[0].shelf -= 3;
  s.customers = [{id:10001,stage:'queue',wait:0,value:6.8,basket:[{index:0,quantity:2}],items:[]},{id:10002,stage:'queue',wait:17,value:3.4,basket:[{index:0,quantity:1}],items:[]}];
  advance(s, 5); assert.equal(s.products[0].soldToday, 2); assert.equal(s.lost, 1);
  s.minute = 1199; advance(s, 1);
  assert.deepEqual(s.history[0].products[0], {id:'produce',sold:2,restocked});
  assert.ok(s.products.every(p => p.soldToday === 0 && p.restockedToday === 0));
  assert.equal(s.history[0].products[0].sold, 2);
});

test('groupage costs 10 per provider once, including Express, while a flash Express costs 150', () => {
  const s = quiet(); queueEveningOrder(s, 'produce', 48, 'express'); queueEveningOrder(s, 'bakery', 48, 'express');
  const quote = quoteEveningBasket(s); assert.equal(quote.groups[0].deliveryFee, 10);
  const cash = s.money; openStore(s); s.minute = 1199; advance(s, 1);
  assert.equal(s.orders.reduce((sum,o) => sum + o.deliveryFee, 0), 10); assert.equal(s.history[0].spending, quote.totalCost);
  assert.equal(Math.round(s.money * 100), Math.round((cash - quote.totalCost - 267) * 100));
  const order = placeOrder(s, 'home', 48, 'express'); assert.equal(order.deliveryFee, 150);
});

test('articles leave the cart one by one, scan sequentially, and payment starts after all scans', () => {
  const customer = {stage:'checkout',basket:[{index:0,quantity:2},{index:1,quantity:2}],checkoutDuration:5,checkoutRemaining:5};
  let p = checkoutProgress(customer, .375); assert.equal(p.phase, 'loading');
  assert.deepEqual(p.articles.map(a=>a.loading), [1,.5,0,0]); assert.equal(p.scanned, 0);
  customer.checkoutRemaining = 3; p = checkoutProgress(customer, .5);
  assert.equal(p.phase, 'scanning'); assert.equal(p.scanned, 2); assert.equal(p.articles[2].scanning, 0);
  customer.checkoutRemaining = 1; p = checkoutProgress(customer); assert.equal(p.phase, 'payment');
  assert.equal(p.scanned, 4); assert.ok(p.articles.every(a=>a.scanning===1));
});

// The reduced floor layout must keep every family reachable on its own face.
test('twelve short fixtures retain eighteen dense modules with access on opposite sides of each gondola', () => {
  const s = quiet(); assert.equal(shelfFixtureCount(s), 12);
  assert.ok(s.products.every(p => p.capacity === 600 && p.shelf === 480));
  for (const [a, b] of [[2, 3], [4, 5]]) {
    const north = productShelfAccess(s, a), south = productShelfAccess(s, b);
    assert.equal(north[0], south[0]); assert.equal(north[2], -1); assert.equal(south[2], 1);
    assert.ok(north[1] - 1.45 < north[1] && south[1] + 1.45 > south[1]);
  }
  expandStore(s, 'shelves'); assert.equal(shelfFixtureCount(s), 12);
  setShelfCount(s, 'produce', 4); assert.equal(s.products[0].capacity, 800);
  assert.notDeepEqual(productShelfPosition(s, 0, 0), productShelfPosition(s, 0, 1));
});
