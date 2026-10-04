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
   if(response.status!==200||await response.text()!==await readFile(`${dir}/${entry.name}`,'utf8'))throw Error(`Fichier altéré dans le Worker : ${url}`);
   checked++;
  }
 }
}
await verify('dist');
if((await worker.fetch(new Request('https://example.test/api/save'),{})).status!==401)throw Error('API sans authentification.');
if((await worker.fetch(new Request('https://example.test/.openai/hosting.json'),{})).status!==404)throw Error('Fichier privé accessible.');
console.log(`Worker vérifié : ${checked} fichiers identiques et API protégée.`);
