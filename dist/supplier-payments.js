const cents=n=>Math.round(n*100)/100;
export const SUPPLIER_PAYMENT_TERMS=[0,7,30];
export const newSupplierPayments=(termDays=7)=>({termDays,invoicedToday:0,paidToday:0,invoices:[]});
export function ensureSupplierPayments(s){return s.supplierPayments||=newSupplierPayments(0);}
export function setSupplierPaymentTerm(s,days){if(!SUPPLIER_PAYMENT_TERMS.includes(days)||!['open','preparation'].includes(s.phase))throw new Error('Délai de paiement invalide.');ensureSupplierPayments(s).termDays=days;return {days};}
export function invoiceSupplier(s,{batchId,supplierId,total}) {
 const p=ensureSupplierPayments(s),invoice={id:batchId,supplierId,day:s.day,dueDay:s.day+p.termDays,total,remaining:total};p.invoices.push(invoice);p.invoicedToday=cents(p.invoicedToday+total);
 if(!p.termDays){s.money=cents(s.money-total);invoice.remaining=0;p.paidToday=cents(p.paidToday+total);}
 return invoice;
}
export function paySupplierInvoices(s,id=null,dueOnly=false) {
 const p=ensureSupplierPayments(s),invoices=p.invoices.filter(i=>i.remaining>0&&(id===null||i.id===id)&&(!dueOnly||i.dueDay<=s.day)).sort((a,b)=>a.dueDay-b.dueDay||a.id-b.id);
 let paid=0;for(const invoice of invoices){const amount=Math.min(invoice.remaining,Math.max(0,s.money));invoice.remaining=cents(invoice.remaining-amount);s.money=cents(s.money-amount);paid=cents(paid+amount);}
 p.paidToday=cents(p.paidToday+paid);return {paid,remaining:cents(invoices.reduce((n,i)=>n+i.remaining,0))};
}
export function supplierPaymentReport(s) {
 const p=ensureSupplierPayments(s),invoices=p.invoices.filter(i=>i.remaining>0);
 return {termDays:p.termDays,invoicedToday:p.invoicedToday,paidToday:p.paidToday,outstanding:cents(invoices.reduce((n,i)=>n+i.remaining,0)),due:cents(invoices.filter(i=>i.dueDay<=s.day).reduce((n,i)=>n+i.remaining,0)),invoices:structuredClone(invoices)};
}
export function cashPurchases(s){const p=ensureSupplierPayments(s);return cents(s.spending-p.invoicedToday+p.paidToday);}
export function startSupplierDay(s){const p=ensureSupplierPayments(s);p.invoicedToday=0;p.paidToday=0;}
