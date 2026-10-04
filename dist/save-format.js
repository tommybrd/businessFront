export const SAVE_VERSION = 1;
export const MAX_SAVE_BYTES = 1000000;
const saveProductIds = ['produce','bakery','dairy','grocery','drinks','home'];
function saveAssert(test) { if (!test) throw new Error('Cette sauvegarde est incomplète ou incompatible.'); }
function saveTree(value, depth=0) {
  saveAssert(depth<32);
  if(typeof value==='number') {saveAssert(Number.isFinite(value));return;}
  if(value===null||['string','boolean'].includes(typeof value))return;
  saveAssert(typeof value==='object');
  for(const[key,item]of Object.entries(value)){saveAssert(!['__proto__','prototype','constructor'].includes(key));saveTree(item,depth+1);}
}
export function validateSave(snapshot) {
  saveAssert(snapshot?.schemaVersion===SAVE_VERSION);saveTree(snapshot);
  const s=snapshot.state;saveAssert(s && Number.isSafeInteger(s.day) && s.day>0 && Number.isSafeInteger(s.minute) && s.minute>=0 && s.minute<=1200 && Number.isFinite(s.money));
  saveAssert(['preparation','open','closed','bankrupt'].includes(s.phase));
  for(const key of ['seed','nextId','elapsed','sales','spending','sold','lost','satisfaction','directorSalary','personalCash','vatCollected','vatDeductible','vatCredit','vatDue','profitTaxDue','taxPaidToday','ownerContribution','discarded','arrivalCredit','checkoutCredit'])saveAssert(Number.isFinite(s[key]));
  for(const key of ['orders','shipments','eveningBasket','customers','restockers','receivers','restockRequests','history','log','personalTransactions','shelfLayout'])saveAssert(Array.isArray(s[key]));
  saveAssert(s.staff&&s.expansions&&s.infrastructure&&s.restockUnlocked&&typeof s.autoCheckout==='boolean');
  for(const role of ['checkout','shelves','receiving','online'])saveAssert(Number.isSafeInteger(s.staff[role])&&s.staff[role]>=0);
  saveAssert(s.restockers.length===s.staff.shelves && s.receivers.length===s.staff.receiving && s.online?.workers?.length===s.staff.online);
  for(const zone of ['checkout','shelves','reserve'])saveAssert(Number.isSafeInteger(s.expansions[zone])&&s.expansions[zone]>=0&&s.expansions[zone]<=2);
  saveAssert(Array.isArray(s.products)&&s.products.length===6&&s.products.every((p,i)=>p.id===saveProductIds[i]&&[p.shelf,p.reserve,p.capacity,p.reserveCapacity,p.reserveRacks].every(n=>Number.isSafeInteger(n)&&n>=0)));
  saveAssert(s.shelfLayout.every(id=>id===null||saveProductIds.includes(id)));
  const orderIds=new Set(s.orders.map(o=>o.id));
  for(const o of s.orders){saveAssert(saveProductIds.includes(o.productId)&&Array.isArray(o.pallets));for(const p of o.pallets)saveAssert(Number.isInteger(p.remaining)&&p.remaining>=0);}
  for(const t of s.shipments){saveAssert(Array.isArray(t.pallets));for(const ref of t.pallets)saveAssert(orderIds.has(ref.orderId)&&s.orders.find(o=>o.id===ref.orderId).pallets[ref.palletIndex]);}
  for(const w of [...s.restockers,...s.receivers]){saveAssert(typeof w.phase==='string' && Number.isSafeInteger(w.load)&&w.load>=0&&Number.isSafeInteger(w.reserved)&&w.reserved>=0);if(w.orderId!==null&&w.orderId!==undefined)saveAssert(orderIds.has(w.orderId));}
  const customerIds=new Set();for(const c of s.customers){saveAssert(Number.isSafeInteger(c.id)&&!customerIds.has(c.id)&&['shopping','queue','checkout'].includes(c.stage)&&Array.isArray(c.basket)&&Array.isArray(c.items)&&Number.isFinite(c.value));customerIds.add(c.id);for(const l of [...c.basket,...c.items])saveAssert(Number.isInteger(l.index)&&l.index>=0&&l.index<6&&Number.isInteger(l.quantity)&&l.quantity>0);}
  for(const c of s.customers) {
    saveAssert(Number.isSafeInteger(c.wait)&&c.wait>=0);
    if(c.stage==='shopping')saveAssert(Number.isSafeInteger(c.itemIndex)&&c.itemIndex>=0&&c.itemIndex<c.items.length&&Number.isFinite(c.progress));
    if(c.stage==='checkout')saveAssert((c.checkoutLane==='auto'||Number.isSafeInteger(c.checkoutLane))&&Number.isFinite(c.checkoutDuration)&&c.checkoutDuration>0&&Number.isFinite(c.checkoutRemaining)&&c.checkoutRemaining>=0);
    if(c.motion)saveAssert(Array.isArray(c.motion.position)&&c.motion.position.length===2&&c.motion.position.every(Number.isFinite)&&Array.isArray(c.motion.path)&&c.motion.path.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))&&typeof c.motion.key==='string'&&Number.isFinite(c.motion.facing));
  }
  saveAssert(Array.isArray(s.online.orders)&&s.online.enabled&&s.online.daily&&Number.isInteger(s.online.seed)&&Number.isInteger(s.online.nextId));
  for(const o of s.online.orders){saveAssert(['drive','web'].includes(o.channel)&&Array.isArray(o.lines)&&typeof o.status==='string');for(const l of o.lines)saveAssert(saveProductIds[l.index]===l.productId&&Number.isSafeInteger(l.quantity)&&l.quantity>0);}
  for(const w of s.online.workers)if(w.orderId!==null)saveAssert(s.online.orders.some(o=>o.id===w.orderId));
  if(s.online.carrier)saveAssert(s.online.carrier.ids.every(id=>s.online.orders.some(o=>o.id===id)));
  saveAssert(snapshot.preferences&&typeof snapshot.preferences.checkoutSound==='boolean');
  return snapshot;
}
export function makeSave(state, preferences={checkoutSound:true}) {
  const snapshot=JSON.parse(JSON.stringify({schemaVersion:SAVE_VERSION,state,preferences}));snapshot.state.speed=0;
  validateSave(snapshot);return snapshot;
}
export function readSave(payload) {
  const snapshot=typeof payload==='string'?JSON.parse(payload):structuredClone(payload);validateSave(snapshot);snapshot.state.speed=0;return snapshot;
}
