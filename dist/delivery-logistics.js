// Truck movements and pallet coordinates share the simulation clock.
export const DELIVERY_BAYS = [2.2, 5.6, 9, 12.4, 15.8];
export const deliveryBayCount = state => state.infrastructure?.bays ?? 3;
export const outsideCapacity = state => state.infrastructure?.outside ?? OUTSIDE_PALLET_CAPACITY;
export const PALLETS_PER_TRUCK = 10;
export const OUTSIDE_PALLET_CAPACITY = 30;
export function outsidePalletPosition(state, pallet) {
  return [-10.9 + (pallet.outsideSlot % 5) * 1.7, -10.9 - Math.floor(pallet.outsideSlot / 5) * 1.75 - state.expansions.reserve * 3];
}
export function outsidePallets(state) {
  return state.orders.flatMap(order => order.pallets.filter(p => p.status === 'outside' || (p.status === 'reserved' && p.outsideOrigin)).map(pallet => ({ order, pallet })));
}
export function outsideSlotsUsed(state) {
  return state.orders.reduce((sum, order) => sum + order.pallets.filter(p => p.outsideSlot !== null && p.outsideSlot !== undefined).length, 0);
}
export function freeOutsideSlot(state) {
  const used = new Set(state.orders.flatMap(o => o.pallets.map(p => p.outsideSlot).filter(slot => slot !== null && slot !== undefined)));
  for (let i = 0; i < outsideCapacity(state); i++) if (!used.has(i)) return i;
  return null;
}
const clamp = n => Math.max(0, Math.min(1, n));
const lerp = (a, b, t) => a + (b - a) * t;
export function truckPose(state, shipment, minuteFraction = 0) {
  const back = state.expansions.reserve * 3, wide = Math.max(state.expansions.shelves * 2, state.expansions.checkout) + Math.max(0, deliveryBayCount(state) - 3) * 3.4;
  const x = DELIVERY_BAYS[shipment.bay ?? 0], z = -11.15 - back;
  const time = state.elapsed + minuteFraction;
  if (shipment.phase === 'enroute') return { x: 16 + wide, z: -19 - back - Math.max(0, shipment.eta - time - 8) * 1.8, rotation: 0 };
  if (shipment.phase === 'waiting') {
    const index = state.shipments.filter(s => s.phase === 'waiting').indexOf(shipment);
    return { x: 16 + wide, z: -19 - back - Math.max(0, index) * 9, rotation: 0 };
  }
  if (shipment.phase === 'positioning') {
    const t = clamp((time - shipment.phaseStarted) / 3);
    return { x: lerp(16 + wide, x, t), z: -18.8 - back, rotation: Math.sin(t * Math.PI) * Math.PI / 2 };
  }
  if (shipment.phase === 'reversing') {
    const t = clamp((time - shipment.phaseStarted) / 4);
    return { x, z: lerp(-18.8 - back, z, t), rotation: 0 };
  }
  if (shipment.phase === 'departing') {
    const t = clamp((time - shipment.phaseStarted) / 8);
    return t < .55 ? { x, z: lerp(z, -19 - back, t / .55), rotation: 0 } : { x: lerp(x, 16 + wide, (t - .55) / .45), z: -19 - back, rotation: -(t - .55) / .45 * Math.PI / 2 };
  }
  return { x, z, rotation: 0 };
}
export function palletPosition(state, shipment, pallet) {
  const pose = truckPose(state, shipment);
  return [pose.x + (pallet.truckIndex % 2 ? .58 : -.58), pose.z + 2.55 - Math.floor(pallet.truckIndex / 2) * 1.15];
}
export function updateShipments(state) {
  for (const shipment of state.shipments) {
    if (shipment.phase === 'enroute' && shipment.eta <= state.elapsed) { shipment.phase = 'waiting'; shipment.phaseStarted = state.elapsed; }
    if (shipment.phase === 'positioning' && state.elapsed - shipment.phaseStarted >= 3) { shipment.phase = 'reversing'; shipment.phaseStarted = state.elapsed; }
    if (shipment.phase === 'reversing' && state.elapsed - shipment.phaseStarted >= 4) {
      shipment.phase = 'docked'; shipment.phaseStarted = state.elapsed;
      for (const ref of shipment.pallets) { const order = state.orders.find(o => o.id === ref.orderId); if (order.status !== 'received') order.status = 'unloading'; }
    }
    if (shipment.phase === 'departing' && state.elapsed - shipment.phaseStarted >= 8) { shipment.phase = 'complete'; shipment.bay = null; }
  }
  const occupied = new Set(state.shipments.filter(s => ['positioning', 'reversing', 'docked', 'departing'].includes(s.phase)).map(s => s.bay));
  for (const shipment of state.shipments.filter(s => s.phase === 'waiting').sort((a, b) => a.eta - b.eta || a.id - b.id)) {
    const bay = DELIVERY_BAYS.slice(0, deliveryBayCount(state)).findIndex((_, index) => !occupied.has(index));
    if (bay < 0) break;
    shipment.bay = bay; shipment.phase = 'positioning'; shipment.phaseStarted = state.elapsed; occupied.add(bay);
  }
}
export function finishShipments(state) {
  for (const shipment of state.shipments) {
    if (shipment.phase !== 'docked') continue;
    const unloaded = shipment.pallets.every(ref => {
      const pallet = state.orders.find(o => o.id === ref.orderId).pallets[ref.palletIndex];
      return ['stored', 'outside'].includes(pallet.status) || pallet.outsideOrigin;
    });
    const hasWorker = state.receivers.some(w => w.phase !== 'idle' && !w.fromOutside && state.orders.find(o => o.id === w.orderId)?.pallets[w.palletIndex]?.shipmentId === shipment.id);
    if (unloaded && !hasWorker) { shipment.phase = 'departing'; shipment.phaseStarted = state.elapsed; }
  }
}
