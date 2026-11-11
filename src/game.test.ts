import { test } from 'node:test';
import assert from 'node:assert/strict';
import { containRect, insetZone, scaleZone, advanceSessionClock, calibratedZone, contains, mirror, nextTarget } from './game';
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
