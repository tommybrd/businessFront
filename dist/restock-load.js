// A cart can reserve and carry several families; single-family old saves stay readable.
export const restockLoad=(w,id)=>w.cargo?w.cargo.filter(l=>l.productId===id).reduce((n,l)=>n+l.quantity,0):w.productId===id?w.load:0;
export const restockReserved=(w,id)=>w.cargo?w.cargo.filter(l=>l.productId===id).reduce((n,l)=>n+l.reserved,0):w.productId===id?w.reserved:0;
export const workerHasProduct=(w,id)=>w.productId===id||Boolean(w.cargo?.some(l=>l.productId===id&&(l.quantity||l.reserved)));
