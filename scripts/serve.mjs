import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { saveApi } from '../worker/index.js';
import { localSaveDatabase } from './local-save-db.mjs';
const root=resolve(import.meta.dirname,'../dist'),DB=localSaveDatabase();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,`http://${req.headers.host}`),pathname=decodeURIComponent(url.pathname);
    if(pathname==='/api/save') {
      const chunks=[];let bytes=0;
      for await(const chunk of req){bytes+=chunk.length;if(bytes>1000000){res.writeHead(413).end();return;}chunks.push(chunk);}
      const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);
      headers.set('oai-authenticated-user-id','local-playtest');
      const request=new Request(url,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
      let response;try{response=await saveApi(request,{DB});}catch{response=Response.json({error:'Sauvegarde locale indisponible.'},{status:503});}
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+sep)||pathname.split('/').some(p=>p.startsWith('.'))||pathname.startsWith('/server/')){res.writeHead(403).end();return;}
    const content=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(content);
  } catch(error){console.error(error.message);res.writeHead(404).end('Introuvable');}
});
const port=Number(process.env.PORT||3000);
server.listen(port,'127.0.0.1',()=>process.stdout.write(`Market Front : http://localhost:${port}\n`));
