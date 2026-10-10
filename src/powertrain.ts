import type { DriveInput } from './input';

export const ROAD_SPEED = 70 / 3.6;
export const BOOST_SPEED = 120 / 3.6;
const GEARS = [0, 14, 28, 42, 56] as const;

/** Arcade five-speed transmission; player boost is never available to traffic. */
export class AutoPowertrain {
  gear = 1;
  rpm = 1000;
  boosted = false;
  wheelie = 0;
  shift = 0;
  private launch = 2;
  private wasBoosting = false;
  constructor(readonly player = true) {}
  update(dt: number, signedSpeed: number, input: DriveInput) {
    const kmh = Math.max(0, signedSpeed * 3.6);
    let next = this.gear;
    while (next < 5 && kmh > GEARS[next] + 1) next++;
    while (next > 1 && kmh < GEARS[next - 1] - 3) next--;
    if (next !== this.gear) this.shift = 0.24;
    this.gear = next;
    this.shift = Math.max(0, this.shift - dt);
    this.boosted = this.player && input.boost && input.throttle > 0 && !input.brake;
    if (this.boosted && !this.wasBoosting) this.launch = 0;
    this.wasBoosting = this.boosted;
    this.launch = Math.min(2, this.launch + dt);
    this.wheelie =
      this.boosted && this.launch < 2 ? Math.sin((this.launch / 2) * Math.PI) * 0.25 : 0;
    const span = next === 5 && this.boosted ? 64 : 14;
    const revs = 1100 + Math.min(1, Math.max(0, (kmh - GEARS[next - 1]) / span)) * 4800;
    const wanted =
      (input.throttle > 0 ? revs + 400 : Math.max(900, revs * 0.65)) * (this.shift ? 0.7 : 1);
    this.rpm += (wanted - this.rpm) * (1 - Math.exp(-dt * 16));
  }
  reset() {
    this.gear = 1;
    this.rpm = 1000;
    this.boosted = this.wasBoosting = false;
    this.wheelie = this.shift = 0;
    this.launch = 2;
  }
}
