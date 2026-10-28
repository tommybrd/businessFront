import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../dist/restaurant-engine.js';
import {createWarehouseGame,advanceWarehouse,warehouseStats,takeWarehouseLoan} from '../dist/engine.js';
import {makeSave,readSave} from '../dist/save-format.js';

const reconcile=s=>{const t=s.totals;assert.ok(Math.abs(s.money-(s.initialCash+t.revenue-t.refunds+t.bonus-t.purchases-t.delivery-t.packaging-t.marketing-t.charges-t.investments+t.borrowed-t.repaid))<.02,'cash reconciles');};
const runDay=s=>{const day=s.day;while(s.day===day)R.advanceRestaurant(s,10);return s.history[0];};
const at=(s,minute)=>{while(s.minute<minute)R.advanceRestaurant(s,1);};

test('a full day serves real groups, keeps the cash consistent and saves cleanly',()=>{
 const s=R.createRestaurantGame(11),h=runDay(s);
 assert.ok(h.customers>80&&h.served>80,`${h.customers} groupes, ${h.served} servis`);assert.ok(h.onTime/h.served>.6,'most orders within 8 minutes');assert.ok(h.revenue>1000&&h.cogs>0&&h.cogs<h.revenue);
 assert.ok(s.minute>=R.OPENING.prep&&s.minute<R.OPENING.prep+10);assert.equal(s.customers.length,0);assert.ok(s.tables.every(t=>t.state==='free'));reconcile(s);readSave(JSON.stringify(makeSave(s)));
});

test('grill cooks take raw patties from the bin, cook in batches and tickets draw them from the holding cabinet',()=>{
 const s=R.createRestaurantGame(2);s.open=false;s.autoSupplies=false;s.minute=700;R.setRestaurantPolicy(s,'cookAhead','order');
 const bins={...s.kitchen.bins},a=R.createRestaurantOrder(s,[{item:'double',qty:3}],{channel:'takeaway'}),b=R.createRestaurantOrder(s,[{item:'classic',qty:2}],{channel:'dine'}),c=R.createRestaurantOrder(s,[{item:'chicken',qty:1}],{channel:'dine'});
 assert.deepEqual(a.patties,{beef:6,chicken:0});assert.equal(R.kitchenStatus(s).beef.waiting,8);R.advanceRestaurant(s,1);
 assert.equal(s.kitchen.batches.reduce((n,x)=>n+x.qty,0),R.STATION_CAPACITY.grill,'one grill holds 8 patties');assert.equal(s.kitchen.bins.beef,bins.beef-8);assert.equal(a.grill.state,'todo');
 s.supplies.bags=0;R.advanceRestaurant(s,R.GRILL_MINUTES+3);assert.equal(a.grill.state,'done');assert.equal(b.grill.state,'done');assert.notEqual(b.assemble.state,'todo');assert.equal(a.assemble.state,'todo','no bag, no takeaway assembly');assert.deepEqual(R.missingPackaging(s),['bags']);
 s.supplies.bags=50;R.advanceRestaurant(s,12);assert.equal(a.stage,'ready');assert.equal(c.stage,'ready');assert.equal(s.daily.discarded,0,'cooking to order wastes nothing');makeSave(s);
});

test('an empty bin sends a cook to the cold room, and cooked patties left too long are thrown away',()=>{
 const s=R.createRestaurantGame(3);s.open=false;s.minute=700;s.kitchen.bins={beef:0,chicken:0};const cold=R.ingredientStock(s,'beef');
 R.createRestaurantOrder(s,[{item:'classic',qty:1}],{channel:'dine'});R.advanceRestaurant(s,1);const cook=s.workers.find(w=>w.role==='grill');assert.equal(cook.phase,'refill');
 for(let m=0;m<10&&s.kitchen.bins.beef===0;m++)R.advanceRestaurant(s,1);assert.equal(s.kitchen.bins.beef,R.BIN_CAPACITY);assert.equal(R.ingredientStock(s,'beef'),cold-R.BIN_CAPACITY);
 s.kitchen.holding.push({kind:'beef',qty:3,cookedAt:(s.day-1)*1440+s.minute});const waste=s.daily.waste;R.advanceRestaurant(s,R.HOLD_MINUTES+1);assert.ok(s.daily.discarded>=2,'the waiting ticket uses one, the rest expires');assert.ok(s.daily.waste>waste);
 const g=R.createRestaurantGame(4);g.minute=1400;g.kitchen.holding.push({kind:'chicken',qty:2,cookedAt:(g.day-1)*1440+1395});const lots=R.ingredientStock(g,'beef');R.advanceRestaurant(g,30);assert.equal(g.history[0].discarded,2,'held patties go to waste at closing');assert.equal(R.ingredientStock(g,'beef'),lots+R.BIN_CAPACITY,'raw bins go back to the cold room');makeSave(g);
});

test('the grill cook walks: raw patties from the bin to the grill, the cooked batch to the holding cabinet, then back',()=>{
 const s=R.createRestaurantGame(7);s.open=false;s.minute=700;R.setRestaurantPolicy(s,'cookAhead','order');const cook=s.workers.find(w=>w.role==='grill'),trails=[];
 R.createRestaurantOrder(s,[{item:'classic',qty:2}],{channel:'dine'});
 for(let m=0;m<10;m++){R.advanceRestaurant(s,1);if(cook.trail)trails.push(cook.trail);}
 const visits=trails.flat(),near=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1])<.6,bin=[R.LAYOUT.rawBins[0]+.9,R.LAYOUT.rawBins[1]+1.1],holding=[R.LAYOUT.holding[0],R.LAYOUT.holding[1]-.8];
 assert.ok(visits.some(p=>near(p,bin)),'goes to the raw bin');assert.ok(visits.some(p=>near(p,holding)),'brings the batch to the holding cabinet');assert.ok(trails.every(tr=>near(tr.at(-1),R.LAYOUT.grillCook(0))),'comes back to the grill');
 for(const tr of trails)assert.ok(tr.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-tr[i][0],p[1]-tr[i][1]),0)<=8.001,'never more than a minute of walking');
 assert.equal(s.orders[0].grill.state,'done');makeSave(s);
});

test('cooking ahead trades waiting time against waste',()=>{
 const day=ahead=>{const s=R.createRestaurantGame(11);R.setRestaurantPolicy(s,'cookAhead',ahead);const h=(()=>{const d=s.day;while(s.day===d)R.advanceRestaurant(s,10);return s.history[0];})();return {wait:h.waitSum/h.served,discarded:h.discarded};};
 const order=day('order'),high=day('high');assert.ok(high.wait<order.wait);assert.ok(high.discarded>order.discarded);assert.throws(()=>R.setRestaurantPolicy(R.createRestaurantGame(),'cookAhead','always'));
 const old=R.createRestaurantGame(5);delete old.kitchen;old.orders.push({...R.createRestaurantOrder(R.createRestaurantGame(6),[{item:'classic',qty:1}]),patties:undefined});const loaded=R.migrateRestaurantGame({schemaVersion:3,state:old});assert.equal(loaded.kitchen.cookAhead,'normal');assert.equal(loaded.orders.at(-1).grill.state,'done','orders already paid their patties');
});

test('without an open register the queue grows and impatient guests walk out, hurting reputation',()=>{
 const s=R.createRestaurantGame(3);R.setRestaurantStaff(s,'cashier',0);const rep=s.reputation;at(s,840);
 assert.equal(s.daily.served,0);assert.ok(s.daily.walkouts>5);assert.ok(s.reputation<rep);
 R.buyRestaurantEquipment(s,'kiosks');at(s,900);assert.ok(s.daily.served>0,'a kiosk takes orders without a cashier');makeSave(s);
});

test('dine-in guests eat at a table that stays dirty until the floor team cleans it',()=>{
 const s=R.createRestaurantGame(4);s.format='gourmet';R.setRestaurantStaff(s,'floor',0);at(s,820);
 assert.ok(s.tables.some(t=>t.state==='dirty'),'dirty tables pile up without floor staff');const dirty=s.tables.filter(t=>t.state==='dirty').length;
 R.setRestaurantStaff(s,'floor',2);R.advanceRestaurant(s,15);assert.ok(s.tables.filter(t=>t.state==='dirty').length<dirty);assert.ok(s.customers.some(c=>c.phase==='eating')||s.daily.served>0);makeSave(s);
});

test('perishable lots are used first-in first-out and thrown away when they expire',()=>{
 const s=R.createRestaurantGame(5);s.open=false;const veg=s.ingredients.find(i=>i.id==='veggies');veg.lots=[{qty:30,expires:1},{qty:50,expires:3}];
 R.setRestaurantRestock(s,'veggies',{enabled:false});R.createRestaurantOrder(s,[{item:'classic',qty:10}],{channel:'takeaway'});assert.deepEqual(veg.lots.map(l=>l.qty),[20,50]);
 runDay(s);assert.equal(veg.wasted,20);assert.equal(s.history[0].waste,+(20*.15).toFixed(2));assert.equal(R.ingredientStock(s,'veggies'),50);reconcile(s);
});

test('restock rules order once below their trigger and switch to express when stock is critical',()=>{
 const s=R.createRestaurantGame(6);s.open=false;s.minute=900;const buns=s.ingredients.find(i=>i.id==='buns');buns.lots=[{qty:200,expires:9}];
 R.advanceRestaurant(s,1);assert.equal(s.shipments.filter(t=>t.ingredient==='buns').length,1);assert.equal(s.shipments[0].express,false);R.advanceRestaurant(s,2);assert.equal(s.shipments.filter(t=>t.ingredient==='buns').length,1,'goods on the way count');
 const t=R.createRestaurantGame(7);t.open=false;t.minute=900;t.ingredients.find(i=>i.id==='beef').lots=[{qty:20,expires:9}];R.advanceRestaurant(t,1);const ship=t.shipments.find(x=>x.ingredient==='beef');assert.ok(ship.express,'critical stock goes express');
 R.advanceRestaurant(t,70);assert.ok(R.ingredientStock(t,'beef')>20,'express delivery unloaded');assert.throws(()=>R.setRestaurantRestock(t,'beef',{lots:0}));makeSave(t);
});

test('the margin slider sets every price and moves demand the other way; promotions and ads work as before',()=>{
 const s=R.createRestaurantGame(8);const base=R.itemPrice(s,'classic');assert.ok(Math.abs(base-8.9)<.15);R.setRestaurantPolicy(s,'margin',70);assert.ok(R.itemPrice(s,'classic')<base);const cheap=R.restaurantDemand(s).price;
 R.setRestaurantPolicy(s,'margin',88);assert.ok(R.itemPrice(s,'classic')>base&&R.restaurantDemand(s).price<cheap);assert.throws(()=>R.setRestaurantPolicy(s,'margin',95));
 const g=R.createRestaurantGame(9);g.minute=700;R.launchRestaurantPromo(g,20,180);assert.ok(R.restaurantDemand(g).promo>1);assert.throws(()=>R.launchRestaurantPromo(g,20,180));R.setRestaurantPolicy(g,'adBudget',300);assert.ok(R.restaurantDemand(g).ads>1.3);runDay(g);assert.ok(g.history[0].marketing>R.PROMO_SETUP);reconcile(g);
});

test('a group order is paid on acceptance, collected at its time and rewarded when ready',()=>{
 const s=R.createRestaurantGame(10);at(s,620);const c=s.contracts.find(c=>c.status==='offered'&&s.minute+(s.day-1)*1440>=c.opens);const cash=s.money;R.acceptRestaurantContract(s,c.id);
 const o=s.orders.find(o=>o.id===c.order);assert.equal(o.deadline,c.due);assert.ok(s.money>cash);R.setRestaurantStaff(s,'grill',3);R.buyRestaurantEquipment(s,'grills');R.buyRestaurantEquipment(s,'grills');R.setRestaurantStaff(s,'assembly',2);R.buyRestaurantEquipment(s,'assembly');
 at(s,c.due%1440+20);assert.equal(o.stage,'served');assert.ok(['completed','failed'].includes(c.status));if(c.status==='completed')assert.ok(s.daily.bonus>=c.bonus);makeSave(s);
});

test('loans and equipment limits behave like in the distribution centre',()=>{
 const s=R.createRestaurantGame(12);R.takeRestaurantLoan(s,10000,10);assert.equal(R.restaurantDebt(s),10000);for(let i=1;i<R.EQUIPMENT.grills.max;i++)R.buyRestaurantEquipment(s,'grills');assert.throws(()=>R.buyRestaurantEquipment(s,'grills'),/maximum/);
 runDay(s);assert.equal(R.restaurantDebt(s),9000);R.repayRestaurantLoan(s,s.loans[0].id);assert.equal(s.loans.length,0);reconcile(s);makeSave(s);
});

test('a distribution-centre save becomes a restaurant funded by its net worth, with the old game archived',()=>{
 const w=createWarehouseGame(13);advanceWarehouse(w,600);takeWarehouseLoan(w,10000,10);const record=makeSave(w),value=warehouseStats(w).stockValue;
 const r=R.migrateRestaurantGame(record,{stockValue:value});assert.equal(r.kind,'restaurant');assert.equal(r.legacyArchive.schemaVersion,2);assert.equal(r.legacyArchive.state.kind,'fulfillment');
 assert.equal(r.money,+Math.max(30000,w.money+value-10000).toFixed(2));assert.equal(r.transition.debt,10000);const saved=makeSave(r);assert.equal(saved.schemaVersion,3);readSave(JSON.stringify(saved));
 assert.deepEqual(R.migrateRestaurantGame(saved),saved.state,'a restaurant save loads unchanged');
 const poor=createWarehouseGame(14);poor.money=500;const funded=R.migrateRestaurantGame(makeSave(poor),{stockValue:0});assert.equal(funded.money,30000);assert.equal(funded.transition.support,29500);
});

test('the 28-day calendar and the concept change how many guests come',()=>{
 assert.equal(R.seasonEvent(3).id,'match');assert.equal(R.seasonEvent(26+R.SEASON_LENGTH).id,'burgerday');assert.equal(R.seasonEvent(1),null);
 const calm=R.createRestaurantGame(15),match=R.createRestaurantGame(15),fast=R.createRestaurantGame(15);match.day=3;R.setRestaurantPolicy(fast,'format','fast');
 assert.ok(Math.abs(R.restaurantDemand(match).factor/R.restaurantDemand(calm).factor-1.8)<1e-9);assert.ok(R.restaurantDemand(fast).factor>R.restaurantDemand(calm).factor);
 const groups=day=>{const g=R.createRestaurantGame(16);g.day=day;return runDay(g).customers;};assert.ok(groups(26)>groups(1)*1.4,'Journée du burger, salle pleine');assert.ok(groups(19)<groups(1),'vacances');
});
