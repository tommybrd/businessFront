export function startOfflineSupport({notify=()=>{},onAuthRequired=()=>{},isFlightMode=()=>false}={}){
  const sw=globalThis.navigator?.serviceWorker;
  const unavailable=()=>{throw Error('Mode hors ligne indisponible dans ce navigateur.');};
  if(!sw){notify('Mode hors ligne indisponible dans ce navigateur.');return {setFlightMode:unavailable};}
  notify('Préparation du jeu hors ligne…');
  sw.addEventListener('message',event=>{if(event.data?.type==='AUTH_REQUIRED')onAuthRequired();});
  function ask(worker,data){
    return new Promise((resolve,reject)=>{
      const channel=new MessageChannel();
      const timer=setTimeout(()=>{channel.port1.close();reject(Error('Le téléchargement est encore en cours. Réessayez avant le départ.'));},10000);
      channel.port1.onmessage=event=>{clearTimeout(timer);channel.port1.close();event.data.error?reject(Error(event.data.error)):resolve(event.data);};
      try{worker.postMessage(data,[channel.port2]);}catch(error){clearTimeout(timer);channel.port1.close();reject(error);}
    });
  }
  function inspect(worker){
    if(!worker)return;
    ask(worker,{type:'OFFLINE_STATUS'}).then(info=>notify(info.ready?(info.flightMode?'Prêt pour l’avion · sauvegarde sur cet appareil':'Jeu disponible hors ligne'):'Téléchargement incomplet · reconnectez-vous.')).catch(error=>notify(error.message));
  }
  const register=async()=>{
    try{
      // A prepared flight uses the installed game, including when the connection is a captive portal.
      const existing=await sw.getRegistration('./');
      if(isFlightMode()&&existing?.active){inspect(existing.active);return existing;}
      const registration=await sw.register('./sw.js',{scope:'./',updateViaCache:'none'});
      inspect(registration.active);
      const watch=worker=>worker?.addEventListener('statechange',()=>{
        if(worker.state==='activated')inspect(worker);
        if(worker.state==='installed'&&registration.waiting)notify('Mise à jour prête · fermez les fenêtres du jeu pour l’appliquer.');
        if(worker.state==='redundant'&&!registration.active)notify('Téléchargement incomplet · réessayez avec Internet.');
      });
      watch(registration.installing);registration.addEventListener('updatefound',()=>watch(registration.installing));
      globalThis.navigator.storage?.persist?.().catch(()=>{});return registration;
    }catch{notify('Préparation hors ligne indisponible · reconnectez-vous pour réessayer.');return null;}
  };
  register();globalThis.addEventListener?.('online',register);
  async function setFlightMode(enabled){
    let registration=await sw.getRegistration('./');
    if(!registration?.active){
      await register();
      let timer;
      try{registration=await Promise.race([sw.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Téléchargement encore en cours. Attendez avant le départ.')),30000);})]);}finally{clearTimeout(timer);}
    }
    const result=await ask(registration.active,{type:'SET_FLIGHT_MODE',enabled});
    if(enabled&&!result.ready)throw Error('Le téléchargement du jeu est incomplet.');
    notify(enabled?'Prêt pour l’avion · sauvegarde sur cet appareil':'Jeu disponible hors ligne');
    if(!enabled)register();return result;
  }
  return {setFlightMode};
}
