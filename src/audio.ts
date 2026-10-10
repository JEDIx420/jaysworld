/** Original procedural sound design. No third-party engine recordings. */
export class JourneyAudio {
  private studioBeatAt = 0;
  private studioBeat = 0;
  private context?: AudioContext;
  private master?: GainNode;
  private exhaust?: OscillatorNode;
  private pulse?: OscillatorNode;
  private pulseDepth?: GainNode;
  private engineLevel?: GainNode;
  private engineFilter?: BiquadFilterNode;
  private rattle?: AudioBufferSourceNode;
  private rattleLevel?: GainNode;
  private wind?: AudioBufferSourceNode;
  private windLevel?: GainNode;
  private rainLevel?: GainNode;
  private rain?: AudioBufferSourceNode;
  private birdAt = 0;
  private gear = 1;

  private brakeAt = 0;
  enabled = false;
  async enable() {
    if (!this.enabled) await this.toggle();
  }
  async toggle() {
    if (!this.context) {
      const c = (this.context = new AudioContext());
      const master = (this.master = c.createGain());
      master.gain.value = 0;
      const compressor = c.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.ratio.value = 4;
      master.connect(compressor);
      compressor.connect(c.destination);
      // Rounded exhaust harmonics, amplitude-modulated by the firing rhythm.
      const exhaust = (this.exhaust = c.createOscillator());
      exhaust.setPeriodicWave(
        c.createPeriodicWave(
          new Float32Array(9),
          new Float32Array([0, 1, 0.55, 0.32, 0.19, 0.1, 0.07, 0.035, 0.02]),
        ),
      );
      const filter = (this.engineFilter = c.createBiquadFilter());
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      filter.Q.value = 0.65;
      const level = (this.engineLevel = c.createGain());
      level.gain.value = 0.075;
      exhaust.connect(filter);
      filter.connect(level);
      level.connect(master);
      exhaust.start();
      const pulse = (this.pulse = c.createOscillator());
      pulse.type = 'sine';
      pulse.frequency.value = 13;
      const mod = (this.pulseDepth = c.createGain());
      mod.gain.value = 0.052;
      pulse.connect(mod);
      mod.connect(level.gain);
      pulse.start();
      const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const a = buffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < a.length; i++) {
        brown = (brown + (Math.random() * 2 - 1) * 0.03) / 1.03;
        a[i] = brown * 4;
      }
      this.wind = c.createBufferSource();
      this.wind.buffer = buffer;
      this.wind.loop = true;
      const air = c.createBiquadFilter();
      air.type = 'bandpass';
      air.frequency.value = 950;
      air.Q.value = 0.45;
      this.windLevel = c.createGain();
      this.windLevel.gain.value = 0;
      this.wind.connect(air);
      air.connect(this.windLevel);
      this.windLevel.connect(master);
      this.wind.start();
      this.rattle = c.createBufferSource();
      this.rattle.buffer = buffer;
      this.rattle.loop = true;
      const metal = c.createBiquadFilter();
      metal.type = 'bandpass';
      metal.frequency.value = 1850;
      metal.Q.value = 4;
      this.rattleLevel = c.createGain();
      this.rattleLevel.gain.value = 0.025;
      this.rattle.connect(metal);
      metal.connect(this.rattleLevel);
      this.rattleLevel.connect(master);
      this.rattle.start();
      const rainBuffer = c.createBuffer(1, c.sampleRate * 3, c.sampleRate),
        data = rainBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.45;
      this.rain = c.createBufferSource();
      this.rain.buffer = rainBuffer;
      this.rain.loop = true;
      const filterRain = c.createBiquadFilter();
      filterRain.type = 'lowpass';
      filterRain.frequency.value = 2400;
      this.rainLevel = c.createGain();
      this.rainLevel.gain.value = 0;
      this.rain.connect(filterRain).connect(this.rainLevel).connect(master);
      this.rain.start();
    }
    await this.context.resume();
    this.enabled = !this.enabled;
    this.master!.gain.setTargetAtTime(this.enabled ? 0.65 : 0, this.context.currentTime, 0.1);
    if (this.enabled) this.cue('ignition');
    return this.enabled;
  }
  update(speed: number, paused: boolean, throttle = 0, brake = false) {
    if (!this.context) return;
    const t = this.context.currentTime;
    this.master!.gain.setTargetAtTime(this.enabled ? 0.65 : 0, t, 0.1);
    const gear = speed < 3.5 ? 1 : speed < 7.8 ? 2 : 3;
    if (gear !== this.gear && this.enabled && !paused) {
      this.gear = gear;
      this.tone(110, 0.06, 0.022, 'triangle');
    }
    const rpm = paused
      ? 0
      : 13 + speed * (gear === 1 ? 3.8 : gear === 2 ? 2.2 : 1.45) + Math.abs(throttle) * 7;
    this.exhaust!.frequency.setTargetAtTime(38 + rpm * 2, t, 0.1);
    this.pulse!.frequency.setTargetAtTime(Math.max(1, rpm), t, 0.08);
    this.engineFilter!.frequency.setTargetAtTime(
      280 + rpm * 12 + Math.abs(throttle) * 260,
      t,
      0.12,
    );
    this.pulseDepth!.gain.setTargetAtTime(paused ? 0 : 0.032, t, 0.1);
    this.engineLevel!.gain.setTargetAtTime(
      paused ? 0 : 0.055 + Math.abs(throttle) * 0.065,
      t,
      0.12,
    );
    this.windLevel!.gain.setTargetAtTime(paused ? 0 : Math.min(speed / 16, 1) * 0.12, t, 0.2);
    this.rattleLevel!.gain.setTargetAtTime(
      paused ? 0 : 0.025 + Math.min(speed / 16, 1) * 0.04,
      t,
      0.15,
    );
    if (brake && speed > 2 && t > this.brakeAt) {
      this.brakeAt = t + 0.9;
      this.tone(920 + speed * 24, 0.16, 0.012, 'sine');
    }
    if (this.enabled && !paused && t > this.birdAt) {
      this.birdAt = t + 9 + Math.random() * 8;
      this.tone(1800, 0.09, 0.018, 'sine', 2700);
      setTimeout(() => this.tone(2200, 0.08, 0.014, 'sine', 1400), 140);
    }
  }
  weather(rain: number, wind: number, night: number) {
    if (!this.context) return;
    this.rainLevel?.gain.setTargetAtTime(
      document.hidden ? 0 : rain * 0.14 + wind * 0.012,
      this.context.currentTime,
      0.4,
    );
    if (this.enabled && !document.hidden && this.context.currentTime > this.birdAt) {
      this.birdAt = this.context.currentTime + 10 + Math.random() * 10;
      this.tone(
        night > 0.7 ? 540 : 1800,
        night > 0.7 ? 0.3 : 0.1,
        0.012,
        'sine',
        night > 0.7 ? 490 : 2600,
      );
    }
  }
  studio(distance: number, audible: boolean) {
    if (!this.context || !this.enabled || !audible || document.hidden || distance > 24) return;
    const t = this.context.currentTime;
    if (t < this.studioBeatAt) return;
    this.studioBeatAt = t + 60 / 108 / 2;
    const level = Math.max(0, 1 - distance / 24) * 0.024;
    this.tone(
      this.studioBeat % 4 === 0 ? 85 : this.studioBeat % 4 === 2 ? 170 : 3600,
      0.05,
      level,
      'triangle',
    );
    this.studioBeat = (this.studioBeat + 1) % 8;
  }
  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    end = frequency,
  ) {
    if (!this.enabled || !this.context || !this.master || this.context.state === 'closed') return;
    const c = this.context,
      t = c.currentTime,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(frequency, t);
    o.frequency.exponentialRampToValueAtTime(end, t + duration);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.01);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  honk() {
    this.tone(355, 0.32, 0.11, 'sawtooth', 347);
    this.tone(470, 0.32, 0.075, 'triangle', 465);
  }
  cue(kind: 'coins' | 'paper' | 'tea' | 'pickup' | 'ignition') {
    if (kind === 'coins') {
      this.tone(1568, 0.14, 0.05);
      setTimeout(() => this.tone(2093, 0.2, 0.04), 110);
    } else if (kind === 'pickup') {
      this.tone(740, 0.12, 0.04);
      setTimeout(() => this.tone(990, 0.16, 0.04), 110);
    } else if (kind === 'tea') this.tone(680, 0.25, 0.025, 'sine', 320);
    else if (kind === 'paper') this.tone(170, 0.06, 0.025, 'sawtooth', 90);
    else this.tone(45, 0.45, 0.08, 'triangle', 95);
  }
  dispose() {
    this.exhaust?.stop();
    this.pulse?.stop();
    this.wind?.stop();
    this.rattle?.stop();
    this.rain?.stop();
    if (this.context) void this.context.close();
  }
}
