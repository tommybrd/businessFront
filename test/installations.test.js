import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, setStaff, openStore, advance, expandStore, quoteInstallation, setInstallation, setShelfCount, maintenanceCosts, checkoutCount, deliveryBayCount, outsideCapacity, outsideSlotsUsed, inventoryPosition, placeOrder, discardReserve, dailyCosts } from '../dist/engine.js';

function quiet() { const s = createGame(); s.money = 50000; for (const role of ['checkout', 'shelves', 'receiving']) setStaff(s, role, 0); s.arrivalCredit = -100000; return s; }
function until(s, condition) { for (let i = 0; i < 250 && !condition(); i++) advance(s, 1); assert.ok(condition()); }
function unchanged(s, action) { const snapshot = JSON.stringify(s); assert.throws(action); assert.equal(JSON.stringify(s), snapshot); }

test('quotes do not buy; removal and installation debit their exact costs, deductible VAT and maintenance once', () => {
  const s = quiet(), cash = s.money, before = JSON.stringify(s);
  const quote = quoteInstallation(s, 'checkouts', 2); assert.equal(quote.totalCost, 240); assert.equal(quote.dailyMaintenance, 10); assert.equal(JSON.stringify(s), before);
  setInstallation(s, 'checkouts', 2); assert.equal(checkoutCount(s), 2); assert.equal(s.money, cash - 240); assert.equal(s.vatDeductible, 40); assert.equal(maintenanceCosts(s).total, 97);
  setInstallation(s, 'checkouts', 4); assert.equal(s.money, cash - 2040); assert.equal(s.spending, 2040); assert.equal(s.vatDeductible, 340); assert.equal(maintenanceCosts(s).total, 107);
  const stable = JSON.stringify(s); setInstallation(s, 'checkouts', 4); assert.equal(JSON.stringify(s), stable);
  for (const amount of [-1, 1.5, NaN, 5]) unchanged(s, () => setInstallation(s, 'checkouts', amount));
  unchanged(s, () => setInstallation(s, 'unknown', 1)); s.money = 0; unchanged(s, () => setInstallation(s, 'checkouts', 3));
});

test('floor extensions make room; individual checkout and shelf installations are paid separately', () => {
  const s = quiet(); expandStore(s, 'checkout'); assert.equal(checkoutCount(s), 4);
  const cash = s.money; setInstallation(s, 'checkouts', 6); assert.equal(checkoutCount(s), 6); assert.equal(s.money, cash - 1800);
  expandStore(s, 'shelves'); const initial = s.money;
  assert.equal(s.shelfLayout.filter(Boolean).length, 18); assert.equal(s.products[0].capacity, 600);
  setShelfCount(s, 'produce', 6); assert.equal(s.money, initial - 360); assert.equal(s.products[0].capacity, 1200);
  s.products[0].shelf = 1200; unchanged(s, () => setShelfCount(s, 'produce', 3));
  s.products[0].shelf = 600; setShelfCount(s, 'produce', 3); assert.equal(s.money, initial - 450); assert.equal(s.products[0].capacity, 600);
});

test('a checkout serving a customer cannot be removed; unused cashiers are not silently dismissed', () => {
  const s = quiet(); setStaff(s, 'checkout', 4); openStore(s);
  s.products[0].shelf--; s.customers.push({id:777,stage:'queue',checkoutLane:3,wait:0,items:[],basket:[{index:0,quantity:1}],value:3.4}); advance(s, 1);
  unchanged(s, () => setInstallation(s, 'checkouts', 3)); advance(s, 4); assert.equal(s.sales, 3.4);
  setInstallation(s, 'checkouts', 3); assert.equal(checkoutCount(s), 3); assert.equal(s.staff.checkout, 4);
});

test('reserve racks add real capacity and protect stock plus an incoming pallet already committed', () => {
  const s = quiet(); discardReserve(s, 'produce', 30); expandStore(s, 'reserve'); setInstallation(s, 'reserve', 2, 'produce');
  assert.equal(s.products[0].reserveCapacity, 1500); s.products[0].reserve = 750;
  placeOrder(s, 'produce', 48, 'express'); const total = inventoryPosition(s, 'produce'); setStaff(s, 'receiving', 1); openStore(s);
  until(s, () => s.receivers[0].load > 0); unchanged(s, () => setInstallation(s, 'reserve', 1, 'produce'));
  until(s, () => s.orders[0].status === 'received' && s.receivers[0].phase === 'idle'); assert.equal(inventoryPosition(s, 'produce'), total);
  unchanged(s, () => setInstallation(s, 'reserve', 1, 'produce')); discardReserve(s, 'produce', 48); setInstallation(s, 'reserve', 1, 'produce');
  assert.equal(s.products[0].reserveCapacity, 750); assert.equal(s.products[0].reserve, 750); assert.equal(inventoryPosition(s, 'produce'), total - 48);
});

test('zero docks hold trucks; a newly installed dock works and cannot be removed during a manoeuvre', () => {
  const s = quiet(); setInstallation(s, 'bays', 0); placeOrder(s, 'produce', 48, 'express'); const total = inventoryPosition(s, 'produce'); openStore(s); advance(s, 40);
  assert.equal(s.shipments[0].phase, 'waiting'); setInstallation(s, 'bays', 1); advance(s, 1); assert.equal(s.shipments[0].phase, 'positioning');
  unchanged(s, () => setInstallation(s, 'bays', 0)); setStaff(s, 'receiving', 1); until(s, () => s.shipments[0].phase === 'complete');
  setInstallation(s, 'bays', 0); assert.equal(deliveryBayCount(s), 0); assert.equal(inventoryPosition(s, 'produce'), total);
});

test('outdoor capacity protects slots reserved for transport, then occupied slots, until the pallets are stored', () => {
  const s = quiet(); setInstallation(s, 'outside', 5); s.products[0].reserve = 500; placeOrder(s, 'produce', 120, 'express');
  const total = inventoryPosition(s, 'produce'); setStaff(s, 'receiving', 1); openStore(s);
  until(s, () => outsideSlotsUsed(s) > 0); unchanged(s, () => setInstallation(s, 'outside', 0));
  until(s, () => outsideSlotsUsed(s) === 3 && s.shipments[0].phase === 'complete'); setInstallation(s, 'outside', 3);
  assert.equal(outsideCapacity(s), 3); unchanged(s, () => setInstallation(s, 'outside', 2));
  expandStore(s, 'reserve'); until(s, () => s.orders[0].status === 'received'); setInstallation(s, 'outside', 0);
  assert.equal(outsideSlotsUsed(s), 0); assert.equal(inventoryPosition(s, 'produce'), total);
});

test('a fourth dock and extra outdoor places require reserve expansion, with capacity limits enforced', () => {
  const s = quiet(); unchanged(s, () => setInstallation(s, 'bays', 4)); unchanged(s, () => setInstallation(s, 'outside', 45));
  expandStore(s, 'reserve'); setInstallation(s, 'bays', 4); setInstallation(s, 'outside', 45);
  assert.equal(deliveryBayCount(s), 4); assert.equal(outsideCapacity(s), 45);
  for(let i=0;i<4;i++) placeOrder(s, s.products[i].id, 48, 'express'); openStore(s); advance(s, 40);
  assert.equal(s.shipments.filter(t=>t.phase==='docked').length, 4);
  assert.equal(new Set(s.shipments.map(t=>t.bay)).size, 4);
});

test('all installed equipment contributes to the daily charge and history exactly once', () => {
  const s = quiet(); setInstallation(s, 'checkouts', 3); discardReserve(s, 'produce', 30); setInstallation(s, 'reserve', 0, 'produce');
  s.products[0].shelf = 0; setShelfCount(s, 'produce', 0); setInstallation(s, 'outside', 10); setInstallation(s, 'bays', 1); setInstallation(s, 'auto', 1);
  const expected = 3*5 + 8 + 5*3 + 5*4 + 10 + 10*.5;
  assert.equal(expected, 73); assert.equal(maintenanceCosts(s).total, expected); assert.equal(dailyCosts(s), 233);
  const cash = s.money; openStore(s); s.minute = 1199; advance(s, 1);
  assert.equal(s.history[0].maintenance, 73); assert.equal(s.history[0].maintenanceDetails.reduce((sum,row)=>sum+row.cost,0), 73); assert.equal(s.money, cash - 233);
  advance(s, 0); assert.equal(s.money, cash - 233); assert.equal(s.history.length, 1);
});
