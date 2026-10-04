export const RESERVE_BACK_EXTENSION = 8;
export const SHELF_UNITS_PER_LEVEL = 40;
export const SHELF_INITIAL_LEVELS = 5;
export const SHELF_MODULE_CAPACITY = 200;
export const STORE_SIZES = {
  small: {name:'Petit magasin', front:-2, back:4, shelves:6, checkouts:2, lease:0},
  standard: {name:'Magasin moyen', front:2.2, back:8, shelves:18, checkouts:4, lease:3000},
  large: {name:'Grand magasin', front:6, back:12, shelves:36, checkouts:6, lease:6500},
};
export const storeSize = s => STORE_SIZES[s.storeSize || 'standard'];
export const storeFrontExtension = (expansions, size='standard') => STORE_SIZES[size].front + expansions.checkout * 3 + expansions.shelves * 7.6;
export const reserveBackExtension = s => storeSize(s).back + s.expansions.reserve * 3;
export const shopBounds = s => ({left:-11.4-Math.max(1.6,s.expansions.checkout*2)/2,right:11.4+Math.max(1.6,s.expansions.checkout*2)/2,back:-7.9-reserveBackExtension(s),front:7.9+storeFrontExtension(s.expansions,s.storeSize)});
export const SHOP_AREA_SCALE = 5;
export const shopArea = s => {const b=shopBounds(s);return Math.round((b.right-b.left)*(b.front-b.back)/2)*SHOP_AREA_SCALE;};
export const placed = (s,id,position,rotation=0) => s.layout?.[id] || {x:position[0],z:position[1],rotation};
export const rotateOffset = (p,dx,dz) => [Math.round((p.x+Math.cos(p.rotation)*dx+Math.sin(p.rotation)*dz)*1e10)/1e10,Math.round((p.z-Math.sin(p.rotation)*dx+Math.cos(p.rotation)*dz)*1e10)/1e10];
const faces = [[-4.5,-2],[4.5,-2],[-4.5,1.26],[-4.5,2.74],[4.5,1.26],[4.5,2.74]];
export const shelfPosition = slot => {
  const face = Math.floor(slot / 3), segment = slot % 3;
  const [x,z] = face < 6 ? faces[face] : [-6.4 + ((face-6)%3)*6.4,6.4+Math.floor((face-6)/3)*3.8];
  return [x+(segment-1)*1.8,z];
};
export const shelfRotation = slot => [2,4].includes(Math.floor(slot/3)) ? Math.PI : 0;
export const shelfFixtureId = slot => {
  const face=Math.floor(slot/3), segment=slot%3;
  return (face<2 ? face : face<6 ? 2+Math.floor((face-2)/2) : face-2)*3+segment;
};
export const shelfFixtureCount = s => new Set(s.shelfLayout.flatMap((id,slot)=>id?[shelfFixtureId(slot)]:[])).size;
const productShelfSlot = (s,index,ordinal) => {
  const slots=s.shelfLayout.map((id,slot)=>id===s.products[index].id?slot:-1).filter(slot=>slot>=0);
  return slots[ordinal%slots.length] ?? index*3;
};
export const productShelfPosition = (s,index,ordinal=0) => {const p=shelfPlacement(s,productShelfSlot(s,index,ordinal));return [p.x,p.z];};
export function productShelfAccess(s,index,ordinal=0) {
  const slot=productShelfSlot(s,index,ordinal),[x,z]=productShelfPosition(s,index,ordinal);
  return [x,z,shelfRotation(slot)?-1:1];
}
export const shelfPlacement = (s,slot) => placed(s,`shelf:${slot}`,shelfPosition(slot),shelfRotation(slot));
export const shelfFacing = (s,index,ordinal=0) => shelfPlacement(s,productShelfSlot(s,index,ordinal)).rotation+Math.PI;
export const shelfAccessPoint = (s,index,ordinal=0,distance=1.45) => rotateOffset(shelfPlacement(s,productShelfSlot(s,index,ordinal)),0,distance);
export const reservePlacement = (s,index,rack=0) => placed(s,`reserve:${index}:${rack}`,[-9.5+index*3.8,-7.8-rack*4.2]);
export const reserveProductPosition = (index,rack=0,s=null) => {const p=s?reservePlacement(s,index,rack):{x:-9.5+index*3.8,z:-7.8-rack*4.2};return [p.x,p.z];};
export const reserveAccessPoint = (s,index,rack=0,distance=1.25) => rotateOffset(reservePlacement(s,index,rack),0,distance);
export const laneX = (i,lanes) => (i-(lanes-1)/2)*(lanes<=4?4:3);
export function checkoutPlacement(s,lane) {
  const wide=Math.max(1.6,s.expansions.checkout*2),front=storeFrontExtension(s.expansions,s.storeSize);
  return placed(s,lane==='auto'?'auto':`checkout:${lane}`,[lane==='auto'?10.2+wide/2:laneX(lane,s.infrastructure.checkouts),lane==='auto'?4.8+front:6+front],-Math.PI/2);
}
export const checkoutPoint = (s,lane) => rotateOffset(checkoutPlacement(s,lane),.35,-.85);
export const cashierPoint = (s,lane) => rotateOffset(checkoutPlacement(s,lane),-.75,.85);
export const packingPlacement = s => placed(s,'packing',[-10.05,3+storeFrontExtension(s.expansions,s.storeSize)]);
export const packingAccessPoint = s => rotateOffset(packingPlacement(s),.55,.4);
export function layoutObjects(s) {
  const objects=[];
  s.shelfLayout.forEach((id,slot)=>{if(id){const p=shelfPlacement(s,slot);objects.push({...p,id:`shelf:${slot}`,name:s.products.find(p=>p.id===id).short,color:s.products.find(p=>p.id===id).color,w:1.8,d:id==='produce'?1.8:1.45,zone:'shop',access:rotateOffset(p,0,1.45)});}});
  for(let i=0;i<s.infrastructure.checkouts;i++){const p=checkoutPlacement(s,i);objects.push({...p,id:`checkout:${i}`,name:`Caisse ${i+1}`,color:'#82a98c',w:2.2,d:1.1,zone:'shop',access:checkoutPoint(s,i)});}
  if(s.autoCheckout){const p=checkoutPlacement(s,'auto');objects.push({...p,id:'auto',name:'Caisse automatique',color:'#90b877',w:1,d:.8,zone:'shop',access:checkoutPoint(s,'auto')});}
  s.products.forEach((product,i)=>{for(let r=0;r<product.reserveRacks;r++){const p=reservePlacement(s,i,r);objects.push({...p,id:`reserve:${i}:${r}`,name:`Rack ${product.short} ${r+1}`,color:product.color,w:3.05,d:1.4,zone:'reserve',access:reserveAccessPoint(s,i,r)});}});
  if(s.infrastructure.drive||s.infrastructure.web){const p=packingPlacement(s);objects.push({...p,id:'packing',name:'Poste de préparation',color:'#789a80',w:1.1,d:2,zone:'shop',access:rotateOffset(p,.95,0)});}
  return objects;
}
export function objectBox(o,margin=0) {
  const rotated=Math.abs(Math.sin(o.rotation))>.5;
  const hx=(rotated?o.d:o.w)/2+margin,hz=(rotated?o.w:o.d)/2+margin;
  return {left:o.x-hx,right:o.x+hx,back:o.z-hz,front:o.z+hz};
}
