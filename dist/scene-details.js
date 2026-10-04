import * as THREE from 'three';
import { storeFrontExtension } from './engine.js';

export const CARTON_SIZE = { width: .45, height: .43, depth: .38 };
export function stockCarton(parent, box, x, y, z, color) {
  const carton = box(parent, CARTON_SIZE.width, CARTON_SIZE.height, CARTON_SIZE.depth, x, y, z, color);
  carton.userData.unitsPerCarton = 12; carton.name = 'stock-carton'; return carton;
}

export function productUnit(product, index, box, material) {
  const group = new THREE.Group(); group.name = `article-${index}`;
  if (product.id === 'produce') {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.105, 7, 5), material(index % 3 ? 0x8bb653 : 0xe39847));
    fruit.position.y = 0.11; group.add(fruit);
  } else if (product.id === 'drinks' || product.id === 'home') {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 0.23, 7), material(product.color));
    bottle.position.y = 0.12; group.add(bottle);
    box(group, 0.07, 0.07, 0.07, 0, 0.26, 0, 0xf2eee0, false);
    box(group, 0.16, 0.07, 0.01, 0, 0.13, 0.08, 0xe9eadb, false);
  } else if (product.id === 'bakery') {
    const loaf = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.17, 2, 6), material(0xd4a05c));
    loaf.rotation.x = Math.PI / 2; loaf.position.y = 0.08; group.add(loaf);
  } else {
    box(group, 0.18, 0.26, 0.19, 0, 0.13, 0, product.color, false);
    box(group, 0.14, 0.08, 0.012, 0, 0.13, 0.102, 0xf2efe5, false);
    if (product.id === 'dairy') box(group, 0.13, 0.035, 0.15, 0, 0.28, 0, 0xe0f1f1, false);
  }
  return group;
}

// Batch the dense stock while retaining one instance for each real article.
export function shelfStock(product, maximum, unitsPerLevel, parent, box, material, layout = 'shelf') {
  const variants = product.id === 'produce' ? 3 : 1, batches = [];
  const group = new THREE.Group(); group.name = `shelf-stock-${product.id}`; parent.add(group);
  for (let variant = 0; variant < variants; variant++) {
    const template = productUnit(product, variant, box, material);
    template.children.forEach((part, component) => {
      part.updateMatrix();
      const capacity = Math.ceil((maximum - variant) / variants);
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, capacity);
      mesh.name = `stock-${product.id}-${variant}-${component}`;
      mesh.castShadow = part.castShadow; mesh.receiveShadow = true;
      group.add(mesh); batches.push({ mesh, variant, capacity, partMatrix: part.matrix.clone() });
    });
  }
  let currentLevels = 0;
  return { update(count, levels) {
    if (levels !== currentLevels) {
      const position = new THREE.Matrix4(), matrix = new THREE.Matrix4(), itemScale = new THREE.Matrix4().makeScale(.85, .85, .85);
      for (const batch of batches) {
        for (let n = 0; n < batch.capacity; n++) {
          const index = batch.variant + n * variants, slot = Math.floor(index / levels);
          if (layout === 'stall') position.makeTranslation(-2.4 + (index % 30) * .165, 1.02 + Math.floor(index / 180) * .17, .65 - Math.floor((index % 180) / 30) * .26);
          else position.makeTranslation(-2.415 + (slot % 24) * .21, .48 + (index % levels) * .38, .55 - Math.floor(slot / 24) * .275);
          position.multiply(itemScale); batch.mesh.setMatrixAt(n, matrix.multiplyMatrices(position, batch.partMatrix));
        }
        batch.mesh.instanceMatrix.needsUpdate = true; batch.mesh.computeBoundingBox(); batch.mesh.computeBoundingSphere();
      }
      currentLevels = levels;
    }
    const visibleCount = Math.min(count, levels * unitsPerLevel);
    for (const batch of batches) batch.mesh.count = Math.max(0, Math.min(batch.capacity, Math.ceil((visibleCount - batch.variant) / variants)));
  } };

}

export function staffOutfit(role, box, material) {
  const group = new THREE.Group(); group.name = `uniform-${role}`;
  if (role === 'checkout') {
    box(group, 0.29, 0.45, 0.03, 0, 0.62, 0.19, 0x87ba78);
    box(group, 0.31, 0.05, 0.035, 0, 0.85, 0.19, 0xe4e8cd);
    box(group, 0.06, 0.19, 0.08, -0.17, 1.15, 0, 0x213d2e);
  } else if (role === 'shelves') {
    box(group, 0.29, 0.25, 0.03, 0, 0.71, 0.19, 0x71a96b);
    for (const x of [-0.07, 0.07]) box(group, 0.08, 0.1, 0.035, x, 0.65, 0.2, 0x325d3f);
    box(group, 0.34, 0.06, 0.26, 0, 1.27, 0.07, 0x3d794f);
  } else if (role === 'receiving') {
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), material(0x9fca79));
    helmet.position.y = 1.17; group.add(helmet);
    box(group, 0.41, 0.04, 0.36, 0, 1.17, 0.03, 0x9fca79);
    box(group, 0.32, 0.4, 0.035, 0, 0.68, 0.19, 0x6c9c57);
    for (const x of [-0.1, 0.1]) box(group, 0.035, 0.34, 0.015, x, 0.68, 0.214, 0xe4efba);
    box(group, 0.29, 0.04, 0.02, 0, 0.56, 0.214, 0xe4efba);
  }
  return group;
}

export function createSurroundings(scene, box, material, textSprite) {
  const exterior = new THREE.Group(); scene.add(exterior);
  box(exterior, 100, 0.12, 100, 0, -0.48, 0, 0x95a780, false);
  const parking = new THREE.Group(); exterior.add(parking);
  box(parking, 27, 0.07, 14, 0, -0.17, 16, 0x788278);
  box(parking, 26, 0.1, 2.1, 0, -0.05, 9.7, 0xd0d1b9);
  box(parking, 64, 0.08, 5.2, 0, -0.25, 26, 0x657167);
  box(parking, 64, 0.12, 1.5, 0, -0.15, 29.4, 0xc4c9b4);
  for (let x = -30; x <= 30; x += 4) if (Math.abs(x + 22) > 3 && Math.abs(x - 25) > 3) box(parking, 2.1, 0.02, 0.08, x, -0.19, 26, 0xe1dfbe, false);
  // A visible driveway joins the parking aisle to the public street.
  const driveway = box(parking, 4.6, 0.075, 10, 15.2, -0.17, 21, 0x788278);
  for (const x of [-12.8, 12.8]) box(parking, 0.14, 0.12, 12, x, -0.05, 16, 0xc4c9b4);
  for (let x = 13.9; x < 17; x += 0.55) box(parking, 0.3, 0.025, 1.6, x, -0.1, 10, 0xe5e3c9, false);
  const places = [];
  for (let row = 0; row < 2; row++) for (let col = 0; col < 8; col++) {
    const x = -10.5 + col * 3, z = 12.8 + row * 7;
    places.push([x, z]);
    box(parking, 0.07, 0.02, 4, x - 1.4, -0.115, z, 0xe8e5cc, false);
    box(parking, 2.8, 0.02, 0.07, x, -0.11, z + (row ? 2 : -2), 0xe8e5cc, false);
  }
  for (let z = 10.5; z < 26; z += 0.75) box(parking, 1.7, 0.025, 0.32, 9.5, -0.1, z, 0xe5e3c9, false);
  const parkingSign = textSprite('PARKING CLIENTS', { background: '#233d31ef', color: '#f2eed7', worldWidth: 4.1 });
  parkingSign.position.set(-9, 0.75, 9.6); parking.add(parkingSign);
  const access = new THREE.Group(); exterior.add(access);
  const serviceRoad = box(access, 4.3, 0.1, 52, 16, -0.2, 1, 0x68766a);
  box(access, 35, 0.1, 4.5, 0, -0.17, -11.1, 0x7b8673);
  for (let z = -13; z < 24; z += 4) box(access, 0.08, 0.02, 2.1, 16, -0.13, z, 0xe0dfc6, false);
  const accessSign = textSprite('ACCÈS LIVRAISONS', { background: '#233d31ef', color: '#f2eed7', worldWidth: 4 });
  accessSign.position.set(13.7, 0.8, -9.5); access.add(accessSign);
  const neighborhood = new THREE.Group(); exterior.add(neighborhood);
  const backStreet = box(neighborhood, 64, 0.08, 5.2, 0, -0.25, -23, 0x657167);
  const sideStreets = [-22, 25].map(x => box(neighborhood, 5.2, 0.08, 49, x, -0.25, 1.5, 0x657167));
  const sideWalks = [-18.6, 21.6].map(x => box(neighborhood, 1.4, 0.13, 49, x, -0.15, 1.5, 0xc4c9b4));
  for (const x of [-22, 25]) for (let z = -19; z < 23; z += 4) box(neighborhood, 0.08, 0.02, 2, x, -0.19, z, 0xe1dfbe, false);
  const backMarkings = new THREE.Group(); neighborhood.add(backMarkings);
  for (let x = -29; x < 30; x += 4) box(backMarkings, 2, 0.02, 0.08, x, -0.19, -23, 0xe1dfbe, false);
  const buildings = new THREE.Group(); neighborhood.add(buildings);
  function building(x, z, width, depth, height, color, name) {
    const group = new THREE.Group(); group.position.set(x, -0.2, z); buildings.add(group);
    box(group, width + 1, 0.2, depth + 1, 0, 0, 0, 0xc4c9b4);
    box(group, width, height, depth, 0, height / 2, 0, color);
    box(group, width + 0.3, 0.25, depth + 0.3, 0, height + 0.1, 0, 0x657668);
    for (let wx = -width / 2 + 1; wx < width / 2; wx += 1.6) {
      box(group, 0.9, 1, 0.045, wx, 1.6, depth / 2 + 0.03, 0x8faea6);
      if (height > 3.5) box(group, 0.9, 0.9, 0.045, wx, 3.3, depth / 2 + 0.03, 0x8faea6);
    }
    box(group, 0.85, 1.8, 0.07, 0, 0.9, depth / 2 + 0.05, 0x45695e);
    if (name) {
      const sign = textSprite(name, { background: '#203a32f2', color: '#eef2e3', worldWidth: width - 1 });
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(width - 1, 0.6), new THREE.MeshBasicMaterial({ map: sign.material.map, transparent: true }));
      sign.material.dispose(); plate.position.set(0, 2.7, depth / 2 + 0.06); group.add(plate);
    }
  }
  building(-12, -30, 8, 6, 3.4, 0xd5c7a4, 'BOULANGERIE');
  building(0, -30, 8, 6, 4.6, 0xc4cebd, 'QUARTIER DU MARCHÉ');
  building(12, -30, 8, 6, 3.4, 0xb7c9b0, 'PHARMACIE');
  for (let z = 22.7; z < 29; z += 0.7) box(parking, 1.9, 0.025, 0.32, -18, -0.18, z, 0xe5e3c9, false);
  function tree(x, z, scale = 1) {
    const group = new THREE.Group(); group.position.set(x, -0.2, z); group.scale.setScalar(scale);
    box(group, 0.32, 2, 0.32, 0, 0.85, 0, 0x89765a);
    for (const [radius, y, color] of [[0.95, 2.4, 0x657e43], [0.7, 3.15, 0x7e954e]]) {
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 0), material(color)); crown.position.y = y; crown.castShadow = true; group.add(crown);
    }
    exterior.add(group);
  }
  for (let x = -23; x <= 22; x += 5.5) { tree(x, -35, 0.9); tree(x, 33, 1.15); }
  for (let z = -10; z < 26; z += 7) tree(-18.5, z);
  for (const [x, z] of [[-13, 12], [13, 12], [-13, 22], [13, 22]]) {
    box(parking, 0.1, 3.4, 0.1, x, 1.5, z, 0x526b53);
    box(parking, 0.65, 0.09, 0.3, x + 0.23, 3.2, z, 0xdddfc3);
  }
  const cars = new Map(); let extension = 0, drivewayX = 16;
  function car(color) {
    const group = new THREE.Group();
    box(group, 1.35, 0.48, 2.45, 0, 0.42, 0, color);
    box(group, 1.16, 0.4, 1.25, 0, 0.83, 0.05, color);
    box(group, 1.18, 0.29, 0.04, 0, 0.83, 0.69, 0xa3bec0);
    box(group, 1.18, 0.29, 0.04, 0, 0.83, -0.59, 0xa3bec0);
    for (const x of [-0.7, 0.7]) for (const z of [-0.75, 0.75]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 8), material(0x344636)); wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.23, z); group.add(wheel);
    }
    parking.add(group); return group;
  }
  return {
    register(customer) {
      if (customer.id % 3 !== 0) return [9.5, 10 + extension];
      const used = new Set([...cars.values()].map(c => c.slot)), slot = places.findIndex((_, i) => !used.has(i));
      if (slot < 0) return [9.5, 10 + extension];
      const group = car([0x638d84, 0xbab196, 0xa3b17d, 0x829db1][customer.id % 4]);
      group.position.set(drivewayX + 5, 0, 26);
      const [x, z] = places[slot];
      cars.set(customer.id, { group, slot, departing: false, parked: false, route: [[drivewayX, 26], [drivewayX, 16.5], [x, 16.5], [x, z]] });
      return [places[slot][0] + 0.8, places[slot][1] + extension];
    },
    release(id) {
      const value = cars.get(id); if (value) {
        value.departing = true;
        value.route = [[value.group.position.x, 16.5], [drivewayX, 16.5], [drivewayX, 26], [drivewayX + 5, 26]];
      }
    },
    update(seconds, running, expansions) {
      extension = storeFrontExtension(expansions); parking.position.z = extension; access.position.z = -expansions.reserve * 3; access.position.x = Math.max(.8, expansions.checkout);
      drivewayX = 16 + access.position.x;
      driveway.scale.x = (4.6 + access.position.x) / 4.6; driveway.position.x = 15.2 + access.position.x / 2;
      const back = expansions.reserve * 3, streetLength = 49 + extension + back;
      serviceRoad.scale.z = (52 + extension + back) / 52; serviceRoad.position.z = 1 + (extension + back) / 2;
      backStreet.position.z = -23 - back;
      backMarkings.position.z = -back;
      sideStreets.forEach(road => { road.scale.z = streetLength / 49; road.position.z = 1.5 + (extension - back) / 2; });
      sideWalks.forEach(walk => { walk.scale.z = streetLength / 49; walk.position.z = 1.5 + (extension - back) / 2; });
      buildings.position.z = -back;
      for (const [id, value] of cars) {
        if (!value.route.length) {
          if (value.departing) { parking.remove(value.group); value.group.traverse(o => o.geometry?.dispose()); cars.delete(id); }
          else { value.parked = true; value.group.rotation.y = 0; }
          continue;
        }
        const [x, z] = value.route[0], position = value.group.position;
        const dx = x - position.x, dz = z - position.z, distance = Math.hypot(dx, dz), step = seconds * running * 9;
        if (distance > 0.05 && step > 0) {
          position.x += dx / distance * Math.min(distance, step); position.z += dz / distance * Math.min(distance, step);
          value.group.rotation.y = Math.atan2(dx, dz);
        } else if (distance <= 0.05) value.route.shift();
      }
    },
  };
}
