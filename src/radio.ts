export interface Station {
  id: string;
  name: string;
  description: string;
  url: string;
  homepage: string;
  uuid?: string;
  alternates?: string[];
  effects?: boolean;
}
export const CURATED_STATIONS: readonly Station[] = [
  {
    id: 'ente',
    name: 'Ente Radio 91.2',
    description: 'Karunagappally · Community radio · Default station',
    url: 'https://cast1.my-control-panel.com/proxy/enteradio/stream',
    homepage: 'https://enteradio.com/',
    uuid: 'cddf5ab5-ff56-4a0c-8634-91a31e895fe5',
    effects: true,
  },
  {
    id: 'digital-malayali',
    effects: true,
    name: 'Radio Digital Malayali',
    description: 'Malayalam · Independent internet radio',
    url: 'https://radio.digitalmalayali.in/listen/stream/radio.mp3',
    homepage: 'https://radio.digitalmalayali.in/',
    uuid: '15d870bb-86aa-4f97-8360-b586f71886d4',
  },
  {
    id: 'macfast',
    name: 'Radio MACFAST 90.4',
    description: 'Thiruvalla · Community radio',
    url: 'https://icecast.octosignals.com/radiomacfast',
    homepage: 'https://www.radiomacfast.org/',
    uuid: '7b33877d-9f67-44a0-b929-bce276a3806c',
  },
  {
    id: 'keralam',
    name: 'Radio Keralam 1476',
    description: 'Malayalam · Music, news & conversation',
    url: 'https://ice31.securenetsystems.net/RADIOKERAL',
    homepage: 'https://radiokeralam.com/',
  },
];

export function publicHttps(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const u = new URL(value),
      h = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || u.username || u.password || !h.includes('.')) return false;
    return !(
      /^(localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) ||
      h.endsWith('.local') ||
      h.endsWith('.internal') ||
      h.includes(':')
    );
  } catch {
    return false;
  }
}
export function directoryStations(values: unknown): Station[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>(),
    stations: Station[] = [];
  for (const raw of values.slice(0, 80)) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>,
      url = r.url_resolved,
      name = r.name,
      codec = String(r.codec ?? '').toUpperCase();
    if (
      !publicHttps(url) ||
      typeof name !== 'string' ||
      !name.trim() ||
      r.lastcheckok !== 1 ||
      !['MP3', 'AAC', 'AAC+', 'OGG', 'OPUS'].includes(codec) ||
      /\.m3u8(?:$|\?)/i.test(url) ||
      !String(r.language ?? '')
        .toLowerCase()
        .includes('malayalam')
    )
      continue;
    if (seen.has(url)) continue;
    seen.add(url);
    stations.push({
      id: 'directory-' + String(r.stationuuid ?? stations.length),
      uuid:
        typeof r.stationuuid === 'string' && /^[a-f0-9-]{36}$/i.test(r.stationuuid)
          ? r.stationuuid
          : undefined,
      name: name.trim().slice(0, 80),
      description: 'Malayalam · ' + codec + ' · Radio Browser',
      url,
      homepage: publicHttps(r.homepage) ? r.homepage : 'https://www.radio-browser.info/',
    });
    if (stations.length >= 12) break;
  }
  return stations;
}

const $ = (id: string) => document.getElementById(id)!;
export type RadioPhase = 'off' | 'tuning' | 'playing' | 'buffering' | 'unavailable';
export class VillageRadio {
  private stations: Station[] = [...CURATED_STATIONS];
  private audio?: HTMLAudioElement;
  private generation = 0;
  private timeout = 0;
  private index = 0;
  private phase: RadioPhase = 'off';
  private level = 0.32;
  private ducked = false;
  private context?: AudioContext;
  private hiss?: GainNode;
  private noise?: AudioBufferSourceNode;
  private abort?: AbortController;
  constructor() {
    $('radio-prev').addEventListener('click', () => this.seek(-1));
    $('radio-next').addEventListener('click', () => this.seek(1));
    $('radio-power').addEventListener('click', () => this.power());
    $('radio-volume').addEventListener('input', () => {
      this.level = Number(($('radio-volume') as HTMLInputElement).value);
      this.volume();
    });
    this.render();
  }
  private staticBus() {
    if (!this.context) {
      const ctx = (this.context = new AudioContext());
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.noise = ctx.createBufferSource();
      this.noise.buffer = buffer;
      this.noise.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 1800;
      band.Q.value = 0.7;
      this.hiss = ctx.createGain();
      this.hiss.gain.value = 0;
      this.noise.connect(band).connect(this.hiss).connect(ctx.destination);
      this.noise.start();
    }
    void this.context.resume().catch(() => {});
  }
  private volume() {
    const level = this.level * (this.ducked ? 0.16 : 1);
    if (this.audio) this.audio.volume = level;
    if (this.context && this.hiss) {
      this.hiss.gain.setTargetAtTime(
        ['tuning', 'buffering'].includes(this.phase) ? level * 0.11 : 0,
        this.context.currentTime,
        0.12,
      );
    }
    $('radio-dialog').style.setProperty('--volume', String(this.level));
  }
  private state(phase: RadioPhase) {
    this.phase = phase;
    this.volume();
    this.render();
  }
  private render() {
    const station = this.stations[this.index];
    $('radio-dialog').dataset.phase = this.phase;
    $('radio-name').textContent = station.name;
    $('radio-status').textContent = {
      off: 'POWER OFF',
      tuning: 'SEEKING SIGNAL…',
      playing: 'LIVE SIGNAL',
      buffering: 'SIGNAL FADING…',
      unavailable: 'NO SIGNAL · TRY NEXT',
    }[this.phase];
    $('radio-needle').style.left =
      8 + (84 * this.index) / Math.max(1, this.stations.length - 1) + '%';
    $('radio-indicator').classList.toggle('on', this.phase === 'playing');
    $('radio-power').setAttribute('aria-pressed', String(this.phase !== 'off'));
    ($('radio-source') as HTMLAnchorElement).href = station.homepage;
  }
  playDefault() {
    try {
      if (localStorage.getItem('jaysworld-radio-off') === 'true') return;
    } catch {
      /* Optional. */
    }
    this.index = 0;
    this.play(this.stations[0]);
  }
  seek(direction: number) {
    this.index = (this.index + direction + this.stations.length) % this.stations.length;
    this.play(this.stations[this.index]);
  }
  adjustVolume(direction: number) {
    this.level = Math.max(0, Math.min(1, this.level + direction * 0.05));
    ($('radio-volume') as HTMLInputElement).value = String(this.level);
    this.volume();
  }
  duck(active: boolean) {
    this.ducked = active;
    this.volume();
  }
  power() {
    if (this.phase === 'off') this.play(this.stations[this.index]);
    else this.stop();
  }
  play(station: Station) {
    this.stop(false);
    this.index = Math.max(
      0,
      this.stations.findIndex((s) => s.id === station.id),
    );
    try {
      localStorage.setItem('jaysworld-radio-off', 'false');
      this.staticBus();
    } catch {
      /* Direct audio still works. */
    }
    const generation = ++this.generation;
    this.state('tuning');
    if (!publicHttps(station.url)) {
      this.state('unavailable');
      return;
    }
    const audio = (this.audio = new Audio());
    audio.preload = 'none';
    audio.volume = this.level * (this.ducked ? 0.16 : 1);
    // Keep the live stream on the native media path: station CORS policies need not permit Web Audio.
    audio.src = station.url;
    const current = () => generation === this.generation && this.audio === audio;
    const fail = () => {
      if (!current()) return;
      clearTimeout(this.timeout);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      this.state('unavailable');
    };
    const deadline = () => {
      clearTimeout(this.timeout);
      this.timeout = window.setTimeout(fail, 14000);
    };
    audio.addEventListener('playing', () => {
      if (current()) {
        clearTimeout(this.timeout);
        this.state('playing');
      }
    });
    audio.addEventListener('waiting', () => {
      if (current() && ['tuning', 'playing', 'buffering'].includes(this.phase)) {
        // Initial media loading is still a search for the first signal.
        // A fading signal only exists after the station has started playing.
        if (this.phase !== 'tuning') this.state('buffering');
        deadline();
      }
    });
    audio.addEventListener('error', fail);
    deadline();
    void audio.play().catch(fail);
  }
  stop(explicit = true) {
    this.generation++;
    clearTimeout(this.timeout);
    this.audio?.pause();
    if (this.audio) {
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.audio = undefined;
    if (explicit) {
      try {
        localStorage.setItem('jaysworld-radio-off', 'true');
      } catch {
        /* Optional. */
      }
    }
    this.state('off');
  }
  async discover() {
    this.abort?.abort();
    const abort = (this.abort = new AbortController());
    for (const mirror of ['de1', 'de2', 'fi1']) {
      try {
        const response = await fetch(
          'https://' +
            mirror +
            '.api.radio-browser.info/json/stations/search?language=malayalam&hidebroken=true&is_https=true&limit=60&order=clickcount&reverse=true',
          { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(5000)]) },
        );
        if (!response.ok) continue;
        const found = directoryStations(await response.json());
        if (!found.length || abort.signal.aborted) continue;
        const seen = new Set(this.stations.map((s) => s.url));
        this.stations.push(...found.filter((s) => !seen.has(s.url)));
        this.render();
        return;
      } catch {
        if (abort.signal.aborted) return;
      }
    }
  }
  dispose() {
    this.abort?.abort();
    this.stop(false);
    this.noise?.stop();
    void this.context?.close().catch(() => {});
  }
}
