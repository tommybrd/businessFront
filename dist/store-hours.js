export const DEFAULT_STORE_HOURS=Object.freeze({open:480,close:1200});
export const storeHours=s=>s.dayHours??s.storeHours??DEFAULT_STORE_HOURS;
export const nextStoreHours=s=>s.storeHours??DEFAULT_STORE_HOURS;
export const validStoreHours=h=>h&&Number.isInteger(h.open)&&Number.isInteger(h.close)&&h.open>=300&&h.close<=1380&&h.close-h.open>=60;
export const postCollectionMinute=s=>Math.min(1020,storeHours(s).close-20);
