import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateDay } from '../scripts/balance.mjs';
import { createGame, createStarterGame, setStaff, openStore, advance, requestRestock, expandStore, setShelfCount, selectRestockEquipment, storeDemandScale, restockReserved, inventoryPosition, queueEveningOrder } from '../dist/engine.js';
import { checkoutProgress } from '../dist/checkout-flow.js';

const seeds = [73471, 9944, 2026];
test('a normal day requires shelf replenishment; prepared medium carts avoid shortages across seeds', () => {
  for (const seed of seeds) {
    const unattended = simulateDay({ seed, workers: 0 });
    const prepared = simulateDay({ seed, mode: 'medium' });
    assert.equal(prepared.requested, unattended.requested);
    assert.ok(unattended.shortfall > 300);
    assert.equal(prepared.shortfall, 0);
    assert.ok(prepared.restocked > 1000 && prepared.trips > 0 && prepared.trips < 30);
    assert.ok(prepared.sold > unattended.sold + 200);
  }
});

test('larger carts reduce trips on Saturday; exceptional demand still needs supplier deliveries', () => {
  for (const seed of seeds) {
    const normal = simulateDay({ seed, mode: 'large' });
    const small = simulateDay({ seed, day: 3 });
    const medium = simulateDay({ seed, day: 3, mode: 'medium' });
    const large = simulateDay({ seed, day: 3, mode: 'large' });
    assert.ok(large.requested > normal.requested * 1.4);
    assert.ok(small.shortfall >= medium.shortfall && medium.shortfall >= large.shortfall);
    assert.ok(large.sold >= medium.sold && medium.sold >= small.sold);
    assert.ok(small.trips>medium.trips&&medium.trips>large.trips);
    const blackFriday = simulateDay({ seed, day: 4, mode: 'large' });
    assert.ok(blackFriday.requested > large.requested * 1.3 && blackFriday.shortfall > 500);
  }
});

test('a prepared two-rayon starter is manageable with one mixed-cart employee on ordinary days and Saturday', () => {
  for (const seed of seeds) for (const day of [1,2,3]) {
    const result=simulateDay({seed,day,starter:true,reserve:480});
    assert.equal(result.shortfall,0); assert.equal(result.emptyMinutes,0);
    assert.ok(result.sold>250 && result.trips>0 && result.trips<=12);
    assert.ok(result.peakCustomers<15);
    if(day===1){assert.ok(result.arrivals>=50&&result.arrivals<80);assert.ok(result.requested>=400&&result.requested<600);}
  }
});

test('customer demand follows installed capacity, not the amount currently in stock or empty floor area', () => {
  const s=createStarterGame(),scale=storeDemandScale(s);
  assert.ok(scale<.4); s.products.forEach(p=>{p.shelf=0;p.reserve=0;}); assert.equal(storeDemandScale(s),scale);
  s.storeSize='large';assert.equal(storeDemandScale(s),scale);
  s.money=50000;setShelfCount(s,'produce',3);assert.ok(storeDemandScale(s)>scale);
  setShelfCount(s,'bakery',0);setShelfCount(s,'produce',0);assert.equal(storeDemandScale(s),0);
  assert.equal(storeDemandScale(createGame()),1);
});

test('five continuous starter days with explicit morning supply preserve every article and remain playable', () => {
  for(const seed of seeds){
    const s=createStarterGame(seed),initialCash=s.money;
    s.products.forEach(p=>{p.shelf=p.capacity;p.reserve=p.capacity?480:0;});
    const initial=s.products.map(p=>inventoryPosition(s,p.id)),planned=new Set();openStore(s);
    let minutes=0;
    while(s.history.length<5&&minutes++<4500){
      if(!planned.has(s.day)){
        // The player prepares larger morning deliveries ahead of busy days.
        const quantity=[240,480,720,480,240][s.day-1];
        for(const id of ['produce','bakery'])queueEveningOrder(s,id,quantity,'regular');
        planned.add(s.day);
      }
      advance(s,1);assert.notEqual(s.phase,'bankrupt');
      s.products.forEach((p,index)=>{
        const purchased=s.orders.filter(o=>o.productId===p.id).reduce((n,o)=>n+o.quantity,0);
        const sold=s.history.reduce((n,h)=>n+h.products[index].sold,0)+p.soldToday;
        const stolen=s.history.reduce((n,h)=>n+(h.theft?.products[index]??0),0)+(s.theft?.daily.products[index]??0);
        const held=s.customers.reduce((n,c)=>n+c.basket.filter(l=>l.index===index).reduce((sum,l)=>sum+l.quantity,0),0);
        assert.equal(inventoryPosition(s,p.id)+sold+stolen+held,initial[index]+purchased);
        assert.ok(p.shelf<=p.capacity&&p.reserve<=p.reserveCapacity&&p.reserve>=0);
      });
    }
    assert.equal(s.history.length,5);
    assert.ok(s.history.every(h=>h.satisfactionDetails.missing.every(n=>n===0)));
    assert.ok(s.history.slice(0,3).every(h=>h.satisfactionDetails.waitDepartures===0));
    assert.equal(Math.round(s.money*100),Math.round((initialCash+s.history.reduce((n,h)=>n+h.net,0))*100));
  }
});

test('shopping lists never repeat a family to inflate a small assortment into a large basket', () => {
  for(const starter of [false,true]){
    const s=starter?createStarterGame():createGame();openStore(s);const seen=new Set();
    for(let minute=0;minute<300;minute++){
      advance(s,1);
      for(const c of s.customers){seen.add(c.id);assert.equal(new Set(c.items.map(l=>l.index)).size,c.items.length);assert.ok(c.items.length<=(starter?2:6));assert.ok(c.items.every(l=>s.products[l.index].capacity>0));}
    }
    assert.ok(seen.size>10);
  }
});

test('automatic replenishment starts at 75 percent with a partial cart and counts loads already coming', () => {
  for(const mixed of [false,true])for(const mode of ['medium','hyper']){
    const s=createGame();s.money=50000;s.mixedRestock=mixed;setStaff(s,'shelves',2);s.arrivalCredit=-100000;
    for(const equipment of ['medium','large','hyper']){selectRestockEquipment(s,equipment);if(equipment===mode)break;}
    s.products.forEach(p=>{p.shelf=p.capacity;p.reserve=500;});const p=s.products[0],total=inventoryPosition(s,p.id);
    p.shelf=451;openStore(s);advance(s,1);assert.ok(s.restockers.every(w=>w.phase==='idle'));
    p.shelf=450;advance(s,1);assert.notEqual(s.restockers[0].phase,'idle');assert.equal(restockReserved(s.restockers[0],p.id),150);assert.equal(s.restockers[1].phase,'idle');
    const actualTotal=total-150;
    for(let minute=0;minute<150;minute++){advance(s,1);assert.equal(inventoryPosition(s,p.id),actualTotal);assert.equal(s.restockers[1].phase,'idle');}
    assert.equal(p.shelf,p.capacity);assert.equal(s.restockers[0].completed,1);
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
  setStaff(s, 'shelves', 0); expandStore(s, 'shelves'); setShelfCount(s, p.id, 6); p.shelf = 901;
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
