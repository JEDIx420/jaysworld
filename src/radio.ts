export interface Station {
  id: string;
  name: string;
  description: string;
  url: string;
  homepage: string;
  uuid?: string;
  alternates?: string[];
}
export const CURATED_STATIONS: readonly Station[] = [
  {
    id: 'digital-malayali',
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
export class VillageRadio {
  private stations: Station[] = [...CURATED_STATIONS];
  private audio?: HTMLAudioElement;
  private generation = 0;
  private timeout = 0;
  private current?: Station;
  private playing = false;
  private abort?: AbortController;
  private mirrors = [
    'https://de1.api.radio-browser.info',
    'https://de2.api.radio-browser.info',
    'https://fi1.api.radio-browser.info',
  ];
  constructor() {
    this.render();
    ($('radio-volume') as HTMLInputElement).addEventListener('input', () => {
      if (this.audio) this.audio.volume = Number(($('radio-volume') as HTMLInputElement).value);
    });
    $('radio-stop').addEventListener('click', () => this.stop());
    $('radio-refresh').addEventListener('click', () => void this.discover());
  }
  private status(text: string) {
    $('radio-status').textContent = text;
  }
  private render() {
    const list = $('radio-stations');
    list.replaceChildren();
    for (const station of this.stations) {
      const row = document.createElement('div');
      row.className = 'radio-station' + (this.current?.id === station.id ? ' active' : '');
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute(
        'aria-label',
        (this.current?.id === station.id && this.playing ? 'Stop ' : 'Play ') + station.name,
      );
      const icon = document.createElement('span');
      icon.className = 'station-icon';
      icon.textContent = this.current?.id === station.id && this.playing ? 'Ⅱ' : '▶';
      const copy = document.createElement('span'),
        name = document.createElement('strong'),
        meta = document.createElement('small');
      name.textContent = station.name;
      meta.textContent = station.description;
      copy.append(name, meta);
      button.append(icon, copy);
      button.addEventListener('click', () => {
        if (this.current?.id === station.id && this.playing) this.stop();
        else this.play(station);
      });
      const source = document.createElement('a');
      source.href = station.homepage;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      source.textContent = 'Station';
      source.setAttribute('aria-label', station.name + ' station website');
      row.append(button, source);
      list.append(row);
    }
  }
  play(station: Station) {
    this.stop(false);
    const generation = ++this.generation;
    this.current = station;
    this.render();
    this.status('Tuning in to ' + station.name + '…');
    if (!publicHttps(station.url)) {
      this.status('This station does not have a supported secure stream. Choose another station.');
      return;
    }
    const urls = [station.url, ...(station.alternates ?? []).filter(publicHttps)];
    let attempt = 0;
    const open = () => {
      if (generation !== this.generation) return;
      this.audio?.pause();
      const audio = new Audio();
      audio.preload = 'none';
      audio.volume = Number(($('radio-volume') as HTMLInputElement).value);
      this.audio = audio;
      audio.src = urls[attempt];
      const fail = () => {
        if (generation !== this.generation || this.audio !== audio) return;
        clearTimeout(this.timeout);
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        if (attempt + 1 < urls.length) {
          attempt++;
          open();
          return;
        }
        this.playing = false;
        $('radio-now').hidden = true;
        $('radio-indicator').classList.remove('on');
        this.status(
          station.name + ' is unavailable right now. Choose another station, or open its website.',
        );
        this.render();
      };
      audio.addEventListener('playing', () => {
        if (generation !== this.generation || this.audio !== audio) return;
        clearTimeout(this.timeout);
        this.playing = true;
        $('radio-now').hidden = false;
        $('radio-now-name').textContent = station.name;
        $('radio-indicator').classList.add('on');
        this.status('Live: ' + station.name);
        this.render();
      });
      audio.addEventListener('waiting', () => {
        if (generation === this.generation) this.status('Buffering ' + station.name + '…');
      });
      audio.addEventListener('error', fail, { once: true });
      this.timeout = window.setTimeout(fail, 14000);
      void audio.play().catch((error) => {
        if (generation !== this.generation || this.audio !== audio) return;
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          clearTimeout(this.timeout);
          this.status('Tap the station again to allow audio playback.');
        } else fail();
      });
    };
    open();
    if (station.uuid)
      void fetch(this.mirrors[0] + '/json/url/' + encodeURIComponent(station.uuid), {
        signal: AbortSignal.timeout(4000),
      }).catch(() => undefined);
  }
  stop(announce = true) {
    this.generation++;
    clearTimeout(this.timeout);
    this.audio?.pause();
    if (this.audio) {
      this.audio.removeAttribute('src');
      this.audio.load();
    }
    this.audio = undefined;
    this.current = undefined;
    this.playing = false;
    $('radio-now').hidden = true;
    $('radio-indicator').classList.remove('on');
    if (announce) this.status('Radio off. Choose a station to tune in.');
    this.render();
  }
  async discover() {
    this.abort?.abort();
    this.abort = new AbortController();
    const abort = this.abort;
    this.status('Looking for Malayalam stations…');
    ($('radio-refresh') as HTMLButtonElement).disabled = true;
    try {
      try {
        const response = await fetch(this.mirrors[0] + '/json/servers', {
          signal: AbortSignal.any([abort.signal, AbortSignal.timeout(4000)]),
        });
        const values: unknown = await response.json();
        if (Array.isArray(values)) {
          const found = values
            .map((v) =>
              v && typeof v === 'object' ? (v as Record<string, unknown>).name : undefined,
            )
            .filter(
              (v): v is string =>
                typeof v === 'string' && /^[a-z0-9-]+\.api\.radio-browser\.info$/i.test(v),
            )
            .map((v) => 'https://' + v);
          if (found.length)
            this.mirrors = [...new Set(found)].sort(() => Math.random() - 0.5).slice(0, 4);
        }
      } catch {
        if (abort.signal.aborted) return;
      }
      for (const mirror of this.mirrors) {
        if (abort.signal.aborted) return;
        try {
          const response = await fetch(
            mirror +
              '/json/stations/search?language=malayalam&hidebroken=true&is_https=true&limit=60&order=clickcount&reverse=true',
            { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(5000)]) },
          );
          if (!response.ok) continue;
          const stations = directoryStations(await response.json());
          if (!stations.length) continue;
          const seen = new Set(CURATED_STATIONS.map((s) => s.url));
          this.stations = [...CURATED_STATIONS, ...stations.filter((s) => !seen.has(s.url))];
          this.render();
          this.status(
            this.playing && this.current
              ? 'Live: ' + this.current.name
              : 'More stations found. Choose one to tune in.',
          );
          return;
        } catch {
          continue;
        }
      }
      this.status(
        'The directory is taking a break. The stations above are still available to try.',
      );
    } finally {
      if (this.abort === abort) ($('radio-refresh') as HTMLButtonElement).disabled = false;
    }
  }
  dispose() {
    this.abort?.abort();
    this.stop(false);
  }
}
