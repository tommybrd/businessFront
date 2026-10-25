import test from 'node:test';
import assert from 'node:assert/strict';
import {createWarehouseGame,advanceWarehouse,setWarehouseRobots,buyWarehouseSupply} from '../dist/warehouse-engine.js';
import {sampleWorkerRoute,createWorkerMotion,updateWorkerMotion,followVehicle} from '../dist/warehouse-motion.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const person=()=>({pos:[0,0],path:[[1,0],[1,2]],phase:'to_rack',robot:false,cargo:3});

test('route sampling keeps the corners, exact walking speed, and final stopping position',()=>{
 const worker=person(),copy=structuredClone(worker);
 for(let i=0;i<=60;i++){
  const pose=sampleWorkerRoute(worker,i/60),distance=i/20;
  near(pose.x,Math.min(1,distance));near(pose.z,Math.max(0,distance-1));
 }
 const end=sampleWorkerRoute(worker,100);near(end.x,1);near(end.z,2);
 assert.deepEqual(worker,copy);
});

test('rendered endpoints agree with real humans and robots across mission transitions',()=>{
 const state=createWarehouseGame(414);setWarehouseRobots(state,1);buyWarehouseSupply(state,'books',24,true);
 const moving=new Set();
 for(let minute=0;minute<140;minute++){
  const copy=structuredClone(state),expected=new Map(state.workers.map(w=>[w.id,sampleWorkerRoute(w,1)]));
  for(const w of state.workers)for(const fraction of [0,.2,.5,.9])sampleWorkerRoute(w,fraction);
  assert.deepEqual(state,copy);for(const w of state.workers)if(w.path.length)moving.add(w.robot?'robot':w.role);
  advanceWarehouse(state,1);
  for(const w of state.workers){const pose=expected.get(w.id);near(pose.x,w.pos[0]);near(pose.z,w.pos[1]);}
 }
 assert.ok(moving.has('receiving'));assert.ok(moving.has('picking'));assert.ok(moving.has('robot'));
});

test('positions remain continuous at minute boundaries at 30, 60, 120 fps and all game speeds',()=>{
 for(const fps of [30,60,120])for(const speed of [1,3,6]){
  const state=createWarehouseGame(514);let tick=0,previous=new Map();
  for(let frame=0;frame<=fps*12;frame++){
   const time=frame/fps*speed,whole=Math.floor(time+1e-9),fraction=Math.max(0,time-whole);
   if(whole>tick){advanceWarehouse(state,whole-tick);tick=whole;}
   for(const worker of state.workers){
    const pose=sampleWorkerRoute(worker,fraction),before=previous.get(worker.id);
    if(before)assert.ok(Math.hypot(pose.x-before.x,pose.z-before.z)<=3*speed/fps+1e-7);
    previous.set(worker.id,pose);
   }
  }
 }
});

test('turns use the shortest arc and depend on elapsed time rather than frame count',()=>{
 const worker={...person(),path:[[0,30]]};
 for(const fps of [30,60,120]){
  const motion=createWorkerMotion(worker);motion.heading=2*Math.PI-.1;
  for(let frame=1;frame<=fps;frame++)updateWorkerMotion(motion,worker,frame/fps,1/fps);
  near(motion.heading,2*Math.PI-.1*Math.exp(-18));
  near(motion.stride,3*Math.PI*2/1.15);assert.ok(motion.walk>.99);
 }
});

test('pausing freezes the visual position, facing and walking pose until resumption',()=>{
 const worker=person(),motion=createWorkerMotion(worker);
 updateWorkerMotion(motion,worker,.2,.2);const paused=structuredClone(motion),saved=structuredClone(worker);
 for(let frame=0;frame<120;frame++)updateWorkerMotion(motion,worker,.2,0);
 assert.deepEqual(motion,paused);assert.deepEqual(worker,saved);
 updateWorkerMotion(motion,worker,.4,.2);assert.ok(motion.stride>paused.stride);
 const reloaded=createWorkerMotion(worker,.4);near(reloaded.x,motion.x);near(reloaded.z,motion.z);
});

test('idle workers stop their gait and drivers do not walk during a delivery',()=>{
 const worker=person(),motion=createWorkerMotion(worker);updateWorkerMotion(motion,worker,.2,.2);
 worker.pos=[motion.x,motion.z];worker.path=[];worker.phase='idle';
 for(let i=0;i<60;i++)updateWorkerMotion(motion,worker,0,1/60);
 assert.ok(motion.walk<1e-7);near(motion.x,worker.pos[0]);
 worker.phase='driving';worker.path=[[10,10]];near(sampleWorkerRoute(worker,.8).x,worker.pos[0]);
});

test('vehicles follow the road exactly and glide when parking or leaving the dock',()=>{
 let motion=followVehicle(undefined,{x:0,z:17,heading:Math.PI/2,visible:true},0,1);
 for(let i=1;i<=60;i++){motion=followVehicle(motion,{x:i/60,z:17,heading:Math.PI/2,visible:true},1/60,1);near(motion.x,i/60);}
 const parked={x:-12,z:15,heading:Math.PI,visible:true};let steps=0,largest=0;
 while(Math.hypot(motion.x-parked.x,motion.z-parked.z)>1e-3&&steps<600){const x=motion.x,z=motion.z;motion=followVehicle(motion,parked,1/60,0);largest=Math.max(largest,Math.hypot(motion.x-x,motion.z-z));steps++;}
 assert.ok(steps>30&&steps<600,'parking takes a visible glide');assert.ok(largest<=4/60+1e-9,'parking pace is capped');assert.ok(Math.abs(motion.heading-Math.PI)<.01);
 const frozen=structuredClone(followVehicle(motion,{x:5,z:5,heading:0,visible:true},0,1));assert.deepEqual(followVehicle(motion,{x:5,z:5,heading:0,visible:true},0,1),frozen);
 assert.deepEqual(followVehicle(motion,{x:-30,z:17,heading:0,visible:false},1/60,2),{x:-30,z:17,heading:0,visible:false});
});

test('van progress interpolated with the minute fraction has no jump at minute boundaries',()=>{
 const van={phase:'outbound',remaining:40,duration:40};
 const pose=fraction=>10+(1-Math.max(0,van.remaining-fraction)/van.duration)*35;
 for(let f=0;f<1;f+=.1)assert.ok(pose(f+.1)-pose(f)<35/40*.1+1e-9);
 const before=pose(.999);van.remaining--;assert.ok(Math.abs(pose(0)-before)<.01);
});
