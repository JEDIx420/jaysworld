import { PLACES, type Place } from './projects';
import { VENUE_PAGES } from './venue-content';
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

/** Arrival and observation controls stay small; the actual environment takes centre stage. */
export class VenueControls {
  private index = 0;
  private mode: ViewMode = 'drive';
  private place?: Place;
  private options: { title: string; act: () => void }[] = [];
  constructor(
    private root: HTMLElement,
    private actions: Actions,
  ) {}
  show(mode: ViewMode, place: Place | undefined, title: string, detail: string) {
    this.mode = mode;
    this.place = place;
    this.index = 0;
    this.root.hidden = mode === 'drive' || mode === 'interior';
    if (this.root.hidden) return;
    if (mode !== 'storefront') {
      this.root.innerHTML = `<div class="observation-caption"><small>${mode === 'roof' ? 'EAGLE TOWERS · ROOFTOP' : mode === 'stars' ? 'HILLTOP · TELESCOPE' : 'WETLAND · JETTY'}</small><h2 id="view-title"></h2><span id="view-detail"></span></div><div class="observation-actions"><button type="button" data-observer="previous" aria-label="Previous target">←</button><button type="button" data-observer="action">${mode === 'croc' ? 'Watch a hunt ↵' : 'Next constellation ↵'}</button><button type="button" data-observer="next" aria-label="Next target">→</button>${mode === 'stars' ? '<button type="button" data-observer="night">Nightfall</button>' : ''}<button type="button" data-observer="wider" aria-label="Zoom out">−</button><button type="button" data-observer="closer" aria-label="Zoom in">+</button><button type="button" data-observer="notes">${mode === 'roof' ? 'Office' : 'Field guide'}</button><button type="button" data-observer="back" aria-label="Back to auto">↩</button></div>`;
      this.update(title, detail);
      this.root
        .querySelector('[data-observer=back]')!
        .addEventListener('click', this.actions.leave);
      this.root
        .querySelector('[data-observer=notes]')!
        .addEventListener('click', () =>
          this.actions.paper(
            PLACES.find(
              (p) =>
                p.id === (mode === 'roof' ? 'eagle-eye' : mode === 'stars' ? 'space' : 'saltwater'),
            )!,
          ),
        );
      if (mode === 'roof')
        this.root
          .querySelectorAll<HTMLElement>(
            '[data-observer]:not([data-observer=back]):not([data-observer=notes])',
          )
          .forEach((e) => (e.hidden = true));
      return;
    }
    if (!place) return;
    const enter = {
      title: {
        about: 'Step into the tea shop',
        'eagle-eye': 'Enter the briefing room',
        opsflash: 'Enter the OpsFlash office',
        rift: 'Enter the workshop',
        music: 'Enter the recording studio',
        space: 'Look through the telescope',
        saltwater: 'Watch from the jetty',
      }[place.id],
      act:
        place.id === 'space'
          ? this.actions.stars
          : place.id === 'saltwater'
            ? this.actions.crocs
            : () => this.actions.paper(place),
    };
    this.options = [enter];
    if (place.id === 'eagle-eye')
      this.options.push({ title: 'Take the roof lift', act: this.actions.roof });
    if (place.id === 'space' || place.id === 'saltwater')
      this.options.push({
        title: place.id === 'space' ? 'Enter the observatory' : 'Open the field guide',
        act: () => this.actions.paper(place),
      });
    if (place.id === 'about')
      this.options.push(
        { title: 'Chaya · ₹10', act: () => this.actions.buy('tea') },
        { title: 'Pazhampori · ₹15', act: () => this.actions.buy('pazhampori') },
        { title: 'Samosa · ₹12', act: () => this.actions.buy('samosa') },
      );
    this.render();
  }
  private render() {
    const selected = this.options[this.index];
    this.root.innerHTML = `<div class="arrival-caption"><small>${this.place?.location.toUpperCase()}</small><h2>${selected.title}</h2><div class="arrival-actions"><button type="button" data-venue="prev" aria-label="Previous activity">←</button><button type="button" data-venue="act">ENTER ↵</button><button type="button" data-venue="next" aria-label="Next activity">→</button><button type="button" data-venue="back" aria-label="Back to auto">↩</button></div><small>${this.index + 1} / ${this.options.length} · ARROWS TO CHOOSE</small></div>`;
    this.root.dataset.selection = String(this.index);
    this.root.querySelector('[data-venue=act]')!.addEventListener('click', selected.act);
    this.root.querySelector('[data-venue=prev]')!.addEventListener('click', () => this.change(-1));
    this.root.querySelector('[data-venue=next]')!.addEventListener('click', () => this.change(1));
    this.root.querySelector('[data-venue=back]')!.addEventListener('click', this.actions.leave);
  }
  change(delta: number) {
    if (this.mode === 'storefront' && this.options.length) {
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
      roof: () => void;
      radio: () => void;
      buy: (item: 'tea' | 'pazhampori' | 'samosa') => void;
      slide: (page: number, progress: number) => void;
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
      pages = VENUE_PAGES[place.id],
      card = pages[this.page];
    this.dialog.className = 'room-experience';
    this.dialog.innerHTML = `<button type="button" data-close aria-label="Close project" class="room-exit">↩ <span>ESC</span></button><div class="room-location">${place.location.toUpperCase()}</div><div id="project-stage" class="room-stage"></div><article class="room-story"><small>${card.label}</small><h1 id="project-title">${card.title}</h1><p>${card.copy}</p></article><footer class="room-navigation"><button type="button" data-retro="prev" aria-label="Previous slide">←</button><output>${String(this.page + 1).padStart(2, '0')} / ${String(pages.length).padStart(2, '0')}</output><button type="button" data-retro="next" aria-label="Next slide">→</button><button type="button" data-retro="action">${place.id === 'saltwater' ? 'Watch ↵' : place.id === 'space' ? 'Telescope ↵' : place.id === 'rift' ? 'Compare ↵' : 'Next ↵'}</button></footer><div class="room-activities"></div><div class="retro-links"></div>`;
    const stage = this.dialog.querySelector<HTMLElement>('#project-stage')!,
      activities = this.dialog.querySelector('.room-activities')!;
    this.dialog.querySelector('[data-close]')!.addEventListener('click', this.actions.close);
    const tuner = document.createElement('button');
    tuner.type = 'button';
    tuner.className = 'room-radio';
    tuner.textContent = 'RADIO · Q';
    tuner.setAttribute('aria-label', 'Tune the radio');
    tuner.addEventListener('click', this.actions.radio);
    this.dialog.append(tuner);
    this.dialog
      .querySelector('[data-retro=prev]')!
      .addEventListener('click', () => this.change(-1));
    this.dialog.querySelector('[data-retro=next]')!.addEventListener('click', () => this.change(1));
    this.dialog
      .querySelector('[data-retro=action]')!
      .addEventListener('click', () => this.activate());
    const activity = (label: string, act: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', act);
      activities.append(b);
    };
    if (place.id === 'music') {
      this.beat = createBeatMachine(stage, this.actions.playback);
      this.dialog.querySelector<HTMLElement>('.room-navigation')!.hidden = true;
    } else if (place.id === 'about') {
      stage.innerHTML = `<div class="village-paper"><header><small>KERALA · TODAY & EVERY DAY</small><strong>THE KERALA DISPATCH</strong><span>VILLAGE EDITION · ${this.page + 1}</span></header><h2>${card.title}</h2><p>${card.copy}</p><div class="paper-columns">${card.nodes.map((node, i) => `<div><span class="paper-drawing drawing-${i}">${['✦', '♫', '↗'][i]}</span><strong>${node}</strong></div>`).join('')}</div><footer>JAY’S WORLD · GOOD COMPANY, BETTER CHAYA</footer></div>`;
      activity('Chaya ₹10 · C', () => this.actions.buy('tea'));
      activity('Pazhampori ₹15 · P', () => this.actions.buy('pazhampori'));
      activity('Samosa ₹12 · S', () => this.actions.buy('samosa'));
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
      stage.innerHTML = `<div class="reconciliation-tray"><small>ILLUSTRATIVE RECORDS</small><div class="rift-readouts"><div><small>SOURCE ₹</small><strong>4500.75</strong></div><div><small>TARGET ₹</small><strong>4500.76</strong></div></div><output>${this.progress ? 'Δ 0.01 · ' + rows.filter((r) => r.state !== 'equal').length + ' DIFFERENCES' : 'ENTER TO COMPARE'}</output></div>`;
    }
    if (place.id === 'eagle-eye')
      activity('Roof lift ↑7 · L', () => {
        this.actions.close();
        this.actions.roof();
      });
    const fallback = document.createElement('div');
    fallback.className = 'room-fallback-screen';
    fallback.innerHTML = `<div class="presentation-nodes">${card.nodes.map((n, i) => `<div><small>0${i + 1}</small><strong>${n}</strong></div>`).join('')}</div>`;
    stage.append(fallback);
    const links = this.dialog.querySelector('.retro-links')!;
    if (this.page === pages.length - 1)
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
    this.actions.slide(this.page, this.progress);
  }
  change(delta: number) {
    if (!this.place || this.place.id === 'music') return;
    this.page =
      (this.page + delta + VENUE_PAGES[this.place.id].length) % VENUE_PAGES[this.place.id].length;
    this.progress = 0;
    this.actions.cue();
    this.render();
    this.dialog.focus({ preventScroll: true });
  }
  activate() {
    if (!this.place) return;
    if (this.place.id === 'saltwater') {
      this.actions.close();
      this.actions.crocs();
    } else if (this.place.id === 'space') {
      this.actions.close();
      this.actions.stars();
    } else if (this.place.id === 'rift') {
      this.progress = 1 - this.progress;
      this.actions.cue();
      this.render();
    } else this.change(1);
  }
  key(code: string) {
    if (this.beat) return this.beat.key(code);
    if (this.place?.id === 'eagle-eye' && code === 'KeyL') {
      this.actions.close();
      this.actions.roof();
      return true;
    }
    if (this.place?.id === 'about' && ['KeyC', 'KeyP', 'KeyS'].includes(code)) {
      this.actions.buy(code === 'KeyC' ? 'tea' : code === 'KeyP' ? 'pazhampori' : 'samosa');
      return true;
    }
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
