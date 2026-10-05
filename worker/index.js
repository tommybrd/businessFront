import { validateSave, MAX_SAVE_BYTES } from '../dist/save-format.js';
import { loadSaveRow, writeSaveRow } from './save-db.js';
const ASSET_VERSION='__MARKET_FRONT_VERSION__';
const STATIC_ASSETS = '__MARKET_FRONT_ASSETS__';
function jsonResponse(body,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export async function saveApi(request,env) {
  const userId=request.headers.get('oai-authenticated-user-id');
  if(!userId)return jsonResponse({error:'Connectez-vous pour retrouver votre partie.'},401);
  if(!env.DB)return jsonResponse({error:'La sauvegarde est indisponible pour le moment.'},503);
  const url=new URL(request.url);
  if(request.method==='GET'){
    const row=await loadSaveRow(env.DB,userId);
    if(!row)return jsonResponse({revision:0,snapshot:null,ownerId:userId,hasPrevious:false,savedAt:null});
    const previous=url.searchParams.get('previous')==='1';const payload=previous?row.previous_payload:row.payload;
    if(!payload)return jsonResponse({error:'Aucune sauvegarde précédente.'},404);
    return jsonResponse({revision:row.revision,snapshot:JSON.parse(payload),ownerId:userId,hasPrevious:Boolean(row.previous_payload),savedAt:row.updated_at});
  }
  if(request.method!=='PUT')return jsonResponse({error:'Méthode non prise en charge.'},405);
  if(request.headers.get('origin')!==url.origin||request.headers.get('x-market-front-save')!=='1'||!request.headers.get('content-type')?.startsWith('application/json'))return jsonResponse({error:'Requête de sauvegarde invalide.'},403);
  if(Number(request.headers.get('content-length'))>MAX_SAVE_BYTES)return jsonResponse({error:'Cette partie dépasse la taille maximale de sauvegarde.'},413);
  const text=await request.text();if(new TextEncoder().encode(text).length>MAX_SAVE_BYTES)return jsonResponse({error:'Cette partie dépasse la taille maximale de sauvegarde.'},413);
  let body;try{body=JSON.parse(text);if(!Number.isSafeInteger(body.revision)||body.revision<0)throw new Error();validateSave(body.snapshot);}catch{return jsonResponse({error:'La partie à sauvegarder est incomplète ou incompatible.'},422);}
  if(body.ownerId!==undefined&&body.ownerId!==userId)return jsonResponse({error:'Le compte connecté a changé. Rechargez sa partie.'},403);
  const row=await writeSaveRow(env.DB,userId,body.revision,JSON.stringify(body.snapshot),new Date().toISOString());
  if(!row)return jsonResponse({error:'La partie a changé dans une autre fenêtre. Rechargez la sauvegarde avant de continuer.'},409);
  return jsonResponse({revision:row.revision,savedAt:row.updated_at,hasPrevious:body.revision>0});
}
export default { async fetch(request,env) {
  const url=new URL(request.url);
  if(url.pathname==='/api/save'){
    try{return await saveApi(request,env);}catch(error){console.error('game_save_failed',error?.message);return jsonResponse({error:'La sauvegarde est indisponible. Votre partie reste ouverte ; réessayez.'},503);}
  }
  const path=url.pathname==='/'?'/index.html':url.pathname;
  const asset=STATIC_ASSETS[path];if(!asset||!['GET','HEAD'].includes(request.method))return new Response('Introuvable',{status:404});
  return new Response(request.method==='HEAD'?null:asset.encoding==='base64'?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers:{'Content-Type':asset.type,'X-Market-Front-Asset':'1','X-Market-Front-Version':ASSET_VERSION,'Service-Worker-Allowed':'/','Cache-Control':path.endsWith('.html')?'no-store':'public, max-age=0, must-revalidate','X-Content-Type-Options':'nosniff'}});
}};
