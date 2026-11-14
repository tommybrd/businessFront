// Fixed decor (fences, walls, roads, trees, lamp posts…) is hundreds of small boxes that never move. Drawn one by one they cost one
// draw call each; merged by material they cost a handful. `bakeGroup(group)` merges every plain mesh under `group` into one mesh per
// material (and per shadow setting), keeping its world position. Meshes that must stay alone (animated, textured, transparent, instanced)
// are left where they are: mark one with `mesh.userData.keep = true` to be sure. Returns how many meshes were replaced and by how many.
import * as THREE from 'three';
export function bakeGroup(group){
 group.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(group.matrixWorld).invert(),rel=new THREE.Matrix4(),buckets=new Map(),gone=[];
 group.traverse(o=>{
  if(!o.isMesh||o.isInstancedMesh||o.userData.keep||!o.geometry?.attributes?.position)return;
  const m=o.material;if(Array.isArray(m)||!m.isMeshStandardMaterial||m.map||m.transparent||m.vertexColors||m.emissiveIntensity>0)return;
  const key=m.uuid+(o.castShadow?'c':'n')+(o.receiveShadow?'r':'x');let b=buckets.get(key);if(!b){b={m,cast:o.castShadow,receive:o.receiveShadow,pos:[],nor:[]};buckets.set(key,b);}
  const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();rel.multiplyMatrices(inv,o.matrixWorld);g.applyMatrix4(rel);
  b.pos.push(g.attributes.position.array);b.nor.push(g.attributes.normal.array);gone.push(o);});
 for(const o of gone)o.parent.remove(o);
 for(const b of buckets.values()){const len=b.pos.reduce((n,a)=>n+a.length,0),pos=new Float32Array(len),nor=new Float32Array(len);let at=0;
  for(let i=0;i<b.pos.length;i++){pos.set(b.pos[i],at);nor.set(b.nor[i],at);at+=b.pos[i].length;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('normal',new THREE.BufferAttribute(nor,3));g.computeBoundingSphere();
  const mesh=new THREE.Mesh(g,b.m);mesh.castShadow=b.cast;mesh.receiveShadow=b.receive;group.add(mesh);}
 return {before:gone.length,after:buckets.size};}
