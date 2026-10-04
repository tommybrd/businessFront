import { readSave, MAX_SAVE_BYTES } from './save-format.js';
export function createSaveManager({snapshot,apply,notify=()=>{},fetcher=globalThis.fetch,storage=globalThis.localStorage}) {
  let revision=0,ownerId=null,lastPayload=null,inFlight=null,ready=false,hasPrevious=false,savedAt=null,dirty=false,blocked=false,loading=false,status='loading';
  const key='market-front-pending-save-v1';
  const emit=(next,message='')=>{status=next;notify({status,message,ready,hasPrevious,savedAt,revision});};
  const draft=(payload)=>{try{storage?.setItem(key,JSON.stringify({ownerId,revision,payload}));}catch{}};
  const clearDraft=()=>{try{const item=JSON.parse(storage?.getItem(key)||'null');if(item?.ownerId===ownerId)storage?.removeItem(key);}catch{}};
  async function request(method,body,previous=false,keepalive=false){
    const options={method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
    if(body){options.headers['Content-Type']='application/json';options.headers['X-Market-Front-Save']='1';options.body=JSON.stringify(body);options.keepalive=keepalive&&new TextEncoder().encode(options.body).length<60000;}
    const response=await fetcher(`/api/save${previous?'?previous=1':''}`,options);
    const result=await response.json();if(!response.ok){const error=new Error(result.error||'Sauvegarde indisponible.');error.status=response.status;throw error;}return result;
  }
  async function load(previous=false){
    if(loading)return false;loading=true;
    if(inFlight)await inFlight;
    ready=false;emit('loading','Chargement de la partie…');
    try{
      const result=await request('GET',null,previous);revision=result.revision;ownerId=result.ownerId;hasPrevious=result.hasPrevious;savedAt=result.savedAt;blocked=false;
      let restored=result.snapshot?readSave(result.snapshot):null;
      if(!previous){try{const local=JSON.parse(storage?.getItem(key)||'null');if(local?.ownerId===ownerId&&local.revision===revision)restored=readSave(local.payload);}catch{}}
      if(restored)apply(restored);ready=true;lastPayload=!previous&&result.snapshot?JSON.stringify(readSave(result.snapshot)):null;dirty=previous||JSON.stringify(snapshot())!==lastPayload;
      emit(dirty?'pending':'saved',restored?'Partie reprise en pause.':'Votre première partie sera sauvegardée automatiquement.');
      if(dirty)await flush();return true;
    }catch(error){ready=false;emit('load-error',error.message||'Impossible de charger la partie. Réessayez.');return false;}finally{loading=false;}
  }
  function changed(){if(!ready||blocked)return;dirty=true;try{draft(snapshot());}catch(error){emit('error',error.message);return;}if(status==='saved')emit('pending');}
  async function flush(keepalive=false){
    if(!ready||blocked)return false;
    if(inFlight){dirty=true;return inFlight;}
    let payload;try{payload=snapshot();const serialized=JSON.stringify(payload);if(serialized===lastPayload){dirty=false;emit('saved');return true;}if(new TextEncoder().encode(serialized).length>MAX_SAVE_BYTES-100)throw new Error('Cette partie dépasse la taille maximale de sauvegarde.');draft(payload);}catch(error){emit('error',error.message);return false;}
    dirty=false;emit('saving');
    inFlight=(async()=>{try{const result=await request('PUT',{revision,snapshot:payload},false,keepalive);revision=result.revision;hasPrevious=result.hasPrevious;savedAt=result.savedAt;lastPayload=JSON.stringify(payload);clearDraft();if(JSON.stringify(snapshot())!==lastPayload){dirty=true;draft(snapshot());}emit(dirty?'pending':'saved');return true;}catch(error){dirty=true;if(error.status===409){blocked=true;ready=false;emit('conflict',error.message);}else emit('error',error.message||'Connexion interrompue. Réessayez de sauvegarder.');return false;}finally{inFlight=null;}})();
    return inFlight;
  }
  async function newGame(payload){
    if(!ready||blocked||loading)return false;loading=true;
    if(inFlight)await inFlight;
    if(!ready||blocked){loading=false;return false;}
    ready=false;emit('saving');
    try{const validated=readSave(payload),result=await request('PUT',{revision,snapshot:validated});revision=result.revision;hasPrevious=result.hasPrevious;savedAt=result.savedAt;apply(validated);lastPayload=JSON.stringify(validated);dirty=false;clearDraft();ready=true;emit('saved','Nouvelle partie créée.');return true;}
    catch(error){blocked=error.status===409;ready=!blocked;emit(blocked?'conflict':'error',error.message);return false;}
    finally{loading=false;}
  }
  return {load,flush,changed,newGame,get ready(){return ready;},get hasPrevious(){return hasPrevious;},get revision(){return revision;},get dirty(){return dirty;}};
}
