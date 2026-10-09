import { PLACES, type Place } from './projects';
import { exhibitArt } from './exhibit-art';
import { createBeatMachine } from './beats';
import { compareDemoRecords } from './demos';
import type { ViewMode } from './engine';

type Actions = {
  paper: (place: Place) => void;
  roof: () => void;
  crocs: () => void;
  stars: () => void;
  buy: (item: 'tea' | 'pazhampori' | 'samosa') => void;
  leave: () => void;
  cue: () => void;
};
const PROPS: Record<string, string> = {
  telescope:
    '<svg viewBox="0 0 220 120" aria-hidden="true"><path d="m115 57-36 54m36-54 34 54m-34-54 2 56" stroke="#8d947c" stroke-width="6"/><g transform="rotate(-27 110 43)"><rect x="57" y="23" width="114" height="33" rx="8" fill="#7b9998" stroke="#d0dbbc" stroke-width="3"/><ellipse cx="167" cy="39" rx="7" ry="17" fill="#1d4442"/><rect x="45" y="32" width="19" height="15" fill="#d6c897"/><path d="M139 22v33" stroke="#304f4a" stroke-width="5"/></g><circle cx="183" cy="13" r="3" fill="#ead7a1"/></svg>',
  drum: '<svg viewBox="0 0 220 120" aria-hidden="true"><rect x="34" y="17" width="152" height="91" rx="11" fill="#4c5e4b" stroke="#879b76" stroke-width="3"/><rect x="46" y="29" width="65" height="21" rx="3" fill="#213c2d"/><text x="57" y="44" fill="#d3d795" font-family="monospace" font-size="13">108 BPM</text><g fill="#d9b47a"><rect x="47" y="60" width="24" height="25" rx="4"/><rect x="79" y="60" width="24" height="25" rx="4"/><rect x="111" y="60" width="24" height="25" rx="4"/><rect x="143" y="60" width="24" height="25" rx="4"/></g><circle cx="153" cy="40" r="10" fill="#afc09b"/></svg>',
  crt: '<svg viewBox="0 0 220 120" aria-hidden="true"><rect x="45" y="10" width="130" height="92" rx="15" fill="#929a7c" stroke="#647862" stroke-width="3"/><rect x="57" y="21" width="106" height="67" rx="14" fill="#16392d"/><path d="m70 41 14 9-14 9m23 3h26" stroke="#bbd99d" stroke-width="4" fill="none"/><rect x="77" y="103" width="69" height="7" rx="2" fill="#6f856e"/><circle cx="154" cy="95" r="3" fill="#ecd084"/></svg>',
  rift: '<svg viewBox="0 0 220 120" aria-hidden="true"><rect x="35" y="15" width="150" height="93" rx="11" fill="#3e5147" stroke="#889782" stroke-width="3"/><rect x="48" y="31" width="124" height="32" rx="3" fill="#172c23"/><text x="67" y="54" fill="#d6c27f" font-family="monospace" font-size="24">Δ 0.01</text><path d="M51 81h117m-117 12h117" stroke="#839b7c" stroke-width="4"/><circle cx="60" cy="97" r="2" fill="#d6c27f"/></svg>',
  croc: '<svg viewBox="0 0 220 120" aria-hidden="true"><path d="M24 96h177m-156 9h114" stroke="#92b1a0" stroke-width="3"/><path d="m27 79 48-17 60 4 38 17 27 4-37 9-59-8-40 7z" fill="#77905d"/><ellipse cx="93" cy="73" rx="46" ry="15" fill="#6e895b"/><path d="m65 61 6-9 8 9 7-11 7 11 8-10 6 10 8-8 8 12" fill="#415c3f"/><circle cx="63" cy="66" r="5" fill="#d3c574"/><circle cx="61" cy="65" r="2" fill="#1d3c30"/><path d="M32 80h42" stroke="#3e5b38" stroke-width="3"/></svg>',

  paper:
    '<svg viewBox="0 0 220 120" aria-hidden="true"><path fill="#f1e5bc" stroke="#ac9262" stroke-width="2" d="m42 19 138-6 10 94-143 5z"/><text x="61" y="42" font-size="14" fill="#27483d" font-family="serif" font-weight="bold">KERALA DISPATCH</text><path d="m58 54 115-5m-112 12 50-2m-50 9 50-2m-49 9 51-2" stroke="#9a9b7a" stroke-width="3"/><rect x="119" y="59" width="48" height="35" rx="2" fill="#829d71"/><path d="m126 86 15-20 14 19" stroke="#d9e2b5" fill="none" stroke-width="3"/></svg>',
  tea: '<svg viewBox="0 0 220 120" aria-hidden="true"><ellipse cx="108" cy="101" rx="62" ry="10" fill="#c49e66"/><path d="M82 25q-12-15 0-24m28 24q-12-15 0-24m28 24q-12-15 0-24" fill="none" stroke="#e5dec5" stroke-width="3"/><path d="m74 38 9 60h48l8-60" fill="#d9bf8d" stroke="#f7efd6" stroke-width="3"/><ellipse cx="107" cy="38" rx="32" ry="8" fill="#aa6d3e"/><path d="M141 48q33-3 19 28l-24 7" fill="none" stroke="#e6d3a8" stroke-width="7"/></svg>',
  snack:
    '<svg viewBox="0 0 220 120" aria-hidden="true"><ellipse cx="110" cy="85" rx="80" ry="23" fill="#e9d8b0"/><path d="m70 84 15-45 43 43z" fill="#d6a548" stroke="#b67839" stroke-width="3"/><rect x="128" y="38" width="20" height="54" rx="10" fill="#ddb555" transform="rotate(21 138 65)"/></svg>',
  lift: '<svg viewBox="0 0 220 120" aria-hidden="true"><rect x="65" y="15" width="90" height="96" rx="4" fill="#415c63" stroke="#92adb1" stroke-width="4"/><path d="M110 22v82" stroke="#a6babe"/><path d="m101 9 9-8 9 8" fill="none" stroke="#eec781" stroke-width="3"/><text x="92" y="66" font-family="monospace" font-size="23" fill="#f4dcaa">↑7</text></svg>',
};
export class VenueControls {
  private index = 0;
  private options: { title: string; art: string; act: () => void }[] = [];
  private mode: ViewMode = 'drive';
  private place?: Place;
  constructor(
    private root: HTMLElement,
    private actions: Actions,
  ) {}
  show(mode: ViewMode, place: Place | undefined, title: string, detail: string) {
    this.mode = mode;
    this.place = place;
    this.index = 0;
    this.root.hidden = mode === 'drive';
    if (mode === 'drive') return;
    if (mode !== 'storefront') {
      this.root.innerHTML = `<div class="observation-caption"><small>${mode === 'roof' ? 'EAGLE TOWERS · ROOFTOP' : mode === 'stars' ? 'THE TELESCOPE' : 'WETLAND WATCH'}</small><h2 id="view-title"></h2><span id="view-detail"></span></div><div class="observation-actions"><button type="button" data-observer="previous" aria-label="Previous target">←</button><button type="button" data-observer="action">${mode === 'croc' ? 'Watch a hunt' : mode === 'stars' ? 'Next constellation' : 'Stay a while'}</button><button type="button" data-observer="next" aria-label="Next target">→</button>${mode === 'stars' ? '<button type="button" data-observer="night">Nightfall</button>' : ''}<button type="button" data-observer="wider" aria-label="Zoom out">−</button><button type="button" data-observer="closer" aria-label="Zoom in">+</button><button type="button" data-observer="back" aria-label="Back to auto">↩</button></div>`;
      this.update(title, detail);
      this.root
        .querySelector('[data-observer=back]')!
        .addEventListener('click', this.actions.leave);
      if (mode === 'roof')
        this.root
          .querySelectorAll<HTMLElement>('[data-observer]:not([data-observer=back])')
          .forEach((e) => (e.hidden = true));
      return;
    }
    if (!place) return;
    const paper = {
      title: place.id === 'about' ? 'The morning paper' : place.name,
      art: place.id === 'eagle-eye' ? 'crt' : 'paper',
      act: () => this.actions.paper(place),
    };
    this.options =
      place.id === 'about'
        ? [
            paper,
            { title: 'Chaya · ₹10', art: 'tea', act: () => this.actions.buy('tea') },
            { title: 'Pazhampori · ₹15', art: 'snack', act: () => this.actions.buy('pazhampori') },
            { title: 'Samosa · ₹12', art: 'snack', act: () => this.actions.buy('samosa') },
          ]
        : place.id === 'eagle-eye'
          ? [paper, { title: 'Take the roof lift', art: 'lift', act: this.actions.roof }]
          : [
              {
                title:
                  place.id === 'music'
                    ? 'Make a beat'
                    : place.id === 'space'
                      ? 'Look through the telescope'
                      : place.id === 'saltwater'
                        ? 'Watch the crocodiles'
                        : 'Try the instrument',
                art:
                  (
                    {
                      music: 'drum',
                      space: 'telescope',
                      saltwater: 'croc',
                      opsflash: 'crt',
                      rift: 'rift',
                    } as Record<string, string>
                  )[place.id] ?? 'paper',
                act:
                  place.id === 'space'
                    ? this.actions.stars
                    : place.id === 'saltwater'
                      ? this.actions.crocs
                      : paper.act,
              },
              { ...paper, title: 'Project postcard' },
            ];
    this.render();
  }
  private render() {
    const selected = this.options[this.index];
    this.root.innerHTML = `<div class="venue-object" data-object="${selected.art}"><small>${this.place?.location ?? ''}</small><button type="button" class="venue-prop" aria-label="${selected.title}">${PROPS[selected.art] ?? PROPS.paper}</button><h2>${selected.title}</h2><div class="venue-nav"><button type="button" data-venue="prev" aria-label="Previous object">←</button><button type="button" data-venue="act">ENTER <span>↵</span></button><button type="button" data-venue="next" aria-label="Next object">→</button><button type="button" data-venue="back" aria-label="Back to auto">↩</button></div><small class="object-count">${this.index + 1} / ${this.options.length} · ARROWS TO CHOOSE</small></div>`;
    this.root.dataset.object = selected.art;
    this.root.dataset.selection = String(this.index);
    this.root.querySelector('.venue-prop')!.addEventListener('click', selected.act);
    this.root.querySelector('[data-venue=act]')!.addEventListener('click', selected.act);
    this.root.querySelector('[data-venue=prev]')!.addEventListener('click', () => this.change(-1));
    this.root.querySelector('[data-venue=next]')!.addEventListener('click', () => this.change(1));
    this.root.querySelector('[data-venue=back]')!.addEventListener('click', this.actions.leave);
  }
  change(delta: number) {
    if (this.options.length && this.mode === 'storefront') {
      this.index = (this.index + delta + this.options.length) % this.options.length;
      this.actions.cue();
      this.render();
    }
  }
  activate() {
    if (this.mode === 'storefront') this.options[this.index]?.act();
  }
  update(title: string, detail: string) {
    const h = this.root.querySelector('#view-title'),
      d = this.root.querySelector('#view-detail');
    if (h) h.textContent = title;
    if (d) d.textContent = detail.split(' · ')[0];
  }
}

const CARDS: Record<string, { title: string; copy: string }[]> = {
  about: [
    {
      title: 'Hello, I’m Jay.',
      copy: 'From Kerala. Building AI systems, growth tools and worlds to explore.',
    },
    { title: 'Work. Play. Repeat.', copy: 'Eagle Eye · OpsFlash · RIFT · Music · Games' },
    { title: 'Let’s talk.', copy: 'An idea worth building? Find me here.' },
  ],
  'eagle-eye': [
    {
      title: 'Useful AI.',
      copy: 'Research, retrieval and practical systems for everyday business.',
    },
    { title: 'Better growth.', copy: 'Connected intelligence. Clear next actions.' },
    { title: 'Built with care.', copy: 'Eagle Eye Research & Deployment Labs · Kerala' },
  ],
  opsflash: [
    { title: 'Research', copy: 'Sources → evidence → a useful brief.' },
    { title: 'Content', copy: 'Research → draft → review → publish.' },
    { title: 'Growth', copy: 'Discover → enrich → prioritise → act.' },
  ],
  rift: [
    { title: 'One paisa.', copy: 'Small differences deserve exact answers.' },
    { title: 'Missing. New. Changed.', copy: 'Compare records and see what moved.' },
    { title: 'RIFT', copy: 'An exact reconciliation engine, built in Rust.' },
  ],
  music: [{ title: 'Music & Beats', copy: 'Leave a little groove behind.' }],
  saltwater: [
    { title: 'SALTWATER', copy: 'Swim. Stalk. Survive.' },
    { title: 'A patient hunter.', copy: 'Watch the wetland residents from the jetty.' },
    { title: 'Explore the game.', copy: 'A tropical crocodile survival experiment.' },
  ],
  space: [
    { title: 'The Quiet Between Stars', copy: 'A peaceful trip into the strange and beautiful.' },
    { title: 'Look a little further.', copy: 'Choose a constellation. Stay for the night.' },
    { title: 'Take flight.', copy: 'Explore the space game.' },
  ],
};
export class RetroExhibit {
  private page = 0;
  private progress = 0;
  private place?: Place;
  private beat?: ReturnType<typeof createBeatMachine>;
  constructor(
    private dialog: HTMLDialogElement,
    private actions: {
      close: () => void;
      crocs: () => void;
      stars: () => void;
      playback: (playing: boolean) => void;
      cue: () => void;
    },
  ) {}
  show(place: Place) {
    this.dispose();
    this.place = place;
    this.page = this.progress = 0;
    this.dialog.dataset.venue = place.id;
    this.render();
  }
  private render() {
    this.beat?.dispose();
    this.beat = undefined;
    const place = this.place!,
      card = CARDS[place.id][this.page];
    this.dialog.className = 'retro-exhibit';
    this.dialog.innerHTML = `<button type="button" data-close aria-label="Close project" class="instrument-close">↩ <span>ESC</span></button><div class="retro-label">${place.location.toUpperCase()}</div><h1 id="project-title">${card.title}</h1><p class="retro-copy">${card.copy}</p><div id="project-stage" class="retro-stage"></div><footer class="retro-nav"><button type="button" data-retro="prev" aria-label="Previous exhibit">←</button><span>${String(this.page + 1).padStart(2, '0')} / ${String(CARDS[place.id].length).padStart(2, '0')}</span><button type="button" data-retro="next" aria-label="Next exhibit">→</button><button type="button" data-retro="action">ENTER ↵</button></footer><div class="retro-links"></div>`;
    const stage = this.dialog.querySelector<HTMLElement>('#project-stage')!;
    if (place.id === 'music') {
      this.beat = createBeatMachine(stage, this.actions.playback);
      this.dialog.querySelector<HTMLElement>('.retro-nav')!.hidden = true;
    } else if (place.id === 'opsflash' || place.id === 'eagle-eye') {
      const words =
        place.id === 'opsflash'
          ? [
              ['SOURCES', 'EVIDENCE', 'CONNECT', 'BRIEF'],
              ['RESEARCH', 'DRAFT', 'REVIEW', 'PUBLISH'],
              ['DISCOVER', 'ENRICH', 'PRIORITISE', 'ACT'],
            ][this.page]
          : [
              ['QUESTION', 'RESEARCH', 'BUILD', 'USE'],
              ['DISCOVER', 'ENRICH', 'CONNECT', 'GROW'],
              ['IDEA', 'DESIGN', 'TEST', 'DEPLOY'],
            ][this.page];
      stage.innerHTML = `<div class="crt-case"><div class="crt-screen"><small>OPS / ${this.page + 1} · ILLUSTRATIVE WORKFLOW</small><div class="terminal-flow">${words.map((w, i) => `<span class="${i < this.progress ? 'complete' : ''}"><b>${i < this.progress ? '✓' : '○'}</b> ${w}</span>`).join('')}</div><div class="terminal-result">${this.progress === 4 ? 'READY. A USEFUL RESULT.' : 'PRESS ENTER TO ADVANCE_'}</div></div><i class="crt-lamp"></i></div>`;
    } else if (place.id === 'rift') {
      const rows = compareDemoRecords(
        [
          { id: '01', amount: '4500.75', status: 'settled' },
          { id: '02', amount: '1200.00', status: 'settled' },
        ],
        [
          { id: '01', amount: '4500.76', status: 'settled' },
          { id: '03', amount: '1200.00', status: 'settled' },
        ],
      );
      stage.innerHTML = `<div class="rift-instrument"><small>EXACT COMPARE · ILLUSTRATIVE RECORDS</small><div class="rift-readouts"><div><small>SOURCE ₹</small><strong>4500.75</strong></div><div><small>TARGET ₹</small><strong>4500.76</strong></div></div><output>${this.progress ? 'Δ 0.01 · ' + rows.filter((r) => r.state !== 'equal').length + ' DIFFERENCES' : 'READY TO COMPARE'}</output><div class="instrument-slots"><i></i><i></i><i></i><i></i></div></div>`;
    } else stage.innerHTML = `<div class="postcard-art">${exhibitArt(place.id)}</div>`;
    this.dialog.querySelector('[data-close]')!.addEventListener('click', this.actions.close);
    this.dialog
      .querySelector('[data-retro=prev]')!
      .addEventListener('click', () => this.change(-1));
    this.dialog.querySelector('[data-retro=next]')!.addEventListener('click', () => this.change(1));
    this.dialog
      .querySelector('[data-retro=action]')!
      .addEventListener('click', () => this.activate());
    const links = this.dialog.querySelector('.retro-links')!;
    if (this.page === CARDS[place.id].length - 1)
      for (const link of place.links) {
        const a = document.createElement('a');
        a.href = link.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = link.label;
        links.append(a);
      }
    this.dialog.dataset.page = String(this.page);
    this.dialog.dataset.progress = String(this.progress);
  }
  change(delta: number) {
    if (!this.place || this.place.id === 'music') return;
    this.page = (this.page + delta + CARDS[this.place.id].length) % CARDS[this.place.id].length;
    this.progress = 0;
    this.actions.cue();
    this.render();
  }
  activate() {
    if (!this.place) return;
    if (this.place.id === 'opsflash' || this.place.id === 'eagle-eye') {
      this.progress = (this.progress + 1) % 5;
      this.actions.cue();
      this.render();
    } else if (this.place.id === 'rift') {
      this.progress = 1 - this.progress;
      this.actions.cue();
      this.render();
    } else if (this.place.id === 'saltwater') {
      this.actions.close();
      this.actions.crocs();
    } else if (this.place.id === 'space') {
      this.actions.close();
      this.actions.stars();
    } else if (this.page === CARDS[this.place.id].length - 1)
      this.dialog.querySelector<HTMLAnchorElement>('.retro-links a')?.click();
    else this.change(1);
  }
  key(code: string) {
    if (this.beat) return this.beat.key(code);
    if (code === 'ArrowLeft' || code === 'ArrowUp') this.change(-1);
    else if (code === 'ArrowRight' || code === 'ArrowDown') this.change(1);
    else if (code === 'Enter') this.activate();
    else return false;
    return true;
  }
  dispose() {
    this.beat?.dispose();
    this.beat = undefined;
  }
}

export const PUBLIC_PLACE_COUNT = PLACES.length;
