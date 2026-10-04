// Supplier stock remains expected until physically stored, including receiver loads.
export function reserveStockProjection(state,product) {
  const ordered=state.orders.filter(o=>o.productId===product.id&&o.status!=='received').reduce((n,o)=>n+o.remaining,0)
    +state.receivers.filter(w=>w.productId===product.id).reduce((n,w)=>n+w.load,0);
  const planned=state.eveningBasket.filter(line=>line.productId===product.id).reduce((n,line)=>n+line.quantity,0);
  const stock=product.reserve,capacity=product.reserveCapacity,total=stock+ordered+planned;
  return {stock,ordered,planned,capacity,scale:Math.max(1,capacity,total),overflow:Math.max(0,total-capacity)};
}
