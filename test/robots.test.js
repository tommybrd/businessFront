import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGame,createStarterGame,openStore,startDayOnLoad,advance,setStaff,staffCount,setRobotCount,robotCount,robotWorkers,humanRestockers,RESTOCK_ROBOT,inventoryPosition,restockInTransit,dailyCosts,maintenanceCosts,premisesCosts,selectRestockEquipment,requestRestock,moveFixture } from '../dist/engine.js';
import {makeSave,readSave,validateSave} from '../dist/save-format.js';
import {createRobotFleet} from '../dist/robot-scene.js';
function quiet(){const s=createStarterGame();s.money=200000;s.arrivalCredit=-100000;setStaff(s,'shelves',0);s.products.forEach(p=>{p.shelf=0;p.reserve=p.capacity?400:0;});return s;}
function stocks(s){return s.products.map(p=>inventoryPosition(s,p.id));}
function loaded(s){for(let minute=0;minute<150&&!robotWorkers(s).some(w=>w.load===RESTOCK_ROBOT.capacity);minute++)advance(s,1);assert.ok(robotWorkers(s).some(w=>w.load===RESTOCK_ROBOT.capacity));}

test('robots are bought per unit, carry no employee wage, and maintenance plus power are charged once at closing',()=>{
 const s=quiet(),staff=staffCount(s),cost=dailyCosts(s),power=premisesCosts(s).rows.find(r=>r.name==='Électricité').cost;
 setRobotCount(s,2);assert.equal(s.money,140000);assert.equal(s.spending,60000);assert.equal(s.vatDeductible,10000);assert.equal(staffCount(s),staff);
 assert.equal(dailyCosts(s),cost+400);assert.equal(maintenanceCosts(s).rows.find(r=>r.kind==='robots').cost,360);assert.equal(premisesCosts(s).rows.find(r=>r.name==='Électricité').cost,power+40);
 setRobotCount(s,2);assert.equal(s.money,140000);openStore(s);const before=s.money+s.spending;advance(s,720);const h=s.history[0];
 assert.equal(h.expenses,cost+400);assert.equal(h.maintenanceDetails.find(r=>r.kind==='robots').count,2);
 assert.equal(s.money,Math.round((before+h.net)*100)/100);assert.equal(robotCount(s),2);
 const after=s.money;advance(s,0);assert.equal(s.money,after);
});

test('unaffordable, invalid or closed-day purchases leave the entire game unchanged; new and old saves start without robots',()=>{
 const s=createStarterGame();for(const n of [1,-1,1.5,9,NaN]){const before=JSON.stringify(s);assert.throws(()=>setRobotCount(s,n));assert.equal(JSON.stringify(s),before);}
 s.money=50000;s.phase='closed';const before=JSON.stringify(s);assert.throws(()=>setRobotCount(s,1));assert.equal(JSON.stringify(s),before);
 assert.equal(robotCount(createStarterGame()),0);assert.equal(robotCount(readSave(makeSave(createGame())).state),0);
});

test('one autonomous robot collects 320 mixed articles and fills shelves without any shelf employee or invented goods',()=>{
 const s=quiet(),initial=stocks(s);setRobotCount(s,1);openStore(s);assert.equal(requestRestock(s,'produce').waitingForStaff,false);
 loaded(s);assert.equal(robotWorkers(s)[0].cargo.filter(l=>l.quantity>0).length,2);assert.equal(restockInTransit(s),320);
 let max=0;for(let minute=0;minute<250;minute++){advance(s,1);assert.deepEqual(stocks(s),initial);const w=robotWorkers(s)[0];max=Math.max(max,w.load+w.reserved);assert.ok(w.load+w.reserved<=320);}
 assert.equal(max,320);assert.ok(s.products.slice(0,2).every(p=>p.shelf>=160));assert.equal(s.staff.shelves,0);assert.equal(humanRestockers(s).length,0);assert.equal(robotWorkers(s)[0].phase,'idle');
 for(const p of s.products.filter(p=>p.capacity&&p.shelf<p.capacity))requestRestock(s,p.id);advance(s,150);assert.ok(s.products.slice(0,2).every(p=>p.shelf===200));assert.deepEqual(stocks(s),initial);
});

test('robots prepare before opening at 5h and cooperate with humans without double reservations',()=>{
 const s=quiet();setStaff(s,'shelves',2);setRobotCount(s,2);const initial=stocks(s);startDayOnLoad(s);
 for(let minute=0;minute<180;minute++){advance(s,1);assert.deepEqual(stocks(s),initial);assert.ok(s.products.every(p=>p.reserve>=0&&p.shelf<=p.capacity));}
 assert.equal(s.minute,480);assert.equal(s.phase,'open');assert.equal(s.customers.length,0);assert.ok(s.products.slice(0,2).every(p=>p.shelf>=160));assert.ok(s.restockers.some(w=>w.completed>0));
});

test('changing human staff or carts never deletes a busy robot or changes its capacity',()=>{
 const s=quiet();setRobotCount(s,1);openStore(s);loaded(s);const robot=robotWorkers(s)[0],before=structuredClone(robot),initial=stocks(s);
 setStaff(s,'shelves',4);selectRestockEquipment(s,'large');assert.deepEqual(robotWorkers(s)[0],before);assert.equal(s.staff.shelves,4);assert.equal(robotCount(s),1);
 setStaff(s,'shelves',0);assert.deepEqual(robotWorkers(s)[0],before);assert.deepEqual(stocks(s),initial);advance(s,100);assert.equal(robotWorkers(s)[0].mode,'robot');
});

test('a busy robot save resumes identically; retiring it returns its cargo and releases all reservations',()=>{
 const s=quiet();setRobotCount(s,2);openStore(s);loaded(s);const initial=stocks(s),saved=readSave(makeSave(s)).state;
 s.speed=0;advance(s,40);advance(saved,40);assert.deepEqual(saved,s);const cash=s.money;
 setRobotCount(s,0);assert.equal(robotCount(s),0);assert.equal(s.money,cash-2000);assert.deepEqual(stocks(s),initial);assert.equal(restockInTransit(s),0);
 assert.equal(readSave(makeSave(s)).state.restockers.length,0);
 for(const alter of [r=>r.state.restockers[0].mode='small',r=>r.state.restockers[0].id=1008,r=>r.state.restockers[0].robot='yes',r=>r.state.restockers.push(structuredClone(r.state.restockers[0]))]){const r=makeSave(saved);alter(r);assert.throws(()=>validateSave(r));}
});

test('moving an active robot destination during pause reroutes it and preserves its real cargo',()=>{
 const s=quiet();setRobotCount(s,1);openStore(s);loaded(s);const initial=stocks(s);s.speed=0;
 moveFixture(s,'shelf:1',-4,0,Math.PI/2);assert.deepEqual(stocks(s),initial);
 for(let minute=0;minute<250;minute++){advance(s,1);assert.deepEqual(stocks(s),initial);}
 assert.equal(s.products[0].shelf,160);assert.equal(s.products[1].shelf,160);
});

test('the visible fleet follows robot position, mixed cargo, selection and retirement without a human actor',()=>{
 const s=quiet();setRobotCount(s,1);openStore(s);loaded(s);const scene=new THREE.Scene(),materials=new Map();
 const material=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshBasicMaterial({color}));return materials.get(color);};
 const box=(parent,w,h,d,x,y,z,color)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);parent.add(m);return m;};
 const fleet=createRobotFleet(scene,{box,material});fleet.update(s,1,.1,0,0);const group=fleet.groups()[0];
 assert.equal(group.userData.articleCount,320);assert.equal(group.userData.selection.view,'equipes');assert.equal(group.name,'restock-robot-1000');
 const w=robotWorkers(s)[0];assert.equal(group.position.x,w.pickup[0]);assert.equal(group.position.z,w.pickup[1]);
 setRobotCount(s,0);fleet.update(s,0,0,0,0);assert.equal(fleet.groups().length,0);assert.equal(scene.children.length,0);
});
