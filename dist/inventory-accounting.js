const cents=n=>Math.round(n*100)/100;
// Moving weighted average, excluding VAT. Initial goods use the game's reference purchase price.
export function ensureInventoryAccounting(s,quantities) {
 if(s.inventoryAccounting)return s.inventoryAccounting;
 const today=s.orders.filter(o=>(o.day??Math.max(1,Math.ceil(Math.max(0,o.eta-({regular:90,express:30}[o.supplierId]||0))/720)))===s.day);
 const unitCosts=s.products.map((p,i)=>{
  const purchases=today.filter(o=>o.productId===p.id),units=purchases.reduce((n,o)=>n+o.quantity,0),goods=purchases.reduce((n,o)=>n+o.goodsCost/1.2,0);
  const sold=p.soldToday||0,stolen=s.theft?.daily.products[i]||0,opening=Math.max(0,quantities[i]+sold+stolen-units);
  return opening+units?(opening*p.cost/1.2+goods)/(opening+units):p.cost/1.2;
 });
 const purchasesHT=today.reduce((n,o)=>n+o.goodsCost/1.2,0),costOfSalesHT=s.products.reduce((n,p,i)=>n+(p.soldToday||0)*unitCosts[i],0),lossesHT=s.products.reduce((n,p,i)=>n+(s.theft?.daily.products[i]||0)*unitCosts[i],0);
 const closing=quantities.reduce((n,q,i)=>n+q*unitCosts[i],0);
 return s.inventoryAccounting={method:'weighted-average',unitCosts,openingHT:Math.max(0,closing-purchasesHT+costOfSalesHT+lossesHT),purchasesHT,costOfSalesHT,lossesHT};
}
export function accountPurchase(s,quotes,quantities) {
 const a=ensureInventoryAccounting(s,quantities);
 for(const q of quotes){const i=s.products.findIndex(p=>p.id===q.productId),goods=q.goodsCost/1.2;a.unitCosts[i]=(quantities[i]*a.unitCosts[i]+goods)/(quantities[i]+q.quantity);a.purchasesHT+=goods;}
}
export function accountSale(s,basket) {
 const a=s.inventoryAccounting;
 for(const l of basket){a.costOfSalesHT+=(l.quantity-(l.stolen||0))*a.unitCosts[l.index];a.lossesHT+=(l.stolen||0)*a.unitCosts[l.index];}
}
export function accountDiscard(s,index,quantity){s.inventoryAccounting.lossesHT+=quantity*s.inventoryAccounting.unitCosts[index];}
export function inventoryReport(s,quantities) {
 const a=ensureInventoryAccounting(s,quantities),closingHT=quantities.reduce((n,q,i)=>n+q*a.unitCosts[i],0);
 return {openingHT:cents(a.openingHT),closingHT:cents(closingHT),variationHT:cents(closingHT-a.openingHT),purchasesHT:cents(a.purchasesHT),costOfSalesHT:cents(a.costOfSalesHT),lossesHT:cents(a.lossesHT)};
}
export function startInventoryDay(s,quantities) {
 const a=ensureInventoryAccounting(s,quantities);a.openingHT=quantities.reduce((n,q,i)=>n+q*a.unitCosts[i],0);a.purchasesHT=0;a.costOfSalesHT=0;a.lossesHT=0;
}
