/** The existing local drum synthesis/scheduler, with a tactile instrument face. */
export function createBeatMachine(root: HTMLElement, onPlayback: (playing: boolean) => void) {
  let pattern = [
    [1, 0, 0, 0, 1, 0, 0, 1],
    [0, 0, 1, 0, 0, 0, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
  ];
  let bpm = 108,
    row = 0,
    column = 0,
    bank = 0;
  try {
    const saved = JSON.parse(localStorage.getItem('jaysworld-beat') ?? 'null');
    if (
      Array.isArray(saved?.pattern) &&
      saved.pattern.length === 3 &&
      saved.pattern.every(
        (r: unknown) => Array.isArray(r) && r.length === 8 && r.every((v) => v === 0 || v === 1),
      )
    )
      pattern = saved.pattern;
    if (Number.isInteger(saved?.bpm) && saved.bpm >= 70 && saved.bpm <= 150) bpm = saved.bpm;
  } catch {
    /* Optional local pattern. */
  }
  root.innerHTML = `<div class="drum-machine" role="group" aria-label="Eight step drum machine">
    <div class="machine-brand"><span>CHAYA SOUND CO.</span><small>RHYTHM BOX · 08</small></div>
    <div class="machine-display"><span class="beat-meter" aria-hidden="true">▂ ▅ ▃ ▆ ▂ ▄ ▅ ▂</span><output id="beat-tempo">${bpm}</output><small>BPM</small></div>
    <div class="drum-grid"></div>
    <div class="machine-transport"><button type="button" class="beat-play" aria-label="Play beat">▶ PLAY</button><button type="button" class="tempo-less" aria-label="Slower tempo">−</button><button type="button" class="tempo-more" aria-label="Faster tempo">+</button><button type="button" class="beat-bank" aria-label="Show other four steps">1–4 ⇄ 5–8</button></div>
    <small class="instrument-hint">ARROWS · choose pad &nbsp; ENTER · pad &nbsp; SPACE · play</small></div>`;
  const machine = root.querySelector<HTMLElement>('.drum-machine')!,
    grid = root.querySelector('.drum-grid')!;
  const names = ['KICK', 'SNARE', 'HAT'],
    buttons: HTMLButtonElement[][] = [];
  const persist = () => {
    try {
      localStorage.setItem('jaysworld-beat', JSON.stringify({ pattern, bpm }));
    } catch {
      /* Optional. */
    }
  };
  const refresh = () => {
    buttons.forEach((line, r) =>
      line.forEach((b, c) => {
        b.classList.toggle('on', !!pattern[r][c]);
        b.classList.toggle('selected', row === r && column === c);
        b.setAttribute('aria-pressed', String(!!pattern[r][c]));
        b.dataset.bank = String(Math.floor(c / 4));
      }),
    );
    machine.dataset.bank = String(bank);
    machine.dataset.pad = `${row}:${column}`;
    root.querySelector('output')!.textContent = String(bpm);
    persist();
  };
  for (let r = 0; r < 3; r++) {
    const label = document.createElement('span');
    label.className = 'drum-label';
    label.textContent = names[r];
    grid.append(label);
    buttons[r] = [];
    for (let c = 0; c < 8; c++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'drum-pad';
      b.textContent = String(c + 1);
      b.setAttribute('aria-label', `${names[r].toLowerCase()}, step ${c + 1}`);
      b.addEventListener('click', () => {
        row = r;
        column = c;
        pattern[r][c] ^= 1;
        refresh();
      });
      grid.append(b);
      buttons[r].push(b);
    }
  }
  let context: AudioContext | undefined,
    noise: AudioBuffer | undefined,
    playing = false,
    starting = false,
    intent = 0,
    disposed = false,
    timer = 0,
    next = 0,
    step = 0;
  const visualTimers = new Set<number>(),
    play = root.querySelector<HTMLButtonElement>('.beat-play')!;
  const hit = (r: number, time: number) => {
    if (!context || !noise) return;
    const gain = context.createGain();
    gain.connect(context.destination);
    if (r === 0) {
      const osc = context.createOscillator();
      osc.frequency.setValueAtTime(145, time);
      osc.frequency.exponentialRampToValueAtTime(44, time + 0.14);
      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      osc.connect(gain);
      osc.start(time);
      osc.stop(time + 0.22);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    } else {
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter();
      source.buffer = noise;
      filter.type = r === 1 ? 'bandpass' : 'highpass';
      filter.frequency.value = r === 1 ? 1600 : 7200;
      filter.Q.value = 0.65;
      gain.gain.setValueAtTime(r === 1 ? 0.12 : 0.045, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (r === 1 ? 0.12 : 0.045));
      source.connect(filter);
      filter.connect(gain);
      source.start(time);
      source.stop(time + (r === 1 ? 0.14 : 0.06));
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    }
  };
  const schedule = () => {
    if (!playing || !context) return;
    // AudioContext can be suspended by mobile browsers; never accumulate an unbounded backlog.
    if (next < context.currentTime - 0.1) next = context.currentTime + 0.02;
    while (next < context.currentTime + 0.1) {
      const current = step;
      for (let r = 0; r < 3; r++) if (pattern[r][step]) hit(r, next);
      const id = window.setTimeout(
        () => {
          visualTimers.delete(id);
          if (playing)
            buttons.forEach((line) =>
              line.forEach((b, c) => b.classList.toggle('playing', c === current)),
            );
        },
        Math.max(0, (next - context.currentTime) * 1000),
      );
      visualTimers.add(id);
      next += 60 / bpm / 2;
      step = (step + 1) % 8;
    }
  };
  const stop = () => {
    intent++;
    starting = false;
    playing = false;
    clearInterval(timer);
    visualTimers.forEach(clearTimeout);
    visualTimers.clear();
    buttons.forEach((line) => line.forEach((b) => b.classList.remove('playing')));
    play.textContent = '▶ PLAY';
    play.setAttribute('aria-label', 'Play beat');
    machine.dataset.playing = 'false';
    onPlayback(false);
  };
  const toggle = async () => {
    if (playing || starting) {
      stop();
      return;
    }
    const request = ++intent;
    starting = true;
    try {
      if (!context) {
        context = new AudioContext();
        noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      await context.resume();
      if (disposed || request !== intent) return;
      starting = false;
      playing = true;
      onPlayback(true);
      step = 0;
      next = context.currentTime + 0.025;
      play.textContent = 'Ⅱ STOP';
      play.setAttribute('aria-label', 'Stop beat');
      machine.dataset.playing = 'true';
      schedule();
      timer = window.setInterval(schedule, 25);
    } catch {
      if (request !== intent || disposed) return;
      starting = false;
      play.textContent = 'TAP TO PLAY';
    }
  };
  play.addEventListener('click', () => void toggle());
  const tempo = (delta: number) => {
    bpm = Math.max(70, Math.min(150, bpm + delta));
    refresh();
  };
  root.querySelector('.tempo-less')!.addEventListener('click', () => tempo(-2));
  root.querySelector('.tempo-more')!.addEventListener('click', () => tempo(2));
  root.querySelector('.beat-bank')!.addEventListener('click', () => {
    bank = 1 - bank;
    column = bank * 4;
    refresh();
  });
  const visibility = () => {
    if (document.hidden) stop();
  };
  document.addEventListener('visibilitychange', visibility);
  refresh();
  return {
    key(code: string) {
      if (code === 'Space') void toggle();
      else if (code === 'Enter') {
        pattern[row][column] ^= 1;
        refresh();
      } else if (code === 'ArrowLeft' || code === 'ArrowRight') {
        column = (column + (code === 'ArrowRight' ? 1 : 7)) % 8;
        bank = Math.floor(column / 4);
        refresh();
      } else if (code === 'ArrowUp' || code === 'ArrowDown') {
        row = (row + (code === 'ArrowDown' ? 1 : 2)) % 3;
        refresh();
      } else if (code === 'Equal' || code === 'NumpadAdd') tempo(2);
      else if (code === 'Minus' || code === 'NumpadSubtract') tempo(-2);
      else return false;
      return true;
    },
    dispose() {
      disposed = true;
      stop();
      document.removeEventListener('visibilitychange', visibility);
      if (context) void context.close();
    },
  };
}
