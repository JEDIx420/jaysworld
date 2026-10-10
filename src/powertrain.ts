import type { DriveInput } from './input';

export const ROAD_SPEED = 70 / 3.6;
export const BOOST_SPEED = 120 / 3.6;
export const MIN_GEAR_SECONDS = 3;
const GEARS = [0, 14, 28, 42, 56] as const;
const ease = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};

/** A deliberate five-speed transmission; only the player's auto has boost. */
export class AutoPowertrain {
  gear = 1;
  rpm = 1000;
  boosted = false;
  wheelie = 0;
  shift = 0;
  gearSeconds = 0;
  private launch = 2;
  private wasBoosting = false;
  private landing = 0;
  private landingHeight = 0;
  constructor(readonly player = true) {}
  get speedLimit() {
    return (this.boosted ? [24, 48, 72, 96, 120] : [14, 28, 42, 56, 70])[this.gear - 1] / 3.6;
  }
  update(dt: number, signedSpeed: number, input: DriveInput) {
    const kmh = Math.max(0, signedSpeed * 3.6);
    if (input.throttle > 0 && !input.brake) this.gearSeconds += dt;
    let next = this.gear;
    // One shift at a time. Speed alone cannot skip the three-second driving interval.
    if (next < 5 && this.gearSeconds + 1e-7 >= MIN_GEAR_SECONDS && kmh >= GEARS[next] - 0.6) next++;
    while (next > 1 && kmh < GEARS[next - 1] - 3) next--;
    if (next !== this.gear) {
      this.shift = 0.24;
      this.gearSeconds = 0;
    }
    this.gear = next;
    this.shift = Math.max(0, this.shift - dt);
    this.boosted = this.player && input.boost && input.throttle > 0 && !input.brake;
    if (this.boosted && !this.wasBoosting && this.wheelie < 0.005) {
      this.launch = 0;
      this.landing = 0;
    }
    if (!this.boosted && this.wasBoosting && this.wheelie > 0) {
      this.landing = 0.65;
      this.landingHeight = this.wheelie;
      this.launch = 2;
    }
    this.wasBoosting = this.boosted;
    this.launch = Math.min(2, this.launch + dt);
    if (this.landing > 0) {
      this.landing = Math.max(0, this.landing - dt);
      this.wheelie = this.landingHeight * ease(this.landing / 0.65);
    } else {
      // Gentle lift, a brief balance, then a longer landing with zero angular speed at touchdown.
      this.wheelie =
        this.boosted && this.launch < 2
          ? 0.25 *
            (this.launch < 0.5
              ? ease(this.launch / 0.5)
              : this.launch < 1.05
                ? 1
                : 1 - ease((this.launch - 1.05) / 0.95))
          : 0;
    }
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
    this.wheelie = this.shift = this.gearSeconds = this.landing = this.landingHeight = 0;
    this.launch = 2;
  }
}
