import { DatabaseSync } from 'node:sqlite';
import { sqliteBinding } from './local-save-db.mjs';
import { createGame, openStore, advance, setRobotCount, createWarehouseGame, advanceWarehouse } from '../dist/engine.js';
import { makeSave } from '../dist/save-format.js';
import { createRestaurantGame, advanceRestaurant, migrateRestaurantGame } from '../dist/restaurant-engine.js';
import { readFile, readdir } from 'node:fs/promises';
const {default:worker}=await import('../dist/server/index.js');
if(typeof worker.fetch!=='function')throw Error('Worker sans gestionnaire de requêtes.');
let checked=0;
async function verify(dir,prefix='') {
 for(const entry of await readdir(dir,{withFileTypes:true})) {
  if(entry.name.startsWith('.')||entry.name==='server')continue;
  const url=`${prefix}/${entry.name}`;
  if(entry.isDirectory())await verify(`${dir}/${entry.name}`,url);
  else {
   const response=await worker.fetch(new Request(`https://example.test${url}`),{});
   if(response.status!==200||!Buffer.from(await response.arrayBuffer()).equals(await readFile(`${dir}/${entry.name}`)))throw Error(`Fichier altéré dans le Worker : ${url}`);
   checked++;
  }
 }
}
await verify('dist');
if((await worker.fetch(new Request('https://example.test/api/save'),{})).status!==401)throw Error('API sans authentification.');
if((await worker.fetch(new Request('https://example.test/.openai/hosting.json'),{})).status!==404)throw Error('Fichier privé accessible.');
console.log(`Worker vérifié : ${checked} fichiers identiques et API protégée.`);

const sqlite=new DatabaseSync(':memory:');sqlite.exec(await readFile('drizzle/0000_loud_thunderbolt_ross.sql','utf8'));
const state=createGame(897);state.money=90000;setRobotCount(state,1);openStore(state);advance(state,50);
const stored=await worker.fetch(new Request('https://example.test/api/save',{method:'PUT',headers:{'oai-authenticated-user-id':'build-check-only',Origin:'https://example.test','Content-Type':'application/json','X-Market-Front-Save':'1'},body:JSON.stringify({revision:0,ownerId:'build-check-only',snapshot:makeSave(state)})}),{DB:sqliteBinding(sqlite)});
if(stored.status!==200)throw Error('Sauvegarde du Worker assemblé invalide : '+await stored.text());
sqlite.close();console.log('API du Worker assemblé vérifiée avec clients, robots et SQL isolé.');

const warehouseState=createWarehouseGame(765);advanceWarehouse(warehouseState,90);
const warehouseDB=new DatabaseSync(':memory:');warehouseDB.exec(await readFile('drizzle/0000_loud_thunderbolt_ross.sql','utf8'));
const warehouseResult=await worker.fetch(new Request('https://example.test/api/save',{method:'PUT',headers:{'oai-authenticated-user-id':'warehouse-build-check',Origin:'https://example.test','Content-Type':'application/json','X-Market-Front-Save':'1'},body:JSON.stringify({revision:0,ownerId:'warehouse-build-check',snapshot:makeSave(warehouseState)})}),{DB:sqliteBinding(warehouseDB)});
if(warehouseResult.status!==200)throw Error('Sauvegarde logistique assemblée invalide : '+await warehouseResult.text());warehouseDB.close();console.log('Sauvegarde logistique v2 du Worker vérifiée.');

const restaurantState=migrateRestaurantGame(makeSave(warehouseState),{stockValue:0});advanceRestaurant(restaurantState,240);
const restaurantDB=new DatabaseSync(':memory:');restaurantDB.exec(await readFile('drizzle/0000_loud_thunderbolt_ross.sql','utf8'));
const restaurantResult=await worker.fetch(new Request('https://example.test/api/save',{method:'PUT',headers:{'oai-authenticated-user-id':'restaurant-build-check',Origin:'https://example.test','Content-Type':'application/json','X-Market-Front-Save':'1'},body:JSON.stringify({revision:0,ownerId:'restaurant-build-check',snapshot:makeSave(restaurantState)})}),{DB:sqliteBinding(restaurantDB)});
if(restaurantResult.status!==200)throw Error('Sauvegarde restaurant assemblée invalide : '+await restaurantResult.text());restaurantDB.close();console.log('Sauvegarde restaurant v3 du Worker vérifiée, avec l’archive logistique.');
