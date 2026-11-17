import { useEffect, useRef, useState } from 'react';
import { GameSound, type Cue } from './sound';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { advanceStop, advanceAcceleration, coverRect, visibleTargetZone, advanceCountdown, containRect, insetZone, scaleZone, advanceSessionClock, calibratedZone, contains, defaultZone, poseWrists, nextTarget, type Hand, type Point, type Zone } from './game';

type Mode = 'therapy'|'reaction'|'butterfly'|'traffic'|'acceleration';
const modeNames:Record<Mode,string>={therapy:'Cibles libres',reaction:'Cibles chronométrées',butterfly:'Le papillon',traffic:'Feu vert / rouge',acceleration:'Accélération'};
type Phase = 'idle'|'ready'|'countdown'|'calibrating'|'playing'|'paused'|'result';
type Stats = { hits:number; misses:number; redErrors:number; times:number[]; remaining:number };
const initialStats=(duration:number):Stats=>({hits:0,misses:0,redErrors:0,times:[],remaining:duration});

export default function App(){
  const [immersive,setImmersive]=useState(false);
  const [zoneWidth,setZoneWidth]=useState(150),[zoneHeight,setZoneHeight]=useState(150);
  const play=useRef<HTMLElement>(null);
  const hud=useRef<HTMLDivElement>(null);
  const settingsDialog=useRef<HTMLDialogElement>(null);
  const [settingsOpen,setSettingsOpen]=useState(false),[settingsTab,setSettingsTab]=useState<'session'|'zone'|'sound'|'about'>('session');
  const sound=useRef<GameSound|null>(null);
  if(!sound.current)sound.current=new GameSound();
  const [soundEnabled,setSoundEnabled]=useState(true),[volume,setVolume]=useState(40),[audioMessage,setAudioMessage]=useState('');
  useEffect(()=>{sound.current!.configure(soundEnabled,volume/100);},[soundEnabled,volume]);
  useEffect(()=>()=>sound.current?.close(),[]);
  const cue=(name:Cue)=>{if(!document.hidden)sound.current?.play(name);};
  async function testSound(name:Cue){const ready=await sound.current!.unlock();setAudioMessage(ready?'Son prêt. Ajuste aussi le volume de ton appareil.':'Son indisponible ou coupé : vérifie le volume et réessaie.');if(ready)cue(name);}
  async function resumeGame(){const ready=sound.current!.unlock();changePhase('playing');if(await ready)if(state.current.phase==='playing')cue('resume');}
  const [countdown,setCountdown]=useState(5);
  const [mode,setMode]=useState<Mode>('therapy');
  const [series,setSeries]=useState(5),[decrement,setDecrement]=useState(.5),[minimum,setMinimum]=useState(.5);
  const [challenge,setChallenge]=useState({limit:4,streak:0});
  const [hand,setHand]=useState<Hand>('both');
  const [butterflySpeed,setButterflySpeed]=useState(1),[stopDuration,setStopDuration]=useState(.8);
  const [duration,setDuration]=useState(60),[deadline,setDeadline]=useState(4),[size,setSize]=useState(48);
  const [phase,setPhase]=useState<Phase>('idle'),[source,setSource]=useState<'camera'|'demo'|null>(null);
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('Étape 1 : active la caméra. Ton navigateur demandera ensuite ton autorisation.');
  const [tracking,setTracking]=useState(false),[zone,setZone]=useState<Zone|null>(null);
  const [stats,setStats]=useState(initialStats(60));
  const [zoneMode,setZoneMode]=useState<'standard'|'calibrated'|null>(null);
  const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null),stage=useRef<HTMLDivElement>(null);
  const stream=useRef<MediaStream|null>(null),detector=useRef<PoseLandmarker|null>(null),generation=useRef(0);
  const effectiveZone=zone?scaleZone(zone,zoneWidth,zoneHeight):null;
  const state=useRef({phase,source,mode,hand,duration,deadline,series,decrement,minimum,butterflySpeed,stopDuration,size,zone:effectiveZone,immersive});
  state.current={phase,source,mode,hand,duration,deadline,series,decrement,minimum,butterflySpeed,stopDuration,size,zone:effectiveZone,immersive};
  const runtime=useRef({target:null as Point|null,hands:[] as Point[],samples:[] as Point[],calibrationStart:0,calibrationValid:0,last:0,lastSeen:0,lastVideo:-1,countdownMs:5000,active:0,targetAge:0,dwell:0,streak:0,limit:4,red:false,redTouched:false,destination:null as Point|null,stats:initialStats(60),number:1,pointer:null as Point|null});
  const changePhase=(p:Phase)=>{if(p!=='playing')sound.current?.stop();if(p==='paused'&&state.current.phase==='playing')cue('pause');runtime.current.last=performance.now();state.current.phase=p;setPhase(p);};
  const stop=()=>{generation.current++;stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;detector.current?.close();detector.current=null;if(video.current)video.current.srcObject=null;runtime.current.hands=[];runtime.current.target=null;setTracking(false);setSource(null);setZone(null);setZoneMode(null);changePhase('idle');setBusy(false);setMessage('Étape 1 : active la caméra. Ton navigateur demandera ensuite ton autorisation.');};
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
      if(id!==generation.current){model.close();return;}detector.current=model;runtime.current.lastVideo=-1;setSource('camera');setZone(null);changePhase('ready');setMessage('Étape 2 : choisis une zone adaptée ou la zone standard. Les points blancs indiquent les poignets détectés.');
      media.getVideoTracks()[0].addEventListener('ended',()=>{if(id===generation.current){stop();setMessage('Caméra déconnectée. Active-la à nouveau.');}});
    }catch(e){if(id===generation.current){stop();setMessage(e instanceof DOMException && e.name==='NotAllowedError'?'Accès caméra refusé. Autorise la caméra dans les réglages du navigateur, puis réessaie.':`Caméra indisponible : ${e instanceof Error?e.message:'erreur inconnue'}`);}}
    finally{if(id===generation.current)setBusy(false);}
  }
  function demo(){stop();setSource('demo');setZone(defaultZone);setZoneMode('standard');changePhase('ready');setMessage('Démonstration : déplace le pointeur ou ton doigt sur les cibles. Aucun suivi corporel.');}
  function useStandardZone(){setZone(defaultZone);setZoneMode('standard');changePhase('ready');setMessage('Zone standard choisie : vérifie que les cibles restent accessibles. Tu peux calibrer une zone personnalisée.');}
  function calibrate(){void sound.current!.unlock();if(immersive){void backToPreparation();}runtime.current.samples=[];runtime.current.calibrationStart=performance.now();runtime.current.calibrationValid=0;setZone(null);setZoneMode(null);changePhase('calibrating');setMessage('Pendant 8 secondes de suivi, balaie doucement ta zone confortable avec la ou les mains choisies.');}
  function start(){
    if(!zone){changePhase('ready');setMessage('Calibre à nouveau la zone avant de commencer.');return;}
    const audioReady=sound.current!.unlock();
    if(!immersive){void toggleFullscreen();}
    const r=runtime.current;r.stats=initialStats(duration);r.active=0;r.targetAge=0;r.dwell=0;r.number=1;r.streak=0;r.limit=deadline;r.red=false;r.redTouched=false;r.destination=null;setChallenge({limit:deadline,streak:0});r.target=null;r.countdownMs=5000;
    setStats({...r.stats});setCountdown(5);changePhase('countdown');void audioReady.then(ready=>{if(ready&&state.current.phase==='countdown'&&runtime.current.countdownMs>4000)cue('tick');});setMessage('Prépare-toi : le jeu passe en plein écran. Place tes mains pendant le décompte.');
  }
  function finish(){changePhase('result');cue('finish');runtime.current.target=null;setStats({...runtime.current.stats});setMessage('Séance terminée. Les résultats restent uniquement en mémoire.');}

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
        try{const result=detector.current.detectForVideo(v,now);
          r.hands=poseWrists(result.landmarks[0],s.hand);if(r.hands.length)r.lastSeen=now;
        }catch{changePhase('paused');setMessage('Le suivi a été interrompu. Arrête puis réactive la caméra.');r.hands=[];}
      }
      if(s.source==='camera'&&now-r.lastSeen>300){r.hands=[];}
      if(s.source==='demo')r.hands=r.pointer?[r.pointer]:[];
      const valid=r.hands.length>0;setTracking(previous=>previous===valid?previous:valid);
      if(s.phase==='calibrating'){
        if(valid){r.calibrationValid+=dt;r.samples.push(...r.hands);}
        setMessage(`Explore ta zone confortable · ${Math.max(0,8-Math.floor(r.calibrationValid/1000))} s de suivi restantes`);
        if(r.calibrationValid>=8000){const z=calibratedZone(r.samples);setZone(z);setZoneMode(z?'calibrated':null);changePhase('ready');if(z)cue('calibrated');setMessage(z?'Calibration prête. Reste à la même place pour jouer.':'Zone insuffisante. Recule pour cadrer les mains et recommence sans forcer.');}
        else if(now-r.calibrationStart>30000){changePhase('ready');setMessage('Calibration interrompue : suivi insuffisant. Vérifie le cadrage et réessaie.');}
      }
      if(s.phase==='countdown'){
        const previousSeconds=Math.ceil(r.countdownMs/1000);const clock=advanceCountdown(r.countdownMs,elapsed);r.countdownMs=clock.remainingMs;setCountdown(clock.seconds);if(clock.seconds>0&&clock.seconds<previousSeconds)cue('tick');
        if(clock.done){if(targetZone){r.target=nextTarget(targetZone,null);changePhase('playing');cue('start');setMessage(s.mode==='butterfly'?'Garde ton poignet dans le halo du papillon.':s.mode==='traffic'?'Touche GO, évite STOP.':'Atteins le centre de la cible avec le poignet.');}else{changePhase('ready');setMessage('Calibre la zone avant de commencer.');}}
      }
      else if(s.phase==='playing'){
        const clock=advanceSessionClock(r.active,elapsed,s.duration);
        r.active=clock.elapsed;r.stats.remaining=clock.remaining;
        if(clock.done){finish();}
        else {
          r.targetAge+=elapsed;
          if(r.target&&targetZone){
            if(s.mode==='butterfly'){
              if(!r.destination)r.destination=nextTarget(targetZone,r.target);
              const dx=(r.destination.x-r.target.x)*w,dy=(r.destination.y-r.target.y)*h,distance=Math.hypot(dx,dy),step=70*s.butterflySpeed*dt/1000;
              if(distance<=step){r.target=r.destination;r.destination=null;}else{r.target={x:r.target.x+dx/distance*step/w,y:r.target.y+dy/distance*step/h};}
            }
            const touching=valid&&r.hands.some(p=>contains(p,r.target!,s.size,w,h));
            r.dwell=touching?r.dwell+dt:0;
            let advance=false,miss=false;
            if(s.mode==='butterfly'){
              if(r.dwell>=1000){r.stats.hits++;r.dwell-=1000;}
            }else if(s.mode==='traffic'&&r.red){
              const stop=advanceStop(r.redTouched,touching,r.targetAge,s.stopDuration*1000);
              if(stop.error){r.stats.redErrors++;r.stats.misses++;cue('red');}
              r.redTouched=stop.touched;
              if(stop.done){if(!r.redTouched)r.stats.hits++;advance=true;}
            }else{
              const limit=s.mode==='acceleration'?r.limit:s.deadline;
              // Expiration wins over a contact that arrives after the deadline.
              if(s.mode!=='therapy'&&r.targetAge>=limit*1000){miss=true;advance=true;}
              else if(r.dwell>=(s.mode==='therapy'?250:80)){r.stats.hits++;r.stats.times.push(r.targetAge);if(!(s.mode==='acceleration'&&r.streak+1>=s.series&&r.limit>s.minimum))cue('hit');advance=true;}
              if(miss){r.stats.misses++;cue(s.mode==='acceleration'?'reset':'miss');}
              if(advance&&s.mode==='acceleration'){
                const progress=advanceAcceleration(r.limit,r.streak,!miss,s.deadline,s.series,s.decrement,s.minimum);
                if(progress.limit<r.limit)cue('level');r.limit=progress.limit;r.streak=progress.streak;
                setChallenge({limit:r.limit,streak:r.streak});
              }
            }
            if(advance){r.number++;r.target=nextTarget(targetZone,r.target);r.targetAge=0;r.dwell=0;r.red=s.mode==='traffic'&&Math.random()<.35;r.redTouched=false;}
          }
        }
        setStats({...r.stats,times:[...r.stats.times]});
      }
      const z=targetZone;if(z&&(!s.immersive||s.phase==='ready'||s.phase==='calibrating')){ctx.strokeStyle='#50d5c570';ctx.lineWidth=2;ctx.setLineDash([8,8]);ctx.strokeRect(z.left*w,z.top*h,(z.right-z.left)*w,(z.bottom-z.top)*h);ctx.setLineDash([]);}
      if(r.target&&['playing','paused'].includes(s.phase)){
        const x=r.target.x*w,y=r.target.y*h;ctx.shadowColor='#51e4c6';ctx.shadowBlur=25;ctx.fillStyle=s.mode==='traffic'&&r.red?'#f87171':'#46d4b9';ctx.beginPath();ctx.arc(x,y,s.size,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
        ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,s.size+7,-Math.PI/2,-Math.PI/2+Math.PI*2*(['reaction','traffic','acceleration'].includes(s.mode)?Math.max(0,1-r.targetAge/((s.mode==='traffic'&&r.red?s.stopDuration:s.mode==='acceleration'?r.limit:s.deadline)*1000)):1));ctx.stroke();ctx.fillStyle='#0b3040';ctx.font='bold 27px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.mode==='butterfly'?'🦋':s.mode==='traffic'?(r.red?(r.redTouched?'✕':'STOP'):'GO'):String(r.number),x,y);
      }
      r.hands.forEach(p=>{ctx.beginPath();ctx.arc(p.x*w,p.y*h,12,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#13a9e0';ctx.lineWidth=4;ctx.stroke();});
      raf=requestAnimationFrame(frame);
    }raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
  },[]);

  const locked=busy||['playing','paused','countdown','calibrating'].includes(phase);
  const mean=stats.times.length?`${(stats.times.reduce((a,b)=>a+b,0)/stats.times.length/1000).toFixed(2)} s`:'—';
  return <div className="app">
    <header><a className="brand" href="./"><span className="brand-icon">◎</span> Physio<span>Play</span></a><span className="version">V0.3.0 <i/> Traitement local</span></header>
    <main><section ref={play} className={`play ${immersive?'immersive':''}`} aria-label="Espace de jeu PhysioTargets">
      <div className="play-top"><div className="game-title"><strong>PhysioTargets</strong><span>{source==='demo'?'Démonstration':source==='camera'?(tracking?'● Poignet détecté':'○ En attente de suivi'):'Caméra désactivée'}</span></div>
      <div className="top-actions"><button disabled={locked} onClick={()=>setSettingsOpen(true)}>⚙ Réglages</button><button onClick={toggleFullscreen}>{immersive?'↙ Quitter le plein écran':'⛶ Plein écran'}</button></div></div>
      <div className="setup-toolbar">
      <span className="session-summary">{modeNames[mode]} · {duration} s · zone {zoneWidth} × {zoneHeight} %</span>
      <div className="session-actions">
      {source&&<>{source==='camera'&&zone&&<button disabled={locked} onClick={calibrate}>Adapter la zone · 8 s</button>}
      <button onClick={stop}>Arrêter {source==='camera'?'la caméra':'la démo'}</button></>}
      </div></div>
    <div className="stage" ref={stage} style={{aspectRatio:source==='camera'&&video.current?.videoWidth?`${video.current.videoWidth}/${video.current.videoHeight}`:'4/3'}} onPointerMove={demoPointer} onPointerLeave={()=>runtime.current.pointer=null} onPointerDown={demoPointer} onPointerUp={()=>{runtime.current.pointer=null;}}>
    <video ref={video} muted playsInline aria-label="Retour de la caméra en miroir"/><canvas ref={canvas} aria-label="Cibles et position des poignets"/>
    {immersive&&<>
      <div className="immersive-hud" ref={hud}><div className="hud-stats" aria-label="Score et chronomètre"><div><span>{mode==='butterfly'?'SECONDES SUIVIES':mode==='traffic'?'RÉUSSITES':'CIBLES'}</span><strong>{String(stats.hits).padStart(2,'0')}</strong></div><div><span>CHRONO</span><strong>{Math.ceil(['ready','idle','countdown'].includes(phase)?duration:stats.remaining)}<small> s</small></strong></div></div>
      {mode==='acceleration'&&<div><strong>{challenge.limit.toFixed(1)} s</strong><small> · série {challenge.streak}/{series}</small></div>}<div className="hud-actions"><button aria-label="Retour à la préparation" onClick={backToPreparation}>← Retour</button>{phase==='playing'&&<button onClick={()=>changePhase('paused')}>Ⅱ Pause</button>}</div></div>
      {!locked&&phase!=='result'&&<div className="immersive-prepare">{!source?<button onClick={backToPreparation}>Préparer la caméra</button>:zone?<button className="primary" onClick={start}>Commencer · départ dans 5 s</button>:<button onClick={calibrate}>Calibrer · 8 s</button>}</div>}
    </>}

    {!source&&<div className="welcome onboarding-welcome"><div className="onboarding-card">
      <p className="onboarding-step">ÉTAPE 1 SUR 3 · CAMÉRA</p><h2>Prêt à bouger ?</h2>
      <p>Active la caméra, choisis ta zone,<br/>puis lance le jeu.</p>
      <button className="onboarding-primary" disabled={busy} onClick={startCamera}>{busy?'Chargement de la caméra…':'Activer la caméra'}</button>
      {!busy&&/(refusé|indisponible)/.test(message)&&<p className="onboarding-error" role="alert">{message}</p>}
      <p className="camera-permission">Si le navigateur le demande, appuie sur <strong>Autoriser</strong>.<br/>Les images restent sur cet appareil.</p>
      <button className="onboarding-secondary" disabled={busy} onClick={demo}>Essayer sans caméra</button>
      {busy&&<button className="onboarding-secondary" onClick={stop}>Annuler</button>}
    </div></div>}
    {source==='camera'&&phase==='ready'&&!zone&&<div className="overlay zone-onboarding"><div className="onboarding-card">
      <p className="onboarding-step">ÉTAPE 2 SUR 3 · ZONE DE JEU</p><h2>Où veux-tu faire apparaître les cibles ?</h2>
      <p>Les points blancs montrent tes poignets.<br/>La calibration adapte la zone, pas la détection.</p>
      <button className="onboarding-primary" onClick={calibrate}>Adapter ma zone · 8 secondes</button>
      <p className="choice-help">Balaie doucement l’espace confortable avec tes mains.</p>
      <button className="onboarding-secondary standard-zone" onClick={useStandardZone}>Utiliser la zone standard sans calibration</button>
      <p className="choice-help">Zone prédéfinie : vérifie que les cibles restent accessibles.</p>
    </div></div>}
    {phase==='calibrating'&&<div className="overlay calibration-guide"><p className="onboarding-step">ZONE PERSONNALISÉE</p><h2>Bouge dans ta zone confortable</h2><p>Balaie doucement l’espace avec les mains choisies,<br/>sans forcer ni rechercher l’amplitude maximale.</p><strong className="calibration-progress">{message}</strong><button onClick={()=>{changePhase('ready');setMessage('Choisis une zone pour continuer.');}}>Annuler la calibration</button></div>}
    {source&&zone&&phase==='ready'&&!immersive&&<div className="ready-card"><div><p className="onboarding-step">ÉTAPE 3 SUR 3 · JOUER</p><p>{modeNames[mode]} · Choisis ton jeu dans ⚙ Réglages.</p><strong>{zoneMode==='calibrated'?'Ta zone personnalisée est prête':'La zone standard est prête'}</strong><p>Le plein écran s’ouvre automatiquement, puis tu as 5 secondes pour te placer.</p></div><button className="onboarding-primary" onClick={start}>Commencer le jeu</button></div>}
    {phase==='countdown'&&<div className="overlay countdown-overlay" aria-live="polite"><p>PRÊT À JOUER ?</p><strong className="countdown-number">{countdown}</strong><p>Place-toi confortablement. Le chrono démarrera après le décompte.</p><button onClick={()=>{changePhase('ready');setMessage('Départ annulé.');}}>Annuler le départ</button></div>}
    {phase==='playing'&&!tracking&&<div className="tracking-notice" role="status">Replace les mains dans le cadre · la séance continue</div>}
    {phase==='paused'&&<div className="overlay"><h2>Une pause pour souffler.</h2><button className="primary" disabled={!zone} onClick={resumeGame}>Reprendre</button><button onClick={backToPreparation}>Revenir à la préparation</button></div>}
    {phase==='result'&&<div className="overlay result"><p className="eyebrow">SÉANCE TERMINÉE</p><h2>{stats.hits} {mode==='butterfly'?'secondes de suivi continu cumulé':mode==='traffic'?'consignes réussies':'cibles atteintes'}</h2><p>{mode!=='butterfly'&&<>Temps moyen d’atteinte : {mean}<br/></>}{mode==='traffic'?<>{stats.redErrors} cibles rouges touchées (erreurs STOP)<br/>{stats.misses-stats.redErrors} cibles vertes manquées<br/>{stats.misses} erreurs au total</>:mode!=='therapy'&&mode!=='butterfly'?`${stats.misses} cibles expirées`:'Chaque mouvement compte.'}</p><button className="primary" onClick={start}>Rejouer</button><button onClick={backToPreparation}>Modifier la séance</button></div>}
    {!immersive&&phase==='playing'&&tracking&&<span className="stage-hint">{mode==='butterfly'?'Garde le poignet dans le halo du papillon':mode==='traffic'?'Touche GO · Évite STOP':mode==='therapy'?'Maintiens le poignet sur la cible · ¼ s':'Touche la cible avant la fin du cercle'}</span>}

      </div><div className="metrics"><div><span>{mode==='butterfly'?'SECONDES SUIVIES':mode==='traffic'?'RÉUSSITES':'CIBLES'}</span><strong>{String(stats.hits).padStart(2,'0')}</strong></div><div><span>TEMPS RESTANT</span><strong>{Math.ceil(['ready','idle','countdown'].includes(phase)?duration:stats.remaining)}<small> s</small></strong></div>
      <div className="game-actions">{phase==='playing'&&<button onClick={()=>changePhase('paused')}>Ⅱ Pause</button>}{phase==='countdown'&&<button onClick={()=>{changePhase('ready');setMessage('Départ annulé.');}}>Annuler</button>}{(phase==='playing'||phase==='paused')&&<button onClick={finish}>Terminer</button>}</div></div>
      <p className="status" role="status">{message}</p>
      <dialog ref={settingsDialog} className="settings-dialog" aria-labelledby="settings-title" onCancel={()=>setSettingsOpen(false)} onClose={()=>setSettingsOpen(false)}>
        <div className="dialog-header"><h2 id="settings-title">Réglages</h2><button aria-label="Fermer les réglages" onClick={()=>setSettingsOpen(false)}>✕ Fermer</button></div>
        <div className="settings-tabs" role="tablist" aria-label="Catégories des réglages">{([['session','Séance'],['zone','Zone des cibles'],['sound','Sons'],['about','À propos']] as const).map(([id,label])=><button key={id} id={`tab-${id}`} role="tab" aria-selected={settingsTab===id} aria-controls={`panel-${id}`} onClick={()=>setSettingsTab(id)}>{label}</button>)}</div>
        <div className="settings-body" role="tabpanel" id={`panel-${settingsTab}`} aria-labelledby={`tab-${settingsTab}`}>
        {settingsTab==='session'&&<>
          <label>Jeu<select value={mode} onChange={e=>setMode(e.target.value as Mode)}>{Object.entries(modeNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
          <p className="helper">{mode==='butterfly'?'Accompagne le papillon : garde ton point blanc dans son halo. Chaque seconde continue dans le halo rapporte un point.':mode==='traffic'?`Touche GO. Évite STOP : chaque cible rouge touchée compte une erreur, même lors d’un contact bref. STOP reste affiché ${stopDuration} s ; une croix confirme l’erreur.`:mode==='acceleration'?`Après ${series} cibles réussies de suite, le délai diminue de ${decrement} s, jusqu’à ${minimum} s. Une expiration remet le délai à ${deadline} s.`:mode==='therapy'?'Touche une cible pour faire apparaître la suivante, sans limite de temps par cible.':'Touche chaque cible avant la fin du délai réglé ; à expiration, la cible suivante apparaît.'}</p>
          <div className="fields"><label>Main suivie<select value={hand} onChange={e=>{setHand(e.target.value as Hand);setZone(null);}}><option value="both">Les deux mains</option><option value="left">Main gauche</option><option value="right">Main droite</option></select></label>
          <label>Durée<select value={duration} onChange={e=>setDuration(+e.target.value)}>{[30,60,90,120].map(n=><option key={n} value={n}>{n} secondes</option>)}</select></label>
          <label>Taille des cibles<select value={size} onChange={e=>setSize(+e.target.value)}><option value={60}>Grande</option><option value={48}>Moyenne</option><option value={34}>Petite</option></select></label>
          {['reaction','traffic','acceleration'].includes(mode)&&<label>{mode==='traffic'?'Délai des cibles vertes':'Délai par cible'}<select value={deadline} onChange={e=>setDeadline(+e.target.value)}>{[2,3,4,6,8].map(n=><option key={n} value={n}>{n} secondes</option>)}</select></label>}
          {mode==='traffic'&&<label>Durée STOP rouge<select value={stopDuration} onChange={e=>setStopDuration(+e.target.value)}>{[.4,.6,.8,1,1.5].map(n=><option key={n} value={n}>{n} seconde</option>)}</select></label>}
          {mode==='butterfly'&&<label>Vitesse du papillon<select value={butterflySpeed} onChange={e=>setButterflySpeed(+e.target.value)}>{[[.25,'Très lente'],[.5,'Lente'],[1,'Normale'],[1.5,'Rapide'],[2,'Très rapide']].map(([value,label])=><option key={value} value={value}>{label} · ×{value}</option>)}</select></label>}
          {mode==='acceleration'&&<><label>Réussites par palier<select value={series} onChange={e=>setSeries(+e.target.value)}>{[2,3,5,10].map(n=><option key={n} value={n}>{n} cibles</option>)}</select></label><label>Réduction par palier<select value={decrement} onChange={e=>setDecrement(+e.target.value)}>{[.1,.25,.5,1].map(n=><option key={n} value={n}>{n} seconde</option>)}</select></label><label>Délai minimum<select value={minimum} onChange={e=>setMinimum(+e.target.value)}>{[.3,.5,.75,1].map(n=><option key={n} value={n}>{n} seconde</option>)}</select></label></>}
          </div>
          <p className="helper">Chaque départ comporte 5 secondes de préparation, hors durée de séance. Après un changement de main, choisis à nouveau une zone personnalisée ou standard.</p>
        </>}
        {settingsTab==='zone'&&<><label>Largeur · {zoneWidth} %<input type="range" min="50" max="150" step="5" value={zoneWidth} onChange={e=>setZoneWidth(+e.target.value)}/></label><label>Hauteur · {zoneHeight} %<input type="range" min="50" max="150" step="5" value={zoneHeight} onChange={e=>setZoneHeight(+e.target.value)}/></label>
        <div className="zone-presets"><button onClick={()=>{setZoneWidth(150);setZoneHeight(150);}}>Par défaut · 150 %</button><button onClick={()=>{setZoneWidth(100);setZoneHeight(100);}}>Zone calibrée · 100 %</button></div><p className="helper">150 % par défaut, appliqués à la zone choisie (personnalisée ou standard). Au-delà de 100 %, la zone est élargie : garde des mouvements confortables.</p></>}
        {settingsTab==='sound'&&<><h3>Repères sonores</h3><label><input type="checkbox" checked={soundEnabled} onChange={e=>setSoundEnabled(e.target.checked)}/> Activer les sons</label><label>Volume des sons · {volume} %<input type="range" min="0" max="100" step="5" value={volume} onChange={e=>setVolume(+e.target.value)}/></label><p className="helper">Bips du décompte, signal de départ, réussite, erreur STOP, cible expirée, changement de palier, pause et fin de séance. Le papillon reste silencieux pendant le suivi.</p><div className="zone-presets"><button disabled={!soundEnabled||volume===0} onClick={()=>void testSound('hit')}>Tester la réussite</button><button disabled={!soundEnabled||volume===0} onClick={()=>void testSound('red')}>Tester l’erreur STOP</button></div><p role="status">{audioMessage}</p><p className="helper">Les sons s’activent en appuyant sur Commencer. Si tu n’entends rien, vérifie aussi le volume et le mode silencieux de l’iPad.</p></>}
        {settingsTab==='about' &&<div className="about"><h3>Caméra privée</h3><p>Images et coordonnées traitées sur cet appareil, sans enregistrement ni envoi. Aucun historique patient.</p><h3>Installation et confort</h3><p>Appareil stable, haut du corps et mains visibles. La calibration est facultative : elle personnalise la zone des cibles. La zone standard permet de jouer sans cette étape. Pour personnaliser la zone, bouge doucement sans rechercher ton amplitude maximale.</p><p>Prototype à évaluer avec le thérapeute. Arrête en cas de douleur. La calibration ne mesure pas les angles articulaires.</p></div>}
        </div><div className="dialog-footer"><button className="primary" onClick={()=>setSettingsOpen(false)}>Revenir au jeu</button></div>
      </dialog>
    </section></main></div>;
}
