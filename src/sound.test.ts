import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameSound} from './sound';
function harness(){
  const counts={created:0,started:0,stopped:0,resumed:0,closed:0};
  const param={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
  const context={state:'suspended',currentTime:0,destination:{},
    async resume(){counts.resumed++;this.state='running';},
    async close(){counts.closed++;this.state='closed';},
    createOscillator(){return {type:'',frequency:param,connect(){},disconnect(){},start(){counts.started++;},stop(){counts.stopped++;},onended:null};},
    createGain(){return {gain:param,connect(){},disconnect(){}};}};
  const sound=new GameSound(()=>{counts.created++;return context as unknown as AudioContext;});
  return {sound,counts,context};
}
test('audio : aucun contexte avant geste, aucun son avant activation',async()=>{
  const {sound,counts}=harness();sound.play('hit');assert.equal(counts.created,0);
  assert.equal(await sound.unlock(),true);sound.play('hit');assert.equal(counts.started,2);
});
test('audio : muet et volume zéro annulent les sons et empêchent toute lecture',async()=>{
  const {sound,counts}=harness();await sound.unlock();sound.play('red');const stopped=counts.stopped;
  sound.configure(false,.4);assert.ok(counts.stopped>stopped);const started=counts.started;
  sound.play('finish');assert.equal(counts.started,started);assert.equal(await sound.unlock(),false);
  sound.configure(true,0);sound.play('start');assert.equal(counts.started,started);
});
test('audio : interruption sans sons en attente, reprise par geste et fermeture',async()=>{
  const {sound,counts,context}=harness();await sound.unlock();context.state='suspended';
  sound.play('tick');sound.play('red');assert.equal(counts.started,0);
  await sound.unlock();assert.equal(counts.started,0);sound.play('start');assert.equal(counts.started,2);
  sound.close();assert.equal(counts.closed,1);
});
test('audio : navigateur sans audio ne bloque pas le jeu',async()=>{
  const sound=new GameSound(()=>{throw new Error('unavailable');});
  assert.equal(await sound.unlock(),false);assert.doesNotThrow(()=>sound.play('hit'));sound.close();
});
