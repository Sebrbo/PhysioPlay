import { mirror, type Hand, type Point } from './game';
export type Palm = { side:'left'|'right'; point:Point };
type Category = { categoryName:string; score:number };
export function palmCenter(landmarks:Point[]):Point|null {
  const points=[0,5,9,13,17].map(i=>landmarks[i]);
  if(points.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
  return {x:points.reduce((sum,p)=>sum+p.x,0)/5,y:points.reduce((sum,p)=>sum+p.y,0)/5};
}
// La vidéo d'entrée n'est pas inversée ; seul l'affichage final est en miroir.
export function selectPalms(landmarks:Point[][],handedness:Category[][],selection:Hand):Palm[] {
  const candidates: {palm:Palm;score:number}[]=[];
  landmarks.forEach((points,i)=>{
    const category=handedness[i]?.[0],name=category?.categoryName.toLowerCase();
    if(!category||category.score<.65||(name!=='left'&&name!=='right'))return;
    if(selection!=='both'&&selection!==name)return;
    const center=palmCenter(points);if(!center)return;
    candidates.push({palm:{side:name,point:mirror(center)},score:category.score});
  });
  // Une seule position par main, même en cas de classification ambiguë.
  return (['left','right'] as const).flatMap(side=>{
    const best=candidates.filter(c=>c.palm.side===side).sort((a,b)=>b.score-a.score)[0];
    return best?[best.palm]:[];
  });
}
export function smoothPalms(current:Palm[],previous:Palm[]):Palm[] {
  return current.map(p=>{const old=previous.find(o=>o.side===p.side);
    if(!old||Math.hypot(old.point.x-p.point.x,old.point.y-p.point.y)>.15)return p;
    return {...p,point:{x:p.point.x*.65+old.point.x*.35,y:p.point.y*.65+old.point.y*.35}};
  });
}
