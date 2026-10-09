export class JourneyAudio {
  private context?: AudioContext;
  private master?: GainNode;
  private engine?: OscillatorNode;
  private engineLevel?: GainNode;
  private pulse?: OscillatorNode;
  private wind?: AudioBufferSourceNode;
  private windLevel?: GainNode;
  private birdAt = 0;
  enabled = false;
  async toggle() {
    if (!this.context) {
      this.context = new AudioContext();
      const c = this.context;
      this.master = c.createGain();
      this.master.gain.value = 0;
      const compressor = c.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.ratio.value = 4;
      this.master.connect(compressor);
      compressor.connect(c.destination);
      this.engine = c.createOscillator();
      this.engine.type = 'sawtooth';
      this.engine.frequency.value = 54;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 280;
      filter.Q.value = 0.5;
      this.engineLevel = c.createGain();
      this.engineLevel.gain.value = 0.047;
      this.engine.connect(filter);
      filter.connect(this.engineLevel);
      this.engineLevel.connect(this.master);
      this.engine.start();
      this.pulse = c.createOscillator();
      this.pulse.type = 'sine';
      this.pulse.frequency.value = 11;
      const pulseLevel = c.createGain();
      pulseLevel.gain.value = 0.013;
      this.pulse.connect(pulseLevel);
      pulseLevel.connect(this.engineLevel.gain);
      this.pulse.start();
      const buffer = c.createBuffer(1, c.sampleRate * 3, c.sampleRate),
        data = buffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < data.length; i++) {
        brown = (brown + (Math.random() * 2 - 1) * 0.02) / 1.02;
        data[i] = brown * 3.2;
      }
      this.wind = c.createBufferSource();
      this.wind.buffer = buffer;
      this.wind.loop = true;
      const air = c.createBiquadFilter();
      air.type = 'bandpass';
      air.frequency.value = 780;
      air.Q.value = 0.4;
      this.windLevel = c.createGain();
      this.windLevel.gain.value = 0.023;
      this.wind.connect(air);
      air.connect(this.windLevel);
      this.windLevel.connect(this.master);
      this.wind.start();
    }
    await this.context.resume();
    this.enabled = !this.enabled;
    this.master!.gain.setTargetAtTime(this.enabled ? 0.65 : 0, this.context.currentTime, 0.12);
    return this.enabled;
  }
  update(speed: number, paused: boolean) {
    if (!this.context || !this.engine) return;
    const c = this.context,
      t = c.currentTime;
    this.master!.gain.setTargetAtTime(this.enabled && !paused ? 0.65 : 0, t, 0.12);
    this.engine.frequency.setTargetAtTime(54 + Math.min(speed, 16) * 5.4, t, 0.15);
    this.pulse!.frequency.setTargetAtTime(11 + Math.min(speed, 16) * 1.9, t, 0.1);
    this.engineLevel!.gain.setTargetAtTime(paused ? 0 : 0.047, t, 0.18);
    this.windLevel!.gain.setTargetAtTime(paused ? 0 : 0.023, t, 0.18);
    if (this.enabled && !paused && t > this.birdAt) {
      this.birdAt = t + 5 + Math.random() * 6;
      this.chirp();
    }
  }
  private chirp() {
    const c = this.context!,
      t = c.currentTime + 0.05;
    for (let n = 0; n < 2; n++) {
      const osc = c.createOscillator(),
        gain = c.createGain(),
        start = t + n * 0.16;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800 + n * 180, start);
      osc.frequency.exponentialRampToValueAtTime(2800, start + 0.055);
      osc.frequency.exponentialRampToValueAtTime(1400, start + 0.11);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.015, start + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
      osc.connect(gain);
      gain.connect(this.master!);
      osc.start(start);
      osc.stop(start + 0.13);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
  }
  honk() {
    if (!this.context || !this.master || !this.enabled) return;
    const c = this.context,
      t = c.currentTime;
    for (const frequency of [355, 470]) {
      const osc = c.createOscillator(),
        gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.095, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.27);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t);
      osc.stop(t + 0.28);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }
  }
  dispose() {
    this.engine?.stop();
    this.pulse?.stop();
    this.wind?.stop();
    if (this.context) void this.context.close();
  }
}
