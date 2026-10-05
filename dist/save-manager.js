import { readSave, MAX_SAVE_BYTES } from './save-format.js';
const AUTH_KEY='market-front-offline-auth-blocked';
const LOCAL_KEY='market-front-local-save-v1', DRAFT_KEY='market-front-pending-save-v1', RECOVERY_KEY='market-front-recovery-save-v1';
const CONNECTION_ERROR='Sauvegarde locale effectuée · synchronisation au retour d’Internet.';
export function createSaveManager({snapshot,apply,notify=()=>{},fetcher=globalThis.fetch,storage=globalThis.localStorage,isOnline=()=>globalThis.navigator?.onLine!==false}) {
  let revision=0,ownerId=null,lastPayload=null,inFlight=null,ready=false,hasPrevious=false,savedAt=null,dirty=false,blocked=false,loading=false,status='loading',offline=false,previousPayload=null,localAvailable=false;
  const emit=(next,message='')=>{status=next;notify({status,message,ready,hasPrevious,savedAt,revision,offline,localAvailable,hasRecovery:parse(RECOVERY_KEY)?.ownerId===ownerId});};
  const parse=key=>{try{return JSON.parse(storage?.getItem(key)||'null');}catch{return null;}};
  function localRecord(){
    try{const r=parse(LOCAL_KEY);if(!r||typeof r.ownerId!=='string'||!r.ownerId||!Number.isSafeInteger(r.revision)||r.revision<0||typeof r.dirty!=='boolean')return null;
      r.payload=readSave(r.payload);if(r.lastPayload!==null)readSave(r.lastPayload);if(r.previousPayload)r.previousPayload=readSave(r.previousPayload);return r;
    }catch{return null;}
  }
  function persist(payload=snapshot()){
    try{if(!storage||!ownerId)throw Error();readSave(payload);
      storage.setItem(LOCAL_KEY,JSON.stringify({ownerId,revision,payload,lastPayload,dirty,hasPrevious,savedAt,previousPayload}));
      localAvailable=true;
      // Retain the former draft format for older open tabs during the upgrade.
      try{if(dirty)storage.setItem(DRAFT_KEY,JSON.stringify({ownerId,revision,payload}));else if(parse(DRAFT_KEY)?.ownerId===ownerId)storage.removeItem(DRAFT_KEY);}catch{}
      return true;
    }catch{localAvailable=false;return false;}
  }
  function backup(payload=snapshot()){
    try{storage?.setItem(RECOVERY_KEY,JSON.stringify({ownerId,revision,payload:readSave(payload)}));return Boolean(storage);}catch{return false;}
  }
  function adoptLocal(r){ownerId=r.ownerId;revision=r.revision;lastPayload=r.lastPayload;dirty=r.dirty;savedAt=r.savedAt;hasPrevious=r.hasPrevious;previousPayload=r.previousPayload||null;localAvailable=true;}
  function connectionFailure(error){return !error.status||error.status>=500;}
  function lockAuth(message='Reconnectez-vous à votre compte pour synchroniser la partie.'){
    try{storage?.setItem(AUTH_KEY,ownerId||'blocked');}catch{}
    ready=false;blocked=true;offline=false;emit('load-error',message);
  }
  function conflict(){blocked=true;ready=false;persist();const retained=backup();emit('conflict',retained?'Deux parties ont avancé. Choisissez celle à reprendre ; une copie de récupération est conservée sur cet appareil.':'Deux parties ont avancé. Libérez de l’espace sur cet appareil avant de choisir celle à reprendre.');return false;}
  async function request(method,body,previous=false,keepalive=false){
    if(!isOnline())throw new TypeError('Hors ligne');
    const options={method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)};
    if(body){body={...body,ownerId};options.headers['Content-Type']='application/json';options.headers['X-Market-Front-Save']='1';options.body=JSON.stringify(body);options.keepalive=keepalive&&new TextEncoder().encode(options.body).length<60000;}
    const response=await fetcher(`/api/save${previous?'?previous=1':''}`,options);
    if(response.status>=500&&!response.headers.get('Content-Type')?.includes('application/json'))throw Object.assign(new Error('Connexion indisponible.'),{status:response.status});
    if(response.redirected||!response.headers.get('Content-Type')?.includes('application/json')){const error=new Error('Reconnectez-vous pour retrouver votre partie.');error.status=401;throw error;}
    const result=await response.json();if(!response.ok){const error=new Error(result.error||'Sauvegarde indisponible.');error.status=response.status;throw error;}return result;
  }
  function localFallback(error){
    if(!connectionFailure(error))return false;
    try{if(storage?.getItem(AUTH_KEY))return false;}catch{return false;}
    const r=localRecord();if(!r||ownerId&&r.ownerId!==ownerId)return false;
    adoptLocal(r);apply(r.payload);ready=true;blocked=false;offline=true;emit('offline',CONNECTION_ERROR);return true;
  }
  async function load(previous=false){
    if(loading)return false;loading=true;if(inFlight)await inFlight;
    const choosingCloud=blocked&&status==='conflict';if(choosingCloud&&!backup()){emit('error','Impossible de conserver la copie locale. Libérez de l’espace avant de choisir une partie.');loading=false;return false;}
    ready=false;emit('loading','Chargement de la partie…');
    try{
      const result=await request('GET',null,previous),local=localRecord(),remote=result.snapshot?readSave(result.snapshot):null;
      if(!previous&&!choosingCloud&&local?.ownerId===result.ownerId&&local.dirty&&local.revision!==result.revision&&JSON.stringify(local.payload)!==JSON.stringify(remote)){
        adoptLocal(local);apply(local.payload);offline=false;return conflict();
      }
      try{storage?.removeItem(AUTH_KEY);}catch{}
      ownerId=result.ownerId;revision=result.revision;hasPrevious=result.hasPrevious;savedAt=result.savedAt;blocked=false;offline=false;
      previousPayload=local?.ownerId===ownerId?local.previousPayload||null:null;
      let restored=remote;
      if(previous){previousPayload=readSave(snapshot());backup(previousPayload);}
      else if(!choosingCloud&&local?.ownerId===ownerId&&local.dirty&&local.revision===revision)restored=local.payload;
      else if(!choosingCloud){const draft=parse(DRAFT_KEY);if(draft?.ownerId===ownerId&&draft.revision===revision){try{restored=readSave(draft.payload);}catch{}}}
      if(restored)apply(restored);ready=true;lastPayload=!previous&&remote?JSON.stringify(remote):null;dirty=previous||JSON.stringify(snapshot())!==lastPayload;
      persist();emit(dirty?'pending':'saved');if(dirty)await flush();return ready;
    }catch(error){
      if(!previous&&!choosingCloud&&localFallback(error))return true;
      if(previous&&connectionFailure(error)){const r=localRecord();if(r?.ownerId===ownerId&&r.previousPayload){previousPayload=r.payload;apply(r.previousPayload);ready=true;blocked=false;offline=true;dirty=true;persist();emit('offline',CONNECTION_ERROR);return true;}}
      if(error.status===401||error.status===403){lockAuth(error.message);return false;}
      ready=false;emit('load-error',error.message||'Impossible de charger la partie. Réessayez.');return false;
    }finally{loading=false;}
  }
  function changed(){if(!ready||blocked)return;dirty=JSON.stringify(snapshot())!==lastPayload;
    if(!persist()){emit('error','Sauvegarde sur l’appareil indisponible. Gardez le jeu ouvert et reconnectez-vous.');return;}
    if(offline||!isOnline())emit('offline',CONNECTION_ERROR);else if(status==='saved')emit('pending');
  }
  async function reconcile(){
    const result=await request('GET');
    if(result.ownerId!==ownerId){lockAuth('Le compte connecté a changé. Rechargez sa partie avant de continuer.');return false;}
    const remote=result.snapshot?JSON.stringify(readSave(result.snapshot)):null;
    if(result.revision!==revision){
      if(dirty&&JSON.stringify(snapshot())!==remote)return conflict();
      if(!dirty&&remote)apply(readSave(remote));
      revision=result.revision;lastPayload=remote;dirty=JSON.stringify(snapshot())!==lastPayload;
    }
    hasPrevious=result.hasPrevious;savedAt=result.savedAt;offline=false;persist();return true;
  }
  async function flush(keepalive=false){
    if(!ready||blocked)return false;if(inFlight)return inFlight;
    inFlight=Promise.resolve().then(async()=>{
      try{
        let payload=snapshot();dirty=JSON.stringify(payload)!==lastPayload;
        if(new TextEncoder().encode(JSON.stringify(payload)).length>MAX_SAVE_BYTES-100)throw Object.assign(new Error('Cette partie dépasse la taille maximale de sauvegarde.'),{status:413});
        const stored=persist(payload);
        if(!isOnline()){offline=true;if(!stored){emit('error','Impossible de sauvegarder sur cet appareil. Gardez le jeu ouvert.');return false;}emit('offline',CONNECTION_ERROR);return false;}
        if(offline&&!await reconcile())return false;
        payload=snapshot();const serialized=JSON.stringify(payload);
        if(serialized===lastPayload){dirty=false;persist(payload);emit('saved');return true;}
        emit('saving');
        const result=await request('PUT',{revision,snapshot:payload},false,keepalive);
        revision=result.revision;hasPrevious=result.hasPrevious;savedAt=result.savedAt;lastPayload=serialized;offline=false;dirty=JSON.stringify(snapshot())!==lastPayload;
        persist();emit(dirty?'pending':'saved');return true;
      }catch(error){
        dirty=JSON.stringify(snapshot())!==lastPayload;persist();
        if(error.status===409)return conflict();
        if(error.status===401||error.status===403){lockAuth(error.message);return false;}
        if(connectionFailure(error)&&localAvailable){offline=true;emit('offline',CONNECTION_ERROR);}else emit('error',error.message||'Sauvegarde indisponible.');return false;
      }finally{inFlight=null;}
    });return inFlight;
  }
  async function newGame(payload){
    if(!ready||blocked||loading)return false;loading=true;if(inFlight)await inFlight;
    if(!ready||blocked){loading=false;return false;}
    const validated=readSave(payload),old=readSave(snapshot());ready=false;emit('saving');
    try{
      if(offline){ready=true;if(isOnline()&&!await reconcile())return false;ready=false;}
      const result=await request('PUT',{revision,snapshot:validated});
      previousPayload=old;revision=result.revision;hasPrevious=result.hasPrevious;savedAt=result.savedAt;apply(validated);lastPayload=JSON.stringify(validated);dirty=false;offline=false;ready=true;persist();emit('saved','Nouvelle partie créée.');return true;
    }catch(error){
      if(connectionFailure(error)){
        const oldPrevious=previousPayload;previousPayload=old;dirty=true;
        if(persist(validated)){apply(validated);ready=true;offline=true;hasPrevious=true;persist();emit('offline',CONNECTION_ERROR);return true;}
        previousPayload=oldPrevious;ready=true;emit('error','Impossible de sauvegarder la nouvelle partie sur cet appareil.');return false;
      }
      if(error.status===409){ready=true;return conflict();}
      if(error.status===401||error.status===403)lockAuth(error.message);else{ready=true;emit('error',error.message);}return false;
    }finally{loading=false;}
  }
  async function keepLocal(){
    if(!blocked||status!=='conflict'||loading)return false;loading=true;
    try{if(!backup())throw Error('Impossible de conserver la copie de récupération.');
      const result=await request('GET');if(result.ownerId!==ownerId){lockAuth();return false;}
      // The explicitly chosen local branch replaces only the revision just read.
      revision=result.revision;lastPayload=result.snapshot?JSON.stringify(readSave(result.snapshot)):null;blocked=false;ready=true;offline=false;dirty=true;persist();return await flush();
    }catch(error){emit('conflict',error.message);return false;}finally{loading=false;}
  }
  async function recoverLocal(){
    const recovery=parse(RECOVERY_KEY);if(!ready||blocked||recovery?.ownerId!==ownerId)return false;
    try{return await newGame(readSave(recovery.payload));}catch{return false;}
  }
  return {load,flush,changed,newGame,keepLocal,recoverLocal,lockAuth,get ready(){return ready;},get hasPrevious(){return hasPrevious;},get revision(){return revision;},get dirty(){return dirty;},get offline(){return offline;}};
}
