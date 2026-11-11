import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calibratedZone, contains, mirror, nextTarget } from './game';
test('miroir : le poignet et la vidéo partagent le même repère',()=>{assert.deepEqual(mirror({x:.2,y:.7}),{x:.8,y:.7});});
test('collision en pixels même sur un écran non carré',()=>{assert.equal(contains({x:.55,y:.5},{x:.5,y:.5},40,1000,500),false);assert.equal(contains({x:.5,y:.55},{x:.5,y:.5},40,1000,500),true);});
test('calibration rejette un suivi court ou immobile',()=>{assert.equal(calibratedZone([{x:.2,y:.2}]),null);assert.equal(calibratedZone(Array.from({length:100},()=>({x:.5,y:.5}))),null);});
test('calibration réduit la zone observée pour garder une marge',()=>{const z=calibratedZone(Array.from({length:100},(_,i)=>({x:.1+i*.008,y:.1+i*.008})))!;assert.ok(z);assert.ok(z.left>.1&&z.right<.9&&z.top>.1&&z.bottom<.9);});
test('les cibles restent dans la zone calibrée',()=>{const z={left:.25,right:.7,top:.3,bottom:.6};for(let i=0;i<1000;i++){const p=nextTarget(z,{x:.5,y:.5});assert.ok(p.x>=z.left&&p.x<=z.right&&p.y>=z.top&&p.y<=z.bottom);}});
