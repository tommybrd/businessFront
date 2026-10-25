import test from 'node:test';
import assert from 'node:assert/strict';
import {createWarehouseGame,advanceWarehouse,setWarehousePolicy,launchWarehousePromo,stopWarehousePromo,warehouseDemand,createWarehouseOrder,migrateWarehouseGame,unitPrice,PRICING,PROMO_SETUP,PROMO_VISIBILITY} from '../dist/warehouse-engine.js';
import {makeSave} from '../dist/save-format.js';

const ordersReceived=(setup,seed=31)=>{const s=createWarehouseGame(seed);s.minute=479;setup(s);advanceWarehouse(s,600);return s.daily.accepted;};
const book=s=>s.products.find(p=>p.id==='books');

test('the gross margin sets the selling price and moves demand against it',()=>{
 const s=createWarehouseGame(5);assert.equal(unitPrice(s,book(s)),14);
 setWarehousePolicy(s,'margin','30');assert.equal(s.margin,30);assert.equal(unitPrice(s,book(s)),10);
 const order=createWarehouseOrder(s,{lines:[{productId:'books',quantity:2}],channel:'standard',area:'north'});assert.equal(order.value,25);
 setWarehousePolicy(s,'margin',65);assert.equal(unitPrice(s,book(s)),20);assert.ok(warehouseDemand(s).price<1);
 for(const bad of [10,75,50.5,'x'])assert.throws(()=>setWarehousePolicy(s,'margin',bad));
 const market=ordersReceived(()=>{}),cheap=ordersReceived(g=>setWarehousePolicy(g,'margin',30)),dear=ordersReceived(g=>setWarehousePolicy(g,'margin',65));
 assert.ok(cheap>market&&market>dear,`${cheap} > ${market} > ${dear}`);
});

test('advertising is paid hourly from the daily budget and brings orders with diminishing returns',()=>{
 const s=createWarehouseGame(6);setWarehousePolicy(s,'adBudget',500);assert.throws(()=>setWarehousePolicy(s,'adBudget',520));assert.throws(()=>setWarehousePolicy(s,'adBudget',1050));
 const cash=s.money;s.minute=479;advanceWarehouse(s,620);assert.equal(s.daily.marketing,500);
 const one=createWarehouseGame(1),two=createWarehouseGame(1);one.adBudget=500;two.adBudget=1000;assert.ok(warehouseDemand(two).ads-1<2*(warehouseDemand(one).ads-1));
 assert.ok(ordersReceived(g=>setWarehousePolicy(g,'adBudget',1000))>ordersReceived(()=>{}));assert.ok(s.money<cash+s.daily.revenue+1);
});

test('a promotion discounts prices for hours or days, can be stopped and cannot be stacked',()=>{
 const s=createWarehouseGame(9);s.minute=600;const cash=s.money;launchWarehousePromo(s,20,1440);
 assert.equal(s.money,cash-PROMO_SETUP);assert.equal(s.daily.marketing,PROMO_SETUP);assert.equal(unitPrice(s,book(s)),11.2);assert.equal(warehouseDemand(s).promo,PROMO_VISIBILITY);assert.ok(warehouseDemand(s).price>1);
 assert.throws(()=>launchWarehousePromo(s,20,180),/déjà en cours/);assert.throws(()=>launchWarehousePromo(createWarehouseGame(2),15,180));assert.throws(()=>launchWarehousePromo(createWarehouseGame(2),20,60));
 const clock=()=>(s.day-1)*1440+s.minute,until=s.promo.until;while(clock()<until-1)advanceWarehouse(s,1);assert.ok(s.promo);advanceWarehouse(s,1);assert.equal(s.promo,null);assert.equal(unitPrice(s,book(s)),14);
 const t=createWarehouseGame(3);t.minute=600;launchWarehousePromo(t,30,4320);stopWarehousePromo(t);assert.equal(t.promo,null);assert.throws(()=>stopWarehousePromo(t));makeSave(t);
 assert.ok(ordersReceived(g=>launchWarehousePromo(g,30,1440))>ordersReceived(()=>{}));
});

test('reputation clearly drives demand and marketing spending reduces the day result',()=>{
 const s=createWarehouseGame(4);s.reputation=100;const best=warehouseDemand(s).reputation;s.reputation=0;assert.ok(best/warehouseDemand(s).reputation>1.6);
 const g=createWarehouseGame(4);g.minute=600;launchWarehousePromo(g,10,180);g.adBudget=200;advanceWarehouse(g,720);const day=g.history[0];
 assert.equal(day.marketing,PROMO_SETUP+160);assert.ok(Number.isFinite(day.profit));makeSave(g);
});

test('saves made before margins load with an equivalent setting and keep a running promotion',()=>{
 for(const [pricing,margin] of [['low',45],['normal',PRICING.marketMargin],['high',55],[undefined,PRICING.marketMargin]]){
  const s=createWarehouseGame(2);delete s.margin;delete s.adBudget;delete s.promo;delete s.totals.marketing;delete s.daily.marketing;if(pricing)s.pricing=pricing;s.promoUntil=pricing==='low'?(s.day-1)*1440+s.minute+60:0;makeSave(s);
  const loaded=migrateWarehouseGame({schemaVersion:2,state:s});assert.equal(loaded.margin,margin);assert.equal(loaded.adBudget,0);assert.equal(loaded.totals.marketing,0);assert.equal('pricing' in loaded,false);
  if(pricing==='low')assert.deepEqual(loaded.promo,{discount:0,until:s.promoUntil});else assert.equal(loaded.promo,null);makeSave(loaded);
 }
});
