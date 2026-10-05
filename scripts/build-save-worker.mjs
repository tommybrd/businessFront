import { readFile,writeFile,mkdir,readdir,copyFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { createHash } from 'node:crypto';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.webmanifest':'application/manifest+json; charset=utf-8'};
const assets={};
async function add(dir,prefix=''){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(entry.name.startsWith('.')||entry.name==='server'||entry.name==='sw.js')continue;const path=`${prefix}/${entry.name}`;if(entry.isDirectory())await add(`${dir}/${entry.name}`,path);else {const binary=extname(entry.name)==='.png';assets[path]={type:types[extname(entry.name)]||'application/octet-stream',body:await readFile(`${dir}/${entry.name}`,binary?'base64':'utf8'),...(binary?{encoding:'base64'}:{})};}}}
await add('dist');
const version=createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0,20);
const sw=(await readFile('worker/offline-sw.js','utf8')).replace('__MARKET_FRONT_VERSION__',version).replace('__MARKET_FRONT_OFFLINE_ASSETS__',JSON.stringify(Object.keys(assets)));
await writeFile('dist/sw.js',sw);assets['/sw.js']={type:types['.js'],body:sw};
const hours=await readFile('dist/store-hours.js','utf8'),robots=await readFile('dist/restock-robots.js','utf8');
const lane=(await readFile('dist/store-layout.js','utf8')).split('\n').find(line=>line.startsWith('export const isAutoCheckoutLane'));
const format=(await readFile('dist/save-format.js','utf8')).replace(/^import .*;\n/gm,''),db=await readFile('worker/save-db.js','utf8');
const worker=(await readFile('worker/index.js','utf8')).replace(/^import .*;\n/gm,'').replace("'__MARKET_FRONT_ASSETS__'",()=>JSON.stringify(assets)).replace('__MARKET_FRONT_VERSION__',version);
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',hours+'\n'+robots+'\n'+lane+'\n'+format+'\n'+db+'\n'+worker);await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log(`Sauvegarde, mode hors ligne et ${Object.keys(assets).length} fichiers publics réunis dans le Worker.`);
