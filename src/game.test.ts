import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coverRect, visibleTargetZone, advanceCountdown, containRect, insetZone, scaleZone, advanceSessionClock, calibratedZone, contains, mirror, nextTarget } from './game';
test('miroir : le poignet et la vidéo partagent le même repère',()=>{assert.deepEqual(mirror({x:.2,y:.7}),{x:.8,y:.7});});
test('collision en pixels même sur un écran non carré',()=>{assert.equal(contains({x:.55,y:.5},{x:.5,y:.5},40,1000,500),false);assert.equal(contains({x:.5,y:.55},{x:.5,y:.5},40,1000,500),true);});
test('calibration rejette un suivi court ou immobile',()=>{assert.equal(calibratedZone([{x:.2,y:.2}]),null);assert.equal(calibratedZone(Array.from({length:100},()=>({x:.5,y:.5}))),null);});
test('calibration réduit la zone observée pour garder une marge',()=>{const z=calibratedZone(Array.from({length:100},(_,i)=>({x:.1+i*.008,y:.1+i*.008})))!;assert.ok(z);assert.ok(z.left>.1&&z.right<.9&&z.top>.1&&z.bottom<.9);});
test('les cibles restent dans la zone calibrée',()=>{const z={left:.25,right:.7,top:.3,bottom:.6};for(let i=0;i<1000;i++){const p=nextTarget(z,{x:.5,y:.5});assert.ok(p.x>=z.left&&p.x<=z.right&&p.y>=z.top&&p.y<=z.bottom);}});

test('la séance finit à 60 secondes même à deux images par seconde',()=>{
  let elapsed=0;
  for(let i=0;i<119;i++){const clock=advanceSessionClock(elapsed,500,60);assert.equal(clock.done,false);elapsed=clock.elapsed;}
  assert.deepEqual(advanceSessionClock(elapsed,500,60),{elapsed:60000,remaining:0,done:true});
});
test('un retard de rendu ne ralentit pas le chronomètre',()=>{assert.deepEqual(advanceSessionClock(59000,1800,60),{elapsed:60000,remaining:0,done:true});});
test('une nouvelle séance démarre avec toute sa durée',()=>{assert.deepEqual(advanceSessionClock(0,0,60),{elapsed:0,remaining:60,done:false});});

test('agrandir une zone conserve son centre et reste dans l’image',()=>{assert.deepEqual(scaleZone({left:.3,right:.7,top:.3,bottom:.7},150,50),{left:.2,right:.8,top:.4,bottom:.6});const z=scaleZone({left:.02,right:.98,top:.02,bottom:.98},150,150);assert.deepEqual(z,{left:.02,right:.98,top:.02,bottom:.98});});
test('plein écran : vidéo et cibles gardent leur repère sans déformation',()=>{assert.deepEqual(containRect(1200,600,4/3),{x:200,y:0,width:800,height:600});assert.deepEqual(containRect(400,900,4/3),{x:0,y:300,width:400,height:300});});
test('les cercles restent entièrement visibles près des bords',()=>{const z=insetZone({left:.02,right:.98,top:.02,bottom:.98},60,400,300);assert.ok(z.left*400>=69);assert.ok((1-z.right)*400>=69-1e-9);assert.ok(z.top*300>=69);});

test('le départ attend cinq secondes sans consommer le temps de séance',()=>{
  let remainingMs=5000;
  for(let i=0;i<4;i++){const countdown=advanceCountdown(remainingMs,1000);assert.equal(countdown.done,false);assert.equal(countdown.seconds,4-i);remainingMs=countdown.remainingMs;}
  assert.deepEqual(advanceCountdown(remainingMs,1000),{remainingMs:0,seconds:0,done:true});
  assert.equal(advanceSessionClock(0,0,60).remaining,60);
});
test('le compte à rebours tolère un retard de rendu',()=>{assert.deepEqual(advanceCountdown(400,1200),{remainingMs:0,seconds:0,done:true});});

test('vidéo immersive : recadrer sans bandes ni déformation',()=>{assert.deepEqual(coverRect(1200,600,4/3),{x:0,y:-150,width:1200,height:900});const portrait=coverRect(400,900,4/3);assert.equal(portrait.height,900);assert.equal(portrait.width,1200);assert.equal(portrait.x,-400);});
test('les cibles du plein écran restent visibles après recadrage et sous les commandes',()=>{for(const [width,height] of [[1200,600],[400,900],[844,390]]){const fit=coverRect(width,height,4/3),z=visibleTargetZone({left:.02,right:.98,top:.02,bottom:.98},48,width,height,fit,76);for(let i=0;i<100;i++){const p=nextTarget(z,null);const x=fit.x+p.x*fit.width,y=fit.y+p.y*fit.height;assert.ok(x>=57-1e-6&&x<=width-57+1e-6);assert.ok(y>=133-1e-6&&y<=height-57+1e-6);}}});
