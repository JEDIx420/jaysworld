/** A modest studio chain for CORS-enabled streams and visitor-owned audio. */
export class RadioEffects {
  readonly context = new AudioContext();
  private source: MediaElementAudioSourceNode;
  private bass = this.context.createBiquadFilter();
  private filter = this.context.createBiquadFilter();
  private delay = this.context.createDelay(1);
  private feedback = this.context.createGain();
  private echo = this.context.createGain();
  private reverb = this.context.createConvolver();
  private room = this.context.createGain();
  private dry = this.context.createGain();
  private wobble = this.context.createOscillator();
  private wobbleDepth = this.context.createGain();
  constructor(audio: HTMLAudioElement) {
    const c = this.context;
    this.source = c.createMediaElementSource(audio);
    this.bass.type = 'lowshelf';
    this.bass.frequency.value = 180;
    this.filter.type = 'lowpass';
    this.filter.Q.value = 0.7;
    this.source.connect(this.bass);
    this.bass.connect(this.filter);
    this.filter.connect(this.dry);
    this.dry.connect(c.destination);
    this.filter.connect(this.delay);
    this.delay.delayTime.value = 0.28;
    this.delay.connect(this.echo);
    this.echo.connect(c.destination);
    this.delay.connect(this.feedback);
    this.feedback.gain.value = 0.28;
    this.feedback.connect(this.delay);
    const impulse = c.createBuffer(2, c.sampleRate * 1.8, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const a = impulse.getChannelData(ch);
      for (let i = 0; i < a.length; i++)
        a[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / a.length, 3);
    }
    this.reverb.buffer = impulse;
    this.filter.connect(this.reverb);
    this.reverb.connect(this.room);
    this.room.connect(c.destination);
    this.wobble.frequency.value = 1.8;
    this.wobble.connect(this.wobbleDepth);
    this.wobbleDepth.connect(this.filter.frequency);
    this.wobble.start();
    this.set(18000, 0, 0, 0, 0);
    void c.resume();
  }
  set(cutoff: number, bass: number, echo: number, room: number, wobble: number) {
    const t = this.context.currentTime;
    this.filter.frequency.setTargetAtTime(cutoff, t, 0.08);
    this.bass.gain.setTargetAtTime(bass, t, 0.08);
    this.echo.gain.setTargetAtTime(echo * 0.48, t, 0.08);
    this.room.gain.setTargetAtTime(room * 0.5, t, 0.08);
    this.wobbleDepth.gain.setTargetAtTime(wobble * Math.min(800, cutoff * 0.4), t, 0.08);
    this.dry.gain.setTargetAtTime(0.8, t, 0.08);
  }
  dispose() {
    this.source.disconnect();
    this.wobble.stop();
    void this.context.close();
  }
}
