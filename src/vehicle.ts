import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import type { DriveInput } from './input';
import { groundHeight } from './terrain';

export const FIXED_STEP = 1 / 60;
export const SPAWN = { x: -51, y: 0.95, z: 29 };
export const WHEEL_POINTS = [
  { x: 0, y: -0.18, z: -1.04 },
  { x: -0.7, y: -0.18, z: 0.85 },
  { x: 0.7, y: -0.18, z: 0.85 },
];

export class AutoVehicle {
  readonly body: RAPIER.RigidBody;
  readonly controller: RAPIER.DynamicRayCastVehicleController;
  private steering = 0;
  private throttle = 0;
  private braking = 0;
  private forward = new Vector3();
  private quaternion = new Quaternion();

  constructor(readonly world: RAPIER.World) {
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(SPAWN.x, SPAWN.y, SPAWN.z)
        .setLinearDamping(0.13)
        .setAngularDamping(1.8)
        .setCanSleep(false)
        .setCcdEnabled(true),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.67, 0.22, 1.16)
        .setTranslation(0, -0.12, 0)
        .setMassProperties(
          140,
          { x: 0, y: -0.3, z: 0.2 },
          { x: 100, y: 140, z: 100 },
          { x: 0, y: 0, z: 0, w: 1 },
        )
        .setFriction(0.35)
        .setRestitution(0.05),
      this.body,
    );
    this.controller = world.createVehicleController(this.body);
    this.controller.indexUpAxis = 1;
    this.controller.setIndexForwardAxis = 2;
    for (const p of WHEEL_POINTS) {
      this.controller.addWheel(p, { x: 0, y: -1, z: 0 }, { x: 1, y: 0, z: 0 }, 0.3, 0.32);
    }
    for (let i = 0; i < 3; i++) {
      this.controller.setWheelSuspensionStiffness(i, 42);
      this.controller.setWheelSuspensionCompression(i, 5.5);
      this.controller.setWheelSuspensionRelaxation(i, 5.5);
      this.controller.setWheelMaxSuspensionTravel(i, 0.25);
      this.controller.setWheelMaxSuspensionForce(i, 5000);
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

  beforeStep(input: DriveInput, dt = FIXED_STEP) {
    const signed = this.signedSpeed;
    const limit = input.boost ? 16 : 12;
    const steeringRange = 0.56 / (1 + this.speed * 0.065);
    this.steering += (-input.steer * steeringRange - this.steering) * (1 - Math.exp(-9 * dt));
    this.controller.setWheelSteering(0, this.steering);
    const reversing = input.throttle * signed < -0.6;
    this.throttle += (input.throttle - this.throttle) * (1 - Math.exp(-5.5 * dt));
    const softLimit = Math.max(0, Math.min(1, (limit + 1 - Math.abs(signed)) / 2));
    const force =
      input.brake || reversing || input.throttle * signed > limit
        ? 0
        : this.throttle * (input.boost ? 360 : 265) * softLimit;
    this.braking +=
      ((input.brake ? 9 : reversing ? 5 : input.throttle === 0 ? 0.065 : 0) - this.braking) *
      (1 - Math.exp(-14 * dt));
    const brake = this.braking;
    for (let i = 0; i < 3; i++) {
      this.controller.setWheelBrake(i, brake);
      this.controller.setWheelEngineForce(i, i === 0 ? 0 : force);
    }
    this.controller.updateVehicle(dt, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
  }

  reset(x = SPAWN.x, z = SPAWN.z, yaw = 0) {
    this.body.setTranslation({ x, y: groundHeight(x, z) + SPAWN.y + 0.06, z }, true);
    this.body.setRotation(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw), true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.body.resetForces(true);
    this.body.resetTorques(true);
    this.steering = 0;
    this.throttle = this.braking = 0;
    for (let i = 0; i < 3; i++) {
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
