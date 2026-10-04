import { reserveBackExtension, RESERVE_BACK_EXTENSION } from './store-layout.js';
import * as THREE from 'three';
import { stockCarton } from './scene-details.js';
import { deliveryVehicle, palletLocalPosition, DELIVERY_BAYS, truckPose, OUTSIDE_PALLET_CAPACITY, outsidePalletPosition, outsidePallets, outsideCapacity, deliveryBayCount } from './delivery-logistics.js';

export function createDeliveryYard(scene, state, box, material, plaque) {
  const group = new THREE.Group(); group.name = 'delivery-yard'; group.userData.selection = { view: 'fournisseurs' }; scene.add(group);
  const infrastructure = new THREE.Group(); group.add(infrastructure);
  const yardFloor = box(infrastructure, 14, .12, 13.5, 5, -.16, -14.6, 0x79847a);
  const annex = box(infrastructure, 6.8, .1, 3.6, 14.8, .07, -5.9, 0xc7d5c1);
  const outsideArea = new THREE.Group(); outsideArea.name = 'outside-pallet-area'; infrastructure.add(outsideArea);
  const outsideFloor = box(outsideArea, 9.2, .07, 11.4, -7.5, -.075, -15.2, 0x87917c);
  const outsideMarks = [];
  for (let slot = 0; slot < 60; slot++) {
    const marks = new THREE.Group(); marks.name = `outside-slot-${slot}`; outsideArea.add(marks); outsideMarks.push(marks);
    const [x, z] = outsidePalletPosition({ expansions: { reserve: 0 } }, { outsideSlot: slot });
    for (const side of [-1, 1]) box(marks, .035, .015, 1.15, x + side * .65, -.025, z + RESERVE_BACK_EXTENSION, 0xe4c566, false);
    box(marks, 1.33, .015, .035, x, -.025, z + RESERVE_BACK_EXTENSION - .59, 0xe4c566, false);
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
    return { bay, door, light };
  });
  // Mark the safe circulation strip inside the warehouse.
  for (let x = .4; x <= 10.5; x += .65) box(infrastructure, .38, .015, .13, x, .15, -6.4, 0xd8b74f, false);
  const trucks = new Map(), outsideModels = new Map();
  function makeTruck(shipment) {
    const truck = new THREE.Group(); truck.name = `truck-${shipment.id}`;
    truck.userData.shipmentId = shipment.id; truck.userData.selection = { view: 'fournisseurs' }; group.add(truck);
    const v=deliveryVehicle(shipment),van=shipment.vehicleKind==='van',half=v.width/2,rear=v.length/2+.03,centerY=v.floor+v.height/2,cabZ=-v.length/2-v.cabLength/2-.18;
    box(truck, v.width, .18, v.length, 0, v.floor-.14, 0, 0x586d60);
    box(truck, v.width, v.height, .1, 0, centerY, -v.length/2, 0xf0f0e4);
    box(truck, .1, v.height, v.length, -half, centerY, 0, 0xe8ede2);
    // Cutaway side and roof keep the actual pallets visible to the director.
    box(truck, .1, v.height*.5, v.length, half, v.floor+v.height*.25, 0, 0xe8ede2);
    const cabColor=shipment.vehicleKind==='heavy'||!shipment.vehicleKind?0x497b5b:van?0x608fa3:0xd3a64d;
    box(truck, v.width*.9, van?1.5:1.9, v.cabLength, 0, van?1.05:1.15, cabZ, cabColor);
    box(truck, v.width*.78, .65, .05, 0, van?1.48:1.7, cabZ-v.cabLength/2-.04, 0x9bbaba);
    box(truck, v.width*.78, .22, .07, 0, .55, cabZ-v.cabLength/2-.06, 0x4e6255);
    if(van)box(truck,v.width*.86,.35,.4,0,.72,cabZ-v.cabLength/2-.12,cabColor);
    for (const x of [-v.width*.34,v.width*.34])box(truck,.23,.16,.07,x,.83,cabZ-v.cabLength/2-.1,0xf4e6b4,false);
    const axles=shipment.vehicleKind==='heavy'||!shipment.vehicleKind?[cabZ,-.8,1.6]:[cabZ,v.length/2-.65];
    for (const x of [-half-.05,half+.05]) for (const z of axles) {
      const radius=van?.29:.38,wheel=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,.17,12),material(0x2c3c32));
      wheel.rotation.z=Math.PI/2;wheel.position.set(x,radius,z);truck.add(wheel);
    }
    const rearDoors = [-1, 1].map(side => {
      const hinge = new THREE.Group(); hinge.position.set(side*(half-.03),0,rear);truck.add(hinge);
      box(hinge,half-.08,v.height,.09,-side*(half-.08)/2,centerY,0,0xc9d7cb);
      box(hinge,.055,v.height*.75,.04,-side*.4,centerY,.07,0x627e6b);
      return hinge;
    });
    const reversingLights=[-1,1].map(side=>box(truck,.23,.12,.07,side*v.width*.38,.62,rear+.02,0x4c5d50,false));
    const pallets = shipment.pallets.map(ref => {
      const order = state.orders.find(o => o.id === ref.orderId), pallet = order.pallets[ref.palletIndex];
      const model = new THREE.Group(); model.name = `pallet-${order.id}-${pallet.index}`;
      const [px,pz]=palletLocalPosition(shipment,pallet);model.position.set(px,0,pz);
      box(model, 1.04, .13, .95, 0, v.floor, 0, 0xac8f60);
      const cargo = [];
      for(let i=0;i<20;i++){const carton=stockCarton(model,box,i%2?.25:-.25,v.floor+.27+Math.floor(i/4)*(van?.29:.43),i%4<2?-.21:.21,state.products.find(p=>p.id===order.productId).color);if(van)carton.scale.y=.65;cargo.push(carton);}
      truck.add(model); return { model, cargo, ref };
    });
    return { truck, pallets, rearDoors, reversingLights };
  }
  function update(minuteFraction = 0) {
    infrastructure.position.z = -(reserveBackExtension(state));
    const extraWidth = Math.max(0, deliveryBayCount(state) - 3) * 3.4;
    yardFloor.scale.x = (14 + extraWidth) / 14; yardFloor.position.x = 5 + extraWidth / 2;
    annex.visible = extraWidth > 0; annex.scale.x = extraWidth / 6.8; annex.position.x = 11.4 + extraWidth / 2;
    const capacity = outsideCapacity(state), depth = Math.max(1, Math.ceil(capacity / 5)) * 1.75 + .9;
    outsideArea.visible = capacity > 0; outsideFloor.scale.z = depth / 11.4; outsideFloor.position.z = -10.1 - depth / 2;
    outsideMarks.forEach((marks, index) => { marks.visible = index < capacity; });
    bays.forEach(({ bay, door, light }, index) => {
      bay.visible = index < deliveryBayCount(state);
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
        for (let i = 0; i < 20; i++) cargo.push(stockCarton(model, box, i % 2 ? .25 : -.25, .35 + Math.floor(i/4)*.43, i % 4 < 2 ? -.21 : .21, product.color));
        value = { model, cargo }; outsideModels.set(id, value);
      }
      const [x, z] = outsidePalletPosition(state, pallet); value.model.position.set(x, 0, z);
      value.cargo.forEach((crate, index) => { crate.visible = index < Math.ceil(pallet.remaining / 12); });
    }

  }
  return { group, update };
}
