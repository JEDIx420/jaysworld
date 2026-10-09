import type { PlaceId } from './projects';

export interface DemoActions {
  watchCroc: () => void;
  watchStars: () => void;
  onMusic: () => void;
}
function el<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const e = document.createElement(tag);
  if (text) e.textContent = text;
  if (className) e.className = className;
  return e;
}

const details: Record<PlaceId, [string, string][]> = {
  about: [
    [
      'Business + engineering',
      'I work across the business problem, product design, implementation, and deployment.',
    ],
    [
      'Made in Kerala',
      'Based in Thiruvananthapuram. The creative projects are where I keep experimenting.',
    ],
  ],
  'eagle-eye': [
    [
      'AI systems',
      'Research assistants, retrieval, chat interfaces, and workflows that connect to the tools a business already uses.',
    ],
    [
      'Growth operations',
      'Company intelligence, enrichment, campaign workflows, content, and a clearer view of the pipeline.',
    ],
  ],
  opsflash: [
    [
      'Connected evidence',
      'Research, search analytics, website analytics, and lead data brought into one operating context.',
    ],
    [
      'Actions with review',
      'Content and operational workflows with clear review steps, ownership, and handoff.',
    ],
  ],
  rift: [
    [
      'Exactness matters',
      'Typed values and deterministic results help explain what changed between datasets.',
    ],
    [
      'Built for large data',
      'A Rust command-line project, with ongoing work on performance, usability, and reconciliation techniques.',
    ],
  ],
  music: [
    [
      'From a sketch to a groove',
      'Chord pads, piano, bass, drums, loops, guitar, and audio input in a browser workstation.',
    ],
    ['Local-first audio', 'The core synthesis and recording work runs in your browser.'],
  ],
  saltwater: [
    [
      'Land and water',
      'A crocodile survival experiment exploring swimming, stalking, ambush, wildlife, and a coastal world.',
    ],
    [
      'An evolving simulation',
      'The standalone game has its own development path. This village is a small window into the idea.',
    ],
  ],
  space: [
    ['Room to wander', 'Flight, stations, exploration, trading, and a procedural space setting.'],
    [
      'A playful control experiment',
      'Alongside the flight experience, the project explores using a companion device as a controller.',
    ],
  ],
};
export function renderDetails(id: PlaceId, container: HTMLElement) {
  container.replaceChildren();
  const grid = el('div', undefined, 'exhibit-details');
  for (const [title, text] of details[id]) {
    const card = el('div', undefined, 'detail-card');
    card.append(el('strong', title), el('p', text));
    grid.append(card);
  }
  container.append(grid);
}

export interface DemoRecord {
  id: string;
  amount: string;
  status: string;
}
export function exactCents(amount: string): bigint {
  if (!/^-?\d+\.\d{2}$/.test(amount)) throw new Error('Use an exact two-decimal amount.');
  const negative = amount.startsWith('-'),
    clean = negative ? amount.slice(1) : amount,
    [whole, fraction] = clean.split('.');
  const cents = BigInt(whole) * 100n + BigInt(fraction);
  return negative ? -cents : cents;
}
export function compareDemoRecords(source: DemoRecord[], target: DemoRecord[]) {
  if (
    new Set(source.map((r) => r.id)).size !== source.length ||
    new Set(target.map((r) => r.id)).size !== target.length
  )
    throw new Error('Record keys must be unique.');
  const left = new Map(source.map((r) => [r.id, r])),
    right = new Map(target.map((r) => [r.id, r]));
  return [...new Set([...left.keys(), ...right.keys()])].map((id) => {
    const a = left.get(id),
      b = right.get(id);
    const state = !a
      ? 'new'
      : !b
        ? 'missing'
        : exactCents(a.amount) !== exactCents(b.amount) || a.status !== b.status
          ? 'changed'
          : 'equal';
    return { id, source: a, target: b, state };
  });
}

function musicDemo(root: HTMLElement, onMusic: () => void) {
  const demo = el('div', undefined, 'demo'),
    top = el('div', undefined, 'demo-top'),
    play = el('button', 'Play beat'),
    tempo = el('input'),
    label = el('label', '108 BPM');
  play.type = 'button';
  tempo.type = 'range';
  tempo.min = '70';
  tempo.max = '150';
  tempo.value = '108';
  tempo.setAttribute('aria-label', 'Beat tempo');
  label.append(tempo);
  top.append(el('strong', 'Leave a little groove behind.'), play, label);
  demo.append(top);
  const pattern = [
      [1, 0, 0, 0, 1, 0, 0, 1],
      [0, 0, 1, 0, 0, 0, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    names = ['Kick', 'Snare', 'Hat'],
    grid = el('div', undefined, 'beat-grid'),
    buttons: HTMLButtonElement[][] = [];
  for (let row = 0; row < 3; row++) {
    const line = el('div', undefined, 'beat-row');
    line.append(el('span', names[row]));
    buttons[row] = [];
    for (let step = 0; step < 8; step++) {
      const button = el('button');
      button.type = 'button';
      button.classList.toggle('on', !!pattern[row][step]);
      button.setAttribute('aria-pressed', String(!!pattern[row][step]));
      button.setAttribute('aria-label', names[row] + ', step ' + (step + 1));
      button.addEventListener('click', () => {
        pattern[row][step] = pattern[row][step] ? 0 : 1;
        button.classList.toggle('on', !!pattern[row][step]);
        button.setAttribute('aria-pressed', String(!!pattern[row][step]));
      });
      line.append(button);
      buttons[row].push(button);
    }
    grid.append(line);
  }
  demo.append(
    grid,
    el(
      'p',
      'Tap the steps to change the rhythm. This small sequencer makes its sounds here in your browser.',
      'demo-note',
    ),
  );
  root.append(demo);
  let context: AudioContext | undefined,
    noise: AudioBuffer | undefined,
    playing = false,
    disposed = false,
    timer = 0,
    next = 0,
    step = 0;
  const visualTimers = new Set<number>();
  const hit = (row: number, time: number) => {
    if (!context || !noise) return;
    const gain = context.createGain();
    gain.connect(context.destination);
    if (row === 0) {
      const osc = context.createOscillator();
      osc.frequency.setValueAtTime(145, time);
      osc.frequency.exponentialRampToValueAtTime(44, time + 0.14);
      gain.gain.setValueAtTime(0.3, time);
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
      filter.type = row === 1 ? 'bandpass' : 'highpass';
      filter.frequency.value = row === 1 ? 1600 : 7200;
      filter.Q.value = 0.65;
      gain.gain.setValueAtTime(row === 1 ? 0.14 : 0.055, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + (row === 1 ? 0.12 : 0.045));
      source.connect(filter);
      filter.connect(gain);
      source.start(time);
      source.stop(time + (row === 1 ? 0.14 : 0.06));
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    }
  };
  const schedule = () => {
    if (!playing || !context) return;
    while (next < context.currentTime + 0.1) {
      const currentStep = step;
      for (let row = 0; row < 3; row++) if (pattern[row][step]) hit(row, next);
      const timerId = window.setTimeout(
        () => {
          visualTimers.delete(timerId);
          if (!playing) return;
          buttons.forEach((row) =>
            row.forEach((b, i) => b.classList.toggle('playing', i === currentStep)),
          );
        },
        Math.max(0, (next - context.currentTime) * 1000),
      );
      visualTimers.add(timerId);
      next += 60 / Number(tempo.value) / 2;
      step = (step + 1) % 8;
    }
  };
  const stop = () => {
    playing = false;
    clearInterval(timer);
    for (const t of visualTimers) clearTimeout(t);
    visualTimers.clear();
    buttons.forEach((row) => row.forEach((b) => b.classList.remove('playing')));
    play.textContent = 'Play beat';
  };
  play.addEventListener('click', async () => {
    if (playing) {
      stop();
      return;
    }
    try {
      if (!context) {
        context = new AudioContext();
        noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      await context.resume();
      if (disposed) return;
      onMusic();
      playing = true;
      step = 0;
      next = context.currentTime + 0.025;
      play.textContent = 'Stop beat';
      schedule();
      timer = window.setInterval(schedule, 25);
    } catch {
      play.textContent = 'Audio unavailable';
    }
  });
  tempo.addEventListener('input', () => {
    label.firstChild!.textContent = tempo.value + ' BPM';
  });
  return () => {
    disposed = true;
    stop();
    if (context) void context.close();
  };
}

function riftDemo(root: HTMLElement) {
  const demo = el('div', undefined, 'demo'),
    top = el('div', undefined, 'demo-top'),
    run = el('button', 'Compare records');
  run.type = 'button';
  top.append(el('strong', 'One paisa makes a difference.'), run);
  demo.append(top);
  const table = el('table', undefined, 'rift-table'),
    head = el('thead'),
    tr = el('tr');
  for (const text of ['Record', 'Source INR', 'Target INR', 'Result']) tr.append(el('th', text));
  head.append(tr);
  table.append(head);
  const body = el('tbody'),
    source = [
      { id: 'TX-01', amount: '1200.00', status: 'settled' },
      { id: 'TX-02', amount: '4500.75', status: 'settled' },
      { id: 'TX-03', amount: '1000.00', status: 'pending' },
    ],
    target = [
      { id: 'TX-01', amount: '1200.00', status: 'settled' },
      { id: 'TX-02', amount: '4500.76', status: 'settled' },
      { id: 'TX-04', amount: '1000.00', status: 'settled' },
    ];
  const rows = compareDemoRecords(source, target);
  for (const row of rows) {
    const line = el('tr');
    line.dataset.state = row.state;
    for (const text of [row.id, row.source?.amount ?? '—', row.target?.amount ?? '—', 'Ready'])
      line.append(el('td', text));
    body.append(line);
  }
  table.append(body);
  const result = el('p', 'Same keys. Exact amounts. A small change can matter.', 'rift-result');
  run.addEventListener('click', () => {
    [...body.rows].forEach((line, i) => {
      line.classList.toggle('changed', rows[i].state !== 'equal');
      line.cells[3].textContent = rows[i].state;
    });
    result.textContent = '1 changed · 1 missing · 1 new. The 0.01 INR difference is preserved.';
    run.textContent = 'Compared';
  });
  demo.append(
    table,
    result,
    el(
      'p',
      'Illustrative data, compared locally using exact integer amounts. The full RIFT engine is a separate Rust CLI.',
      'demo-note',
    ),
  );
  root.append(demo);
  return () => undefined;
}

function workflowDemo(root: HTMLElement, id: 'eagle-eye' | 'opsflash') {
  const demo = el('div', undefined, 'demo'),
    top = el('div', undefined, 'demo-top');
  top.append(
    el('strong', id === 'eagle-eye' ? 'Useful systems, from end to end.' : 'Pick a workflow.'),
  );
  const actions = el('div', undefined, 'demo-actions'),
    flow = el('div', undefined, 'workflow-steps'),
    copy = el('p', undefined, 'workflow-copy');
  const scenarios = [
    [
      'Research',
      ['Collect', 'Check', 'Connect', 'Brief'],
      'Bring sources together, keep their evidence, and make the useful findings easy to act on.',
    ],
    [
      'Content',
      ['Research', 'Draft', 'Review', 'Publish'],
      'Move from a researched opportunity to a reviewed article and a deliberate publishing handoff.',
    ],
    [
      'Growth',
      ['Discover', 'Enrich', 'Prioritise', 'Act'],
      'Turn company and lead intelligence into a workflow with clear next actions.',
    ],
  ] as const;
  const show = (index: number) => {
    flow.replaceChildren();
    for (const [n, text] of scenarios[index][1].entries()) {
      const step = el('span'),
        num = el('b', String(n + 1).padStart(2, '0'));
      step.append(num, document.createTextNode(text));
      flow.append(step);
    }
    copy.textContent = scenarios[index][2];
    [...actions.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
  };
  scenarios.forEach((s, i) => {
    const b = el('button', s[0]);
    b.type = 'button';
    b.addEventListener('click', () => show(i));
    actions.append(b);
  });
  show(0);
  demo.append(
    top,
    actions,
    flow,
    copy,
    el(
      'p',
      'An illustrative workflow. Project-specific tools and approval steps vary by deployment.',
      'demo-note',
    ),
  );
  root.append(demo);
  return () => undefined;
}

function starsDemo(root: HTMLElement, watchStars: () => void) {
  const demo = el('div', undefined, 'demo'),
    top = el('div', undefined, 'demo-top'),
    button = el('button', 'Stay for the stars');
  button.type = 'button';
  button.addEventListener('click', watchStars);
  top.append(el('strong', 'A window into the quiet.'), button);
  const canvas = el('canvas', undefined, 'star-chart');
  canvas.width = 600;
  canvas.height = 190;
  canvas.setAttribute('aria-label', 'Move across a miniature star chart');
  const ctx = canvas.getContext('2d')!;
  let shiftX = 0,
    shiftY = 0,
    seed = 42;
  const points: { x: number; y: number; r: number }[] = [];
  for (let n = 0; n < 115; n++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const x = (seed / 4294967296) * 600;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const y = (seed / 4294967296) * 190;
    points.push({ x, y, r: n % 7 === 0 ? 1.8 : 0.65 });
  }
  const draw = () => {
    ctx.fillStyle = '#183044';
    ctx.fillRect(0, 0, 600, 190);
    for (const p of points) {
      ctx.fillStyle = p.r > 1 ? '#e7cd95' : '#829da6';
      ctx.beginPath();
      ctx.arc((p.x + shiftX + 600) % 600, (p.y + shiftY + 190) % 190, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#e7cd9540';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(300, 95, 100, 31, -0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#e7cd95';
    ctx.beginPath();
    ctx.arc(300, 95, 4, 0, Math.PI * 2);
    ctx.fill();
  };
  draw();
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    shiftX = (e.clientX - r.left - r.width / 2) * 0.12;
    shiftY = (e.clientY - r.top - r.height / 2) * 0.12;
    draw();
  });
  demo.append(
    top,
    canvas,
    el(
      'p',
      'Move across the chart, or watch the village settle into evening. Launch the full game below to fly.',
      'demo-note',
    ),
  );
  root.append(demo);
  return () => undefined;
}

export function renderDemo(id: PlaceId, root: HTMLElement, actions: DemoActions): () => void {
  root.replaceChildren();
  if (id === 'music') return musicDemo(root, actions.onMusic);
  if (id === 'rift') return riftDemo(root);
  if (id === 'eagle-eye' || id === 'opsflash') return workflowDemo(root, id);
  if (id === 'space') return starsDemo(root, actions.watchStars);
  if (id === 'saltwater') {
    const demo = el('div', undefined, 'demo'),
      top = el('div', undefined, 'demo-top'),
      button = el('button', 'Watch the crocodile');
    button.type = 'button';
    button.addEventListener('click', actions.watchCroc);
    top.append(el('strong', 'A quiet moment at the jetty.'), button);
    demo.append(
      top,
      el('p', 'There is a resident in the backwater. Give it a moment to swim past.', 'demo-note'),
    );
    root.append(demo);
  }
  return () => undefined;
}
