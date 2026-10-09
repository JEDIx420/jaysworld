import { PASSENGERS, stopById, routeBetween, distance2, type Point } from './village';
export type Snack = 'tea' | 'pazhampori' | 'samosa';
export const MENU: Record<Snack, { name: string; price: number }> = {
  tea: { name: 'Chaya', price: 10 },
  pazhampori: { name: 'Pazhampori', price: 15 },
  samosa: { name: 'Samosa', price: 12 },
};
export interface SavedGame {
  version: 1;
  wallet: number;
  completed: number;
  tea: number;
  snacks: number;
}
export interface FareSnapshot extends SavedGame {
  passengerIndex: number;
  onboard: boolean;
  travelled: number;
  fare: number;
}
export class FareGame {
  private data: SavedGame = { version: 1, wallet: 0, completed: 0, tea: 0, snacks: 0 };
  private onboard = false;
  private travelled = 0;
  private previous?: Point;
  constructor(saved?: unknown) {
    if (saved && typeof saved === 'object') {
      const s = saved as Record<string, unknown>;
      if (
        s.version === 1 &&
        ['wallet', 'completed', 'tea', 'snacks'].every(
          (k) =>
            typeof s[k] === 'number' &&
            Number.isSafeInteger(s[k]) &&
            (s[k] as number) >= 0 &&
            (s[k] as number) < 1000000,
        )
      )
        this.data = {
          version: 1,
          wallet: s.wallet as number,
          completed: s.completed as number,
          tea: s.tea as number,
          snacks: s.snacks as number,
        };
    }
  }
  get passenger() {
    return PASSENGERS[this.data.completed % PASSENGERS.length];
  }
  get pickup() {
    return stopById(this.passenger.from);
  }
  get destination() {
    return stopById(this.passenger.to);
  }
  get fare() {
    return 20 + Math.round(routeBetween(this.pickup, this.destination).distance * 0.18);
  }
  get snapshot(): FareSnapshot {
    return {
      ...this.data,
      passengerIndex: this.data.completed % PASSENGERS.length,
      onboard: this.onboard,
      travelled: this.travelled,
      fare: this.fare,
    };
  }
  get saved(): SavedGame {
    return { ...this.data };
  }
  get target() {
    return this.onboard ? this.destination : this.pickup;
  }
  update(point: Point) {
    if (this.onboard && this.previous) {
      const moved = distance2(point, this.previous);
      if (moved > 20) {
        this.cancel();
      } else this.travelled += moved;
    }
    this.previous = { ...point };
  }
  actionAt(point: Point, speed: number): 'pickup' | 'dropoff' | undefined {
    if (speed > 1.2 || distance2(point, this.target) > 7) return undefined;
    if (!this.onboard) return 'pickup';
    const minimum = distance2(this.pickup, this.destination) * 0.8;
    return this.travelled >= minimum ? 'dropoff' : undefined;
  }
  interact(
    point: Point,
    speed: number,
  ): { kind: 'pickup' | 'dropoff'; message: string; amount?: number } | undefined {
    const action = this.actionAt(point, speed);
    if (!action) return;
    if (action === 'pickup') {
      this.onboard = true;
      this.travelled = 0;
      this.previous = { ...point };
      return { kind: action, message: this.passenger.line };
    }
    const amount = this.fare,
      name = this.passenger.name;
    this.data.wallet += amount;
    this.data.completed++;
    this.onboard = false;
    this.travelled = 0;
    this.previous = { ...point };
    return { kind: action, message: `${name}: Thank you! ₹${amount} paid.`, amount };
  }
  buy(item: Snack, atTeaShop: boolean): { ok: boolean; message: string } {
    if (!atTeaShop)
      return { ok: false, message: 'Order at Chaya corner. The paper is free at every stop.' };
    const product = MENU[item];
    if (this.data.wallet < product.price)
      return {
        ok: false,
        message: `${product.name} is ₹${product.price}. Take a passenger fare to earn a little.`,
      };
    this.data.wallet -= product.price;
    if (item === 'tea') this.data.tea++;
    else this.data.snacks++;
    return { ok: true, message: `${product.name} is ready. Sit down and take your time.` };
  }
  cancel() {
    const wasOnboard = this.onboard;
    this.onboard = false;
    this.travelled = 0;
    this.previous = undefined;
    return wasOnboard;
  }
}
