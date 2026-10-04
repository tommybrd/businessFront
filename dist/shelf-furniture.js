import * as THREE from 'three';
import {SHELF_INITIAL_LEVELS,SHELF_UNITS_PER_LEVEL,SHELF_MODULE_CAPACITY} from './store-layout.js';

export function createShelfFurniture(group,product,{box,material}) {
  const mesh=(geometry,color,name)=>{const object=new THREE.Mesh(geometry,material(color));object.name=name;object.castShadow=true;object.receiveShadow=true;group.add(object);return object;};
  if(product.id==='bakery') {
    group.userData.fixture='bread-basket';
    for(const x of [-.7,.7])for(const z of [-.5,.5])box(group,.12,.74,.12,x,.43,z,0x8e643e);
    box(group,1.68,.1,1.3,0,.8,0,0xa78051);
    box(group,1.58,.17,1.2,0,.67,0,0xbd9765);
    const base=mesh(new THREE.CylinderGeometry(.5,.5,.07,32),0xa8814c,'basket-base');base.position.y=.89;base.scale.set(1.53,1,1.13);
    const levels=5;
    for(let level=0;level<levels;level++){
      const t=level/(levels-1),rim=mesh(new THREE.TorusGeometry(.5,level===levels-1?.019:.013,5,40),level%2?0xbd975d:0xa8814c,'basket-weave');
      rim.rotation.x=Math.PI/2;rim.scale.set(1.53+t*.23,1.13+t*.23,1);rim.position.y=.89+t*.3;
    }
    const up=new THREE.Vector3(0,1,0);
    for(let i=0;i<40;i++){
      const angle=i/40*Math.PI*2,a=new THREE.Vector3(Math.cos(angle)*.765,.89,Math.sin(angle)*.565),b=new THREE.Vector3(Math.cos(angle)*.88,1.19,Math.sin(angle)*.68),delta=b.clone().sub(a);
      const weave=mesh(new THREE.CylinderGeometry(.012,.012,delta.length(),5),i%2?0xc39f68:0xac8954,'basket-weave');weave.position.copy(a.add(b).multiplyScalar(.5));weave.quaternion.setFromUnitVectors(up,delta.normalize());
    }
    return {layout:'basket',levels:1,unitsPerLevel:SHELF_MODULE_CAPACITY,signY:.68,signZ:.67,doors:[]};
  }
  if(product.id==='dairy') {
    group.userData.fixture='refrigerated-cabinet';
    box(group,1.8,.25,1.45,0,.22,0,0x8da2a0);
    box(group,1.8,2.15,.1,0,1.35,-.67,0xe0e9e6);
    for(const x of [-.85,.85])box(group,.1,2.15,1.45,x,1.35,0,0xe3ece9);
    for(let level=0;level<SHELF_INITIAL_LEVELS;level++){
      box(group,1.65,.075,1.25,0,.42+level*.38,0,0xcddcda);
      box(group,1.65,.045,.04,0,.47+level*.38,.63,0xa8bbba);
    }
    box(group,1.8,.18,1.45,0,2.35,0,0xdbe7e4);
    box(group,1.66,.17,.06,0,.24,.74,0x819492);
    for(let i=0;i<14;i++)box(group,.05,.11,.018,-.75+i*.115,.24,.78,0x364c4c,false);
    const light=new THREE.MeshStandardMaterial({color:0xddffff,emissive:0xb7edf1,emissiveIntensity:.9});
    for(const x of [-.78,.78]){const led=box(group,.025,1.8,.03,x,1.34,.55,0xddffff,false);led.material=light;}
    const glass=new THREE.MeshPhysicalMaterial({color:0xbbe6e8,transparent:true,opacity:.14,roughness:.12,metalness:.03,depthWrite:false});
    const doors=[-1,1].map(side=>{
      const door=new THREE.Group();door.name='fridge-door';door.position.set(side*.84,0,.73);group.add(door);const direction=-side,center=direction*.4;
      const pane=new THREE.Mesh(new THREE.BoxGeometry(.76,1.86,.025),glass);pane.name='fridge-glass';pane.position.set(center,1.34,0);door.add(pane);
      for(const x of [direction*.02,direction*.8])box(door,.035,1.94,.06,x,1.34,0,0xf0f5f1,false);
      for(const y of [.37,2.31])box(door,.82,.035,.06,center,y,0,0xf0f5f1,false);
      box(door,.035,.43,.055,direction*.71,1.26,.075,0x596e70,false);
      return {group:door,side};
    });
    return {layout:'shelf',levels:SHELF_INITIAL_LEVELS,unitsPerLevel:SHELF_UNITS_PER_LEVEL,signY:2.34,signZ:.75,doors};
  }
  const stall=product.id==='produce';
  if(stall){
    group.userData.fixture='produce-stall';
    for(const x of [-.75,.75])for(const z of [-.65,.65])box(group,.16,.85,.16,x,.5,z,0x957046);
    box(group,1.8,.2,1.8,0,.88,0,0xb59462);
    for(const x of [-.9,-.3,.3,.9])box(group,.065,.28,1.8,x,1.04,0,0xc1a272);
    for(const z of [-.88,.88])box(group,1.8,.28,.06,0,1.04,z,0xc1a272);
  }else{
    group.userData.fixture='grocery-shelf';
    box(group,1.8,.25,1.45,0,.22,0,0xb9c8ae);
    for(let level=0;level<SHELF_INITIAL_LEVELS;level++)box(group,1.8,.1,1.45,0,.42+level*.38,0,0xd1dbc5);
    for(const x of [-.83,.83])for(const z of [-.65,.65])box(group,.09,2.05,.09,x,1.2,z,0x859287);
    box(group,1.8,.18,.14,0,1.45,.76,product.color);
  }
  return {layout:stall?'stall':'shelf',levels:stall?1:SHELF_INITIAL_LEVELS,unitsPerLevel:stall?SHELF_MODULE_CAPACITY:SHELF_UNITS_PER_LEVEL,signY:stall?.8:1.12,signZ:stall?.94:.77,doors:[]};
}
