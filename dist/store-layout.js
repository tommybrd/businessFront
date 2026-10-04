export const RESERVE_BACK_EXTENSION = 8;
export const SHELF_UNITS_PER_LEVEL = 40;
export const SHELF_INITIAL_LEVELS = 5;
export const SHELF_MODULE_CAPACITY = 200;
export const storeFrontExtension = expansions => 2.2 + expansions.checkout * 3 + expansions.shelves * 7.6;
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
export const productShelfPosition = (s,index,ordinal=0) => shelfPosition(productShelfSlot(s,index,ordinal));
export function productShelfAccess(s,index,ordinal=0) {
  const slot=productShelfSlot(s,index,ordinal),[x,z]=shelfPosition(slot);
  return [x,z,shelfRotation(slot)?-1:1];
}
export const reserveProductPosition = (index,rack=0) => [-9.5+index*3.8,-7-rack*4.2];
export const laneX = (i,lanes) => (i-(lanes-1)/2)*(lanes<=4?4:3);
export function checkoutPoint(s,lane) {
  const wide=Math.max(1.6,s.expansions.checkout*2),front=storeFrontExtension(s.expansions);
  return [lane==='auto'?10.2+wide/2-.85:laneX(lane,s.infrastructure.checkouts)-.85,lane==='auto'?4.45+front:5.65+front];
}
