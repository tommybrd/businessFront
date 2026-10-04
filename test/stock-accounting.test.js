import test from 'node:test';
import assert from 'node:assert/strict';
import {createStarterGame,createGame,openStore,advance,startDayOnLoad,stockValuation,dailyProfitability,placeOrder,queueEveningOrder,setSupplierPaymentTerm,paySupplierInvoices,supplierPaymentReport,setStaff,setShelfCount,discardReserve,selectRestockEquipment,RESTOCK_EQUIPMENT,inventoryPosition,dailyCosts} from '../dist/engine.js';
import {makeSave,readSave} from '../dist/save-format.js';
const round=n=>Math.round(n*100)/100;
function quiet(){const s=createStarterGame();s.arrivalCredit=-100000;s.money=100000;delete s.theft;return s;}
function close(s){s.minute=1199;advance(s,1);return s.history.at(-1);}
function sell(s,index,quantity){const p=s.products[index];p.shelf-=quantity;s.customers=[{id:s.nextId++,stage:'checkout',checkoutLane:0,checkoutArrived:true,checkoutDuration:1,checkoutRemaining:1,items:[],basket:[{index,quantity}],value:round(p.price*quantity),wait:0}];advance(s,1);}
test('unsold purchases are an asset, including goods in transit, and deferred invoices do not debit cash',()=>{
 const s=quiet();openStore(s);const before=dailyProfitability(s),opening=stockValuation(s).closingHT,cash=s.money;
 const o=placeOrder(s,'produce',240,'express'),after=dailyProfitability(s);assert.equal(s.money,cash);assert.equal(s.spending,o.totalCost);assert.equal(after.stock.closingHT,round(opening+o.goodsCost/1.2));assert.equal(after.stock.costOfSalesHT,0);assert.ok(Math.abs(after.beforeTax-(before.beforeTax-150/1.2))<.02);
 const summary=close(s);assert.equal(summary.stock.closingHT,after.stock.closingHT);assert.equal(summary.suppliers.outstanding,o.totalCost);assert.equal(summary.suppliers.paidToday,0);assert.equal(summary.cashSpending,0);assert.equal(summary.net,round(-dailyCosts(s)));assert.equal(summary.suppliers.invoices[0].dueDay,8);
});
test('sold stock is expensed once at weighted purchase cost, while transfers and unpaid shopping baskets keep their value',()=>{
 const s=quiet();openStore(s);const oldQuantity=inventoryPosition(s,'produce'),oldUnit=s.products[0].cost/1.2;const o=placeOrder(s,'produce',240,'regular'),unit=(oldQuantity*oldUnit+o.goodsCost/1.2)/(oldQuantity+240),value=stockValuation(s).closingHT;
 s.products[0].shelf-=5;s.customers=[{id:999,stage:'queue',items:[],basket:[{index:0,quantity:5}],value:17,wait:0}];assert.equal(stockValuation(s).closingHT,value);s.products[0].shelf+=5;s.customers=[];
 sell(s,0,10);assert.equal(dailyProfitability(s).stock.costOfSalesHT,round(unit*10));assert.ok(Math.abs(stockValuation(s).closingHT-(value-round(unit*10)))<=.01);
 const summary=close(s);assert.equal(summary.stock.costOfSalesHT,round(unit*10));assert.equal(dailyProfitability(s).stock.costOfSalesHT,0);openStore(s);sell(s,0,5);assert.equal(dailyProfitability(s).stock.costOfSalesHT,round(unit*5));assert.equal(dailyProfitability(s).stock.purchasesHT,0);
});
test('discarding goods recognizes their cost once and opening inventory is carried to the next day',()=>{
 const s=quiet();openStore(s);const initial=stockValuation(s);discardReserve(s,'produce',12);assert.equal(stockValuation(s).lossesHT,18);assert.equal(stockValuation(s).closingHT,initial.closingHT-18);const h=close(s);assert.equal(h.stock.lossesHT,18);assert.equal(stockValuation(s).openingHT,h.stock.closingHT);assert.equal(stockValuation(s).lossesHT,0);
});
test('supplier payments follow their original due date, partial payments preserve debt and never expense a prior purchase twice',()=>{
 const s=quiet();openStore(s);const o=placeOrder(s,'produce',24,'regular'),id=s.supplierPayments.invoices[0].id;setSupplierPaymentTerm(s,30);assert.equal(s.supplierPayments.invoices[0].dueDay,8);s.money=20;assert.equal(paySupplierInvoices(s,id).paid,20);assert.equal(supplierPaymentReport(s).outstanding,round(o.totalCost-20));s.money=1000;const profit=dailyProfitability(s).beforeTax;assert.equal(paySupplierInvoices(s,id).paid,round(o.totalCost-20));assert.equal(paySupplierInvoices(s,id).paid,0);assert.equal(dailyProfitability(s).beforeTax,profit);
 const another=placeOrder(s,'produce',12,'regular');assert.equal(s.supplierPayments.invoices.at(-1).dueDay,31);s.day=31;const cash=s.money;const expected=another.totalCost;paySupplierInvoices(s,null,true);assert.equal(s.money,round(cash-expected));assert.equal(supplierPaymentReport(s).outstanding,0);
});
test('on-account evening purchases work with low cash, cash orders still protect affordability, and old saves keep old invoices paid',()=>{
 const s=quiet();openStore(s);s.money=100;queueEveningOrder(s,'produce',240);close(s);assert.equal(s.orders.length,1);assert.equal(s.supplierPayments.invoices.length,1);assert.equal(s.eveningBasket.length,0);
 const old=createGame();openStore(old);placeOrder(old,'produce',12,'regular');const snapshot=makeSave(old);delete snapshot.state.inventoryAccounting;delete snapshot.state.supplierPayments;const restored=readSave(snapshot).state;assert.equal(supplierPaymentReport(restored).outstanding,0);const v=stockValuation(restored);assert.ok(v.purchasesHT>0);setSupplierPaymentTerm(restored,0);restored.money=0;const before=JSON.stringify(restored);assert.throws(()=>placeOrder(restored,'produce',240,'regular'));assert.equal(JSON.stringify(restored),before);
});
test('accounting and supplier debts survive saving, reject corrupted data, and keep resumed results identical',()=>{
 const s=quiet();openStore(s);placeOrder(s,'produce',240,'express');sell(s,0,5);const snap=makeSave(s),restored=readSave(snap).state;assert.deepEqual(dailyProfitability(restored),dailyProfitability(s));assert.deepEqual(restored.supplierPayments,s.supplierPayments);const bad=makeSave(s);bad.state.inventoryAccounting.unitCosts[0]=-1;assert.throws(()=>readSave(bad));const debt=makeSave(s);debt.state.supplierPayments.invoices[0].remaining=-10;assert.throws(()=>readSave(debt));
});
test('preparation starts at 05:00, receives morning deliveries and replenishes before customers arrive at 08:00',()=>{
 const s=quiet();s.products[0].shelf=0;startDayOnLoad(s);assert.equal(s.minute,300);assert.equal(s.phase,'preparation');placeOrder(s,'produce',240,'regular');advance(s,179);assert.equal(s.minute,479);assert.equal(s.customers.length,0);assert.equal(s.sales,0);assert.ok(s.products[0].shelf>0);assert.ok(s.orders[0].remaining<240);s.speed=6;advance(s,1);assert.equal(s.minute,480);assert.equal(s.phase,'open');assert.equal(s.speed,6);queueEveningOrder(s,'bakery',240);close(s);assert.equal(s.phase,'preparation');assert.equal(s.minute,300);const grouped=s.orders.at(-1);assert.equal(grouped.eta,s.elapsed+90);assert.equal(s.customers.length,0);advance(s,179);assert.ok(grouped.remaining<240);assert.equal(s.customers.length,0);
});
test('hyper carts carry 500 articles, require its unlock, carry mixed loads and preserve all stocks',()=>{
 const s=quiet();assert.equal(RESTOCK_EQUIPMENT.hyper.capacity,500);assert.throws(()=>selectRestockEquipment(s,'hyper'));selectRestockEquipment(s,'large');const cash=s.money;selectRestockEquipment(s,'hyper');assert.equal(s.money,cash-7200);selectRestockEquipment(s,'hyper');assert.equal(s.money,cash-7200);setStaff(s,'shelves',1);setShelfCount(s,'produce',2);setShelfCount(s,'bakery',2);s.products[0].shelf=0;s.products[1].shelf=0;s.products[0].reserve=300;s.products[1].reserve=300;const total=s.products.map(p=>inventoryPosition(s,p.id));startDayOnLoad(s);let full=false;for(let i=0;i<400;i++){advance(s,1);assert.deepEqual(s.products.map(p=>inventoryPosition(s,p.id)),total);const w=s.restockers[0];if(w.load===500){full=true;assert.equal(w.cargo.filter(l=>l.quantity>0).length,2);}assert.ok(w.load+w.reserved<=500);}assert.ok(full);assert.equal(s.products[0].shelf,300);assert.equal(s.products[1].shelf,300);assert.equal(readSave(makeSave(s)).state.restockMode,'hyper');
});

test('closing automatically pays due invoices once and reconciles cash separately from goods expenses',()=>{
 const s=quiet();openStore(s);s.autoPayTaxes=false;const o=placeOrder(s,'produce',12,'regular');close(s);
 for(let day=2;day<8;day++){openStore(s);const h=close(s);assert.equal(h.suppliers.paidToday,0);assert.equal(h.suppliers.outstanding,o.totalCost);}
 openStore(s);const cash=s.money,profit=dailyProfitability(s).beforeTax;const h=close(s);assert.equal(h.suppliers.paidToday,o.totalCost);assert.equal(h.suppliers.outstanding,0);assert.equal(h.cashSpending,o.totalCost);assert.equal(h.stock.purchasesHT,0);assert.equal(h.beforeTax,profit);assert.equal(s.money,round(cash+h.net));openStore(s);assert.equal(close(s).suppliers.paidToday,0);
});
