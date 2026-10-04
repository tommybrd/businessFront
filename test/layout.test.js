import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,createStarterGame,startDayOnLoad,setStoreSize,moveFixture,premisesCosts,dailyCosts,setInstallation,advance,openStore,requestRestock,inventoryPosition,setStaff,placeOrder} from '../dist/engine.js';
import {layoutObjects,shelfAccessPoint,checkoutPoint,shopArea,objectBox,reserveAccessPoint} from '../dist/store-layout.js';
import {walkingPath} from '../dist/walking-route.js';
import {makeSave,readSave} from '../dist/save-format.js';
const unchanged=(s,fn)=>{const before=JSON.stringify(s);assert.throws(fn);assert.equal(JSON.stringify(s),before);};
test('new game is a small shop with two stocked modules, one staffed checkout and three employees',()=>{
 const s=createStarterGame();assert.equal(s.storeSize,'small');assert.equal(s.shelfLayout.filter(Boolean).length,2);assert.equal(s.infrastructure.checkouts,1);assert.deepEqual(s.staff,{checkout:1,shelves:1,receiving:1,online:0});assert.equal(s.products.reduce((n,p)=>n+p.shelf,0),240);assert.equal(s.products.reduce((n,p)=>n+p.reserve,0),96);assert.ok(premisesCosts(s).total<160);assert.equal(premisesCosts(s).rows.length,4);
 startDayOnLoad(s);assert.equal(s.phase,'open');assert.equal(s.speed,1);advance(s,70);assert.ok(s.customers.every(c=>c.items.every(l=>l.index<2)));
});
test('page load resumes current minute at x1 and leaves a bankrupt game stopped',()=>{
 const s=createGame();openStore(s);advance(s,30);s.speed=0;const snapshot=readSave(makeSave(s));const before=snapshot.state.minute;startDayOnLoad(snapshot.state);assert.equal(snapshot.state.minute,before);assert.equal(snapshot.state.speed,1);s.phase='bankrupt';s.speed=0;startDayOnLoad(s);assert.equal(s.speed,0);
});
test('larger premises and expansions increase itemized charges and closing charges them once',()=>{
 const s=createStarterGame();s.money=50000;const small=premisesCosts(s);setStoreSize(s,'standard');const medium=premisesCosts(s);assert.equal(s.money,47000);assert.equal(s.shelfLayout.length,18);setStoreSize(s,'large');const large=premisesCosts(s);assert.equal(s.money,43500);assert.equal(s.shelfLayout.length,36);assert.ok(small.total<medium.total&&medium.total<large.total);assert.ok(small.area<medium.area&&medium.area<large.area);assert.equal(shopArea(s),412);
 const before=JSON.stringify(s);s.money=0;unchanged(s,()=>setStoreSize(s,'unknown'));s.money=43500;s.arrivalCredit=-10000;const cash=s.money,cost=dailyCosts(s);openStore(s);s.minute=1199;advance(s,1);assert.equal(s.money,cash-cost);assert.deepEqual(s.history[0].premises,large);advance(s,0);assert.equal(s.money,cash-cost);
});
test('installing or removing a checkout adjusts its employee in the same operation and protects a busy lane',()=>{
 const s=createStarterGame();setInstallation(s,'checkouts',2);assert.equal(s.staff.checkout,2);setInstallation(s,'checkouts',1);assert.equal(s.staff.checkout,1);openStore(s);s.speed=0;s.customers.push({id:42,stage:'checkout',checkoutLane:0,basket:[],items:[],value:0,checkoutRemaining:2});unchanged(s,()=>setInstallation(s,'checkouts',0));
});
test('moving and rotating equipment changes simulation access points, persists and rejects overlaps atomically',()=>{
 const s=createStarterGame(),old=shelfAccessPoint(s,0);moveFixture(s,'shelf:1',-4,0,Math.PI/2);assert.notDeepEqual(shelfAccessPoint(s,0),old);assert.deepEqual(shelfAccessPoint(s,0),[-2.55,0]);moveFixture(s,'checkout:0',2,3,0);assert.deepEqual(checkoutPoint(s,0),[2.35,2.15]);moveFixture(s,'reserve:0:0',-10,-9.5,Math.PI/2);assert.deepEqual(reserveAccessPoint(s,0),[-8.75,-9.5]);assert.deepEqual(readSave(makeSave(s)).state.layout,s.layout);
 unchanged(s,()=>moveFixture(s,'shelf:4',-4,0));unchanged(s,()=>moveFixture(s,'shelf:4',30,0));unchanged(s,()=>moveFixture(s,'shelf:4',0,0,.123));
 s.speed=1;unchanged(s,()=>moveFixture(s,'checkout:0',0,3));
});
test('walking paths turn around moved furniture and customers really reach the new checkout before sales',()=>{
 const s=createStarterGame();moveFixture(s,'shelf:1',0,0);moveFixture(s,'checkout:0',-5,3,0);const path=walkingPath(s,[-4,0],[4,0]);assert.ok(path.length>3);const box=objectBox(layoutObjects(s).find(o=>o.id==='shelf:1'),.15);
 for(let i=1;i<path.length;i++)for(let t=0;t<=1;t+=.1){const x=path[i-1][0]+(path[i][0]-path[i-1][0])*t,z=path[i-1][1]+(path[i][1]-path[i-1][1])*t;assert.ok(!(x>box.left&&x<box.right&&z>box.back&&z<box.front));}
 openStore(s);advance(s,120);assert.ok(s.sold>0);assert.ok(s.customers.every(c=>c.motion.position.every(Number.isFinite)));
});
test('restocking and deliveries use moved racks without losing inventory',()=>{
 const s=createStarterGame();s.money=30000;s.products[0].shelf=0;s.arrivalCredit=-10000;moveFixture(s,'shelf:1',-4,0,Math.PI/2);moveFixture(s,'reserve:0:0',-10,-9.5,Math.PI/2);const total=inventoryPosition(s,'produce');requestRestock(s,'produce');openStore(s);advance(s,100);assert.ok(s.products[0].shelf>0);assert.equal(inventoryPosition(s,'produce'),total);
 const order=placeOrder(s,'produce',48,'express');advance(s,130);assert.equal(s.orders.find(o=>o.id===order.id).status,'received');assert.equal(inventoryPosition(s,'produce'),total+48);
});
test('older save shapes remain readable and malformed placement data is rejected',()=>{
 const s=createGame();delete s.storeSize;delete s.layout;assert.equal(readSave(makeSave(s)).state.day,1);s.layout={'shelf:1':{x:1000,z:0,rotation:0}};assert.throws(()=>makeSave(s));s.layout={'fake':{x:0,z:0,rotation:0}};assert.throws(()=>makeSave(s));
});

import {satisfactionReport} from '../dist/satisfaction.js';
import {newTheftState,settleTheft,setSecurityLevel,theftRates} from '../dist/theft.js';
import {updateCheckouts} from '../dist/checkout-flow.js';
test('automatic checkout accepts only baskets with at most ten articles',()=>{
 const s=createStarterGame();s.autoCheckout=true;const buyer=(id,quantity)=>({id,stage:'queue',checkoutLane:null,wait:0,value:quantity*3.4,basket:[{index:0,quantity}],items:[]});
 s.customers=[buyer(1,20),buyer(2,11),buyer(3,10),buyer(4,4)];updateCheckouts(s,()=>{});assert.equal(s.customers[0].checkoutLane,0);assert.equal(s.customers[1].checkoutLane,0);assert.equal(s.customers[2].checkoutLane,'auto');assert.ok(s.customers.filter(c=>c.checkoutLane==='auto').every(c=>c.basket.reduce((n,l)=>n+l.quantity,0)<=10));
});
test('theft is reproducible, higher at automatic checkout, and does not charge a loss twice',()=>{
 const normal=createStarterGame(923),automatic=createStarterGame(923);const c=lane=>({checkoutLane:lane,basket:[{index:0,quantity:5000}],value:17000});
 settleTheft(normal,c(0));settleTheft(automatic,c('auto'));assert.ok(automatic.theft.daily.stolen>normal.theft.daily.stolen*2);assert.equal(automatic.theft.daily.stolen,automatic.theft.daily.autoStolen);assert.equal(automatic.theft.daily.checked,5000);
 const s=createStarterGame();s.money=10000;const before=s.money;setSecurityLevel(s,'cameras');assert.equal(s.money,before-600);assert.equal(theftRates(s).automatic,.02);assert.equal(theftRates(s).staffed,.005);assert.equal(premisesCosts(s).rows.at(-1).cost,25);
 const state=readSave(makeSave(s)).state,a=c('auto'),b=c('auto');settleTheft(s,a);settleTheft(state,b);assert.deepEqual(a,b);assert.deepEqual(s.theft,state.theft);
 // Force a deterministic unscanned article in a real checkout: it leaves stock but yields no sale or VAT.
 let seed=0;while(((Math.imul(1664525,seed)+1013904223)>>>0)/4294967296>=.01)seed++;
 const live=createStarterGame();live.theft.seed=seed;live.arrivalCredit=-10000;live.products[0].shelf--;live.customers=[{id:99,stage:'checkout',checkoutLane:0,checkoutArrived:true,checkoutDuration:4,checkoutRemaining:1,wait:0,items:[],basket:[{index:0,quantity:1}],value:3.4}];openStore(live);advance(live,1);assert.equal(live.sales,0);assert.equal(live.vatCollected,0);assert.equal(live.theft.daily.lostRevenue,3.4);assert.equal(live.products[0].soldToday,0);assert.equal(live.products[0].shelf,119);
});
test('satisfaction reports actual missing articles, waiting abandonment and recovery without invented historical data',()=>{
 const s=createStarterGame();s.arrivalCredit=-10000;s.products[0].shelf=1;s.customers=[{id:91,stage:'shopping',progress:5,itemIndex:0,items:[{index:0,quantity:4}],basket:[],value:0,wait:0}];openStore(s);advance(s,1);let r=satisfactionReport(s);assert.equal(r.requests,4);assert.equal(r.fulfilled,1);assert.equal(r.shortages[0],1);assert.equal(r.missing[0],3);assert.ok(r.stockPenalty>0);assert.equal(r.availability,25);
 setStaff(s,'checkout',0);s.customers[0].wait=17;advance(s,1);r=satisfactionReport(s);assert.equal(r.waitDepartures,1);assert.ok(r.waitPenalty>.69);assert.ok(Math.abs(r.opening-r.stockPenalty-r.waitPenalty+r.paymentRecovery-r.score)<.00001);assert.deepEqual(readSave(makeSave(s)).state.satisfactionDetails,s.satisfactionDetails);
});
test('a loaded pallet stops far enough from the rack for the transpalette nose',()=>{
 const s=createStarterGame();s.arrivalCredit=-10000;placeOrder(s,'produce',48,'express');openStore(s);let i=0;while(s.receivers[0].phase!=='storing'&&i++<180)advance(s,1);assert.equal(s.receivers[0].phase,'storing');const w=s.receivers[0],rack=layoutObjects(s).find(o=>o.id==='reserve:0:0');assert.ok(w.destination[1]-rack.z>=2.7-.001);
});
import {stockAlerts} from '../dist/stock-alerts.js';
test('stock alerts target real shortages and low stock, omit uninstalled families, and clear after replenishment',()=>{
 const s=createStarterGame();assert.deepEqual(stockAlerts(s),[]);s.products[0].shelf=0;s.products[0].reserve=0;s.products[1].shelf=20;const alerts=stockAlerts(s);assert.equal(alerts.filter(a=>a.severity==='critical').length,2);assert.equal(alerts.filter(a=>a.severity==='warning').length,1);assert.ok(alerts.every(a=>['produce','bakery'].includes(a.productId)));s.products[0].shelf=120;s.products[0].reserve=48;s.products[1].shelf=120;assert.deepEqual(stockAlerts(s),[]);
});
test('new installations cannot overlap custom furniture or debit cash after a placement rejection',()=>{
 const s=createStarterGame();moveFixture(s,'shelf:1',0,0);moveFixture(s,'shelf:4',-6.5,-2);unchanged(s,()=>setInstallation(s,'shelves',2,'produce'));
});
test('a full double-height pallet contains exactly twenty cartons and remains compatible with old partial pallets',()=>{
 const s=createStarterGame();const order=placeOrder(s,'produce',480,'express');assert.equal(order.pallets.length,2);assert.ok(order.pallets.every(p=>p.quantity===240));assert.equal(order.pallets.reduce((n,p)=>n+p.quantity/12,0),40);const snapshot=makeSave(s);snapshot.state.orders[0].pallets[0].quantity=48;snapshot.state.orders[0].pallets[0].remaining=48;assert.equal(readSave(snapshot).state.orders[0].pallets[0].quantity,48);
});

test('medium carts collect several families, reserve each separately and deliver without losing or duplicating articles',()=>{
 const s=createStarterGame();assert.equal(s.restockMode,'medium');assert.equal(s.restockUnlocked.medium,true);s.arrivalCredit=-100000;s.products[0].shelf=0;s.products[1].shelf=0;setStaff(s,'shelves',3);openStore(s);const total=s.products.map(p=>inventoryPosition(s,p.id));let mixed=false;
 for(let i=0;i<250;i++){advance(s,1);assert.deepEqual(s.products.map(p=>inventoryPosition(s,p.id)),total);for(const w of s.restockers){assert.ok(w.load+w.reserved<=24);if(w.cargo?.filter(l=>l.quantity>0).length>1)mixed=true;}for(const p of s.products){assert.ok(p.reserve>=0&&p.shelf<=p.capacity);}}
 assert.ok(mixed);assert.equal(s.products[0].reserve,0);assert.equal(s.products[1].reserve,0);assert.equal(s.products[0].shelf,48);assert.equal(s.products[1].shelf,48);
});
test('saving a mixed load resumes deterministically and removing the employee returns all carried families',()=>{
 const s=createStarterGame();s.arrivalCredit=-100000;s.products[0].shelf=0;s.products[1].shelf=0;openStore(s);for(let i=0;i<150&&!s.restockers[0].cargo?.every(l=>l.quantity>0);i++)advance(s,1);assert.ok(s.restockers[0].cargo.every(l=>l.quantity>0));const snapshot=readSave(makeSave(s)).state,total=s.products.map(p=>inventoryPosition(s,p.id));
 const original=readSave(makeSave(s)).state;advance(original,35);advance(snapshot,35);assert.deepEqual(snapshot,original);setStaff(s,'shelves',0);assert.deepEqual(s.products.map(p=>inventoryPosition(s,p.id)),total);assert.equal(s.products[0].reserve,48);assert.equal(s.products[1].reserve,48);
});
