import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import type { DriveInput } from './input';
import { groundHeight } from './terrain';
import { FIXED_STEP } from './vehicle';
import { BikePowertrain, RR310 } from './bike-powertrain';
import { BIKE_BAY } from './recreation-layout';

export const BIKE_WHEELS = [
  { x: 0, y: -0.02, z: -RR310.wheelbase / 2 },
  { x: 0, y: -0.02, z: RR310.wheelbase / 2 },
] as const;
/** Two tyre contacts, rear-wheel drive and assisted balance; lean is applied to the rider/model. */
export class BikeVehicle {
  readonly body: RAPIER.RigidBody;
  readonly controller: RAPIER.DynamicRayCastVehicleController;
  readonly powertrain = new BikePowertrain();
  readonly wheelPoints = BIKE_WHEELS;
  private steering = 0;
  private throttle = 0;
  private grip = 1;
  private forward = new Vector3();
  private quaternion = new Quaternion();
  lean = 0;
  constructor(readonly world: RAPIER.World) {
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setCcdEnabled(true)
        .setCanSleep(false)
        .setLinearDamping(0.005)
        .setAngularDamping(1.6)
        .enabledRotations(true, true, false),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.24, 0.28, 0.69)
        .setTranslation(0, 0.03, 0)
        .setMassProperties(
          RR310.kerbMass + RR310.riderMass,
          { x: 0, y: -0.12, z: 0.03 },
          { x: 110, y: 105, z: 140 },
          { x: 0, y: 0, z: 0, w: 1 },
        )
        .setFriction(0.2)
        .setRestitution(0.02),
      this.body,
    );
    this.controller = world.createVehicleController(this.body);
    this.controller.indexUpAxis = 1;
    this.controller.setIndexForwardAxis = 2;
    BIKE_WHEELS.forEach((p, i) => {
      this.controller.addWheel(
        p,
        { x: 0, y: -1, z: 0 },
        { x: 1, y: 0, z: 0 },
        0.3,
        i ? RR310.rearRadius : 0.293,
      );
      this.controller.setWheelSuspensionStiffness(i, 85);
      this.controller.setWheelSuspensionCompression(i, 5);
      this.controller.setWheelSuspensionRelaxation(i, 5.8);
      this.controller.setWheelMaxSuspensionTravel(i, 0.18);
      this.controller.setWheelMaxSuspensionForce(i, 7500);
      this.controller.setWheelFrictionSlip(i, 2.8);
      this.controller.setWheelSideFrictionStiffness(i, 2.4);
    });
    this.reset();
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
    this.grip = 1 - Math.max(0, Math.min(1, amount)) * 0.17;
  }
  beforeStep(input: DriveInput, dt = FIXED_STEP) {
    const speed = this.signedSpeed;
    this.powertrain.update(dt, speed, input);
    // Negative throttle brakes at road speed and walks the bike backwards only when stopped.
    const braking = input.brake || (input.throttle < 0 && speed > 0.5);
    const reverse = input.throttle < 0 && speed <= 0.5;
    this.throttle +=
      ((input.throttle > 0 && !braking ? 1 : 0) - this.throttle) *
      (1 - Math.exp(-dt * (input.boost ? 18 : 10)));
    const steerRange = Math.min(0.5, Math.atan((1.365 * 6) / Math.max(2, this.speed * this.speed)));
    this.steering += (-input.steer * steerRange - this.steering) * (1 - Math.exp(-dt * 10));
    this.controller.setWheelSteering(0, this.steering);
    const drag =
      0.5 * 1.225 * 0.29 * speed * Math.abs(speed) +
      (Math.abs(speed) > 0.2 ? Math.sign(speed) * 25 : 0);
    this.body.applyImpulse(
      { x: -this.forward.x * drag * dt, y: 0, z: -this.forward.z * drag * dt },
      true,
    );
    const engineBrake = input.throttle === 0 && speed > 1 ? 1.2 : 0;
    for (let i = 0; i < 2; i++) {
      this.controller.setWheelFrictionSlip(i, 2.8 * this.grip);
      this.controller.setWheelBrake(i, braking ? (i ? 26 : 40) : engineBrake);
      this.controller.setWheelEngineForce(
        i,
        i === 0
          ? 0
          : reverse
            ? speed > -1.6
              ? -240
              : 0
            : this.throttle * this.powertrain.driveForce,
      );
    }
    this.controller.updateVehicle(dt, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    // Assisted balancing and a moderate contact load make keyboard/touch cornering predictable.
    if (this.speed > 8 && this.controller.wheelIsInContact(1))
      this.body.applyImpulse(
        { x: 0, y: -this.body.mass() * Math.min(5, this.speed * 0.09) * dt, z: 0 },
        true,
      );
    const v = this.body.linvel(),
      cap = reverse ? 1.6 : RR310.topSpeed;
    if (this.speed > cap)
      this.body.setLinvel(
        { x: (v.x * cap) / this.speed, y: v.y, z: (v.z * cap) / this.speed },
        true,
      );
    const desiredLean = -Math.atan(
      (this.speed * this.speed * Math.tan(this.steering)) / RR310.wheelbase / 9.81,
    );
    this.lean +=
      (Math.max(-0.68, Math.min(0.68, desiredLean)) - this.lean) * (1 - Math.exp(-dt * 7));
  }
  reset(x: number = BIKE_BAY.x, z: number = BIKE_BAY.z, yaw: number = BIKE_BAY.yaw) {
    this.body.setTranslation({ x, y: groundHeight(x, z) + 0.86, z }, true);
    this.body.setRotation(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw), true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.resetForces(true);
    this.body.resetTorques(true);
    this.powertrain.reset();
    this.steering = this.throttle = this.lean = 0;
    for (let i = 0; i < 2; i++) {
      this.controller.setWheelEngineForce(i, 0);
      this.controller.setWheelBrake(i, 30);
    }
    this.controller.setWheelSteering(0, 0);
  }
  isOverturned() {
    return (
      new Vector3(0, 1, 0).applyQuaternion(this.quaternion.copy(this.body.rotation())).y < 0.15
    );
  }
}
