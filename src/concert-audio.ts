import { CURATED_STATIONS } from './radio';

/** Native live playback avoids broadcasters' Web Audio CORS restrictions. */
export class ConcertAudio {
  private audio?: HTMLAudioElement;
  private generation = 0;
  private deadline = 0;
  private level = 0;
  private near = false;
  private audible = false;
  private muted = false;
  private phase: 'off' | 'tuning' | 'playing' | 'unavailable' = 'off';
  private source = 0;
  private station = CURATED_STATIONS.find((s) => s.id === 'classic-rock')!;
  constructor(
    private panel: HTMLElement,
    private button: HTMLButtonElement,
  ) {}
  /** Called in the first trusted gesture, including on Safari. */
  unlock() {
    if (this.audio) return;
    this.connect();
  }
  private connect() {
    const generation = ++this.generation;
    clearTimeout(this.deadline);
    this.release();
    const audio = (this.audio = new Audio());
    audio.hidden = true;
    audio.dataset.concert = 'classic-rock';
    audio.preload = 'none';
    audio.volume = 0;
    audio.muted = !this.audible;
    audio.src = [this.station.url, ...(this.station.alternates ?? [])][this.source];
    document.body.append(audio);
    const current = () => this.generation === generation && this.audio === audio;
    const fail = () => {
      if (!current()) return;
      clearTimeout(this.deadline);
      if (this.source === 0) {
        this.source = 1;
        this.connect();
      } else {
        this.phase = 'unavailable';
        this.release();
        this.render();
      }
    };
    audio.addEventListener('playing', () => {
      if (!current()) return;
      clearTimeout(this.deadline);
      this.phase = 'playing';
      if (!this.audible) audio.pause();
      this.render();
    });
    audio.addEventListener('waiting', () => {
      if (!current()) return;
      this.phase = 'tuning';
      clearTimeout(this.deadline);
      this.deadline = window.setTimeout(fail, 14000);
      this.render();
    });
    audio.addEventListener('error', fail);
    audio.addEventListener('ended', fail);
    this.phase = 'tuning';
    this.deadline = window.setTimeout(fail, 14000);
    void audio.play().catch(() => {
      if (current()) {
        clearTimeout(this.deadline);
        this.phase = 'off';
        this.render();
      }
    });
    this.render();
  }
  toggle(forceOn = false) {
    if (this.phase === 'unavailable' || !this.audio) {
      this.source = 0;
      this.muted = false;
      this.connect();
    } else if (this.phase === 'off') {
      this.muted = false;
      this.play();
    } else this.muted = forceOn ? false : !this.muted;
    this.render();
  }
  private play() {
    if (!this.audio) return;
    this.phase = 'tuning';
    const generation = this.generation;
    void this.audio.play().catch(() => {
      if (generation === this.generation) this.phase = 'off';
      this.render();
    });
  }
  update(distance: number, enabled: boolean) {
    this.near = distance < 58;
    const audible = this.near && enabled && !this.muted && !document.hidden;
    if (audible !== this.audible) {
      this.audible = audible;
      if (audible) {
        if (!this.audio && this.phase !== 'unavailable') this.connect();
        else if (this.audio?.paused && this.phase !== 'unavailable') this.play();
      } else this.audio?.pause();
      this.render();
    }
    this.panel.hidden = !this.near;
    const target = audible ? 0.56 * Math.max(0, 1 - distance / 58) ** 1.25 : 0;
    this.level += (target - this.level) * 0.12;
    if (this.audio) {
      this.audio.volume = this.level;
      this.audio.muted = !audible;
    }
    this.panel.dataset.phase = this.phase;
    return audible && this.phase === 'playing';
  }
  private render() {
    this.button.textContent =
      this.muted || (!this.audible && this.phase === 'playing')
        ? '▶ Classic rock'
        : {
            off: '▶ Play classic rock',
            tuning: 'Classic rock · Tuning…',
            playing: 'Ⅱ Classic rock',
            unavailable: 'Classic rock · Retry',
          }[this.phase];
    this.button.setAttribute(
      'aria-pressed',
      String(this.audible && !this.muted && this.phase === 'playing'),
    );
  }
  private release() {
    this.audio?.pause();
    if (this.audio) {
      this.audio.removeAttribute('src');
      this.audio.load();
      this.audio.remove();
    }
    this.audio = undefined;
  }
  dispose() {
    this.generation++;
    clearTimeout(this.deadline);
    this.release();
  }
}
