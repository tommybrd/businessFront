import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createGame, openStore, advance, setStaff, selectRestockEquipment, inventoryPosition } from '../dist/engine.js';

// A complete 08:00–20:00 day, identical demand across staffing/equipment scenarios.
export function simulateDay({ seed = 73471, day = 1, workers = 5, mode = 'small', reserve = 500, cashiers = 4 } = {}) {
  const state = createGame(seed); state.day = day;
  setStaff(state, 'shelves', workers); setStaff(state, 'checkout', cashiers);
  if (mode !== 'small') selectRestockEquipment(state, 'medium');
  if (mode === 'large') selectRestockEquipment(state, 'large');
  state.products.forEach(product => { product.reserve = reserve; });
  const initialStocks = state.products.map(product => inventoryPosition(state, product.id));
  openStore(state);
  const seen = new Set(); let requested = 0, shortfall = 0;
  for (let minute = 0; minute < 720; minute++) {
    for (const customer of state.customers) {
      if (!seen.has(customer.id)) { seen.add(customer.id); requested += customer.items.reduce((sum, item) => sum + item.quantity, 0); }
      if (customer.stage === 'shopping' && customer.progress === 5) {
        const item = customer.items[customer.itemIndex];
        shortfall += Math.max(0, item.quantity - state.products[item.index].shelf);
      }
    }
    advance(state, 1);
    state.products.forEach((product, index) => {
      assert.ok(product.shelf >= 0 && product.shelf <= product.capacity && product.reserve >= 0 && product.reserve <= product.reserveCapacity);
      const held = state.customers.reduce((sum, customer) => sum + customer.basket.filter(item => item.index === index).reduce((n, item) => n + item.quantity, 0), 0);
      const sold = state.history.length ? state.history[0].products[index].sold : product.soldToday;
      assert.equal(inventoryPosition(state, product.id) + held + sold, initialStocks[index]);
    });
  }
  const summary = state.history[0];
  return { day, mode, workers, cashiers, reserve, arrivals: seen.size, requested,
    sold: summary.products.reduce((sum, product) => sum + product.sold, 0),
    restocked: summary.products.reduce((sum, product) => sum + product.restocked, 0),
    trips: state.restockers.reduce((sum, worker) => sum + worker.completed, 0), shortfall, lost: summary.lost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seeds = [73471, 9944, 2026]; const rows = [];
  for (const day of [1, 3, 4]) for (const [workers, mode] of [[0, 'small'], [5, 'small'], [5, 'medium'], [5, 'large']]) {
    const results = seeds.map(seed => simulateDay({ seed, day, workers, mode }));
    const mean = key => Math.round(results.reduce((sum, result) => sum + result[key], 0) / seeds.length);
    rows.push({ journée: day === 1 ? 'Normale' : day === 3 ? 'Samedi' : 'Black Friday', chariot: workers ? mode : 'Sans mise en rayon', employés: workers,
      'demande articles': mean('requested'), 'articles vendus': mean('sold'), 'mis en rayon': mean('restocked'), 'trajets achevés': mean('trips'), 'articles manquants': mean('shortfall') });
  }
  console.log('Moyennes sur 3 graines : 480 articles en rayon + 500 en réserve par famille, 4 caisses, sans livraison dans la journée.');
  console.table(rows);
}
