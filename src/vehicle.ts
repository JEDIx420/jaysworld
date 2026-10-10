import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import type { DriveInput } from './input';
import { groundHeight } from './terrain';
import { AutoPowertrain, ROAD_SPEED, BOOST_SPEED } from './powertrain';
import { ROAD_START } from './village';

export const FIXED_STEP = 1 / 60;
export const SPAWN = { ...ROAD_START, y: 0.95 };
export const WHEEL_POINTS = [
  { x: 0, y: -0.18, z: -1.04 },
  { x: -0.7, y: -0.18, z: 0.85 },
  { x: 0.7, y: -0.18, z: 0.85 },
];

export class AutoVehicle {
  readonly body: RAPIER.RigidBody;
  readonly controller: RAPIER.DynamicRayCastVehicleController;
  readonly wheelPoints: typeof WHEEL_POINTS;
  private grip = 1;
  private steering = 0;
  private throttle = 0;
  private braking = 0;
  private forward = new Vector3();
  private quaternion = new Quaternion();
  readonly powertrain: AutoPowertrain;

  constructor(
    readonly world: RAPIER.World,
    readonly kind: 'auto' | 'car' = 'auto',
    readonly player = kind === 'auto',
  ) {
    const car = kind === 'car';
    this.powertrain = new AutoPowertrain(player && !car);
    this.wheelPoints = car
      ? [
          { x: -0.85, y: -0.18, z: -1.25 },
          { x: 0.85, y: -0.18, z: -1.25 },
          { x: -0.85, y: -0.18, z: 1.25 },
          { x: 0.85, y: -0.18, z: 1.25 },
        ]
      : WHEEL_POINTS;
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(SPAWN.x, SPAWN.y, SPAWN.z)
        .setLinearDamping(0.13)
        .setAngularDamping(1.8)
        .setCanSleep(false)
        .setCcdEnabled(true),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(car ? 0.9 : 0.67, 0.22, car ? 1.8 : 1.16)
        .setTranslation(0, -0.12, 0)
        .setMassProperties(
          car ? 780 : 140,
          { x: 0, y: -0.3, z: 0.2 },
          car ? { x: 650, y: 950, z: 600 } : { x: 100, y: 140, z: 100 },
          { x: 0, y: 0, z: 0, w: 1 },
        )
        .setFriction(0.35)
        .setRestitution(0.05),
      this.body,
    );
    // The cabin is a collision surface too; it has no extra mass.
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(car ? 0.78 : 0.65, car ? 0.46 : 0.65, car ? 1.03 : 0.83)
        .setTranslation(0, 0.7, 0.08)
        .setDensity(0)
        .setFriction(0.25)
        .setRestitution(0.02),
      this.body,
    );
    this.controller = world.createVehicleController(this.body);
    this.controller.indexUpAxis = 1;
    this.controller.setIndexForwardAxis = 2;
    for (const p of this.wheelPoints) {
      this.controller.addWheel(p, { x: 0, y: -1, z: 0 }, { x: 1, y: 0, z: 0 }, 0.3, 0.32);
    }
    for (let i = 0; i < this.wheelPoints.length; i++) {
      this.controller.setWheelSuspensionStiffness(i, 42);
      this.controller.setWheelSuspensionCompression(i, 5.5);
      this.controller.setWheelSuspensionRelaxation(i, 5.5);
      this.controller.setWheelMaxSuspensionTravel(i, 0.25);
      this.controller.setWheelMaxSuspensionForce(i, car ? 18000 : 5000);
      this.controller.setWheelFrictionSlip(i, 1.6);
      this.controller.setWheelSideFrictionStiffness(i, 1.7);
    }
  }

  get signedSpeed() {
    this.quaternion.copy(this.body.rotation());
    this.forward.set(0, 0, -1).applyQuaternion(this.quaternion);
    const v = this.body.linvel();
    return v.x * this.forward.x + v.y * this.forward.y + v.z * this.forward.z;
  }
  get speed() {
    const v = this.body.linvel();
    return Math.hypot(v.x, v.z);
  }

  wet(amount: number) {
    this.grip = 1 - Math.max(0, Math.min(1, amount)) * 0.1;
  }
  beforeStep(input: DriveInput, dt = FIXED_STEP) {
    const signed = this.signedSpeed;
    this.powertrain.update(dt, signed, input);
    const boost = this.powertrain.boosted;
    const limit = input.throttle < 0 ? 4 : this.player ? (boost ? BOOST_SPEED : ROAD_SPEED) : 12;
    const gearLimit = this.player && input.throttle > 0 ? this.powertrain.speedLimit : limit;
    const steeringRange = 0.56 / (1 + this.speed * 0.1);
    this.steering += (-input.steer * steeringRange - this.steering) * (1 - Math.exp(-9 * dt));
    this.controller.setWheelSteering(0, this.steering);
    if (this.kind === 'car') this.controller.setWheelSteering(1, this.steering);
    const reversing = input.throttle * signed < -0.6;
    this.throttle += (input.throttle - this.throttle) * (1 - Math.exp(-5.5 * dt));
    const softLimit = Math.max(0, Math.min(1, (gearLimit + 0.05 - Math.abs(signed)) / 0.4));
    const hillLoad = Math.max(0, this.forward.y * Math.sign(input.throttle) * 9.81);
    const torque =
      this.kind === 'car'
        ? 1550
        : this.player
          ? (this.body.mass() / 2) *
            ((boost ? 2.4 : 1.75) + Math.abs(signed) * 0.13 + hillLoad) *
            (this.powertrain.shift ? 0.55 : 1)
          : 265;
    const force =
      input.brake || reversing || input.throttle * signed > limit
        ? 0
        : this.throttle * torque * softLimit;
    this.braking +=
      ((input.brake ? 9 : reversing ? 5 : input.throttle === 0 ? 0.065 : 0) - this.braking) *
      (1 - Math.exp(-14 * dt));
    const brake = this.braking;
    for (let i = 0; i < this.wheelPoints.length; i++) {
      this.controller.setWheelFrictionSlip(i, 1.6 * this.grip);
      this.controller.setWheelBrake(i, brake);
      this.controller.setWheelEngineForce(i, i < (this.kind === 'car' ? 2 : 1) ? 0 : force);
    }
    this.controller.updateVehicle(dt, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    // Arcade downforce keeps the faster auto settled over ridge crests and during turns.
    if (this.player && this.speed > 7) {
      const downforce = Math.min(18, this.speed * this.speed * 0.085);
      this.body.applyImpulse({ x: 0, y: -this.body.mass() * downforce * dt, z: 0 }, true);
    }
    const speed = this.speed;
    if (speed > limit) {
      // Gently return to road speed after boost; keep a hard ceiling on forward boost/reverse.
      const cap = boost || input.throttle < 0 ? limit : Math.max(limit, speed - 7 * dt);
      const velocity = this.body.linvel();
      this.body.setLinvel(
        { x: (velocity.x * cap) / speed, y: velocity.y, z: (velocity.z * cap) / speed },
        true,
      );
    }
  }

  reset(x = SPAWN.x, z = SPAWN.z, yaw = 0) {
    this.body.setTranslation({ x, y: groundHeight(x, z) + SPAWN.y + 0.06, z }, true);
    this.body.setRotation(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw), true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.resetForces(true);
    this.body.resetTorques(true);
    this.steering = 0;
    this.powertrain.reset();
    this.throttle = this.braking = 0;
    for (let i = 0; i < this.wheelPoints.length; i++) {
      this.controller.setWheelEngineForce(i, 0);
      this.controller.setWheelBrake(i, 9);
    }
    this.controller.setWheelSteering(0, 0);
  }
  isOverturned() {
    this.quaternion.copy(this.body.rotation());
    return new Vector3(0, 1, 0).applyQuaternion(this.quaternion).y < 0.15;
  }
}
