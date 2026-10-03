import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, setStaff, openStore, advance, quoteOrder, placeOrder, queueEveningOrder, removeEveningOrder, quoteEveningBasket, dailyCosts, inventoryPosition, restockerPosition, truckPose, discardReserve, outsidePallets, outsideSlotsUsed, OUTSIDE_PALLET_CAPACITY, INITIAL_SHELF_STOCK } from '../dist/engine.js';
function quiet() {
  const s = createGame(); for (const role of Object.keys(s.staff)) setStaff(s, role, 0);
  s.arrivalCredit = -100000; return s;
}
function until(s, predicate, max = 200) { for (let i = 0; i < max && !predicate(); i++) { s.arrivalCredit = -100000; advance(s, 1); } assert.ok(predicate()); }

test('the evening basket replaces a product lot without purchasing and pools one fee per supplier', () => {
  const s = quiet(), cash = s.money;
  queueEveningOrder(s, 'produce', 12, 'regular'); queueEveningOrder(s, 'bakery', 24, 'regular'); queueEveningOrder(s, 'produce', 48, 'regular');
  assert.equal(s.eveningBasket.length, 2); assert.equal(s.money, cash); assert.equal(s.orders.length, 0);
  const quote = quoteEveningBasket(s); assert.equal(quote.groups.length, 1); assert.equal(quote.groups[0].deliveryFee, 35);
  assert.equal(quote.totalCost, quoteOrder('produce', 48, 'regular').goodsCost + quoteOrder('bakery', 24, 'regular').goodsCost + 35);
  queueEveningOrder(s, 'dairy', 12, 'express'); assert.equal(quoteEveningBasket(s).groups.length, 2);
  const snapshot = JSON.stringify(s); assert.throws(() => queueEveningOrder(s, 'produce', 11, 'regular')); assert.equal(JSON.stringify(s), snapshot);
  removeEveningOrder(s, 'produce'); assert.equal(s.eveningBasket.length, 2); assert.throws(() => removeEveningOrder(s, 'produce'));
});

test('explicitly planned goods dispatch once at 20 h, settle in that day, and do not recur', () => {
  const s = quiet(), cash = s.money;
  queueEveningOrder(s, 'produce', 12); queueEveningOrder(s, 'bakery', 24); const quote = quoteEveningBasket(s);
  openStore(s); advance(s, 719); assert.equal(s.orders.length, 0); assert.equal(s.eveningBasket.length, 2); assert.equal(s.money, cash);
  advance(s, 1); assert.equal(s.day, 2); assert.equal(s.phase, 'open'); assert.equal(s.eveningBasket.length, 0);
  assert.equal(s.orders.length, 2); assert.equal(s.shipments.length, 1); assert.equal(s.shipments[0].mode, 'grouped');
  assert.equal(s.history[0].spending, quote.totalCost); assert.equal(s.money, cash - quote.totalCost - dailyCosts(s));
  assert.equal(s.orders.reduce((n, o) => n + o.deliveryFee, 0), 35); assert.equal(s.history[0].vatDeductible, Math.round(quote.totalCost / 6 * 100) / 100);
  assert.equal(s.shipments[0].eta, s.elapsed + 90);
  advance(s, 720); assert.equal(s.orders.length, 2); assert.equal(s.history[1].spending, 0);
});

test('an unaffordable evening basket stays intact and retries only at the next closing', () => {
  const s = quiet(); s.money = 50; queueEveningOrder(s, 'produce', 120); openStore(s); s.minute = 1199; advance(s, 1);
  assert.equal(s.orders.length, 0); assert.equal(s.eveningBasket.length, 1); assert.match(s.eveningError, /insuffisante/);
  s.money = 2000; advance(s, 100); assert.equal(s.orders.length, 0);
  s.minute = 1199; advance(s, 1); assert.equal(s.orders.length, 1); assert.equal(s.eveningBasket.length, 0); assert.equal(s.eveningError, null);
});

test('large groupages use trucks of at most ten real pallets without charging extra delivery fees', () => {
  const s = quiet(); for (const p of s.products) queueEveningOrder(s, p.id, 240);
  const quote = quoteEveningBasket(s); openStore(s); s.minute = 1199; advance(s, 1);
  assert.equal(s.shipments.length, 3); assert.ok(s.shipments.every(t => t.pallets.length === 10));
  assert.equal(new Set(s.shipments.map(t => t.batchId)).size, 1); assert.equal(s.history[0].spending, quote.totalCost);
  assert.equal(s.orders.reduce((n, o) => n + o.deliveryFee, 0), 35);
  const refs = s.shipments.flatMap(t => t.pallets.map(p => `${p.orderId}:${p.palletIndex}`)); assert.equal(new Set(refs).size, 30);
  for (const p of s.products) assert.equal(inventoryPosition(s, p.id), INITIAL_SHELF_STOCK + 30 + 240);
});

test('three physical bays hold their trucks while later arrivals wait, with no unloading during manoeuvres', () => {
  const s = quiet(); setStaff(s, 'receiving', 1); for (let i = 0; i < 4; i++) placeOrder(s, 'produce', 12, 'express');
  openStore(s); advance(s, 30);
  assert.deepEqual(s.shipments.map(t => t.phase), ['positioning', 'positioning', 'positioning', 'waiting']);
  assert.equal(s.receivers[0].load + s.receivers[0].reserved, 0);
  advance(s, 3); assert.equal(s.shipments[0].phase, 'reversing');
  const start = truckPose(s, s.shipments[0]); const middle = truckPose(s, s.shipments[0], 2);
  assert.ok(middle.z > start.z); assert.equal(middle.x, start.x); assert.equal(middle.rotation, 0);
  assert.equal(s.orders[0].remaining, 12); assert.equal(s.receivers[0].reserved, 0);
  advance(s, 4); assert.equal(s.shipments[0].phase, 'docked'); assert.equal(s.receivers[0].phase, 'approaching');
  assert.ok(restockerPosition(s.receivers[0]).every(Number.isFinite));
  for (let i = 0; i < 180; i++) {
    advance(s, 1); const occupied = s.shipments.filter(t => ['positioning', 'reversing', 'docked', 'departing'].includes(t.phase));
    assert.equal(new Set(occupied.map(t => t.bay)).size, occupied.length); assert.ok(occupied.length <= 3);
  }
  assert.ok(s.shipments.every(t => t.phase === 'complete')); assert.ok(s.orders.every(o => o.status === 'received')); assert.equal(s.products[0].reserve, 78);
});

test('a truck remains docked until its goods are stored and its last transpalette has returned', () => {
  const s = quiet(); setStaff(s, 'receiving', 1); placeOrder(s, 'produce', 48, 'express'); openStore(s);
  until(s, () => s.receivers[0].phase === 'returning'); assert.equal(s.orders[0].status, 'received'); assert.equal(s.shipments[0].phase, 'docked');
  const quantity = inventoryPosition(s, 'produce'); until(s, () => s.shipments[0].phase === 'departing');
  assert.equal(s.receivers[0].phase, 'idle'); const bay = s.shipments[0].bay;
  advance(s, 7); assert.equal(s.shipments[0].phase, 'departing'); assert.equal(s.shipments[0].bay, bay);
  advance(s, 1); assert.equal(s.shipments[0].phase, 'complete'); assert.equal(s.shipments[0].bay, null); assert.equal(inventoryPosition(s, 'produce'), quantity);
});


test('blocked reserve goods wait outside while other pallets are stored and the truck leaves', () => {
  const s = quiet(); setStaff(s, 'receiving', 1); s.products[0].reserve = 100;
  queueEveningOrder(s, 'produce', 48); queueEveningOrder(s, 'bakery', 48); openStore(s); s.minute = 1199; advance(s, 1);
  const inventory = s.products.map(p => inventoryPosition(s, p.id));
  until(s, () => s.shipments[0].phase === 'complete', 300);
  assert.equal(outsidePallets(s).length, 1); assert.equal(outsidePallets(s)[0].pallet.remaining, 48);
  assert.equal(s.orders[0].remaining, 48); assert.equal(s.products[0].reserve, 100); assert.equal(s.orders[1].status, 'received'); assert.equal(s.products[1].reserve, 78);
  assert.deepEqual(s.products.map(p => inventoryPosition(s, p.id)), inventory);
  discardReserve(s, 'produce', 48);
  until(s, () => s.orders[0].status === 'received', 100);
  assert.equal(outsidePallets(s).length, 0); assert.equal(outsideSlotsUsed(s), 0); assert.equal(s.products[0].reserve, 100);
  assert.equal(inventoryPosition(s, 'produce'), inventory[0] - 48);
});

test('the outside buffer holds at most thirty pallets, including slots reserved by moving staff', () => {
  const s = quiet(); s.money = 100000; setStaff(s, 'receiving', 12);
  for (const p of s.products) s.products.find(line => line.id === p.id).reserve = 100;
  for (let i = 0; i < 7; i++) placeOrder(s, 'produce', 240, 'express');
  const inventory = inventoryPosition(s, 'produce'); openStore(s);
  for (let i = 0; i < 650; i++) {
    s.arrivalCredit = -100000; advance(s, 1); assert.ok(outsideSlotsUsed(s) <= OUTSIDE_PALLET_CAPACITY);
    const slots = s.orders.flatMap(o => o.pallets.map(p => p.outsideSlot).filter(slot => slot !== null));
    assert.equal(new Set(slots).size, slots.length); assert.equal(inventoryPosition(s, 'produce'), inventory);
    assert.equal(s.products[0].reserve, 100);
  }
  assert.equal(outsidePallets(s).length, 30); assert.equal(outsideSlotsUsed(s), 30);
  assert.ok(s.orders.some(o => o.pallets.some(p => p.status === 'dock')));
  discardReserve(s, 'produce', 48); until(s, () => s.products[0].reserve === 100, 150);
  for (let i = 0; i < 100; i++) { s.arrivalCredit = -100000; advance(s, 1); } assert.equal(outsideSlotsUsed(s), 30); assert.equal(inventoryPosition(s, 'produce'), inventory - 48);
});

test('reassigning or closing during an outside pickup returns its remaining goods to the same reserved slot', () => {
  const s = quiet(); setStaff(s, 'receiving', 1); s.products[0].reserve = 100; placeOrder(s, 'produce', 48, 'express'); openStore(s);
  until(s, () => outsidePallets(s).length === 1); until(s, () => s.shipments[0].phase === 'complete');
  discardReserve(s, 'produce', 48); const inventory = inventoryPosition(s, 'produce'), slot = outsidePallets(s)[0].pallet.outsideSlot;
  until(s, () => s.receivers[0].fromOutside && s.receivers[0].phase === 'outbound');
  setStaff(s, 'receiving', 0); assert.equal(outsidePallets(s)[0].pallet.outsideSlot, slot); assert.equal(inventoryPosition(s, 'produce'), inventory);
  setStaff(s, 'receiving', 1); until(s, () => s.receivers[0].phase === 'storing'); advance(s, 1);
  s.minute = 1199; advance(s, 1);
  assert.equal(s.day, 2); assert.equal(inventoryPosition(s, 'produce'), inventory); assert.equal(outsidePallets(s)[0].pallet.remaining, 24);
  assert.equal(outsidePallets(s)[0].pallet.outsideSlot, slot);
  until(s, () => s.orders[0].status === 'received'); assert.equal(outsideSlotsUsed(s), 0); assert.equal(s.products[0].reserve, 100);
});


test('1000-unit flash purchases split into real truckloads and a final partial carton without losing goods', () => {
  const s = quiet(); setStaff(s, 'receiving', 6); s.products[0].reserve = 0;
  const inventory = inventoryPosition(s, 'produce'), cash = s.money;
  const quote = quoteOrder('produce', 1000, 'express'), order = placeOrder(s, 'produce', 1000, 'express');
  assert.equal(s.money, cash - quote.totalCost); assert.equal(s.spending, quote.totalCost);
  assert.equal(order.pallets.length, 21); assert.equal(order.pallets.at(-1).quantity, 40); assert.equal(order.pallets.at(-1).quantity % 12, 4);
  assert.deepEqual(s.shipments.map(t => t.pallets.length), [10, 10, 1]);
  assert.equal(order.pallets.reduce((sum, pallet) => sum + pallet.quantity, 0), 1000);
  openStore(s); until(s, () => s.shipments.every(t => t.phase === 'complete'), 650);
  assert.equal(inventoryPosition(s, 'produce'), inventory + 1000); assert.equal(s.products[0].reserve, 96);
  assert.equal(outsidePallets(s).reduce((sum, line) => sum + line.pallet.remaining, 0), 904);
});

test('groupage accepts 1000 per product while invalid quantities leave the complete state untouched', () => {
  const s = quiet(); s.money = 100000;
  for (const p of s.products) queueEveningOrder(s, p.id, 1000);
  const snapshot = JSON.stringify(s);
  for (const n of [0, 11, 1001, 1000.5, NaN]) {
    assert.throws(() => placeOrder(s, 'produce', n, 'regular')); assert.throws(() => queueEveningOrder(s, 'produce', n, 'regular'));
    assert.equal(JSON.stringify(s), snapshot);
  }
  const quote = quoteEveningBasket(s); openStore(s); s.minute = 1199; advance(s, 1);
  assert.equal(s.orders.length, 6); assert.equal(s.shipments.length, 13); assert.equal(s.orders.reduce((n, o) => n + o.quantity, 0), 6000);
  assert.equal(s.orders.reduce((n, o) => n + o.deliveryFee, 0), 35); assert.equal(s.history[0].spending, quote.totalCost);
});


test('truck unloading goes directly to reserve when a full pallet fits, including space freed before pickup', () => {
  for (const initialReserve of [52, 100]) {
    const s = quiet(); setStaff(s, 'receiving', 1); s.products[0].reserve = initialReserve;
    placeOrder(s, 'produce', 48, 'express'); openStore(s); until(s, () => s.receivers[0].phase === 'loading');
    if (initialReserve === 100) discardReserve(s, 'produce', 48);
    until(s, () => s.receivers[0].phase === 'outbound');
    assert.equal(s.receivers[0].toOutside, false); assert.equal(outsideSlotsUsed(s), 0);
    until(s, () => s.orders[0].status === 'received');
    assert.equal(s.products[0].reserve, 100); assert.equal(outsidePallets(s).length, 0);
  }
});
