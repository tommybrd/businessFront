import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, setStaff, setInstallation, setShelfCount, openStore, advance, discardReserve, requestRestock, inventoryPosition, placeOrder, maintenanceCosts } from '../dist/engine.js';
import { createOnlineOrder, setOnlineEnabled, cancelOnlineOrder, onlineReserved, onlineHeld, onlineUnits, onlinePicked } from '../dist/online-orders.js';
function setup(channel='drive',people=1) {
  const s=createGame();s.money=50000;for(const role of Object.keys(s.staff))setStaff(s,role,0);
  setInstallation(s,channel,1);setStaff(s,'online',people);openStore(s);s.arrivalCredit=-1e6;
  return s;
}
function until(s,fn,max=700){for(let i=0;i<max&&!fn();i++)advance(s,1);assert.ok(fn());}
function total(s,id){return inventoryPosition(s,id)+s.customers.reduce((n,c)=>n+c.basket.filter(l=>s.products[l.index].id===id).reduce((a,l)=>a+l.quantity,0),0);}
function frozen(s,fn){const before=JSON.stringify(s);assert.throws(fn);assert.equal(JSON.stringify(s),before);}
test('services start absent, with no extra wages, upkeep or sales; installation opens intake',()=>{
  const s=createGame();assert.equal(s.staff.online,0);assert.equal(maintenanceCosts(s).total,107);assert.deepEqual(s.online.orders,[]);
  frozen(s,()=>createOnlineOrder(s,'drive',[{productId:'produce',quantity:1}]));
  setInstallation(s,'drive',1);assert.equal(s.money,6500);assert.equal(maintenanceCosts(s).total,122);assert.equal(s.online.enabled.drive,true);
  setOnlineEnabled(s,'drive',false);frozen(s,()=>createOnlineOrder(s,'drive',[{productId:'produce',quantity:1}]));
  frozen(s,()=>setOnlineEnabled(s,'invalid',true));
});
test('a complete basket reserves physical stock, preventing double sale, disposal and restock; unavailable basket waits',()=>{
  const s=setup('drive',0),p=s.products[0];p.reserve=3;p.shelf=2;
  const o=createOnlineOrder(s,'drive',[{productId:'produce',quantity:5}]);setOnlineEnabled(s,'drive',false);
  assert.equal(p.reserve,3);assert.equal(p.shelf,2);assert.equal(onlineReserved(s,p.id,'reserve'),3);assert.equal(onlineReserved(s,p.id,'shelf'),2);assert.equal(o.status,'queued');assert.equal(s.sales,0);
  frozen(s,()=>discardReserve(s,p.id,1));frozen(s,()=>requestRestock(s,p.id));
  s.customers.push({id:888,stage:'shopping',progress:5,itemIndex:0,items:[{index:0,quantity:2}],basket:[],value:0});advance(s,1);assert.equal(p.shelf,2);assert.equal(s.customers.length,0);
  setOnlineEnabled(s,'drive',true);const waiting=createOnlineOrder(s,'drive',[{productId:'produce',quantity:1},{productId:'bakery',quantity:2}]);setOnlineEnabled(s,'drive',false);
  assert.equal(waiting.status,'waiting');assert.equal(onlineReserved(s,'bakery','reserve'),0);
  cancelOnlineOrder(s,o.id);advance(s,1);assert.equal(waiting.status,'queued');
});
test('each picked article moves into the cart without changing inventory; cancellation restores both sources',()=>{
  const s=setup(),p=s.products[0];p.reserve=2;p.shelf=3;const before=total(s,p.id);
  const o=createOnlineOrder(s,'drive',[{productId:p.id,quantity:5}]);setOnlineEnabled(s,'drive',false);
  until(s,()=>onlinePicked(o)===1);assert.equal(onlineHeld(s,p.id,'reserve'),1);assert.equal(total(s,p.id),before);assert.equal(s.sales,0);
  until(s,()=>o.status==='ready');assert.equal(p.reserve,0);assert.equal(p.shelf,0);assert.equal(onlinePicked(o),5);assert.equal(total(s,p.id),before);
  cancelOnlineOrder(s,o.id);assert.equal(p.reserve,2);assert.equal(p.shelf,3);assert.equal(total(s,p.id),before);assert.equal(onlineHeld(s,p.id,'reserve'),0);assert.equal(s.sales,0);
});
test('removing a picker midway restores articles and requeues the whole basket without phantom sale',()=>{
  const s=setup(),before=total(s,'produce');const o=createOnlineOrder(s,'drive',[{productId:'produce',quantity:8}]);setOnlineEnabled(s,'drive',false);
  until(s,()=>onlinePicked(o)===2);setStaff(s,'online',0);assert.equal(o.status,'queued');assert.equal(onlinePicked(o),0);assert.equal(total(s,'produce'),before);
  advance(s,30);assert.equal(o.status,'queued');assert.equal(s.online.workers.length,0);assert.equal(s.sales,0);
  setStaff(s,'online',1);until(s,()=>o.paid);assert.equal(total(s,'produce'),before-8);
});
test('drive waits for a parked car and a human handover; money and VAT enter once, installation stays busy until departure',()=>{
  const s=setup(),cash=s.money,vat=s.vatCollected,before=total(s,'produce');const o=createOnlineOrder(s,'drive',[{productId:'produce',quantity:3}]);setOnlineEnabled(s,'drive',false);
  until(s,()=>o.status==='ready');assert.equal(s.sales,0);assert.equal(s.money,cash-.5);assert.equal(o.car,null);
  frozen(s,()=>setInstallation(s,'drive',0));until(s,()=>o.status==='handover');assert.equal(s.sales,0);assert.equal(o.car,'waiting');
  until(s,()=>o.paid);assert.equal(s.money,cash-.5+o.value);assert.equal(s.sales,o.value);assert.equal(s.vatCollected,Math.round((vat+o.value/6)*100)/100);assert.equal(s.sold,0);assert.equal(s.products[0].soldToday,3);assert.equal(total(s,'produce'),before-3);
  assert.equal(s.online.daily.drive,1);frozen(s,()=>cancelOnlineOrder(s,o.id));frozen(s,()=>setInstallation(s,'drive',0));
  advance(s,15);assert.equal(s.sales,o.value);setInstallation(s,'drive',0);assert.equal(s.online.enabled.drive,false);
});
test('web packs, loads the carrier, charges the customer fee and carrier expense once at dispatch',()=>{
  const s=setup('web'),cash=s.money,before=total(s,'grocery');const o=createOnlineOrder(s,'web',[{productId:'grocery',quantity:4}]);setOnlineEnabled(s,'web',false);
  assert.equal(o.value,4*4.6+6);until(s,()=>o.status==='dispatching');assert.equal(s.money,cash-1);assert.equal(s.sales,0);frozen(s,()=>cancelOnlineOrder(s,o.id));
  until(s,()=>o.paid);assert.equal(s.money,Math.round((cash-1-4.5+o.value)*100)/100);assert.equal(s.spending,1500+1+4.5);assert.equal(s.online.daily.expenses,5.5);assert.equal(s.online.daily.web,1);assert.equal(total(s,'grocery'),before-4);assert.equal(s.sold,0);
  frozen(s,()=>setInstallation(s,'web',0));advance(s,10);setInstallation(s,'web',0);assert.equal(s.sales,o.value);
});
test('timed-out drive orders return picked goods, remove the waiting car, and never record revenue',()=>{
  const s=setup(),before=total(s,'produce');const o=createOnlineOrder(s,'drive',[{productId:'produce',quantity:4}]);setOnlineEnabled(s,'drive',false);
  until(s,()=>o.status==='ready');setStaff(s,'online',0);until(s,()=>o.status==='cancelled');assert.equal(total(s,'produce'),before);assert.equal(s.sales,0);assert.equal(s.online.daily.cancelled,1);advance(s,11);assert.equal(o.car,null);
});
test('held stock protects physical shelf and rack capacity and survives a continuous day change',()=>{
  const s=setup('web');s.online.lastPostCollectionDay=s.day;s.products[0].reserve=0;const o=createOnlineOrder(s,'web',[{productId:'produce',quantity:4}]);setOnlineEnabled(s,'web',false);
  until(s,()=>o.status==='ready');s.products[0].shelf=0;frozen(s,()=>setShelfCount(s,'produce',0));
  const day=s.day;s.minute=1199;advance(s,1);assert.equal(s.day,day+1);assert.equal(o.status,'ready');assert.equal(s.history[0].online.expenses,1);assert.equal(s.online.daily.sales,0);assert.equal(onlineHeld(s,'produce','shelf'),4);
  cancelOnlineOrder(s,o.id);assert.equal(s.products[0].shelf,4);
});
test('supplier receiving leaves space for picked reserve articles to be returned, and competing stock stays conserved',()=>{
  const s=setup('web');s.products[0].reserve=490;s.online.lastPostCollectionDay=s.day;const o=createOnlineOrder(s,'web',[{productId:'produce',quantity:20}]);setOnlineEnabled(s,'web',false);
  const before=total(s,'produce');until(s,()=>o.status==='ready');assert.equal(total(s,'produce'),before);frozen(s,()=>setInstallation(s,'reserve',0,'produce'));
  setStaff(s,'receiving',1);placeOrder(s,'produce',48,'express');advance(s,100);assert.ok(s.products[0].reserve+onlineHeld(s,'produce','reserve')<=500);assert.equal(total(s,'produce'),before+48);
  cancelOnlineOrder(s,o.id);assert.ok(s.products[0].reserve<=500);assert.equal(total(s,'produce'),before+48);
});
test('invalid customer baskets leave state untouched and do not consume order identifiers',()=>{
  const s=setup();for(const basket of [[],[{productId:'bad',quantity:1}],[{productId:'produce',quantity:25}],[{productId:'produce',quantity:1},{productId:'produce',quantity:1}]])frozen(s,()=>createOnlineOrder(s,'drive',basket));
});
test('two channels compete with real shoppers, replenishment and receiving without losing or overselling any unit',()=>{
  const s=createGame(59);s.money=100000;setInstallation(s,'drive',1);setInstallation(s,'web',1);setStaff(s,'online',3);setStaff(s,'receiving',2);
  s.products.forEach(p=>{p.reserve=500;});const initial=s.products.map(p=>inventoryPosition(s,p.id));openStore(s);
  const sold=s.products.map(()=>0),last=s.products.map(()=>0);let lastDay=s.day;
  for(let i=0;i<1500;i++){
    advance(s,1);
    if(s.day!==lastDay){const summary=s.history.at(-1);for(let j=0;j<sold.length;j++)sold[j]+=summary.products[j].sold-last[j];last.fill(0);lastDay=s.day;}
    for(let j=0;j<sold.length;j++){const p=s.products[j];sold[j]+=p.soldToday-last[j];last[j]=p.soldToday;assert.equal(total(s,p.id)+sold[j],initial[j]);assert.ok(p.reserve>=0&&p.reserve<=p.reserveCapacity);assert.ok(p.shelf>=0&&p.shelf<=p.capacity);}
  }
  assert.ok(s.history[0].online.drive>0);assert.ok(s.history[0].online.web>0);
});

test('La Poste collects once at 17h and later ready parcels wait for the next day',()=>{
 const s=setup('web');const first=createOnlineOrder(s,'web',[{productId:'grocery',quantity:4}]);setOnlineEnabled(s,'web',false);
 until(s,()=>first.status==='ready');assert.equal(s.online.carrier,null);
 s.minute=1019;advance(s,1);assert.equal(s.online.carrier.phase,'arriving');assert.equal(s.online.lastPostCollectionDay,s.day);
 until(s,()=>first.paid);advance(s,10);assert.equal(s.online.carrier,null);
 setOnlineEnabled(s,'web',true);const late=createOnlineOrder(s,'web',[{productId:'grocery',quantity:3}]);setOnlineEnabled(s,'web',false);
 until(s,()=>late.status==='ready');assert.equal(s.online.carrier,null);assert.equal(late.paid,false);
 s.minute=1199;advance(s,1);assert.equal(late.status,'ready');assert.equal(late.paid,false);
 s.minute=1019;advance(s,1);assert.equal(s.online.carrier.phase,'arriving');until(s,()=>late.paid);assert.equal(s.online.daily.web,1);
});

test('3D receipts appear only when drive or web revenue is paid, and restored payments are not replayed',async()=>{
 const THREE=await import('three'),{createOnlineScene}=await import('../dist/online-scene.js');
 for(const channel of ['drive','web']){
  const s=setup(channel),orders=[createOnlineOrder(s,channel,[{productId:'produce',quantity:2}])];
  if(channel==='web')orders.push(createOnlineOrder(s,channel,[{productId:'bakery',quantity:3}]));setOnlineEnabled(s,channel,false);
  const scene=new THREE.Scene(),material=color=>new THREE.MeshStandardMaterial({color}),labels=[];
  const box=(parent,w,h,d,x,y,z,color)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
  const textSprite=text=>{labels.push(text);return new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.Texture()}));};
  const view=createOnlineScene(scene,s,{box,material,textSprite});view.update();assert.equal(labels.length,0);
  for(let i=0;i<700&&!orders.every(o=>o.paid);i++){advance(s,1);view.update();}
  assert.ok(orders.every(o=>o.paid));assert.equal(labels.length,1);assert.equal(view.group.getObjectByName('online-payment').userData.amount,orders.reduce((n,o)=>n+o.value,0));
  view.update();assert.equal(labels.length,1);s.online=structuredClone(s.online);view.update();assert.equal(view.group.getObjectByName('online-payment'),undefined);assert.equal(labels.length,1);
 }
});
