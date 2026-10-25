const EPSILON=1e-8;
const shortestAngle=angle=>Math.atan2(Math.sin(angle),Math.cos(angle));

// Render the known route between simulation minutes, without modifying the save.
// Sampling the polyline preserves aisle corners instead of cutting through racks.
export function sampleWorkerRoute(worker,fraction=0){
 const speed=worker.robot?5:3;
 let distance=Math.max(0,Math.min(1,fraction))*speed,x=worker.pos[0],z=worker.pos[1],heading=null;
 if(worker.phase==='driving')return {x,z,heading};
 for(let i=0;i<worker.path.length;i++){
  const target=worker.path[i],dx=target[0]-x,dz=target[1]-z,length=Math.hypot(dx,dz);
  if(length<EPSILON)continue;
  heading=Math.atan2(dx,dz);
  if(distance>=length){distance-=length;x=target[0];z=target[1];continue;}
  x+=dx/length*distance;z+=dz/length*distance;
  const remaining=length-distance;
  // Turn the body just before a corner while keeping its position on the route.
  if(remaining<.45){
   const next=worker.path.slice(i+1).find(p=>Math.hypot(p[0]-target[0],p[1]-target[1])>EPSILON);
   if(next){const turn=1-remaining/.45;heading+=shortestAngle(Math.atan2(next[0]-target[0],next[1]-target[1])-heading)*turn*turn*(3-2*turn);}
  }
  break;
 }
 return {x,z,heading};
}

export function createWorkerMotion(worker,fraction=0){
 const pose=sampleWorkerRoute(worker,fraction);
 return {...pose,heading:pose.heading??0,stride:0,walk:0};
}

export function updateWorkerMotion(motion,worker,fraction,elapsedMinutes){
 const next=sampleWorkerRoute(worker,fraction),distance=Math.hypot(next.x-motion.x,next.z-motion.z);
 if(elapsedMinutes>0){
  const blend=1-Math.exp(-18*elapsedMinutes);
  // Relocations after editing/loading are not steps in a walking animation.
  const walking=distance>EPSILON&&distance<=(worker.robot?5:3)*elapsedMinutes+.001;
  if(walking)motion.stride+=distance*Math.PI*2/1.15;
  motion.walk+=(Number(walking)-motion.walk)*blend;
  if(next.heading!==null)motion.heading+=shortestAngle(next.heading-motion.heading)*blend;
 }
 motion.x=next.x;motion.z=next.z;
 return motion;
}

// Vehicles follow the road at the simulation pace; parking and leaving the dock glide instead of jumping.
export function followVehicle(motion,target,elapsedMinutes,speed){
 if(!motion?.visible||!target.visible)return {...target};
 const dx=target.x-motion.x,dz=target.z-motion.z,distance=Math.hypot(dx,dz),blend=1-Math.exp(-4*elapsedMinutes);
 // Manoeuvres start at a capped pace (4 units, 2.5 rad per minute) and ease into place.
 if(distance>speed*elapsedMinutes+.001){const step=Math.min(distance*blend,(4+speed)*elapsedMinutes)/distance;motion.x+=dx*step;motion.z+=dz*step;}else{motion.x=target.x;motion.z=target.z;}
 const turn=shortestAngle(target.heading-motion.heading);motion.heading+=Math.sign(turn)*Math.min(Math.abs(turn)*blend,2.5*elapsedMinutes);
 return motion;
}
