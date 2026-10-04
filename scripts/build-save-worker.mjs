import { readFile,writeFile,mkdir,readdir,copyFile } from 'node:fs/promises';
import { extname } from 'node:path';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const assets={};
async function add(dir,prefix=''){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.name.startsWith('.')||entry.name==='server')continue;const path=`${prefix}/${entry.name}`;if(entry.isDirectory())await add(`${dir}/${entry.name}`,path);else assets[path]={type:types[extname(entry.name)]||'application/octet-stream',body:await readFile(`${dir}/${entry.name}`,'utf8')};}}
await add('dist');
const format=await readFile('dist/save-format.js','utf8'),db=await readFile('worker/save-db.js','utf8');
const worker=(await readFile('worker/index.js','utf8')).replace(/^import .*;\n/gm,'').replace("'__MARKET_FRONT_ASSETS__'",()=>JSON.stringify(assets));
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',format+'\n'+db+'\n'+worker);await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log(`Sauvegarde et ${Object.keys(assets).length} fichiers publics réunis dans le Worker.`);
