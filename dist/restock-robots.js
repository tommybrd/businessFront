export const RESTOCK_ROBOT = Object.freeze({ name: 'Robot de mise en rayon', capacity: 320, cost: 30000, removal: 1000, maintenance: 180, electricity: 20, loading: 4, stockRate: 32, travelSpeed: 3.2, limit: 8 });
export const robotWorkers = s => s.restockers.filter(w => w.robot === true);
export const humanRestockers = s => s.restockers.filter(w => w.robot !== true);
export const robotCount = s => robotWorkers(s).length;
export const robotHome = worker => [-4.05 + (worker.id - 1000) * 1.15, -5.05];
