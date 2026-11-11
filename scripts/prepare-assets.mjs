import { mkdir, cp, access, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(`${root}public/mediapipe`,{recursive:true});
await cp(`${root}node_modules/@mediapipe/tasks-vision/wasm`,`${root}public/mediapipe/wasm`,{recursive:true});
const path=`${root}public/mediapipe/hand_landmarker.task`;
try { await access(path); }
catch {
  const url='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`Model download: ${response.status}`);
  await writeFile(path,new Uint8Array(await response.arrayBuffer()));
}
console.log('MediaPipe : moteur et modèle disponibles localement.');
