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
  get saved() {
    return { version: 1, earned: [...this.earned], visits: [...this.visits], trail: this.trail };
  }
}
