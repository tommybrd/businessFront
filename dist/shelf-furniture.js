import * as THREE from 'three';
import {SHELF_INITIAL_LEVELS,SHELF_UNITS_PER_LEVEL,SHELF_MODULE_CAPACITY} from './store-layout.js';

export function createShelfFurniture(group,product,{box,material}) {
  if(product.id==='bakery') {
    group.userData.fixture='bread-display';
    box(group,1.8,.24,1.45,0,.2,0,0x55402b);
    box(group,1.8,2.5,.09,0,1.5,-.68,0x9a7649);
    for(const x of [-.85,.85])box(group,.1,2.5,1.45,x,1.5,0,0x725333);
    const heights=[.34,1.12,1.9,2.34];
    heights.forEach((y,level)=>{
      box(group,1.7,.075,1.38,0,y,0,0xb58b55);
      box(group,1.7,.07,.07,0,y+.07,.69,0x453b2c);
      const dividerHeight=level<2?.65:.3;
      for(const x of [-.28,.28])box(group,.035,dividerHeight,1.25,x,y+dividerHeight/2,-.015,0x8d683e);
      for(const x of [-.55,0,.55])box(group,.22,.045,.012,x,y+.08,.735,0xede5cc,false);
    });
    box(group,1.8,.23,1.45,0,2.74,0,0x45372a);
    return {layout:'bread-display',levels:4,unitsPerLevel:SHELF_MODULE_CAPACITY/4,signY:2.74,signZ:.75,doors:[]};
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
