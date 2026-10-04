// Keep small baskets at four minutes; larger shops share the same unload/payment overhead.
export const checkoutDuration = count => 3 + Math.ceil(count / 8);

export const checkoutSpace = state => 4 + state.expansions.checkout * 2;
export const checkoutCount = state => state.infrastructure?.checkouts ?? checkoutSpace(state);

// One minute to unload, a sequential scan, then one minute to pay.
export function checkoutProgress(customer, minuteFraction = 0) {
  const count = customer.basket.reduce((sum, item) => sum + item.quantity, 0);
  const duration = customer.checkoutDuration || checkoutDuration(count);
  const elapsed = customer.paid ? duration : Math.max(0, Math.min(duration, duration - customer.checkoutRemaining + minuteFraction));
  const scanDuration = duration - 2;
  const articles = Array.from({ length: count }, (_, index) => ({
    loading: Math.max(0, Math.min(1, elapsed * count - index)),
    scanning: Math.max(0, Math.min(1, (elapsed - 1) / scanDuration * count - index)),
  }));
  return { elapsed, articles, scanned: articles.filter(item => item.scanning >= .8).length, phase: elapsed < 1 ? 'loading' : elapsed < duration - 1 ? 'scanning' : 'payment' };
}

export function activeCheckoutLanes(state) {
  const lanes = Array.from({ length: Math.min(checkoutCount(state), state.staff.checkout) }, (_, index) => index);
  if (state.autoCheckout && state.staff.checkout > 0) lanes.push('auto');
  return lanes;
}

export function releaseClosedCheckouts(state) {
  const active = new Set(activeCheckoutLanes(state));
  for (const customer of state.customers) {
    if (customer.stage === 'checkout' && !active.has(customer.checkoutLane)) {
      customer.stage = 'queue'; customer.wait = 0; customer.checkoutRemaining = 0;
    }
    if (customer.stage === 'queue' && !active.has(customer.checkoutLane)) customer.checkoutLane = null;
  }
}

export function updateCheckouts(state, recordSale) {
  releaseClosedCheckouts(state);
  const active = activeCheckoutLanes(state);
  if (!active.length) return;
  const paid = new Set();
  for (const customer of state.customers.filter(c => c.stage === 'checkout')) {
    customer.checkoutRemaining--;
    if (customer.checkoutRemaining > 0) continue;
    customer.paid = true; recordSale(customer); paid.add(customer.id);
    state.satisfaction = Math.min(100, state.satisfaction + .03);
  }
  state.customers = state.customers.filter(c => !paid.has(c.id));
  for (const customer of state.customers.filter(c => c.stage === 'queue' && c.checkoutLane == null)) {
    const workload = lane => state.customers.filter(c => c.checkoutLane === lane && ['queue', 'checkout'].includes(c.stage)).length;
    customer.checkoutLane = active.reduce((best, lane) => workload(lane) < workload(best) ? lane : best, active[0]);
  }
  for (const lane of active) {
    if (state.customers.some(c => c.stage === 'checkout' && c.checkoutLane === lane)) continue;
    const customer = state.customers.find(c => c.stage === 'queue' && c.checkoutLane === lane);
    if (!customer) continue;
    const articles = customer.basket.reduce((sum, item) => sum + item.quantity, 0);
    customer.stage = 'checkout'; customer.wait = 0;
    customer.checkoutRemaining = checkoutDuration(articles);
    customer.checkoutDuration = customer.checkoutRemaining;
  }
}
