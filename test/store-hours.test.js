import test from 'node:test';
import assert from 'node:assert/strict';
import {createStarterGame,startDayOnLoad,setStaff,setStoreHours,storeHours,openStore,advance,queueEveningOrder,setDirectorAnnualSalary,setDirectorProfitShare} from '../dist/engine.js';
import {makeSave,readSave} from '../dist/save-format.js';
import {satisfactionReport,satisfactionGrade} from '../dist/satisfaction.js';
import {createOnlineOrder,setOnlineEnabled} from '../dist/online-orders.js';
import {setInstallation} from '../dist/engine.js';
const quiet=()=>{const s=createStarterGame();for(const role of Object.keys(s.staff))setStaff(s,role,0);s.arrivalCredit=-1e6;startDayOnLoad(s);return s;};
test('chosen hours open after morning preparation and close on time; changes while open apply tomorrow',()=>{
 const s=quiet();setStoreHours(s,540,1080);advance(s,239);assert.equal(s.phase,'preparation');advance(s,1);assert.equal(s.phase,'open');assert.equal(s.minute,540);
 setStoreHours(s,600,1260);assert.deepEqual(storeHours(s),{open:540,close:1080});advance(s,539);assert.equal(s.history.length,0);advance(s,1);assert.equal(s.history.length,1);assert.equal(s.day,2);assert.equal(s.minute,300);assert.deepEqual(storeHours(s),{open:600,close:1260});
 advance(s,300);assert.equal(s.phase,'open');assert.equal(s.minute,600);
});
test('hours, annual salary and profit share survive a late-night save; bad hours fail without mutating state',()=>{
 const s=quiet();setStoreHours(s,600,1380);setDirectorAnnualSalary(s,30000);setDirectorProfitShare(s,15);openStore(s);s.minute=1300;
 const restored=readSave(makeSave(s)).state;assert.deepEqual(restored.storeHours,s.storeHours);assert.equal(Math.round(restored.directorSalary*365),30000);assert.equal(restored.directorProfitShare,15);
 for(const hours of [[299,1200],[600,1381],[600,630],[NaN,1200],[1200,600]]){const before=JSON.stringify(s);assert.throws(()=>setStoreHours(s,...hours));assert.equal(JSON.stringify(s),before);}
 const bad=makeSave(s);bad.state.dayHours.close=1440;assert.throws(()=>readSave(bad));
});
test('small player supplier lots fail in both express and evening modes; grouping dispatches at chosen closing time',()=>{
 const s=quiet();setStoreHours(s,540,1080);assert.throws(()=>queueEveningOrder(s,'produce',239,'regular'));const quote=queueEveningOrder(s,'produce',240,'regular');assert.equal(quote.dispatchTime,'18:00');openStore(s);s.minute=1079;advance(s,1);assert.equal(s.orders[0].quantity,240);assert.equal(s.shipments[0].arrivalMinute,390);assert.equal(s.shipments[0].eta-s.elapsed,90);
});
test('early closing still collects web parcels once before closing and preserves their payment',()=>{
 const s=quiet();s.money=50000;setInstallation(s,'web',1);setStaff(s,'online',1);setStoreHours(s,540,900);openStore(s);
 const order=createOnlineOrder(s,'web',[{productId:'bakery',quantity:2}]);setOnlineEnabled(s,'web',false);
 for(let i=0;i<200&&order.status!=='ready';i++)advance(s,1);assert.equal(order.status,'ready');assert.equal(s.online.carrier,null);s.minute=879;advance(s,1);assert.equal(s.online.lastPostCollectionDay,1);
 for(let i=0;i<19&&!order.paid;i++)advance(s,1);assert.equal(order.paid,true);assert.equal(s.online.daily.web,1);
});
test('A to E notes reflect each broad indicator and the weighted global result',()=>{
 assert.deepEqual([100,95,94,85,84,70,69,50,49,0].map(satisfactionGrade),['A','A','B','B','C','C','D','D','E','E']);
 const s=quiet();let r=satisfactionReport(s);assert.equal(r.grade,'A');s.satisfactionDetails.requests=100;s.satisfactionDetails.fulfilled=0;s.satisfactionDetails.waitingCustomers=1;s.satisfactionDetails.waitMinutes=16;s.lost=10;
 r=satisfactionReport(s);assert.equal(r.grade,'E');assert.ok(Object.values(r.indicators).every(i=>i.grade==='E'));
 s.satisfactionDetails.fulfilled=90;s.satisfactionDetails.waitMinutes=1;s.sold=90;r=satisfactionReport(s);assert.equal(r.indicators.availability.grade,'B');assert.equal(r.indicators.waiting.grade,'B');assert.equal(r.indicators.purchases.grade,'B');assert.equal(r.grade,'B');
});

test('supplier trucks still arrive during a very short early day, including after a pending hours change',()=>{
 const s=quiet();openStore(s);queueEveningOrder(s,'produce',240,'regular');setStoreHours(s,300,360);s.minute=1199;advance(s,1);const shipment=s.shipments[0];assert.equal(shipment.arrivalMinute,340);advance(s,40);assert.equal(s.minute,340);assert.equal(shipment.phase,'positioning');
});
