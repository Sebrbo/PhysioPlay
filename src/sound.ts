export type Cue='tick'|'start'|'hit'|'red'|'miss'|'level'|'reset'|'finish'|'pause'|'resume'|'calibrated';
type Note={frequency:number;duration:number;delay?:number};
const patterns:Record<Cue,Note[]>={
  tick:[{frequency:560,duration:.09}],
  start:[{frequency:660,duration:.1},{frequency:880,duration:.18,delay:.13}],
  hit:[{frequency:880,duration:.09},{frequency:1175,duration:.1,delay:.07}],
  red:[{frequency:220,duration:.13},{frequency:165,duration:.18,delay:.15}],
  miss:[{frequency:330,duration:.12}],
  level:[{frequency:660,duration:.08},{frequency:880,duration:.08,delay:.1},{frequency:1100,duration:.12,delay:.2}],
  reset:[{frequency:440,duration:.1},{frequency:330,duration:.14,delay:.12}],
  finish:[{frequency:523,duration:.13},{frequency:659,duration:.13,delay:.16},{frequency:784,duration:.3,delay:.32}],
  pause:[{frequency:440,duration:.1},{frequency:330,duration:.1,delay:.12}],
  resume:[{frequency:440,duration:.1},{frequency:660,duration:.1,delay:.12}],
  calibrated:[{frequency:659,duration:.12},{frequency:880,duration:.16,delay:.15}],
};

// Les sons sont synthétisés localement, sans fichier à télécharger.
export class GameSound {
  private context:AudioContext|null=null;
  private voices=new Set<OscillatorNode>();
  private enabled=true;
  private volume=.4;
  constructor(private createContext:()=>AudioContext=()=>new AudioContext()){}
  configure(enabled:boolean,volume:number){this.enabled=enabled;this.volume=Math.max(0,Math.min(1,volume));this.stop();}
  async unlock(){
    if(!this.enabled||this.volume===0)return false;
    try{
      this.context??=this.createContext();
      if(this.context.state!=='running')await this.context.resume();
      return this.context.state==='running';
    }catch{return false;}
  }
  play(cue:Cue){
    const context=this.context;
    // Ne jamais empiler des sons à rejouer après une interruption iPad.
    if(!this.enabled||this.volume===0||!context||context.state!=='running')return;
    try{
      for(const note of patterns[cue]){
        const oscillator=context.createOscillator(),gain=context.createGain();
        const start=context.currentTime+(note.delay??0),end=start+note.duration;
        oscillator.type='sine';oscillator.frequency.setValueAtTime(note.frequency,start);
        gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.22*this.volume,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,end);
        oscillator.connect(gain);gain.connect(context.destination);this.voices.add(oscillator);
        oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};
        oscillator.start(start);oscillator.stop(end+.01);
      }
    }catch{/* Le jeu reste utilisable si le son est indisponible. */}
  }
  stop(){for(const voice of this.voices){try{voice.stop();}catch{/* déjà terminé */}}this.voices.clear();}
  close(){this.stop();void this.context?.close().catch(()=>{});this.context=null;}
}
