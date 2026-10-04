import { productShelfAccess, storeFrontExtension, checkoutPoint } from './store-layout.js';
export const CUSTOMER_WALK_SPEED = 2.4;
function move(position,path,distance) {
  const p=[...position],route=path.map(point=>[...point]);
  while(route.length && distance>0) {
    const [x,z]=route[0],dx=x-p[0],dz=z-p[1],length=Math.hypot(dx,dz);
    if(length<=distance+.0001){p[0]=x;p[1]=z;distance-=length;route.shift();}
    else {p[0]+=dx/length*distance;p[1]+=dz/length*distance;distance=0;}
  }
  return {position:p,path:route};
}
export function customerPosition(c,fraction=0) {
  return move(c.motion.position,c.motion.path,Math.max(0,fraction)*CUSTOMER_WALK_SPEED).position;
}
export function stepCustomerMotion(s,c) {
  if(!c.motion)return true;
  let target,key;
  const front=storeFrontExtension(s.expansions);
  if(c.stage==='shopping') {
    const item=c.items[Math.min(c.itemIndex,c.items.length-1)];
    const [x,z,side]=productShelfAccess(s,item.index,c.id);
    target=[x,z+side*1.3];key=`shopping-${c.itemIndex}-${x}-${z}`;
    c.motion.facing=side<0?0:Math.PI;
  } else if(c.stage==='checkout') { target=checkoutPoint(s,c.checkoutLane);key=`checkout-${c.checkoutLane}-${front}`;c.motion.facing=0; }
  else {
    const lane=c.checkoutLane??0,point=checkoutPoint(s,lane);
    const index=s.customers.filter(other=>other.stage==='queue'&&(other.checkoutLane??0)===lane).indexOf(c);
    const column=Math.floor(Math.max(0,index)/3),row=Math.max(0,index)%3;
    target=[point[0]-column*.7,4.55+front-(column%2?2-row:row)*.85];
    key=`queue-${lane}-${index}-${front}`;c.motion.facing=0;
  }
  if(c.motion.key!==key) {
    const [px,pz]=c.motion.position;
    const direct=c.motion.key?.startsWith('queue')||c.motion.key?.startsWith('checkout');
    c.motion.path=direct||Math.abs(pz-target[1])<.1 ? [target] : [[9.5,pz],[9.5,target[1]],target];
    c.motion.key=key;
  }
  Object.assign(c.motion,move(c.motion.position,c.motion.path,CUSTOMER_WALK_SPEED));
  return c.motion.path.length===0;
}
