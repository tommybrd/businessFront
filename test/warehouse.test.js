import test from 'node:test';
import assert from 'node:assert/strict';
import {createWarehouseGame,advanceWarehouse,warehouseStats,warehouseNow,createWarehouseOrder,buyWarehouseSupply,setWarehouseStaff,setWarehouseRobots,upgradeWarehouse,dispatchWarehouse,acceptWarehouseContract,moveWarehouseFixture,migrateWarehouseGame,warehouseAccess,warehouseRoute,setWarehousePolicy} from '../dist/warehouse-engine.js';
import {createStarterGame} from '../dist/engine.js';
import {makeSave,readSave} from '../dist/save-format.js';
import {createSaveManager} from '../dist/save-manager.js';
function fixture(){const s=createWarehouseGame(456);s.orders=[];s.daily.accepted=0;s.acceptOrders=false;return s;}
function conservation(s,bought=0){const stock=s.products.reduce((n,p)=>n+p.onHand,0),inOrders=s.orders.filter(o=>o.stage!=='delivered').reduce((n,o)=>n+o.lines.reduce((v,l)=>v+l.picked,0),0),inbound=s.shipments.reduce((n,t)=>n+t.remaining,0),cargo=s.workers.filter(w=>w.role==='receiving').reduce((n,w)=>n+w.cargo,0);assert.equal(stock+inOrders+inbound+cargo+s.soldUnits,s.startingUnits+bought);}
function reconcile(s){const t=s.totals;assert.ok(Math.abs(s.money-(s.initialCash+t.revenue+t.bonus-t.purchases-t.transport-t.packaging-t.charges-t.investments-(t.marketing||0)+(t.borrowed||0)-(t.repaid||0)))<.011);}
test('a real order is picked, packed, transported and paid once, preserving every article',()=>{
 const s=fixture(),initial=s.money,o=createWarehouseOrder(s,{lines:[{productId:'books',quantity:2},{productId:'tech',quantity:1}],deadline:warehouseNow(s)+360});
 advanceWarehouse(s,1);assert.equal(o.stage,'picking');assert.equal(s.products[1].reserved,2);assert.equal(s.money,initial);conservation(s);
 for(let i=0;i<250&&o.stage!=='delivered';i++){advanceWarehouse(s,1);conservation(s);makeSave(s);}
 assert.equal(o.stage,'delivered');assert.equal(s.daily.delivered,1);assert.equal(s.soldUnits,3);assert.equal(s.daily.revenue,o.value);assert.equal(o.late,false);reconcile(s);
 const paid=s.money;advanceWarehouse(s,50);assert.equal(s.money,paid);assert.equal(s.daily.delivered,1);
});
test('missing stock holds an order without creating or reserving goods until the supply arrives',()=>{
 const s=fixture(),p=s.products[0];p.onHand=0;s.startingUnits-=p.initial;const o=createWarehouseOrder(s,{lines:[{productId:p.id,quantity:3}]});advanceWarehouse(s,10);assert.equal(o.stage,'queued');assert.equal(warehouseStats(s).blocked,1);
 buyWarehouseSupply(s,p.id,24,true);advanceWarehouse(s,180);assert.equal(o.stage,'delivered');assert.equal(p.onHand,21);assert.equal(p.ordered,0);conservation(s,24);reconcile(s);
});
test('several reception workers reserve truck and rack capacity without overflow or duplicate goods',()=>{
 const s=fixture();setWarehouseStaff(s,'receiving',4);const p=s.products[1];buyWarehouseSupply(s,p.id,240,true);advanceWarehouse(s,150);assert.equal(p.onHand,p.capacity);assert.ok(s.shipments[0].remaining>0);conservation(s,240);makeSave(s);
 upgradeWarehouse(s,'rack',p.id);advanceWarehouse(s,100);assert.equal(p.onHand,360);assert.equal(p.ordered,0);conservation(s,240);reconcile(s);
});
test('busy staff and robot removal finish their mission and preserve picked cargo',()=>{
 const s=fixture();setWarehouseRobots(s,1);setWarehouseStaff(s,'picking',0);const o=createWarehouseOrder(s,{lines:[{productId:'books',quantity:4},{productId:'tech',quantity:2}]});
 advanceWarehouse(s,5);assert.equal(o.stage,'picking');setWarehouseRobots(s,0);assert.equal(s.workers.filter(w=>w.robot).length,1);assert.equal(s.workers.find(w=>w.robot).retiring,true);advanceWarehouse(s,150);assert.equal(o.stage,'delivered');assert.equal(s.workers.some(w=>w.robot),false);conservation(s);reconcile(s);makeSave(s);
});
test('a busy complete warehouse survives save and resumes deterministically',()=>{
 const s=createWarehouseGame(981);buyWarehouseSupply(s,'tech',240,true);setWarehouseRobots(s,1);acceptWarehouseContract(s,s.contracts[0].id);advanceWarehouse(s,100);
 const restored=readSave(makeSave(s)).state;assert.equal(restored.speed,0);advanceWarehouse(s,400);advanceWarehouse(restored,400);assert.deepEqual(restored,s);conservation(s,240);reconcile(s);
});
test('couriers and ready parcels wait for both a driver and a vehicle; payment waits for delivery',()=>{
 const s=fixture();setWarehouseStaff(s,'drivers',0);const o=createWarehouseOrder(s,{lines:[{productId:'books',quantity:1}]});advanceWarehouse(s,100);assert.equal(o.stage,'ready');assert.equal(s.daily.revenue,0);assert.throws(()=>dispatchWarehouse(s));setWarehouseStaff(s,'drivers',1);dispatchWarehouse(s);assert.equal(o.stage,'in_transit');assert.equal(s.daily.revenue,0);advanceWarehouse(s,90);assert.equal(o.stage,'delivered');assert.ok(s.daily.revenue>0);reconcile(s);
});
test('late deliveries discount payment and service, while on-time contracts reward once',()=>{
 const s=fixture();const o=createWarehouseOrder(s,{lines:[{productId:'books',quantity:1}],deadline:warehouseNow(s)+1});advanceWarehouse(s,150);assert.equal(o.late,true);assert.equal(o.paid,Math.round(o.value*.8*100)/100);assert.equal(s.daily.late,1);
 const c=s.contracts[0];acceptWarehouseContract(s,c.id);setWarehouseStaff(s,'picking',5);advanceWarehouse(s,300);assert.equal(c.status,'completed');assert.equal(s.daily.bonus,c.bonus);advanceWarehouse(s,100);assert.equal(s.daily.bonus,c.bonus);reconcile(s);conservation(s);
});
test('moving busy fixtures keeps stock, missions and accessible routes intact',()=>{
 const s=fixture();const o=createWarehouseOrder(s,{lines:[{productId:'books',quantity:3}]});advanceWarehouse(s,2);moveWarehouseFixture(s,'rack:books',-10,-.5,0);assert.ok(warehouseRoute(s,[1,9],warehouseAccess(s,'rack:books')));assert.throws(()=>moveWarehouseFixture(s,'rack:books',-10,-6,0));moveWarehouseFixture(s,'rack:books',-10,-.5,Math.PI/2);assert.ok(warehouseAccess(s,'rack:books')[0]>-10);advanceWarehouse(s,200);assert.equal(o.stage,'delivered');conservation(s);makeSave(s);
});
test('daily charges settle once, histories use real results and all cash reconciles over three days',()=>{
 const s=createWarehouseGame(772);setWarehouseStaff(s,'picking',4);advanceWarehouse(s,2700);assert.ok(s.day>=3);assert.equal(s.history.length,s.day-1);assert.ok(s.history.every(h=>h.charges>0&&Number.isFinite(h.profit)));reconcile(s);conservation(s);makeSave(s);
});
test('invalid and unaffordable upgrades are atomic; policy choices change actual dispatch behavior',()=>{
 const s=fixture(),copy=structuredClone(s);assert.throws(()=>buyWarehouseSupply(s,'books',1));assert.deepEqual(s,copy);assert.throws(()=>setWarehouseStaff(s,'picking',-1));assert.deepEqual(s,copy);s.money=0;const empty=structuredClone(s);assert.throws(()=>setWarehouseRobots(s,1));assert.deepEqual(s,empty);setWarehousePolicy(s,'dispatchEvery',30);assert.equal(s.dispatchEvery,30);assert.throws(()=>setWarehousePolicy(s,'priority','wrong'));
});
test('legacy saves are archived, converted and serializable without altering the original retail state',()=>{
 const old=makeSave(createStarterGame()),copy=structuredClone(old),s=migrateWarehouseGame(old);assert.deepEqual(old,copy);assert.deepEqual(s.legacyArchive,old);assert.ok(s.money>=25000);const restored=readSave(makeSave(s));assert.equal(restored.schemaVersion,2);assert.deepEqual(restored.state.legacyArchive,old);
});
test('save validation rejects corrupt reservations, missing workers and invalid quantities',()=>{
 const s=fixture();createWarehouseOrder(s,{lines:[{productId:'books',quantity:3}]});advanceWarehouse(s,3);const saved=makeSave(s);
 for(const mutate of [r=>r.state.products[1].reserved++,r=>r.state.workers=[],r=>r.state.orders[0].lines[0].picked=99,r=>r.state.products[0].onHand=9999,r=>r.state.money=Infinity,r=>r.state.orders[0].stage='delivered']){const corrupted=structuredClone(saved);mutate(corrupted);assert.throws(()=>readSave(corrupted));}
});
test('the new warehouse snapshot uses the existing persistent flight save and conflict-safe sync',async()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};let state=fixture(),cloud=null,revision=0,requests=0;
 const fetcher=async(path,o)=>{requests++;if(o.method==='GET')return Response.json({ownerId:'warehouse-test',revision,snapshot:cloud,hasPrevious:revision>1});const body=JSON.parse(o.body);assert.equal(body.revision,revision);cloud=body.snapshot;revision++;return Response.json({revision,hasPrevious:revision>1});};
 const manager=()=>createSaveManager({snapshot:()=>makeSave(state),apply:r=>{state=r.state;},fetcher,storage});const a=manager();await a.load();await a.setFlightMode(true);advanceWarehouse(state,120);a.changed();const before=requests;await a.flush();assert.equal(requests,before);const b=manager();assert.equal(await b.load(),true);assert.equal(b.flightMode,true);assert.equal(state.kind,'fulfillment');await b.setFlightMode(false);await b.flush();assert.equal(cloud.schemaVersion,2);assert.deepEqual(cloud.state,state);
});

test('staff wages accrue during real work and cannot be erased by removing agents before closing',()=>{
 const s=fixture();advanceWarehouse(s,60);const accrued=s.daily.wagesAccrued;assert.ok(accrued>0);for(const role of Object.keys(s.staff))setWarehouseStaff(s,role,0);advanceWarehouse(s,900);assert.equal(s.history.length,1);assert.ok(s.history[0].charges>=Math.round(accrued*100)/100);reconcile(s);
});

test('idle receivers and pickers return to separate waiting places after the actual cargo is handed over',()=>{
 const s=fixture();buyWarehouseSupply(s,'books',24,true);const o=createWarehouseOrder(s,{lines:[{productId:'books',quantity:1}]});advanceWarehouse(s,180);assert.equal(o.stage,'delivered');const receivers=s.workers.filter(w=>w.role==='receiving');assert.ok(receivers.every(w=>w.phase==='idle'&&w.pos[1]===9));const pickers=s.workers.filter(w=>w.role==='picking');assert.ok(new Set(pickers.map(w=>w.pos.join(','))).size===pickers.length);conservation(s,24);makeSave(s);
});

test('legacy capital uses the exact old inventory valuation and records the conversion without changing its archive',()=>{
 const old=makeSave(createStarterGame());old.state.money=50000;const fresh=migrateWarehouseGame(old,1234.56);assert.equal(fresh.money,51234.56);assert.equal(fresh.transition.assets,1234.56);assert.equal(fresh.transition.support,0);assert.deepEqual(fresh.legacyArchive,old);makeSave(fresh);
});
