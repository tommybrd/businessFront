import test from 'node:test';
import assert from 'node:assert/strict';
import {createWarehouseGame,advanceWarehouse,buyWarehouseSupply,setWarehouseStaff,setWarehouseRobots,createWarehouseOrder,conveyorFull,CONVEYOR_CAPACITY,PALLET_UNITS,toggleWarehouseRush,bookWarehouseCourier,courierCost,WH_COURIER,cartonType,buyWarehousePackaging,packagingQuote,missingPackaging,setWarehousePolicy,migrateWarehouseGame,PACKAGING_START,setWarehouseRestock,restockRule,setWarehouseSupplyRule,supplyRule,DELIVERY_PROMISES} from '../dist/warehouse-engine.js';
import {makeSave} from '../dist/save-format.js';

test('receivers move a whole pallet, shelve it over several minutes and add the stock once',()=>{
 const s=createWarehouseGame(21);s.acceptOrders=false;s.orders=[];setWarehouseStaff(s,'picking',0);const p=s.products.find(p=>p.id==='books');p.capacity=960;buyWarehouseSupply(s,'books',480,true);
 const receiver=s.workers.find(w=>w.role==='receiving'),start=p.onHand;let trip=0,storing=0;
 for(let minute=0;minute<240&&p.onHand<start+480;minute++){const before=p.onHand,wasStoring=receiver.phase==='storing',cargo=receiver.cargo;advanceWarehouse(s,1);trip=Math.max(trip,receiver.cargo);if(receiver.phase==='storing')storing++;assert.equal(p.onHand-before,p.onHand===before?0:cargo);if(p.onHand!==before)assert.ok(wasStoring);makeSave(s);}
 assert.equal(trip,PALLET_UNITS);assert.ok(storing>=10,'shelving takes time');assert.equal(p.onHand,start+480);assert.equal(p.ordered,0);
});

test('a full conveyor holds pickers at the drop point without losing or duplicating totes',()=>{
 const s=createWarehouseGame(33);s.minute=480;s.acceptOrders=false;setWarehouseStaff(s,'packing',0);setWarehouseStaff(s,'picking',8);setWarehouseRobots(s,0);s.money=1e6;
 for(const p of s.products){p.capacity=960;p.onHand=900;}
 for(let i=0;i<CONVEYOR_CAPACITY+6;i++)createWarehouseOrder(s,{lines:[{productId:'books',quantity:1}],channel:'standard',area:'north'});
 advanceWarehouse(s,120);
 assert.ok(conveyorFull(s));assert.equal(s.orders.filter(o=>o.stage==='await_pack').length,CONVEYOR_CAPACITY);
 const waiting=s.workers.filter(w=>w.role==='picking'&&w.phase==='to_pack'&&!w.path.length);assert.ok(waiting.length>0,'pickers wait for a place');
 for(const w of waiting)assert.equal(w.cargo,s.orders.find(o=>o.id===w.job).lines.reduce((n,l)=>n+l.picked,0));makeSave(s);
 setWarehouseStaff(s,'packing',2);advanceWarehouse(s,240);assert.ok(!s.workers.some(w=>w.role==='picking'&&w.phase==='to_pack'&&!w.path.length&&!conveyorFull(s)));assert.ok(s.orders.some(o=>o.stage==='ready'||o.stage==='in_transit'||o.stage==='delivered'));
});

test('a prioritised order is picked and packed before older ones',()=>{
 const s=createWarehouseGame(41);s.minute=480;s.acceptOrders=false;s.orders=[];setWarehouseStaff(s,'picking',1);setWarehouseRobots(s,0);
 const first=createWarehouseOrder(s,{lines:[{productId:'books',quantity:1}],channel:'standard',area:'north'}),urgent=createWarehouseOrder(s,{lines:[{productId:'books',quantity:1}],channel:'standard',area:'north',deadline:first.deadline+60});
 toggleWarehouseRush(s,urgent.id);assert.equal(urgent.rush,true);advanceWarehouse(s,1);assert.equal(urgent.stage,'picking');assert.equal(first.stage,'queued');
 toggleWarehouseRush(s,urgent.id);assert.equal(urgent.rush,false);makeSave(s);
});

test('a courier is paid once, collects the parcel when packed and delivers it outside the van tours',()=>{
 const s=createWarehouseGame(43);s.minute=480;s.acceptOrders=false;s.orders=[];s.dispatchEvery=120;
 const o=createWarehouseOrder(s,{lines:[{productId:'tech',quantity:2}],channel:'express',area:'west'}),cash=s.money,transport=s.daily.transport;
 bookWarehouseCourier(s,o.id);assert.equal(s.money,cash-courierCost(o));assert.equal(s.daily.transport,transport+courierCost(o));assert.ok(o.rush);assert.throws(()=>bookWarehouseCourier(s,o.id),/déjà réservé/);
 let collected=null;for(let minute=0;minute<200&&o.stage!=='delivered';minute++){advanceWarehouse(s,1);if(o.stage==='in_transit'&&collected===null){collected=s.minute;assert.ok(!s.vans.some(v=>v.orders.includes(o.id)));makeSave(s);}}
 assert.equal(o.stage,'delivered');assert.equal(o.deliveredAt-collected-(s.day-1)*1440,WH_COURIER.minutes);assert.equal(o.late,false);assert.throws(()=>bookWarehouseCourier(s,o.id),/déjà partie/);
});

test('each parcel uses a carton sized to its content and tape; a shortage holds packing until restocked',()=>{
 assert.equal(cartonType({lines:[{productId:'books',quantity:1}]}),'S');assert.equal(cartonType({lines:[{productId:'books',quantity:2},{productId:'tech',quantity:1}]}),'M');assert.equal(cartonType({lines:[{productId:'home',quantity:2}]}),'L');
 const s=createWarehouseGame(51);s.minute=480;s.acceptOrders=false;s.orders=[];setWarehousePolicy(s,'autoSupplies',false);s.supplies.L=0;
 const big=createWarehouseOrder(s,{lines:[{productId:'home',quantity:2}],channel:'standard',area:'north'}),small=createWarehouseOrder(s,{lines:[{productId:'books',quantity:1}],channel:'standard',area:'north'}),start={...s.supplies};
 advanceWarehouse(s,90);assert.equal(big.stage,'await_pack');assert.deepEqual(missingPackaging(s),['L']);assert.ok(['ready','in_transit','delivered'].includes(small.stage));
 assert.equal(s.supplies.S,start.S-1);assert.equal(s.supplies.tape,start.tape-1);makeSave(s);
 const cash=s.money,{cost,units}=packagingQuote('L');buyWarehousePackaging(s,'L');assert.equal(s.money,+(cash-cost).toFixed(2));assert.equal(s.supplies.L,units);
 advanceWarehouse(s,60);assert.notEqual(big.stage,'await_pack');assert.equal(s.supplies.L,units-1);
});

test('automatic restocking buys a lot below the threshold and old saves get starting supplies',()=>{
 const s=createWarehouseGame(52);s.supplies.M=3;const cash=s.money;advanceWarehouse(s,1);assert.ok(s.supplies.M>=50);assert.ok(s.money<cash);assert.ok(s.daily.packaging>0);
 const old=createWarehouseGame(53);delete old.supplies;delete old.autoSupplies;const loaded=migrateWarehouseGame({schemaVersion:2,state:old});assert.deepEqual(loaded.supplies,PACKAGING_START);assert.equal(loaded.autoSupplies,true);
});

test('hourly and daily statistics count real orders, deliveries, sales and processing time',()=>{
 const s=createWarehouseGame(61);setWarehouseStaff(s,'picking',4);advanceWarehouse(s,1200);
 const m=s.metrics,sum=k=>m.reduce((n,b)=>n+b[k],0),delivered=s.orders.filter(o=>o.stage==='delivered');
 assert.ok(m.length>5&&m.length<=240);assert.ok(m.every((b,i)=>i===0||b.h>m[i-1].h));
 assert.equal(sum('received'),s.orders.length);assert.equal(sum('delivered'),delivered.length);assert.equal(sum('late'),delivered.filter(o=>o.late).length);
 assert.equal(+sum('revenue').toFixed(2),+delivered.reduce((n,o)=>n+o.paid,0).toFixed(2));
 const packed=s.orders.filter(o=>o.readyAt!==undefined);assert.equal(sum('processed'),packed.length);assert.equal(sum('processSum'),packed.reduce((n,o)=>n+o.readyAt-o.created,0));
 assert.ok(s.history[0].processed>0&&s.history[0].processSum>0);makeSave(s);
});

test('an automatic restock rule orders once below its trigger, counts goods on the way and respects rack space',()=>{
 const s=createWarehouseGame(71);s.acceptOrders=false;s.orders=[];const p=s.products.find(p=>p.id==='toys');p.onHand=40;
 setWarehouseRestock(s,'toys',{enabled:true,trigger:60,quantity:240,express:true});assert.deepEqual(restockRule(s,'toys'),{enabled:true,trigger:60,quantity:240,express:true});
 for(const bad of [{trigger:-1},{trigger:2000},{quantity:30},{quantity:0},{quantity:984},{enabled:'yes'}])assert.throws(()=>setWarehouseRestock(s,'toys',bad));assert.throws(()=>setWarehouseRestock(s,'nope',{}));
 advanceWarehouse(s,1);assert.equal(p.ordered,192,'trimmed to the 200 free places, by cartons of 24');assert.equal(s.shipments.filter(t=>t.productId==='toys').length,1);
 advanceWarehouse(s,5);assert.equal(s.shipments.filter(t=>t.productId==='toys').length,1,'no second order while goods are on the way');makeSave(s);
 setWarehouseRestock(s,'toys',{enabled:false});const off=createWarehouseGame(72);off.products.find(p=>p.id==='books').onHand=0;advanceWarehouse(off,1);assert.equal(off.shipments.length,0,'rules are off by default');
});

test('packaging rules set the trigger and the number of lots bought',()=>{
 const s=createWarehouseGame(73);setWarehouseSupplyRule(s,'S',{trigger:100,lots:3});s.supplies.S=90;advanceWarehouse(s,1);assert.equal(s.supplies.S,240);
 assert.throws(()=>setWarehouseSupplyRule(s,'S',{lots:0}));assert.throws(()=>setWarehouseSupplyRule(s,'X',{}));assert.deepEqual(supplyRule(s,'M'),{trigger:12,lots:1});makeSave(s);
});

test('orders are promised in 48 h, 24 h or express 6 h, with matching deadlines, fees and mix',()=>{
 const s=createWarehouseGame(81);s.minute=600;const at=(s.day-1)*1440+s.minute,line=[{productId:'books',quantity:1}];
 const make=channel=>createWarehouseOrder(s,{lines:line,channel,area:'north'}),std=make('standard'),next=make('next'),exp=make('express');
 assert.equal(std.deadline-at,2880);assert.equal(next.deadline-at,1440);assert.equal(exp.deadline-at,360);
 assert.equal(next.value-std.value,DELIVERY_PROMISES.next.fee);assert.equal(exp.value-std.value,DELIVERY_PROMISES.express.fee);
 const g=createWarehouseGame(82);g.minute=479;advanceWarehouse(g,600);const mix=ch=>g.orders.filter(o=>o.channel===ch&&!o.contractId).length;
 assert.ok(mix('standard')>mix('next')&&mix('next')>0&&mix('express')>0,`${mix('standard')} / ${mix('next')} / ${mix('express')}`);makeSave(g);
});
