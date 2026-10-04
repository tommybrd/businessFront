import test from 'node:test';
import assert from 'node:assert/strict';
import {createStarterGame,setStaff,placeOrder,advance,queueEveningOrder,openStore} from '../dist/engine.js';
import {reserveStockProjection} from '../dist/reserve-stock.js';
import {makeSave,readSave} from '../dist/save-format.js';
test('expected reserve includes real receiving loads once and shrinks as stock is stored, surviving save and resume',()=>{
 const s=createStarterGame();setStaff(s,'shelves',0);s.arrivalCredit=-10000;const p=s.products[0],stock=p.reserve;placeOrder(s,p.id,240,'express');
 assert.equal(reserveStockProjection(s,p).ordered,240);let carried=false;
 for(let i=0;i<250&&s.orders[0].status!=='received';i++){
  advance(s,1);const r=reserveStockProjection(s,p);assert.equal(r.stock+r.ordered,stock+240);if(s.receivers[0].load>0){carried=true;const restored=readSave(makeSave(s)).state;assert.deepEqual(reserveStockProjection(restored,restored.products[0]),r);}
 }
 assert.ok(carried);assert.equal(s.orders[0].status,'received');assert.equal(reserveStockProjection(s,p).ordered,0);assert.equal(p.reserve,stock+240);
});
test('evening plans are separate, disappear on removal and are not double counted after dispatch; overflow remains visible',()=>{
 const s=createStarterGame();s.arrivalCredit=-10000;setStaff(s,'shelves',0);queueEveningOrder(s,'produce',720);const p=s.products[0];let r=reserveStockProjection(s,p);assert.equal(r.ordered,0);assert.equal(r.planned,720);assert.equal(r.scale,768);assert.equal(r.overflow,268);
 s.eveningBasket=[];assert.equal(reserveStockProjection(s,p).planned,0);queueEveningOrder(s,'produce',720);openStore(s);s.minute=1199;advance(s,1);r=reserveStockProjection(s,p);assert.equal(r.planned,0);assert.equal(r.ordered,720);
 p.reserve=500;r=reserveStockProjection(s,p);assert.ok(r.ordered/r.scale>0);assert.equal(r.overflow,720);assert.equal(reserveStockProjection(s,s.products[1]).ordered,0);
});
