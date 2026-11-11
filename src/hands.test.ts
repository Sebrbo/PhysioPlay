import { test } from 'node:test';
import assert from 'node:assert/strict';
import { palmCenter, selectPalms, smoothPalms } from './hands';
const hand=(x:number,y:number)=>Array.from({length:21},()=>({x,y}));
test('le contact utilise la paume plutôt que le seul poignet',()=>{const points=hand(.6,.4);points[0]={x:.2,y:.8};assert.deepEqual(palmCenter(points),{x:.52,y:.48});});
test('gauche et droite sont sélectionnées avant affichage en miroir',()=>{const points=[hand(.2,.3),hand(.7,.4)],labels=[[{categoryName:'Left',score:.9}],[{categoryName:'Right',score:.9}]];assert.deepEqual(selectPalms(points,labels,'left'),[{side:'left',point:{x:.8,y:.3}}]);assert.equal(selectPalms(points,labels,'right').length,1);assert.equal(selectPalms(points,labels,'both').length,2);});
test('un résultat incomplet ou peu fiable ne produit pas de contact',()=>{assert.equal(palmCenter([]),null);assert.deepEqual(selectPalms([hand(.2,.3)],[[{categoryName:'Left',score:.4}]],'both'),[]);assert.deepEqual(selectPalms([[]],[[{categoryName:'Left',score:.9}]],'both'),[]);});
test('aucun contact fantôme après disparition de la main',()=>{assert.deepEqual(smoothPalms([],[{side:'left',point:{x:.5,y:.5}}]),[]);});
test('le lissage respecte la main et ne traverse pas une grande distance',()=>{const current=[{side:'left' as const,point:{x:.8,y:.5}}];assert.deepEqual(smoothPalms(current,[{side:'left',point:{x:.2,y:.5}}]),current);assert.deepEqual(smoothPalms(current,[{side:'right',point:{x:.75,y:.5}}]),current);});
