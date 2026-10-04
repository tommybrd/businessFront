import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createGame, createStarterGame, openStore, advance, setStaff, selectRestockEquipment, inventoryPosition } from '../dist/engine.js';

// Complete 08:00–20:00 days. Stocks are prepared explicitly, without free deliveries.
export function simulateDay({ seed = 73471, day = 1, starter = false, mixed = starter, workers = starter ? 1 : 5, mode = starter ? 'medium' : 'small', reserve = 500, cashiers = starter ? 1 : 4 } = {}) {
  const state = starter ? createStarterGame(seed) : createGame(seed); state.day = day; state.mixedRestock = mixed;
  state.money = 25000; // Fund each equipment purchase identically for the audit.
  setStaff(state, 'shelves', workers); setStaff(state, 'checkout', cashiers);
  for (const equipment of ['small','medium','large','hyper']) {
    selectRestockEquipment(state, equipment);
    if (equipment === mode) break;
  }
  state.products.forEach(product => { if (starter) product.shelf = product.capacity; product.reserve = product.capacity ? reserve : 0; });
  const initialStocks = state.products.map(product => inventoryPosition(state, product.id));
  openStore(state);
  const seen = new Set(); let requested = 0, emptyMinutes = 0, peakCustomers = 0;
  for (let minute = 0; minute < 720; minute++) {
    for (const customer of state.customers) {
      if (!seen.has(customer.id)) { seen.add(customer.id); requested += customer.items.reduce((sum, item) => sum + item.quantity, 0); }
    }
    if (state.products.some(product => product.capacity > 0 && product.shelf === 0)) emptyMinutes++;
    peakCustomers = Math.max(peakCustomers, state.customers.length);
    advance(state, 1);
    state.products.forEach((product, index) => {
      assert.ok(product.shelf >= 0 && product.shelf <= product.capacity && product.reserve >= 0 && product.reserve <= product.reserveCapacity);
      const held = state.customers.reduce((sum, customer) => sum + customer.basket.filter(item => item.index === index).reduce((n, item) => n + item.quantity, 0), 0);
      const summary = state.history[0];
      const sold = summary ? summary.products[index].sold : product.soldToday;
      const stolen = (summary ? summary.theft : state.theft?.daily)?.products[index] ?? 0;
      assert.equal(inventoryPosition(state, product.id) + held + sold + stolen, initialStocks[index]);
    });
  }
  const summary = state.history[0];
  return { day, starter, mixed, mode, workers, cashiers, reserve, arrivals: seen.size, requested, emptyMinutes, peakCustomers,
    sold: summary.products.reduce((sum, product) => sum + product.sold, 0),
    restocked: summary.products.reduce((sum, product) => sum + product.restocked, 0),
    trips: state.restockers.reduce((sum, worker) => sum + worker.completed, 0),
    shortfall: summary.satisfactionDetails.missing.reduce((sum,n)=>sum+n,0), lost: summary.lost, netProfit: summary.netProfit };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seeds = [73471, 9944, 2026]; const rows = [];
  for (const day of [1,2,3,4,5]) for (const [starter,workers,mode,mixed] of [[true,1,'medium',true],[false,0,'small',false],[false,5,'small',false],[false,5,'medium',true],[false,5,'large',true],[false,5,'hyper',true]]) {
    const results = seeds.map(seed => simulateDay({ seed, day, starter, workers, mode, mixed, reserve: 480 }));
    const mean = key => Math.round(results.reduce((sum, result) => sum + result[key], 0) / seeds.length);
    rows.push({ journée: ['Normale','Calme','Samedi','Black Friday','Fêtes'][day-1], magasin: starter?'Petit · 2 rayons':'Équipé · 18 modules', chariot: workers ? mode : 'Sans mise en rayon', employés: workers,
      visites: mean('arrivals'), 'demande articles': mean('requested'), vendus: mean('sold'), trajets: mean('trips'), manquants: mean('shortfall'), 'minutes rayon vide': mean('emptyMinutes') });
  }
  console.log('Moyennes sur 3 graines : rayons préparés (petit : 200 par famille ; équipé : 480), 480 en réserve par famille proposée, sans livraison.');
  console.table(rows);
}
