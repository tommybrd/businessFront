import test from 'node:test';
import assert from 'node:assert/strict';
import {createWarehouseGame,advanceWarehouse,takeWarehouseLoan,repayWarehouseLoan,loanQuote,warehouseDebt,warehouseCosts,LOAN_LIMIT} from '../dist/warehouse-engine.js';
import {makeSave} from '../dist/save-format.js';

const reconcile=s=>{const t=s.totals;assert.ok(Math.abs(s.money-(s.initialCash+t.revenue+t.bonus-t.purchases-t.transport-t.packaging-t.charges-t.investments-(t.marketing||0)+(t.borrowed||0)-(t.repaid||0)))<.011);};

test('a loan pays cash now and is repaid in daily instalments whose interest counts as a charge',()=>{
 const s=createWarehouseGame(91);s.acceptOrders=false;const cash=s.money,q=loanQuote(10000,10);
 assert.deepEqual(q,{amount:10000,days:10,interest:400,instalment:1040});
 takeWarehouseLoan(s,10000,10);assert.equal(s.money,cash+10000);assert.equal(warehouseDebt(s),10000);assert.equal(warehouseCosts(s).interest,40);makeSave(s);
 for(let day=1;day<=10;day++){const before=s.history.length;while(s.history.length===before)advanceWarehouse(s,60);assert.equal(s.history[0].charges>=40,true);assert.equal(warehouseDebt(s),Math.max(0,10000-day*1000));}
 assert.equal(s.loans.length,0);assert.equal(s.totals.borrowed,10000);assert.equal(s.totals.repaid,10000);reconcile(s);makeSave(s);
});

test('early repayment settles the capital only, offers and the debt ceiling are enforced',()=>{
 const s=createWarehouseGame(92);takeWarehouseLoan(s,50000,30);takeWarehouseLoan(s,50000,20);assert.equal(warehouseDebt(s),LOAN_LIMIT);
 assert.throws(()=>takeWarehouseLoan(s,5000,10),/Encours maximal/);assert.throws(()=>takeWarehouseLoan(createWarehouseGame(1),7000,10));assert.throws(()=>takeWarehouseLoan(createWarehouseGame(1),5000,15));
 const loan=s.loans[0],cash=s.money;repayWarehouseLoan(s,loan.id);assert.equal(s.money,cash-50000);assert.equal(s.loans.length,1);assert.equal(warehouseDebt(s),50000);reconcile(s);
 const poor=createWarehouseGame(93);takeWarehouseLoan(poor,5000,10);poor.money=100;const copy=structuredClone(poor);assert.throws(()=>repayWarehouseLoan(poor,poor.loans[0].id),/insuffisante/);assert.deepEqual(poor,copy);makeSave(s);
});
