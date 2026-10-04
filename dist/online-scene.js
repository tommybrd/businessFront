import * as THREE from 'three';
import { packingPlacement,storeFrontExtension } from './store-layout.js';
import { packPoint, drivePoint, onlineUnits } from './online-orders.js';
export function createOnlineScene(scene,state,{box,material,textSprite}) {
  const group=new THREE.Group(); group.name='online-services'; group.userData.selection={view:'online'}; scene.add(group);
  const packing=new THREE.Group(); packing.name='online-packing';packing.userData.selection={view:'online',fixtureId:'packing'}; group.add(packing);
  box(packing,1.1,.12,2,0,.88,0,0x789a80);
  for(const x of [-.45,.45]) for(const z of [-.85,.85]) box(packing,.07,.8,.07,x,.43,z,0x547460);
  box(packing,.35,.3,.25,0,1.08,-.7,0x213e32);box(packing,.28,.15,.05,0,1.22,-.54,0x93c9bc);
  box(packing,.42,.35,.42,0,.28,.5,0xbc9764);
  const spaces=new THREE.Group();spaces.name='drive-pickup';group.add(spaces);
  for(let slot=0;slot<2;slot++) {
    const point=drivePoint(state,slot),z=point[1];
    const bay=new THREE.Group();bay.userData.slot=slot;spaces.add(bay);
    box(bay,2.75,.035,4,0,-.07,0,0x749d83,false);
    box(bay,.06,1.9,.06,1.15,.9,-2.2,0x486650);
    box(bay,.45,.35,.1,1.15,1.85,-2.2,0xc4e7ad);
    bay.position.set(point[0],0,z);
  }
  const parcels=new THREE.Group();parcels.name='online-ready-parcels';group.add(parcels);
  const cars=new Map();let parcelKey='';
  function vehicle(van=false) {
    const car=new THREE.Group(); car.name=van?'online-carrier':'drive-customer-car';
    box(car,1.65,.42,van?3.1:2.8,0,.49,0,van?0xf3c629:0x6d9e96);
    box(car,1.45,van?1.1:.6,van?1.9:1.35,0,van?1.17:.99,van?-.4:-.13,van?0xf3c629:0x557d7e);
    box(car,1.3,.38,.05,0,1.03,van?1: .58,0x9fc6c7);
    if(van) {box(car,.8,.4,.03,0,1.25,-1.37,0x244f87);}
    for(const x of [-.79,.79])for(const z of [-.91,.91]){
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.15,10),material(0x354a40));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.25,z);car.add(wheel);
    }
    car.userData.selection={view:'online'};group.add(car);return car;
  }
  function pose(car,route,t) {
    const lengths=route.slice(1).map((p,i)=>Math.hypot(p[0]-route[i][0],p[1]-route[i][1]));let d=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,t));
    for(let i=0;i<lengths.length;i++) {if(d<=lengths[i]&&lengths[i]){const f=d/lengths[i],a=route[i],b=route[i+1];car.position.set(a[0]+(b[0]-a[0])*f,0,a[1]+(b[1]-a[1])*f);car.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);return;}d-=lengths[i];}
    car.position.set(route.at(-1)[0],0,route.at(-1)[1]);
  }
  function remove(car){group.remove(car);car.traverse(o=>o.geometry?.dispose());}
  let courier=null, observedOnline=null, paidSeen=new Set();
  const payments=[];
  const clearPayments=()=>{for(const p of payments){p.sprite.removeFromParent();p.sprite.material.map.dispose();p.sprite.material.dispose();}payments.length=0;};
  const payment=(amount,x,z)=>{
    const label=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(amount);
    const sprite=textSprite(`+ ${label}`,{color:'#edffcf',background:'#245738ed',width:384,height:112,size:46,worldWidth:2.7});
    sprite.name='online-payment';sprite.userData.amount=amount;sprite.position.set(x,2.4,z);sprite.renderOrder=20;group.add(sprite);payments.push({sprite,age:0});
  };
  return {group,update(fraction=0,seconds=0){
    if(observedOnline!==state.online){observedOnline=state.online;paidSeen=new Set(state.online.orders.filter(o=>o.paid).map(o=>o.id));clearPayments();}
    const received=state.online.orders.filter(o=>o.paid&&!paidSeen.has(o.id));
    for(const o of received)paidSeen.add(o.id);
    const webAmount=received.filter(o=>o.channel==='web').reduce((n,o)=>n+o.value,0);
    if(webAmount)payment(webAmount,-4.5,12.8+storeFrontExtension(state.expansions,state.storeSize));
    for(const o of received.filter(o=>o.channel==='drive')){const [x,z]=drivePoint(state,o.slot??0);payment(o.value,x,z);}
    for(let i=payments.length-1;i>=0;i--){const p=payments[i];if(state.speed)p.age+=seconds;p.sprite.position.y=2.4+p.age*.2;p.sprite.material.opacity=Math.min(1,(3-p.age)*2);if(p.age>=3){p.sprite.removeFromParent();p.sprite.material.map.dispose();p.sprite.material.dispose();payments.splice(i,1);}}
    const point=packPoint(state),front=storeFrontExtension(state.expansions,state.storeSize),placement=packingPlacement(state);
    packing.visible=Boolean(state.infrastructure.drive||state.infrastructure.web); packing.position.set(placement.x,0,placement.z);packing.rotation.y=placement.rotation;
    spaces.visible=Boolean(state.infrastructure.drive); spaces.children.forEach((bay,slot)=>{const p=drivePoint(state,slot);bay.position.set(p[0],0,p[1]);});
    const ready=state.online.orders.filter(o=>['ready','dispatching'].includes(o.status));
    const key=ready.map(o=>`${o.id}:${o.channel}:${onlineUnits(o)}`).join('|');
    if(key!==parcelKey){parcelKey=key;for(const mesh of [...parcels.children]){parcels.remove(mesh);mesh.geometry.dispose();}let count=0;for(const o of ready)for(let i=0;i<Math.ceil(onlineUnits(o)/12);i++){
      const mesh=box(parcels,.38,o.channel==='drive'?.4:.32,.34,(count%4)*.48, .25+Math.floor(count/12)*.36, Math.floor(count%12/4)*.45,o.channel==='drive'?0xd8c497:0xbc986a);mesh.userData.orderId=o.id;count++;
    }parcels.userData.packages=parcels.children.length;}
    parcels.position.set(-10.7,0,front+1);parcels.visible=packing.visible;
    const driveOrders=state.online.orders.filter(o=>o.car);
    for(const[id,car]of cars)if(!driveOrders.some(o=>o.id===id)){remove(car);cars.delete(id);}
    const road=16+Math.max(.8,state.expansions.checkout),street=26+front,aisle=16.5+front;
    for(const o of driveOrders){let car=cars.get(o.id);if(!car){car=vehicle();car.userData.orderId=o.id;cars.set(o.id,car);}const [x,z]=drivePoint(state,o.slot);
      if(o.car==='arriving')pose(car,[[road+5,street],[road,street],[road,aisle],[x,aisle],[x,z]],(state.elapsed-o.carStarted+fraction)/6);
      else if(o.car==='departing')pose(car,[[x,z],[x,aisle],[road,aisle],[road,street],[road+5,street]],(state.elapsed-o.finished+fraction)/10);
      else{car.position.set(x,0,z);car.rotation.y=Math.PI;}
    }
    const carrier=state.online.carrier;
    if(carrier){if(!courier)courier=vehicle(true);const x=-4.5,z=12.8+front,age=state.elapsed-carrier.started+fraction;
      if(carrier.phase==='arriving')pose(courier,[[road+5,street],[road,street],[road,aisle],[x,aisle],[x,z]],age/4);
      else if(carrier.phase==='departing')pose(courier,[[x,z],[x,aisle],[road,aisle],[road,street],[road+5,street]],age/6);
      else{courier.position.set(x,0,z);courier.rotation.y=Math.PI;}
      courier.userData.packages=carrier.load;
    }else if(courier){remove(courier);courier=null;}
  }};
}
