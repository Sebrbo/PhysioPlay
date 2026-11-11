import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { coverRect, visibleTargetZone, advanceCountdown, containRect, insetZone, scaleZone, advanceSessionClock, calibratedZone, contains, defaultZone, mirror, nextTarget, type Hand, type Point, type Zone } from './game';

type Phase = 'idle'|'ready'|'countdown'|'calibrating'|'playing'|'paused'|'result';
type Stats = { hits:number; misses:number; times:number[]; remaining:number };
const initialStats=(duration:number):Stats=>({hits:0,misses:0,times:[],remaining:duration});

export default function App(){
  const [immersive,setImmersive]=useState(false);
  const [zoneWidth,setZoneWidth]=useState(150),[zoneHeight,setZoneHeight]=useState(150);
  const play=useRef<HTMLElement>(null);
  const hud=useRef<HTMLDivElement>(null);
  const settingsDialog=useRef<HTMLDialogElement>(null);
  const [settingsOpen,setSettingsOpen]=useState(false),[settingsTab,setSettingsTab]=useState<'session'|'zone'|'about'>('session');
  const [countdown,setCountdown]=useState(5);
  const [mode,setMode]=useState<'therapy'|'reaction'>('therapy');
  const [hand,setHand]=useState<Hand>('both');
  const [duration,setDuration]=useState(60),[deadline,setDeadline]=useState(4),[size,setSize]=useState(48);
  const [phase,setPhase]=useState<Phase>('idle'),[source,setSource]=useState<'camera'|'demo'|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('Choisis un mode, puis active la caméra pour commencer.');
  const [tracking,setTracking]=useState(false),[zone,setZone]=useState<Zone|null>(null);
  const [stats,setStats]=useState(initialStats(60)),[consent,setConsent]=useState(false);
  const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null);
  const stream=useRef<MediaStream|null>(null),detector=useRef<PoseLandmarker|null>(null),generation=useRef(0);
  const effectiveZone=zone?scaleZone(zone,zoneWidth,zoneHeight):null;
  const state=useRef({phase,source,mode,hand,duration,deadline,size,zone:effectiveZone,immersive});
  state.current={phase,source,mode,hand,duration,deadline,size,zone:effectiveZone,immersive};
  const runtime=useRef({target:null as Point|null,hands:[] as Point[],samples:[] as Point[],calibrationStart:0,calibrationValid:0,last:0,lastSeen:0,lastVideo:-1,countdownMs:5000,active:0,targetAge:0,dwell:0,stats:initialStats(60),number:1,pointer:null as Point|null});
  const changePhase=(p:Phase)=>{runtime.current.last=performance.now();state.current.phase=p;setPhase(p);};
  const stop=()=>{generation.current++;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;detector.current?.close();detector.current=null;if(video.current)video.current.srcObject=null;runtime.current.hands=[];runtime.current.target=null;setTracking(false);setSource(null);setZone(null);changePhase('idle');setBusy(false);};
  useEffect(()=>()=>{generation.current++;stream.current?.getTracks().forEach(t=>t.stop());detector.current?.close();},[]);
  useEffect(()=>{const hidden=()=>{if(document.hidden&&state.current.phase==='countdown'){changePhase('ready');setMessage('Départ annulé : l’application a été masquée.');}if(document.hidden && ['playing','calibrating'].includes(state.current.phase)){changePhase('paused');setMessage('Séance en pause : l’application a été masquée.');}};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},[]);
  useEffect(()=>{const resize=()=>{if(state.current.phase==='countdown'){changePhase('ready');setMessage('Affichage modifié : calibre à nouveau avant de commencer.');}if(['playing','calibrating'].includes(state.current.phase)){changePhase('paused');setMessage('Affichage modifié : recalibre avant de reprendre.');}setZone(null);};window.addEventListener('orientationchange',resize);return()=>window.removeEventListener('orientationchange',resize);},[]);

  useEffect(()=>{
    if(!immersive)return;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setImmersive(false);};
    const exited=()=>{if(!document.fullscreenElement)setImmersive(false);};
    window.addEventListener('keydown',escape);document.addEventListener('fullscreenchange',exited);
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',escape);document.removeEventListener('fullscreenchange',exited);};
  },[immersive]);
  useEffect(()=>{const dialog=settingsDialog.current;if(!dialog)return;if(settingsOpen&&!dialog.open)dialog.showModal();else if(!settingsOpen&&dialog.open)dialog.close();},[settingsOpen]);
  async function toggleFullscreen(){
    if(immersive){if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});setImmersive(false);return;}
    setImmersive(true);
    // Le mode immersif reste disponible si Safari ne propose pas l'API plein écran.
    try{await play.current?.requestFullscreen?.();}catch{/* affichage sur toute la fenêtre */}
  }
  async function backToPreparation(){
    if(state.current.phase!=='idle'){changePhase('ready');runtime.current.target=null;setMessage('Retour à la préparation. La caméra reste active.');}
    if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});
    setImmersive(false);
  }
  function demoPointer(e:React.PointerEvent<HTMLDivElement>){
    if(source!=='demo')return;
    const b=e.currentTarget.getBoundingClientRect(),fit=(immersive?coverRect:containRect)(b.width,b.height,4/3);
    const x=(e.clientX-b.left-fit.x)/fit.width,y=(e.clientY-b.top-fit.y)/fit.height;
    runtime.current.pointer=x>=0&&x<=1&&y>=0&&y<=1?{x,y}:null;
  }

  async function startCamera(){
    if(busy)return;const id=++generation.current;setBusy(true);setMessage('Ouverture de la caméra et chargement du suivi…');
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('La caméra nécessite HTTPS et un navigateur compatible.');
      const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}}});
      if(id!==generation.current){media.getTracks().forEach(t=>t.stop());return;}stream.current=media;
      video.current!.srcObject=media;await video.current!.play();
      const files=await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}mediapipe/wasm`);
      const model=await PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:`${import.meta.env.BASE_URL}mediapipe/pose_landmarker_lite.task`,delegate:'CPU'},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.6,minTrackingConfidence:.6,minPosePresenceConfidence:.6});
      if(id!==generation.current){model.close();return;}detector.current=model;runtime.current.lastVideo=-1;setSource('camera');setZone(null);changePhase('ready');setMessage('Cadre le haut du corps et les mains. Lance ensuite la calibration.');
      media.getVideoTracks()[0].addEventListener('ended',()=>{if(id===generation.current){stop();setMessage('Caméra déconnectée. Active-la à nouveau.');}});
    }catch(e){if(id===generation.current){stop();setMessage(e instanceof DOMException && e.name==='NotAllowedError'?'Accès caméra refusé. Autorise la caméra dans les réglages du navigateur, puis réessaie.':`Caméra indisponible : ${e instanceof Error?e.message:'erreur inconnue'}`);}}
    finally{if(id===generation.current)setBusy(false);}
  }
  function demo(){stop();setSource('demo');setZone(defaultZone);changePhase('ready');setMessage('Démonstration : déplace le pointeur ou ton doigt sur les cibles. Aucun suivi corporel.');}
  function calibrate(){runtime.current.samples=[];runtime.current.calibrationStart=performance.now();runtime.current.calibrationValid=0;setZone(null);changePhase('calibrating');setMessage('Pendant 8 secondes de suivi, balaie doucement ta zone confortable avec la ou les mains choisies.');}
  function start(){
    if(!zone){changePhase('ready');setMessage('Calibre à nouveau la zone avant de commencer.');return;}
    const r=runtime.current;r.stats=initialStats(duration);r.active=0;r.targetAge=0;r.dwell=0;r.number=1;r.target=null;r.countdownMs=5000;
    setStats({...r.stats});setCountdown(5);changePhase('countdown');setMessage('Prépare-toi : tu as 5 secondes pour passer en plein écran et te placer.');
  }
  function finish(){changePhase('result');runtime.current.target=null;setStats({...runtime.current.stats});setMessage('Séance terminée. Les résultats restent uniquement en mémoire.');}

  useEffect(()=>{
    let raf=0;
    function frame(now:number){
      const s=state.current,r=runtime.current,elapsed=Math.max(0,now-r.last),dt=Math.min(elapsed,100);r.last=now;
      const el=canvas.current,v=video.current;if(!el||!v){raf=requestAnimationFrame(frame);return;}
      const ctx=el.getContext('2d')!;const outerW=el.clientWidth,outerH=el.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
      if(el.width!==Math.round(outerW*dpr)||el.height!==Math.round(outerH*dpr)){el.width=Math.round(outerW*dpr);el.height=Math.round(outerH*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,outerW,outerH);
      const fit=(s.immersive?coverRect:containRect)(outerW,outerH,s.source==='camera'&&v.videoWidth?v.videoWidth/v.videoHeight:4/3);
      const w=fit.width,h=fit.height;ctx.translate(fit.x,fit.y);
      const hudInset=hud.current?hud.current.offsetTop+hud.current.offsetHeight:76;
      const targetZone=s.zone?(s.immersive?visibleTargetZone(s.zone,s.size,outerW,outerH,fit,hudInset):insetZone(s.zone,s.size,w,h)):null;
      if(r.target&&targetZone){r.target={x:Math.max(targetZone.left,Math.min(targetZone.right,r.target.x)),y:Math.max(targetZone.top,Math.min(targetZone.bottom,r.target.y))};}
      if(s.source==='camera'&&detector.current&&v.readyState>=2&&v.currentTime!==r.lastVideo){
        r.lastVideo=v.currentTime;
        try{const pose=detector.current.detectForVideo(v,now).landmarks[0];const indices=s.hand==='left'?[15]:s.hand==='right'?[16]:[15,16];
          r.hands=pose?indices.filter(i=>(pose[i].visibility??0)>.65).map(i=>mirror(pose[i])):[];if(r.hands.length)r.lastSeen=now;
        }catch{changePhase('paused');setMessage('Le suivi a été interrompu. Arrête puis réactive la caméra.');r.hands=[];}
      }
      if(s.source==='camera'&&now-r.lastSeen>300)r.hands=[];
      if(s.source==='demo')r.hands=r.pointer?[r.pointer]:[];
      const valid=r.hands.length>0;setTracking(previous=>previous===valid?previous:valid);
      if(s.phase==='calibrating'){
        if(valid){r.calibrationValid+=dt;r.samples.push(...r.hands);}
        setMessage(`Explore ta zone confortable · ${Math.max(0,8-Math.floor(r.calibrationValid/1000))} s de suivi restantes`);
        if(r.calibrationValid>=8000){const z=calibratedZone(r.samples);setZone(z);changePhase('ready');setMessage(z?'Calibration prête. Reste à la même place pour jouer.':'Zone insuffisante. Recule pour cadrer les mains et recommence sans forcer.');}
        else if(now-r.calibrationStart>30000){changePhase('ready');setMessage('Calibration interrompue : suivi insuffisant. Vérifie le cadrage et réessaie.');}
      }
      if(s.phase==='countdown'){
        const clock=advanceCountdown(r.countdownMs,elapsed);r.countdownMs=clock.remainingMs;setCountdown(clock.seconds);
        if(clock.done){if(targetZone){r.target=nextTarget(targetZone,null);changePhase('playing');setMessage('Atteins le centre de la cible avec le poignet.');}else{changePhase('ready');setMessage('Calibre la zone avant de commencer.');}}
      }
      else if(s.phase==='playing'){
        const clock=advanceSessionClock(r.active,elapsed,s.duration);
        r.active=clock.elapsed;r.stats.remaining=clock.remaining;
        if(clock.done){finish();}
        else if(valid){r.targetAge+=elapsed;
          if(r.target){const touching=r.hands.some(p=>contains(p,r.target!,s.size,w,h));r.dwell=touching?r.dwell+dt:0;
            if(r.dwell>=(s.mode==='therapy'?250:80)){r.stats.hits++;r.stats.times.push(r.targetAge);r.number++;r.target=nextTarget(targetZone!,r.target);r.targetAge=0;r.dwell=0;}
            else if(s.mode==='reaction'&&r.targetAge>=s.deadline*1000){r.stats.misses++;r.number++;r.target=nextTarget(targetZone!,r.target);r.targetAge=0;r.dwell=0;}
          }
          
        }else{r.dwell=0;}
        setStats({...r.stats,times:[...r.stats.times]});
      }
      const z=targetZone;if(z&&(!s.immersive||s.phase==='ready'||s.phase==='calibrating')){ctx.strokeStyle='#50d5c570';ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.strokeRect(z.left*w,z.top*h,(z.right-z.left)*w,(z.bottom-z.top)*h);ctx.setLineDash([]);}
      if(r.target&&['playing','paused'].includes(s.phase)){
        const x=r.target.x*w,y=r.target.y*h;ctx.shadowColor='#51e4c6';ctx.shadowBlur=25;ctx.fillStyle='#46d4b9';ctx.beginPath();ctx.arc(x,y,s.size,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,s.size+7,-Math.PI/2,-Math.PI/2+Math.PI*2*(s.mode==='reaction'?Math.max(0,1-r.targetAge/(s.deadline*1000)):1));ctx.stroke();ctx.fillStyle='#0b3040';ctx.font='bold 27px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(r.number),x,y);
      }
      r.hands.forEach(p=>{ctx.beginPath();ctx.arc(p.x*w,p.y*h,12,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#13a9e0';ctx.lineWidth=4;ctx.stroke();});
      raf=requestAnimationFrame(frame);
    }raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
  },[]);

  const locked=busy||['playing','paused','countdown','calibrating'].includes(phase);
  const mean=stats.times.length?`${(stats.times.reduce((a,b)=>a+b,0)/stats.times.length/1000).toFixed(2)} s`:'—';
  return <div className="app">
    <header><a className="brand" href="./"><span className="brand-icon">◎</span> Physio<span>Play</span></a><span className="version">V0.1.4 <i/> Traitement local</span></header>
    <main><section ref={play} className={`play ${immersive?'immersive':''}`} aria-label="Espace de jeu PhysioTargets">
      <div className="play-top"><div className="game-title"><strong>PhysioTargets</strong><span>{source==='demo'?'Démonstration':source==='camera'?(tracking?'● Poignet détecté':'○ En attente de suivi'):'Caméra désactivée'}</span></div>
      <div className="top-actions"><button disabled={locked} onClick={()=>setSettingsOpen(true)}>⚙ Réglages</button><button onClick={toggleFullscreen}>{immersive?'↙ Quitter le plein écran':'⛶ Plein écran'}</button></div></div>
      <div className="setup-toolbar">
      <span className="session-summary">{mode==='therapy'?'Thérapeutique':'Réactivité'} · {duration} s · zone {zoneWidth} × {zoneHeight} %</span>
      <div className="session-actions">
      {!source&&<><label className="consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>Autoriser la caméra</label><button className="primary" disabled={!consent||busy} onClick={startCamera}>{busy?'Chargement…':'Activer la caméra'}</button><button disabled={busy} onClick={demo}>Démonstration</button></>}
      {source&&<>{source==='camera'&&<button disabled={locked} onClick={calibrate}>{zone?'Recalibrer':'Calibrer · 8 s'}</button>}
      {!locked&&<button className="primary" disabled={!zone} onClick={start}>Commencer · départ dans 5 s</button>}
      <button onClick={stop}>Arrêter {source==='camera'?'la caméra':'la démo'}</button></>}
      </div></div>
    <div className="stage" ref={stage} style={{aspectRatio:source==='camera'&&video.current?.videoWidth?`${video.current.videoWidth}/${video.current.videoHeight}`:'4/3'}} onPointerMove={demoPointer} onPointerLeave={()=>runtime.current.pointer=null} onPointerDown={demoPointer} onPointerUp={()=>{runtime.current.pointer=null;}}>
    <video ref={video} muted playsInline aria-label="Retour de la caméra en miroir"/><canvas ref={canvas} aria-label="Cibles et position des poignets"/>
    {immersive&&<>
      <div className="immersive-hud" ref={hud}><div className="hud-stats" aria-label="Score et chronomètre"><div><span>CIBLES</span><strong>{String(stats.hits).padStart(2,'0')}</strong></div><div><span>CHRONO</span><strong>{Math.ceil(['ready','idle','countdown'].includes(phase)?duration:stats.remaining)}<small> s</small></strong></div></div>
      <div className="hud-actions"><button aria-label="Retour à la préparation" onClick={backToPreparation}>← Retour</button>{phase==='playing'&&<button onClick={()=>changePhase('paused')}>Ⅱ Pause</button>}</div></div>
      {!locked&&phase!=='result'&&<div className="immersive-prepare">{!source?<button onClick={backToPreparation}>Préparer la caméra</button>:zone?<button className="primary" onClick={start}>Commencer · départ dans 5 s</button>:<button onClick={calibrate}>Calibrer · 8 s</button>}</div>}
    </>}

    {!source&&<div className="welcome"><div className="target-icon">◎</div><h2>Un peu de mouvement.<br/>Beaucoup de possibilités.</h2><p>Active la caméra et retrouve-toi<br/>au centre du jeu.</p><span>CAMÉRA FRONTALE · SANS CAPTEUR</span></div>}
    {phase==='countdown'&&<div className="overlay countdown-overlay" aria-live="polite"><p>PRÊT À JOUER ?</p><strong className="countdown-number">{countdown}</strong><p>Place-toi confortablement. Le chrono démarrera après le décompte.</p><button onClick={()=>{changePhase('ready');setMessage('Départ annulé.');}}>Annuler le départ</button></div>}
    {phase==='playing'&&!tracking&&<div className="tracking-notice" role="status">Replace les mains dans le cadre · la séance continue</div>}
    {phase==='paused'&&<div className="overlay"><h2>Une pause pour souffler.</h2><button className="primary" disabled={!zone} onClick={()=>changePhase('playing')}>Reprendre</button><button onClick={backToPreparation}>Revenir à la préparation</button></div>}
    {phase==='result'&&<div className="overlay result"><p className="eyebrow">SÉANCE TERMINÉE</p><h2>{stats.hits} cibles atteintes</h2><p>Temps moyen d’atteinte : {mean}<br/>{mode==='reaction'?`${stats.misses} cibles expirées`:'Chaque mouvement compte.'}</p><button className="primary" onClick={start}>Rejouer</button><button onClick={backToPreparation}>Modifier la séance</button></div>}
    {!immersive&&phase==='playing'&&tracking&&<span className="stage-hint">{mode==='therapy'?'Maintiens le poignet sur la cible · ¼ s':'Touche la cible avant la fin du cercle'}</span>}

      </div><div className="metrics"><div><span>CIBLES</span><strong>{String(stats.hits).padStart(2,'0')}</strong></div><div><span>TEMPS RESTANT</span><strong>{Math.ceil(['ready','idle','countdown'].includes(phase)?duration:stats.remaining)}<small> s</small></strong></div>
      <div className="game-actions">{phase==='playing'&&<button onClick={()=>changePhase('paused')}>Ⅱ Pause</button>}{phase==='countdown'&&<button onClick={()=>{changePhase('ready');setMessage('Départ annulé.');}}>Annuler</button>}{(phase==='playing'||phase==='paused')&&<button onClick={finish}>Terminer</button>}</div></div>
      <p className="status" role="status">{message}</p>
      <dialog ref={settingsDialog} className="settings-dialog" aria-labelledby="settings-title" onCancel={()=>setSettingsOpen(false)} onClose={()=>setSettingsOpen(false)}>
        <div className="dialog-header"><h2 id="settings-title">Réglages</h2><button aria-label="Fermer les réglages" onClick={()=>setSettingsOpen(false)}>✕ Fermer</button></div>
        <div className="settings-tabs" role="tablist" aria-label="Catégories des réglages">{([['session','Séance'],['zone','Zone des cibles'],['about','À propos']] as const).map(([id,label])=><button key={id} id={`tab-${id}`} role="tab" aria-selected={settingsTab===id} aria-controls={`panel-${id}`} onClick={()=>setSettingsTab(id)}>{label}</button>)}</div>
        <div className="settings-body" role="tabpanel" id={`panel-${settingsTab}`} aria-labelledby={`tab-${settingsTab}`}>
        {settingsTab==='session'&&<>
          <div className="modes"><button className={mode==='therapy'?'selected':''} onClick={()=>setMode('therapy')}><strong>Thérapeutique</strong><small>Atteindre sans délai</small></button><button className={mode==='reaction'?'selected':''} onClick={()=>setMode('reaction')}><strong>Réactivité</strong><small>Toucher avant expiration</small></button></div>
          <div className="fields"><label>Main suivie<select value={hand} onChange={e=>{setHand(e.target.value as Hand);setZone(null);}}><option value="both">Les deux mains</option><option value="left">Main gauche</option><option value="right">Main droite</option></select></label>
          <label>Durée<select value={duration} onChange={e=>setDuration(+e.target.value)}>{[30,60,90,120].map(n=><option key={n} value={n}>{n} secondes</option>)}</select></label>
          <label>Taille des cibles<select value={size} onChange={e=>setSize(+e.target.value)}><option value={60}>Grande</option><option value={48}>Moyenne</option><option value={34}>Petite</option></select></label>
          {mode==='reaction'&&<label>Délai par cible<select value={deadline} onChange={e=>setDeadline(+e.target.value)}>{[2,3,4,6,8].map(n=><option key={n} value={n}>{n} secondes</option>)}</select></label>}</div>
          <p className="helper">Chaque départ comporte 5 secondes de préparation, hors durée de séance. Un changement de main demande une nouvelle calibration.</p>
        </>}
        {settingsTab==='zone'&&<><label>Largeur · {zoneWidth} %<input type="range" min="50" max="150" step="5" value={zoneWidth} onChange={e=>setZoneWidth(+e.target.value)}/></label><label>Hauteur · {zoneHeight} %<input type="range" min="50" max="150" step="5" value={zoneHeight} onChange={e=>setZoneHeight(+e.target.value)}/></label>
        <div className="zone-presets"><button onClick={()=>{setZoneWidth(150);setZoneHeight(150);}}>Par défaut · 150 %</button><button onClick={()=>{setZoneWidth(100);setZoneHeight(100);}}>Zone calibrée · 100 %</button></div><p className="helper">150 % par défaut. Au-delà de 100 %, les cibles dépassent la zone explorée : ajuste les réglages pour garder des mouvements confortables.</p></>}
        {settingsTab==='about'&&<div className="about"><h3>Caméra privée</h3><p>Images et coordonnées traitées sur cet appareil, sans enregistrement ni envoi. Aucun historique patient.</p><h3>Installation et confort</h3><p>Appareil stable, haut du corps et mains visibles. Calibre en bougeant doucement, sans rechercher ton amplitude maximale.</p><p>Prototype à évaluer avec le thérapeute. Arrête en cas de douleur. La calibration ne mesure pas les angles articulaires.</p></div>}
        </div><div className="dialog-footer"><button className="primary" onClick={()=>setSettingsOpen(false)}>Revenir au jeu</button></div>
      </dialog>
    </section></main></div>;
}
