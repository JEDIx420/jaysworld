import type { PlaceId } from './projects';

export const ACCOMPLISHMENTS = [
  { id: 'first-road', title: 'The road is yours', hint: 'Take the auto for your first drive.' },
  { id: 'company', title: 'Meet Eagle Eye', hint: 'Visit the briefing room at Eagle Towers.' },
  { id: 'fare', title: 'First fare', hint: 'Complete a passenger ride on taxi duty.' },
  { id: 'beat', title: 'Leave a groove', hint: 'Play your own beat in the sound studio.' },
  { id: 'roof', title: 'Above the village', hint: 'Take the lift and watch the eagles.' },
  { id: 'wetland', title: 'A patient hunter', hint: 'Observe the wetland crocodiles.' },
  { id: 'stars', title: 'A little further', hint: 'Look through the hilltop telescope.' },
  { id: 'explorer', title: 'Around Jay’s World', hint: 'Discover all seven destinations.' },
] as const;
export type AccomplishmentId = (typeof ACCOMPLISHMENTS)[number]['id'];
export type Trail = 'company' | 'taxi' | 'explore';

export class JourneyProgress {
  readonly earned = new Set<AccomplishmentId>();
  readonly visits = new Set<PlaceId>();
  trail: Trail = 'explore';
  bikeKeys = false;
  constructor(saved?: unknown) {
    if (!saved || typeof saved !== 'object') return;
    const s = saved as Record<string, unknown>;
    if (s.version !== 1) return;
    if (s.trail === 'company' || s.trail === 'taxi' || s.trail === 'explore') this.trail = s.trail;
    if (Array.isArray(s.earned))
      for (const item of ACCOMPLISHMENTS) if (s.earned.includes(item.id)) this.earned.add(item.id);
    if (Array.isArray(s.visits))
      for (const id of [
        'about',
        'eagle-eye',
        'opsflash',
        'rift',
        'music',
        'saltwater',
        'space',
      ] as const)
        if (s.visits.includes(id)) this.visits.add(id);
    this.bikeKeys = s.bikeKeys === true && this.complete;
  }
  earn(id: AccomplishmentId) {
    if (this.earned.has(id)) return undefined;
    this.earned.add(id);
    return ACCOMPLISHMENTS.find((a) => a.id === id)!;
  }
  visit(id: PlaceId) {
    this.visits.add(id);
    return this.visits.size === 7 ? this.earn('explorer') : undefined;
  }
  get complete() {
    return this.visits.size === 7 && ACCOMPLISHMENTS.every((a) => this.earned.has(a.id));
  }
  claimBikeKeys() {
    if (!this.complete || this.bikeKeys) return false;
    this.bikeKeys = true;
    return true;
  }
  get saved() {
    return {
      version: 1,
      earned: [...this.earned],
      visits: [...this.visits],
      trail: this.trail,
      bikeKeys: this.bikeKeys,
    };
  }
}

/** Every reward requirement is reachable from the guided itinerary; the observatory is last. */
export function guidedObjective(progress: JourneyProgress): {
  place: PlaceId;
  label: string;
  kind: 'visit' | 'roof' | 'beat' | 'wetland' | 'fare' | 'stars' | 'drive' | 'keys' | 'bike';
} {
  if (progress.bikeKeys)
    return { place: 'eagle-eye', label: 'Collect your RR 310 at Eagle Towers', kind: 'bike' };
  if (!progress.visits.has('eagle-eye') || !progress.earned.has('company'))
    return { place: 'eagle-eye', label: 'Visit the Eagle Eye briefing room', kind: 'visit' };
  if (!progress.earned.has('roof'))
    return { place: 'eagle-eye', label: 'Take the lift to the rooftop', kind: 'roof' };
  for (const place of ['opsflash', 'rift', 'music'] as const)
    if (!progress.visits.has(place))
      return {
        place,
        label:
          place === 'opsflash'
            ? 'Visit OpsFlash high command'
            : place === 'rift'
              ? 'Visit the RIFT computer centre'
              : 'Visit the sound studio',
        kind: 'visit',
      };
  if (!progress.earned.has('beat'))
    return { place: 'music', label: 'Play a beat in the sound studio', kind: 'beat' };
  if (!progress.visits.has('saltwater'))
    return { place: 'saltwater', label: 'Visit the wetland jetty', kind: 'visit' };
  if (!progress.earned.has('wetland'))
    return { place: 'saltwater', label: 'Observe the crocodiles', kind: 'wetland' };
  if (!progress.visits.has('about'))
    return { place: 'about', label: 'Read Jay’s paper at the tea shop', kind: 'visit' };
  if (!progress.earned.has('fare'))
    return { place: 'about', label: 'Complete one taxi fare', kind: 'fare' };
  if (!progress.earned.has('first-road'))
    return { place: 'space', label: 'Drive to the hilltop observatory', kind: 'drive' };
  if (!progress.visits.has('space') || !progress.earned.has('explorer'))
    return { place: 'space', label: 'Visit the hilltop observatory', kind: 'visit' };
  if (!progress.earned.has('stars'))
    return { place: 'space', label: 'Look through the telescope', kind: 'stars' };
  return { place: 'space', label: 'Collect your bike keys at the observatory', kind: 'keys' };
}
