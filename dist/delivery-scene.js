import * as THREE from 'three';
import { stockCarton } from './scene-details.js';
import { DELIVERY_BAYS, truckPose, OUTSIDE_PALLET_CAPACITY, outsidePalletPosition, outsidePallets } from './delivery-logistics.js';

export function createDeliveryYard(scene, state, box, material, plaque) {
  const group = new THREE.Group(); group.name = 'delivery-yard'; group.userData.selection = { view: 'fournisseurs' }; scene.add(group);
  const infrastructure = new THREE.Group(); group.add(infrastructure);
  box(infrastructure, 14, .12, 13.5, 5, -.16, -14.6, 0x79847a);
  const outsideArea = new THREE.Group(); outsideArea.name = 'outside-pallet-area'; infrastructure.add(outsideArea);
  box(outsideArea, 9.2, .07, 11.4, -7.5, -.075, -15.2, 0x87917c);
  for (let slot = 0; slot < OUTSIDE_PALLET_CAPACITY; slot++) {
    const [x, z] = outsidePalletPosition({ expansions: { reserve: 0 } }, { outsideSlot: slot });
    for (const side of [-1, 1]) box(outsideArea, .035, .015, 1.15, x + side * .65, -.025, z, 0xe4c566, false);
    box(outsideArea, 1.33, .015, .035, x, -.025, z - .59, 0xe4c566, false);
  }
  // Separate staff access keeps the buffer reachable when all three trucks are docked.
  for (const x of [-.65, .65]) box(infrastructure, .1, 2.1, .15, x, 1.05, -7.9, 0x708d77);
  box(infrastructure, 1.4, .12, .15, 0, 2.08, -7.9, 0x708d77);
  box(infrastructure, 1.3, .06, 1.7, 0, .12, -7.7, 0x9da89b);
  const bays = DELIVERY_BAYS.map((x, index) => {
    const bay = new THREE.Group(); bay.name = `loading-bay-${index}`; bay.position.x = x; infrastructure.add(bay);
    box(bay, 2.9, .22, 1.7, 0, .08, -8.25, 0x9da89b);
    box(bay, 2.15, .09, .9, 0, .24, -7.95, 0x586a60);
    for (const side of [-1, 1]) {
      box(bay, .27, 3.2, .3, side * 1.38, 1.6, -7.9, 0x708d77);
      box(bay, .18, 1, .25, side * 1.24, .72, -8.06, 0x273b31);
      box(bay, .08, .025, 9, side * 1.33, -.075, -13.1, 0xf2cc62, false);
      for (let z = -9.4; z > -17.8; z -= 1.3) box(bay, .08, .025, .65, side * .92, -.075, z, 0xe5e7cd, false);
    }
    box(bay, 3, .26, .3, 0, 3.18, -7.9, 0x4f6b59);
    const door = box(bay, 2.43, 2.85, .11, 0, 1.45, -7.93, 0x97aa99);
    const light = box(bay, .16, .16, .12, 1.62, 2.5, -8.03, 0xb9e68d, false);
    const sign = plaque(`QUAI 0${index + 1}`, 1.9); sign.position.set(0, 3.42, -8.1); sign.rotation.y = Math.PI; bay.add(sign);
    return { bay, door, light };
  });
  // Mark the safe circulation strip inside the warehouse.
  for (let x = .4; x <= 10.5; x += .65) box(infrastructure, .38, .015, .13, x, .15, -6.4, 0xd8b74f, false);
  const trucks = new Map(), outsideModels = new Map();
  function makeTruck(shipment) {
    const truck = new THREE.Group(); truck.name = `truck-${shipment.id}`;
    truck.userData.shipmentId = shipment.id; truck.userData.selection = { view: 'fournisseurs' }; group.add(truck);
    box(truck, 2.5, .18, 6.5, 0, .39, 0, 0x586d60);
    box(truck, 2.5, 2.35, .1, 0, 1.62, -3.25, 0xf0f0e4);
    box(truck, .1, 2.35, 6.5, -1.25, 1.62, 0, 0xe8ede2);
    // Cutaway side and roof keep the actual pallets visible to the director.
    box(truck, .1, 1.2, 6.5, 1.25, 1.05, 0, 0xe8ede2);
    box(truck, 2.25, 1.9, 1.65, 0, 1.15, -4.25, shipment.mode === 'grouped' ? 0x497b5b : 0x8c9d46);
    box(truck, 1.94, .65, .05, 0, 1.7, -5.11, 0x9bbaba);
    box(truck, 1.95, .22, .07, 0, .55, -5.13, 0x4e6255);
    for (const x of [-.85, .85]) box(truck, .28, .16, .07, x, .83, -5.16, 0xf4e6b4, false);
    for (const x of [-1.3, 1.3]) for (const z of [-4.2, -.8, 1.6]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, .17, 12), material(0x2c3c32));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(x, .32, z); truck.add(wheel);
    }
    const rearDoors = [-1, 1].map(side => {
      const hinge = new THREE.Group(); hinge.position.set(side * 1.22, 0, 3.28); truck.add(hinge);
      box(hinge, 1.17, 2.35, .09, -side * .6, 1.62, 0, 0xc9d7cb);
      box(hinge, .055, 1.8, .04, -side * .45, 1.62, .07, 0x627e6b);
      return hinge;
    });
    const reversingLights = [-1, 1].map(side => box(truck, .23, .12, .07, side * .95, .62, 3.3, 0x4c5d50, false));
    const pallets = shipment.pallets.map(ref => {
      const order = state.orders.find(o => o.id === ref.orderId), pallet = order.pallets[ref.palletIndex];
      const model = new THREE.Group(); model.name = `pallet-${order.id}-${pallet.index}`;
      model.position.set(pallet.truckIndex % 2 ? .58 : -.58, 0, 2.55 - Math.floor(pallet.truckIndex / 2) * 1.15);
      box(model, 1.04, .13, .95, 0, .53, 0, 0xac8f60);
      const cargo = [];
      for (let i = 0; i < 4; i++) cargo.push(stockCarton(model, box, i % 2 ? .25 : -.25, .8, i < 2 ? -.21 : .21, state.products.find(p => p.id === order.productId).color));
      truck.add(model); return { model, cargo, ref };
    });
    return { truck, pallets, rearDoors, reversingLights };
  }
  function update(minuteFraction = 0) {
    infrastructure.position.z = -state.expansions.reserve * 3;
    bays.forEach(({ door, light }, index) => {
      const truck = state.shipments.find(t => t.bay === index && t.phase !== 'complete');
      const open = truck && ['docked', 'departing'].includes(truck.phase);
      door.scale.y = open ? .05 : 1; door.position.y = open ? 2.95 : 1.45;
      light.material = material(truck ? 0xe99a52 : 0xb9e68d);
    });
    const visible = state.shipments.filter(t => t.phase !== 'complete' && (t.phase !== 'enroute' || t.eta - state.elapsed <= 18));
    const ids = new Set(visible.map(t => t.id));
    for (const [id, value] of trucks) if (!ids.has(id)) {
      group.remove(value.truck); value.truck.traverse(o => o.geometry?.dispose()); trucks.delete(id);
    }
    for (const shipment of visible) {
      let value = trucks.get(shipment.id); if (!value) { value = makeTruck(shipment); trucks.set(shipment.id, value); }
      const pose = truckPose(state, shipment, minuteFraction);
      value.truck.position.set(pose.x, 0, pose.z); value.truck.rotation.y = pose.rotation;
      const open = ['docked', 'departing'].includes(shipment.phase);
      value.rearDoors.forEach((hinge, i) => { hinge.rotation.y = open ? (i === 0 ? -1 : 1) * Math.PI / 2 : 0; });
      value.reversingLights.forEach(light => { light.material = material(shipment.phase === 'reversing' ? 0xfff8d1 : 0x9c4c3b); });
      value.pallets.forEach(({ model, cargo, ref }) => {
        const pallet = state.orders.find(o => o.id === ref.orderId).pallets[ref.palletIndex];
        model.visible = ['dock', 'reserved'].includes(pallet.status) && !pallet.outsideOrigin;
        cargo.forEach((crate, i) => { crate.visible = i < Math.ceil(pallet.remaining / 12); });
      });
    }
    const outside = outsidePallets(state), outsideIds = new Set(outside.map(({ order, pallet }) => `${order.id}-${pallet.index}`));
    for (const [id, value] of outsideModels) if (!outsideIds.has(id)) {
      group.remove(value.model); value.model.traverse(object => object.geometry?.dispose()); outsideModels.delete(id);
    }
    for (const { order, pallet } of outside) {
      const id = `${order.id}-${pallet.index}`;
      let value = outsideModels.get(id);
      if (!value) {
        const model = new THREE.Group(); model.name = `outside-pallet-${id}`;
        model.userData.selection = { view: 'reserve', productId: order.productId }; group.add(model);
        box(model, 1.1, .13, .95, 0, .08, 0, 0xac8f60);
        const cargo = [], product = state.products.find(p => p.id === order.productId);
        for (let i = 0; i < 4; i++) cargo.push(stockCarton(model, box, i % 2 ? .25 : -.25, .35, i < 2 ? -.21 : .21, product.color));
        value = { model, cargo }; outsideModels.set(id, value);
      }
      const [x, z] = outsidePalletPosition(state, pallet); value.model.position.set(x, 0, z);
      value.cargo.forEach((crate, index) => { crate.visible = index < Math.ceil(pallet.remaining / 12); });
    }

  }
  return { group, update };
}
