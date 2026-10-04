// Customer fulfilment, separate from supplier purchase orders. All quantities are real units.
export const ONLINE_CHANNELS = {
  drive: { name: 'Drive', customerFee: 0, packaging: .5, transport: 0, promise: 75 },
  web: { name: 'E-commerce', customerFee: 6, packaging: 1, transport: 4.5, promise: 180 },
};
export const ONLINE_STATUSES = { waiting: 'En attente de stock', queued: 'À préparer', picking: 'Préparation', packing: 'Emballage', ready: 'Prête', handover: 'Remise au client', dispatching: 'Chargement transporteur', completed: 'Terminée', cancelled: 'Annulée' };
export const activeOnlineOrder = o => !['completed', 'cancelled'].includes(o.status);
const round = n => Math.round(n * 100) / 100;
export const onlineDaily = () => ({ accepted: 0, completed: 0, cancelled: 0, sales: 0, drive: 0, web: 0, expenses: 0 });
export const newOnlineState = seed => ({ enabled: { drive: false, web: false }, orders: [], workers: [], credit: { drive: 0, web: 0 }, nextId: 1, seed: seed ^ 9173, daily: onlineDaily(), carrier: null, nextCarrier: 0 });
export const packPoint = s => [-9.5, 3.4 + 2.2 + s.expansions.checkout * 3 + s.expansions.shelves * 7.6];
export const drivePoint = (s, slot) => [-10.5 + slot * 3, 12.8 + 2.2 + s.expansions.checkout * 3 + s.expansions.shelves * 7.6];
export function onlineReserved(s, productId, source) {
  return s.online.orders.filter(activeOnlineOrder).reduce((sum, o) => sum + o.lines.filter(l => l.productId === productId).reduce((n, l) => n + (l[source] || 0) - (l[`picked${source}`] || 0), 0), 0);
}
export function onlineHeld(s, productId, source) {
  return s.online.orders.filter(activeOnlineOrder).reduce((sum, o) => sum + o.lines.filter(l => l.productId === productId).reduce((n, l) => n + (l[`picked${source}`] || 0), 0), 0);
}
export const onlineUnits = o => o.lines.reduce((n, l) => n + l.quantity, 0);
export const onlinePicked = o => o.lines.reduce((n, l) => n + l.pickedreserve + l.pickedshelf, 0);
function allocate(s, order) {
  const lines = order.lines.map(l => {
    const p = s.products[l.index];
    const restock = s.restockers.filter(w => w.productId === p.id).reduce((n, w) => n + w.reserved, 0);
    const reserve = Math.min(l.quantity, Math.max(0, p.reserve - restock - onlineReserved(s, p.id, 'reserve')));
    const shelf = l.quantity - reserve;
    if (shelf > p.shelf - onlineReserved(s, p.id, 'shelf')) return null;
    return { ...l, reserve, shelf };
  });
  if (lines.some(l => !l)) return false;
  order.lines = lines; order.status = 'queued'; return true;
}
export function setOnlineEnabled(s, channel, enabled) {
  if (!Object.hasOwn(ONLINE_CHANNELS, channel) || typeof enabled !== 'boolean') throw new Error('Service invalide.');
  if (enabled && !s.infrastructure[channel]) throw new Error('Installez d’abord la zone de ce service.');
  s.online.enabled[channel] = enabled; return { channel, enabled };
}
export function createOnlineOrder(s, channel, basket) {
  if (!Object.hasOwn(ONLINE_CHANNELS, channel) || !s.infrastructure[channel] || !s.online.enabled[channel]) throw new Error('Ce service est fermé.');
  if (!['preparation', 'open'].includes(s.phase)) throw new Error('Le magasin ne peut plus accepter de commande.');
  if (!Array.isArray(basket) || !basket.length || basket.length > s.products.length) throw new Error('Panier invalide.');
  const seen = new Set();
  const lines = basket.map(l => {
    const index = s.products.findIndex(p => p.id === l.productId);
    if (index < 0 || seen.has(l.productId) || !Number.isSafeInteger(l.quantity) || l.quantity < 1 || l.quantity > 24) throw new Error('Articles invalides : 1 à 24 unités par famille.');
    seen.add(l.productId); return { productId: l.productId, index, quantity: l.quantity, price: s.products[index].price, reserve: 0, shelf: 0, pickedreserve: 0, pickedshelf: 0 };
  });
  if (s.online.orders.filter(activeOnlineOrder).length >= 40) throw new Error('40 commandes en cours : terminez-en avant d’en accepter davantage.');
  const order = { id: s.online.nextId++, channel, lines, status: 'waiting', created: s.elapsed, day: s.day, due: s.elapsed + ONLINE_CHANNELS[channel].promise, fee: ONLINE_CHANNELS[channel].customerFee, value: round(lines.reduce((n, l) => n + l.price * l.quantity, 0) + ONLINE_CHANNELS[channel].customerFee), paid: false, packaged: false, slot: null, car: null };
  allocate(s, order); s.online.orders.push(order); s.online.daily.accepted++;
  return order;
}
function returnGoods(s, o) {
  for (const l of o.lines) { const p = s.products[l.index]; p.reserve += l.pickedreserve; p.shelf += l.pickedshelf; l.reserve = l.shelf = l.pickedreserve = l.pickedshelf = 0; }
}
function idleWorker(w, s) { Object.assign(w, { phase: 'idle', orderId: null, load: 0, position: packPoint(s), path: [], remaining: 0, total: 0 }); }
export function resizeOnlineStaff(s, amount) {
  const workers = s.online.workers;
  for (const w of workers.slice(amount)) {
    const o = s.online.orders.find(o => o.id === w.orderId);
    if (o && activeOnlineOrder(o)) {
      if (o.status === 'handover') o.status = 'ready';
      else { returnGoods(s, o); o.status = 'waiting'; allocate(s, o); }
    }
  }
  workers.length = Math.min(workers.length, amount);
  while (workers.length < amount) { const w = { id: workers.length }; idleWorker(w, s); workers.push(w); }
}
export function cancelOnlineOrder(s, id) {
  const o = s.online.orders.find(o => o.id === id);
  if (!o || !activeOnlineOrder(o) || o.status === 'dispatching') throw new Error('Cette commande ne peut plus être annulée.');
  returnGoods(s, o); o.status = 'cancelled'; o.finished = s.elapsed; s.online.daily.cancelled++;
  if (o.car) o.car = 'departing';
  for (const w of s.online.workers.filter(w => w.orderId === id)) idleWorker(w, s);
  return { id, status: o.status };
}
export function onlineInstallationBusy(s, channel) {
  return s.online.orders.some(o => o.channel === channel && (activeOnlineOrder(o) || o.car)) || (channel === 'web' && Boolean(s.online.carrier));
}
export function onlineWorkerPosition(w, fraction = 0) {
  if (!w.path?.length || !w.total) return [...w.position];
  const lengths = w.path.slice(1).map((p, i) => Math.hypot(p[0] - w.path[i][0], p[1] - w.path[i][1]));
  let distance = lengths.reduce((a,b) => a+b,0) * Math.max(0, Math.min(1, 1 - (w.remaining - fraction) / w.total));
  for (let i=0;i<lengths.length;i++) { if (distance <= lengths[i] && lengths[i]) { const t = distance / lengths[i]; return w.path[i].map((v,j) => v + (w.path[i+1][j] - v) * t); } distance -= lengths[i]; }
  return [...w.path.at(-1)];
}
function travel(w, destination, phase, s) {
  const start = onlineWorkerPosition(w); w.position = start;
  // Side aisle and central reserve doorway, without crossing the gondolas.
  const path = [start];
  if (start[1] < -4 || destination[1] < -4) {
    if (start[1] < -4) path.push([11.65,start[1]],[11.65,-3.65]);
    else path.push([-10.5,start[1]],[-10.5,-3.65],[0,-3.65]);
    if (destination[1] < -4) path.push([11.65,-3.65],[11.65,destination[1]]);
    else path.push([-10.5,-3.65],[-10.5,destination[1]]);
  } else path.push([-10.5,start[1]],[-10.5,destination[1]]);
  path.push(destination); w.path = path;
  w.total = w.remaining = Math.max(1, Math.ceil(path.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0)/3)); w.phase = phase;
}
function targetNext(s, w, o, hooks) {
  for (let i=0;i<o.lines.length;i++) for (const source of ['reserve','shelf']) {
    const l=o.lines[i]; if (l[source] <= l[`picked${source}`]) continue;
    w.line = i; w.source = source;
    const p=s.products[l.index];
    w.reserveRack = source === 'reserve' ? Math.max(0,Math.min(p.reserveRacks-1,Math.ceil(p.reserve / (500 + s.expansions.reserve*250))-1)) : null;
    const point = source === 'reserve' ? hooks.reservePoint(l.index,w.reserveRack) : hooks.shelfPoint(s,l.index);
    const destination = source === 'reserve' ? [point[0],point[1]+1.25] : [point[0],point[1]+point[2]*1.45];
    travel(w,destination,'travelling',s); return;
  }
  travel(w,packPoint(s),'returning',s);
}
function expense(s, amount) { s.money=round(s.money-amount); s.spending=round(s.spending+amount); s.vatDeductible=round(s.vatDeductible+amount/6); s.online.daily.expenses=round(s.online.daily.expenses+amount); }
function complete(s,o,hooks) {
  if (o.paid) return;
  if (o.channel==='web') expense(s,ONLINE_CHANNELS.web.transport);
  hooks.sale(s,{basket:o.lines.map(l=>({index:l.index,quantity:l.quantity})),value:o.value},o.channel);
  o.paid=true; o.status='completed'; o.finished=s.elapsed;
  s.online.daily.completed++; s.online.daily[o.channel]++; s.online.daily.sales=round(s.online.daily.sales+o.value);
  if (o.car) o.car='departing';
}
function random(online) { online.seed=(Math.imul(1664525,online.seed)+1013904223)>>>0; return online.seed/4294967296; }
export function updateOnline(s,hooks) {
  const online=s.online;
  for (const channel of Object.keys(ONLINE_CHANNELS)) if (online.enabled[channel] && s.minute>=480 && s.minute<1080) {
    online.credit[channel]+=(channel==='drive'?.012:.008)*hooks.demand(s);
    if (online.credit[channel]>=1 && online.orders.filter(activeOnlineOrder).length<40) {
      const count=2+Math.floor(random(online)*3), start=Math.floor(random(online)*s.products.length);
      createOnlineOrder(s,channel,Array.from({length:count},(_,i)=>({productId:s.products[(start+i)%s.products.length].id,quantity:2+Math.floor(random(online)*5)}))); online.credit[channel]--;
    }
  }
  for (const o of online.orders) {
    if (o.car==='departing' && s.elapsed-o.finished>=10) { o.car=null; o.slot=null; }
    if (!activeOnlineOrder(o)) continue;
    if (s.elapsed>o.due+(o.channel==='drive'?45:180) && o.status!=='dispatching') { cancelOnlineOrder(s,o.id); continue; }
    if (o.status==='waiting') allocate(s,o);
    if (o.channel==='drive' && !o.car && s.elapsed>=o.due-6) {
      const slot=[0,1].find(slot=>!online.orders.some(other=>other.car && other.slot===slot));
      if (slot!==undefined) { o.slot=slot; o.car='arriving'; o.carStarted=s.elapsed; }
    }
    if (o.car==='arriving' && s.elapsed-o.carStarted>=6) o.car='waiting';
  }
  for (const w of online.workers) {
    if (w.phase==='idle') {
      const ready=online.orders.find(o=>o.channel==='drive' && o.status==='ready' && o.car==='waiting');
      if (ready) { w.orderId=ready.id; w.load=onlineUnits(ready); ready.status='handover'; travel(w,[...drivePoint(s,ready.slot)].map((v,i)=>i?v-2.5:v),'toDrive',s); continue; }
      const o=online.orders.filter(o=>o.status==='queued').sort((a,b)=>a.due-b.due)[0];
      if (o) { w.orderId=o.id; o.status='picking'; targetNext(s,w,o,hooks); }
      continue;
    }
    const o=online.orders.find(o=>o.id===w.orderId);
    if ((!o || !activeOnlineOrder(o)) && w.phase !== 'backFromDrive') { idleWorker(w,s); continue; }
    if (w.phase==='picking') {
      const l=o.lines[w.line],p=s.products[l.index];
      if (p[w.source]<1) { cancelOnlineOrder(s,o.id); continue; }
      p[w.source]--; l[`picked${w.source}`]++; w.load++;
      if (l[w.source]===l[`picked${w.source}`]) targetNext(s,w,o,hooks);
      continue;
    }
    w.remaining--; if (w.remaining>0) continue;
    w.position=w.path.length?[...w.path.at(-1)]:w.position; w.path=[];
    if (w.phase==='travelling') w.phase='picking';
    else if (w.phase==='returning') { o.status='packing'; w.phase='packing'; w.total=w.remaining=4+Math.ceil(onlineUnits(o)/6); if (!o.packaged) { expense(s,ONLINE_CHANNELS[o.channel].packaging); o.packaged=true; } }
    else if (w.phase==='packing') { o.status='ready'; o.readyAt=s.elapsed; idleWorker(w,s); }
    else if (w.phase==='toDrive') { w.phase='handover'; w.total=w.remaining=3; }
    else if (w.phase==='handover') { complete(s,o,hooks); w.load=0; travel(w,packPoint(s),'backFromDrive',s); }
    else if (w.phase==='backFromDrive') idleWorker(w,s);
  }
  if (!online.carrier && s.elapsed>=online.nextCarrier && online.orders.some(o=>o.channel==='web' && o.status==='ready')) {
    const ids=online.orders.filter(o=>o.channel==='web' && o.status==='ready').slice(0,12).map(o=>o.id);
    for (const id of ids) online.orders.find(o=>o.id===id).status='dispatching';
    online.carrier={phase:'arriving',started:s.elapsed,ids,load:0};
  }
  const carrier=online.carrier;
  if (carrier) {
    const age=s.elapsed-carrier.started;
    if (age>=4 && carrier.phase==='arriving') {carrier.phase='loading';carrier.started=s.elapsed;}
    else if (age>=4 && carrier.phase==='loading') {
      for (const id of carrier.ids) { const o=online.orders.find(o=>o.id===id); complete(s,o,hooks); carrier.load+=Math.ceil(onlineUnits(o)/12); }
      carrier.phase='departing';carrier.started=s.elapsed;
    } else if (age>=6 && carrier.phase==='departing') {online.carrier=null;online.nextCarrier=s.elapsed+60;}
  }
  // Keep active orders and moving vehicles; retain the latest 30 closed orders.
  const archived=online.orders.filter(o=>!activeOnlineOrder(o) && !o.car);
  if (archived.length>30) {const remove=new Set(archived.slice(0,-30).map(o=>o.id));online.orders=online.orders.filter(o=>!remove.has(o.id));}
}
