import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { calibratedZone, contains, defaultZone, mirror, nextTarget, type Hand, type Point, type Zone } from './game';

type Phase = 'idle'|'ready'|'calibrating'|'playing'|'paused'|'result';
type Stats = { hits:number; misses:number; times:number[]; remaining:number };
const initialStats=(duration:number):Stats=>({hits:0,misses:0,times:[],remaining:duration});

export default function App(){
  const [mode,setMode]=useState<'therapy'|'reaction'>('therapy');
  const [hand,setHand]=useState<Hand>('both');
  const [duration,setDuration]=useState(60),[deadline,setDeadline]=useState(4),[size,setSize]=useState(48);
  const [phase,setPhase]=useState<Phase>('idle'),[source,setSource]=useState<'camera'|'demo'|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('Choisis un mode, puis active la caméra pour commencer.');
  const [tracking,setTracking]=useState(false),[zone,setZone]=useState<Zone|null>(null);
  const [stats,setStats]=useState(initialStats(60)),[consent,setConsent]=useState(false);
  const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null);
  const stream=useRef<MediaStream|null>(null),detector=useRef<PoseLandmarker|null>(null),generation=useRef(0);
  const state=useRef({phase,source,mode,hand,duration,deadline,size,zone});
  state.current={phase,source,mode,hand,duration,deadline,size,zone};
  const runtime=useRef({target:null as Point|null,hands:[] as Point[],samples:[] as Point[],calibrationStart:0,calibrationValid:0,last:0,lastSeen:0,lastVideo:-1,active:0,targetAge:0,dwell:0,stats:initialStats(60),number:1,pointer:null as Point|null});
  const changePhase=(p:Phase)=>{state.current.phase=p;setPhase(p);};
  const stop=()=>{generation.current++;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;detector.current?.close();detector.current=null;if(video.current)video.current.srcObject=null;runtime.current.hands=[];runtime.current.target=null;setTracking(false);setSource(null);setZone(null);changePhase('idle');setBusy(false);};
  useEffect(()=>()=>{generation.current++;stream.current?.getTracks().forEach(t=>t.stop());detector.current?.close();},[]);
  useEffect(()=>{const hidden=()=>{if(document.hidden && ['playing','calibrating'].includes(state.current.phase)){changePhase('paused');setMessage('Séance en pause : l’application a été masquée.');}};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},[]);
  useEffect(()=>{const resize=()=>{if(['playing','calibrating'].includes(state.current.phase)){changePhase('paused');setMessage('Affichage modifié : recalibre avant de reprendre.');}setZone(null);};window.addEventListener('orientationchange',resize);return()=>window.removeEventListener('orientationchange',resize);},[]);

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
  function start(){const r=runtime.current;r.stats=initialStats(duration);r.active=0;r.targetAge=0;r.dwell=0;r.number=1;r.target=nextTarget(zone! ,null);setStats({...r.stats});changePhase('playing');setMessage('Atteins le centre de la cible avec le poignet.');}
  function finish(){changePhase('result');runtime.current.target=null;setStats({...runtime.current.stats});setMessage('Séance terminée. Les résultats restent uniquement en mémoire.');}

  useEffect(()=>{
    let raf=0;
    function frame(now:number){
      const s=state.current,r=runtime.current,dt=Math.min(now-r.last,100);r.last=now;
      const el=canvas.current,v=video.current;if(!el||!v){raf=requestAnimationFrame(frame);return;}
      const ctx=el.getContext('2d')!;const w=el.clientWidth,h=el.clientHeight,dpr=Math.min(window.devicePixelRatio||1,2);
      if(el.width!==Math.round(w*dpr)||el.height!==Math.round(h*dpr)){el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
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
      if(s.phase==='playing'){
        if(valid){r.active+=dt;r.targetAge+=dt;r.stats.remaining=Math.max(0,s.duration-r.active/1000);
          if(r.target){const touching=r.hands.some(p=>contains(p,r.target!,s.size,w,h));r.dwell=touching?r.dwell+dt:0;
            if(r.dwell>=(s.mode==='therapy'?250:80)){r.stats.hits++;r.stats.times.push(r.targetAge);r.number++;r.target=nextTarget(s.zone!,r.target);r.targetAge=0;r.dwell=0;}
            else if(s.mode==='reaction'&&r.targetAge>=s.deadline*1000){r.stats.misses++;r.number++;r.target=nextTarget(s.zone!,r.target);r.targetAge=0;r.dwell=0;}
          }
          setStats({...r.stats,times:[...r.stats.times]});if(r.active>=s.duration*1000)finish();
        }else{r.dwell=0;}
      }
      const z=s.zone;if(z){ctx.strokeStyle='#50d5c570';ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.strokeRect(z.left*w,z.top*h,(z.right-z.left)*w,(z.bottom-z.top)*h);ctx.setLineDash([]);}
      if(r.target&&['playing','paused'].includes(s.phase)){
        const x=r.target.x*w,y=r.target.y*h;ctx.shadowColor='#51e4c6';ctx.shadowBlur=25;ctx.fillStyle='#46d4b9';ctx.beginPath();ctx.arc(x,y,s.size,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,s.size+7,-Math.PI/2,-Math.PI/2+Math.PI*2*(s.mode==='reaction'?Math.max(0,1-r.targetAge/(s.deadline*1000)):1));ctx.stroke();ctx.fillStyle='#0b3040';ctx.font='bold 27px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(r.number),x,y);
      }
      r.hands.forEach(p=>{ctx.beginPath();ctx.arc(p.x*w,p.y*h,12,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#13a9e0';ctx.lineWidth=4;ctx.stroke();});
      raf=requestAnimationFrame(frame);
    }raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
  },[]);

  const locked=busy||['playing','paused','calibrating'].includes(phase);
  const mean=stats.times.length?`${(stats.times.reduce((a,b)=>a+b,0)/stats.times.length/1000).toFixed(2)} s`:'—';
  return <div className="app"><header><a className="brand" href="./"><span className="brand-icon">◎</span> Physio<span>Play</span></a><span className="version">V0.1 <i/> Traitement local</span></header>
    <main><div className="intro"><div><p className="eyebrow">BOUGER · JOUER · PROGRESSER</p><h1>Le mouvement devient un jeu.</h1><p>Une cible à la fois, à ton rythme.</p></div><span className="tag">01 / PhysioTargets</span></div>
    <div className="layout"><aside><p className="eyebrow">TA SÉANCE</p><h2>À toi de jouer</h2><div className="modes"><button disabled={locked} className={mode==='therapy'?'selected':''} onClick={()=>setMode('therapy')}><span>◉</span><strong>Thérapeutique</strong><small>Précision, sans pression</small></button><button disabled={locked} className={mode==='reaction'?'selected':''} onClick={()=>setMode('reaction')}><span>ϟ</span><strong>Réactivité</strong><small>Une cible, un délai</small></button></div>
    <label>Main suivie<select disabled={locked} value={hand} onChange={e=>{setHand(e.target.value as Hand);setZone(null);}}><option value="both">Les deux mains</option><option value="left">Main gauche</option><option value="right">Main droite</option></select></label>
    <div className="fields"><label>Durée<select disabled={locked} value={duration} onChange={e=>setDuration(+e.target.value)}>{[30,60,90,120].map(n=><option key={n} value={n}>{n} secondes</option>)}</select></label><label>Taille des cibles<select disabled={locked} value={size} onChange={e=>setSize(+e.target.value)}><option value={60}>Grande</option><option value={48}>Moyenne</option><option value={34}>Petite</option></select></label></div>
    {mode==='reaction'&&<label>Délai par cible<select disabled={locked} value={deadline} onChange={e=>setDeadline(+e.target.value)}>{[2,3,4,6,8].map(n=><option key={n} value={n}>{n} secondes</option>)}</select></label>}
    <div className="divider"/><p className="step"><b>1</b> Installer et cadrer</p><p className="helper">Appareil stable, visage et mains visibles. Garde de l’espace autour de toi.</p>
    {!source&&<><label className="consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>J’autorise la caméra pour cette séance.</label><button className="primary" disabled={!consent||busy} onClick={startCamera}>{busy?'Chargement…':'Activer la caméra ↗'}</button><button className="text-button" disabled={busy} onClick={demo}>Essayer sans caméra</button></>}
    {source&&<><p className="step"><b>2</b> Définir sa zone confortable</p><button disabled={locked||source==='demo'} onClick={calibrate}>{zone?'Recalibrer':'Calibrer · 8 secondes'}</button><p className="helper">{source==='demo'?'Zone de démonstration prédéfinie.':'Bouge doucement, sans rechercher ton amplitude maximale.'}</p><button className="primary" disabled={!zone||locked} onClick={start}>Commencer la séance →</button><button className="text-button" onClick={stop}>Arrêter {source==='camera'?'la caméra':'la démonstration'}</button></>}
    </aside><section className="play"><div className="play-top"><div><span className="live-dot"/> {source==='demo'?'Démonstration':source==='camera'?'Caméra frontale · miroir':'Espace de jeu'}</div><span>{source?(tracking?'● Main détectée':'○ En attente de la main'):'Caméra désactivée'}</span></div>
    <div className="stage" ref={stage} style={{aspectRatio:source==='camera'&&video.current?.videoWidth?`${video.current.videoWidth}/${video.current.videoHeight}`:'4/3'}} onPointerMove={e=>{if(source==='demo'){const b=e.currentTarget.getBoundingClientRect();runtime.current.pointer={x:(e.clientX-b.left)/b.width,y:(e.clientY-b.top)/b.height};}}} onPointerLeave={()=>runtime.current.pointer=null} onPointerDown={e=>{if(source==='demo'){e.currentTarget.setPointerCapture(e.pointerId);const b=e.currentTarget.getBoundingClientRect();runtime.current.pointer={x:(e.clientX-b.left)/b.width,y:(e.clientY-b.top)/b.height};}}} onPointerUp={()=>{runtime.current.pointer=null;}}>
    <video ref={video} muted playsInline aria-label="Retour de la caméra en miroir"/><canvas ref={canvas} aria-label="Cibles et position des poignets"/>
    {!source&&<div className="welcome"><div className="target-icon">◎</div><h2>Un peu de mouvement.<br/>Beaucoup de possibilités.</h2><p>Active la caméra et retrouve-toi<br/>au centre du jeu.</p><span>CAMÉRA FRONTALE · SANS CAPTEUR</span></div>}
    {phase==='playing'&&!tracking&&<div className="overlay"><h2>Main hors du cadre</h2><p>Le chronomètre est suspendu.</p></div>}
    {phase==='paused'&&<div className="overlay"><h2>Une pause pour souffler.</h2><button className="primary" disabled={!zone} onClick={()=>changePhase('playing')}>Reprendre</button><button onClick={()=>{changePhase('ready');runtime.current.target=null;}}>Revenir à la préparation</button></div>}
    {phase==='result'&&<div className="overlay result"><p className="eyebrow">SÉANCE TERMINÉE</p><h2>{stats.hits} cibles atteintes</h2><p>Temps moyen d’atteinte : {mean}<br/>{mode==='reaction'?`${stats.misses} cibles expirées`:'Chaque mouvement compte.'}</p><button className="primary" onClick={start}>Rejouer</button><button onClick={()=>changePhase('ready')}>Modifier la séance</button></div>}
    {phase==='playing'&&tracking&&<span className="stage-hint">{mode==='therapy'?'Maintiens le poignet sur la cible · ¼ s':'Touche la cible avant la fin du cercle'}</span>}
    </div><div className="metrics"><div><span>CIBLES ATTEINTES</span><strong>{String(stats.hits).padStart(2,'0')}</strong></div><div><span>TEMPS RESTANT</span><strong>{Math.ceil(phase==='ready'||phase==='idle'?duration:stats.remaining)}<small> s</small></strong></div><div><span>TEMPS MOYEN</span><strong>{mean}</strong></div>{phase==='playing'&&<button onClick={()=>changePhase('paused')}>Ⅱ Pause</button>}{(phase==='playing'||phase==='paused')&&<button onClick={finish}>Terminer</button>}</div>
    <p className="status" role="status">{message}</p></section></div>
    <footer><div><strong>◈ Ta caméra reste privée.</strong><p>Images traitées sur cet appareil, sans enregistrement ni envoi. Aucun compte, aucun historique patient.</p></div><div><strong>Une zone confortable avant tout.</strong><p>Prototype à évaluer avec le thérapeute. Arrête en cas de douleur. La calibration ne mesure pas les angles articulaires.</p></div></footer>
    </main></div>;
}
