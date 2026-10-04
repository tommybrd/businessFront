import * as THREE from 'three';
import { RESTOCK_ROBOT, robotWorkers } from './restock-robots.js';
import { restockerPosition } from './engine.js';
import { reservePlacement, shelfPlacement } from './store-layout.js';

export function createRobotFleet(scene, {box,material}) {
  const actors=new Map();
  function build(id){
    const group=new THREE.Group();group.name=`restock-robot-${id}`;group.userData.selection={view:'equipes',role:'robots'};
    box(group,1.05,.27,.95,0,.29,0,0xe58d24); // Low autonomous carrier and protective bumper.
    box(group,1.1,.09,1,0,.18,0,0x293a3c);
    box(group,.82,.06,.74,0,.45,0,0x526b72);
    box(group,.72,.05,.09,0,.35,.48,0x19373d);
    const lamp=box(group,.4,.025,.03,0,.385,.5,0x76c9ef,false);
    const sensor=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.06,12),material(0x1d333a));sensor.position.set(0,.46,.34);group.add(sensor);
    const wheels=[];
    for(const x of [-.51,.51])for(const z of [-.3,.3]){
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.11,.11,.06,10),material(0x1c2c2e));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.15,z);group.add(wheel);wheels.push(wheel);
    }
    // A lift presents cartons to the shelf; no employee accompanies the carrier.
    for(const x of [-.35,.35])box(group,.055,1,.055,x,.87,-.36,0x547078);
    const lift=new THREE.Group();lift.position.y=.48;group.add(lift);box(lift,.86,.06,.72,0,0,0,0x334e54);
    const cargo=[];
    for(let i=0;i<16;i++)cargo.push(box(lift,.35,.2,.16,(i%2?1:-1)*.2,.13+Math.floor(i/8)*.21,(Math.floor(i%8/2)-1.5)*.18,0xc8ab77));
    scene.add(group);return {group,wheels,lift,cargo,lamp};
  }
  function remove(id){const actor=actors.get(id);actor.group.removeFromParent();actor.group.traverse(o=>o.geometry?.dispose());actors.delete(id);}
  function update(state,running,seconds,fraction){
    const workers=robotWorkers(state),ids=new Set(workers.map(w=>w.id));
    for(const id of actors.keys())if(!ids.has(id))remove(id);
    for(const worker of workers){
      if(!actors.has(worker.id))actors.set(worker.id,build(worker.id));
      const actor=actors.get(worker.id),position=restockerPosition(worker,fraction),dx=position[0]-actor.group.position.x,dz=position[1]-actor.group.position.z;
      const moving=running>0&&['collecting','outbound','returning'].includes(worker.phase);
      if(moving&&Math.hypot(dx,dz)>.001)actor.group.rotation.y=Math.atan2(dx,dz);
      else if(worker.phase==='stocking'){
        const slots=state.shelfLayout.map((id,i)=>id===worker.productId?i:-1).filter(i=>i>=0);
        if(slots.length)actor.group.rotation.y=shelfPlacement(state,slots[worker.completed%slots.length]).rotation+Math.PI;
      }else if(worker.phase==='loading')actor.group.rotation.y=reservePlacement(state,state.products.findIndex(p=>p.id===worker.productId),worker.reserveRack||0).rotation+Math.PI;
      actor.group.position.set(position[0],.09,position[1]);
      actor.group.userData.phase=worker.phase;actor.group.userData.articleCount=worker.load;
      actor.lift.position.y=worker.phase==='stocking'?.82:.48;
      actor.lamp.material=material(worker.phase==='idle'?0x76c9ef:0x9cdb72);
      const count=Math.ceil(worker.load/RESTOCK_ROBOT.capacity*actor.cargo.length);
      const lines=worker.cargo?.filter(l=>l.quantity>0)||[];
      actor.cargo.forEach((crate,i)=>{
        crate.visible=i<count;let unit=(i+.5)/Math.max(1,count)*worker.load;
        const line=lines.find(l=>(unit-=l.quantity)<0)||lines.at(-1);
        crate.material=material(state.products.find(p=>p.id===line?.productId)?.color||0xc8ab77);
      });
      if(moving)actor.wheels.forEach(wheel=>{wheel.rotation.x+=seconds*running*10;});
    }
  }
  return {update,groups:()=>[...actors.values()].map(a=>a.group),reset:()=>{for(const id of [...actors.keys()])remove(id);}};
}
