export type Point = { x: number; y: number };
export type Zone = { left: number; right: number; top: number; bottom: number };
export type Hand = 'both' | 'left' | 'right';
export const defaultZone: Zone = { left: .2, right: .8, top: .2, bottom: .8 };
export function mirror(p: Point): Point { return { x: 1-p.x, y: p.y }; }
export function contains(p: Point, target: Point, radius: number, width: number, height: number) {
  return Math.hypot((p.x-target.x)*width, (p.y-target.y)*height) <= radius;
}
export function calibratedZone(points: Point[]): Zone | null {
  if (points.length < 30) return null;
  const xs = points.map(p=>p.x).sort((a,b)=>a-b), ys=points.map(p=>p.y).sort((a,b)=>a-b);
  const q=(a:number[],v:number)=>a[Math.floor((a.length-1)*v)];
  const z={ left:Math.max(.08,q(xs,.02)),right:Math.min(.92,q(xs,.98)),top:Math.max(.08,q(ys,.02)),bottom:Math.min(.92,q(ys,.98)) };
  if(z.right-z.left<.18 || z.bottom-z.top<.18) return null;
  const dx=(z.right-z.left)*.12,dy=(z.bottom-z.top)*.12;
  return {left:z.left+dx,right:z.right-dx,top:z.top+dy,bottom:z.bottom-dy};
}
export function nextTarget(zone:Zone, previous:Point | null, random= Math.random):Point {
  let p:Point={x:(zone.left+zone.right)/2,y:(zone.top+zone.bottom)/2};
  for(let i=0;i<20;i++){p={x:zone.left+random()*(zone.right-zone.left),y:zone.top+random()*(zone.bottom-zone.top)};if(!previous || Math.hypot(p.x-previous.x,p.y-previous.y)>.18)break;}
  return p;
}

// Le temps de séance suit le temps réellement écoulé, sans dépendre du suivi
// ni de la cadence de rendu. Appeler uniquement pendant la phase de jeu.
export function advanceSessionClock(activeMs:number, deltaMs:number, durationSeconds:number) {
  const limit=durationSeconds*1000;
  const elapsed=Math.min(limit,activeMs+Math.max(0,deltaMs));
  return {elapsed,remaining:Math.max(0,(limit-elapsed)/1000),done:elapsed>=limit};
}

export function scaleZone(zone:Zone, widthPercent:number, heightPercent:number):Zone {
  const cx=(zone.left+zone.right)/2,cy=(zone.top+zone.bottom)/2;
  const dx=(zone.right-zone.left)*widthPercent/200,dy=(zone.bottom-zone.top)*heightPercent/200;
  return {left:Math.max(.02,cx-dx),right:Math.min(.98,cx+dx),top:Math.max(.02,cy-dy),bottom:Math.min(.98,cy+dy)};
}
export function containRect(width:number,height:number,aspect:number) {
  const w=Math.min(width,height*aspect),h=w/aspect;
  return {x:(width-w)/2,y:(height-h)/2,width:w,height:h};
}
export function insetZone(zone:Zone,radius:number,width:number,height:number):Zone {
  const mx=Math.min(.49,(radius+9)/Math.max(1,width)),my=Math.min(.49,(radius+9)/Math.max(1,height));
  return {left:Math.max(mx,Math.min(1-mx,zone.left)),right:Math.max(mx,Math.min(1-mx,zone.right)),top:Math.max(my,Math.min(1-my,zone.top)),bottom:Math.max(my,Math.min(1-my,zone.bottom))};
}
