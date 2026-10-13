import type { DriveInput } from './input';

// TVS RR 310 Rev.2 owner manual (2019), chosen to match the supplied Sinister Black reference.
export const RR310 = {
  gears: [3, 2.063, 1.588, 1.286, 1.095, 0.955],
  primary: 3.08,
  final: 2.47,
  rearRadius: 0.306,
  wheelbase: 1.365,
  kerbMass: 174,
  riderMass: 75,
  idle: 1700,
  redline: 10800,
  topSpeed: 160 / 3.6,
  peakTorque: 27.3,
} as const;
export function bikeRpm(speed: number, gear: number) {
  return (
    (Math.abs(speed) / (Math.PI * 2 * RR310.rearRadius)) *
    60 *
    RR310.primary *
    RR310.final *
    RR310.gears[Math.max(0, Math.min(5, gear - 1))]
  );
}
export function bikeTorque(rpm: number) {
  const knots = [
    [1700, 13],
    [3500, 20],
    [5000, 23],
    [6500, 25.5],
    [7700, 27.3],
    [9700, 24.6],
    [10800, 18],
  ];
  for (let i = 1; i < knots.length; i++)
    if (rpm <= knots[i][0]) {
      const [x, y] = knots[i - 1],
        [xx, yy] = knots[i];
      return y + (yy - y) * Math.max(0, (rpm - x) / (xx - x));
    }
  return 18;
}
export class BikePowertrain {
  gear = 1;
  rpm = RR310.idle as number;
  shift = 0;
  boosted = false;
  wheelie = 0;
  private shiftHold = 0;
  private liftTime = 3;
  private wasBoosting = false;
  update(dt: number, speed: number, input: DriveInput) {
    this.shiftHold = Math.max(0, this.shiftHold - dt);
    this.shift = Math.max(0, this.shift - dt);
    const coupled = bikeRpm(speed, this.gear);
    if (!this.shiftHold && coupled > 10000 && this.gear < 6) {
      this.gear++;
      this.shift = 0.12;
      this.shiftHold = 0.4;
    } else if (
      !this.shiftHold &&
      this.gear > 1 &&
      coupled < 4100 &&
      bikeRpm(speed, this.gear - 1) < 8800
    ) {
      this.gear--;
      this.shift = 0.14;
      this.shiftHold = 0.4;
    }
    const target = Math.max(
      RR310.idle,
      bikeRpm(speed, this.gear),
      input.throttle > 0 ? 4500 : RR310.idle,
    );
    this.rpm += (Math.min(RR310.redline, target) - this.rpm) * (1 - Math.exp(-dt * 18));
    // Boost gives full available engine response. Wheelie is a cosmetic game effect, no extra top speed.
    this.boosted = input.boost && input.throttle > 0 && !input.brake;
    if (this.boosted && !this.wasBoosting && this.wheelie < 0.01) this.liftTime = 0;
    this.wasBoosting = this.boosted;
    this.liftTime += dt;
    const envelope =
      this.boosted && speed > 1 && speed < 25 && this.liftTime < 2.2
        ? Math.sin(Math.PI * Math.min(1, this.liftTime / 2.2)) ** 2 * 0.42
        : 0;
    this.wheelie += (envelope - this.wheelie) * (1 - Math.exp(-dt * 10));
  }
  get driveForce() {
    return (
      ((bikeTorque(this.rpm) * RR310.primary * RR310.final * RR310.gears[this.gear - 1] * 0.88) /
        RR310.rearRadius) *
      (this.shift ? 0.12 : 1)
    );
  }
  reset() {
    this.gear = 1;
    this.rpm = RR310.idle;
    this.shift = this.shiftHold = this.wheelie = 0;
    this.boosted = this.wasBoosting = false;
    this.liftTime = 3;
  }
}
