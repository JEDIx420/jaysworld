import RAPIER from '@dimforge/rapier3d-compat';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { DriveInput } from './input';
import { groundHeight } from './terrain';
import { FIXED_STEP } from './vehicle';
import { BikePowertrain, RR310 } from './bike-powertrain';
import { BIKE_BAY } from './recreation-layout';

export const BIKE_WHEELS = [
  { x: 0, y: -0.02, z: -RR310.wheelbase / 2 },
  { x: 0, y: -0.02, z: RR310.wheelbase / 2 },
] as const;
export const BIKE_SAFETY_RADIUS = 0.45;
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
  private heading = new Euler(0, 0, 0, 'YXZ');
  private surfaceRotation = new Quaternion();
  private surfaceMatrix = new Matrix4();
  private groundForward = new Vector3();
  private groundRight = new Vector3();
  private groundNormal = new Vector3();
  private groundRay = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  lean = 0;
  constructor(readonly world: RAPIER.World) {
    this.body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setCcdEnabled(true)
        .setCanSleep(false)
        .setLinearDamping(0.005)
        .setAngularDamping(1.6)
        // Rapier rotation locks are WORLD axes. Lock both horizontal axes: locking Z
        // alone leaves local roll free when the bike points east or west.
        .enabledRotations(false, true, false),
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
      this.controller.setWheelMaxSuspensionTravel(i, 0.25);
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
  get headingYaw() {
    return this.heading.setFromQuaternion(this.quaternion.copy(this.body.rotation()), 'YXZ').y;
  }
  wet(amount: number) {
    this.grip = 1 - Math.max(0, Math.min(1, amount)) * 0.17;
  }
  private followGround(dt: number) {
    // Balance locks must not hold the chassis horizontal on an incline. A horizontal
    // chassis loads the front spring and lifts the driven rear tyre out of ray range.
    // Read static ground beneath the contact patch, then follow its pitch and bank
    // explicitly; impacts still cannot knock the rider sideways onto the road.
    const position = this.body.translation();
    this.quaternion.copy(this.body.rotation());
    const yaw = this.heading.setFromQuaternion(this.quaternion, 'YXZ').y;
    const fx = -Math.sin(yaw),
      fz = -Math.cos(yaw);
    const rx = Math.cos(yaw),
      rz = -Math.sin(yaw);
    const height = (x: number, z: number) => {
      this.groundRay.origin.x = x;
      this.groundRay.origin.y = position.y + 0.7;
      this.groundRay.origin.z = z;
      const hit = this.world.castRayAndGetNormal(
        this.groundRay,
        1.9,
        true,
        RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC,
        undefined,
        undefined,
        this.body,
      );
      // A ray starting inside a wall reports zero distance. It is not road height.
      return hit && hit.timeOfImpact > 0.02 && hit.normal.y > 0.6
        ? this.groundRay.origin.y - hit.timeOfImpact
        : undefined;
    };
    const half = RR310.wheelbase / 2;
    const front = height(position.x + fx * half, position.z + fz * half);
    const rear = height(position.x - fx * half, position.z - fz * half);
    const right = height(position.x + rx * 0.3, position.z + rz * 0.3);
    const left = height(position.x - rx * 0.3, position.z - rz * 0.3);
    if (front === undefined || rear === undefined || right === undefined || left === undefined)
      return;
    this.groundForward.set(fx * RR310.wheelbase, front - rear, fz * RR310.wheelbase).normalize();
    this.groundRight.set(rx * 0.6, right - left, rz * 0.6).normalize();
    this.groundNormal.crossVectors(this.groundRight, this.groundForward).normalize();
    if (this.groundNormal.y < 0.6) return;
    this.groundForward.projectOnPlane(this.groundNormal).normalize();
    this.groundRight.crossVectors(this.groundForward, this.groundNormal).normalize();
    this.surfaceMatrix.makeBasis(this.groundRight, this.groundNormal, this.groundForward.negate());
    this.surfaceRotation.setFromRotationMatrix(this.surfaceMatrix);
    this.quaternion.slerp(this.surfaceRotation, 1 - Math.exp(-dt * 20));
    this.body.setRotation(this.quaternion, true);
  }
  beforeStep(input: DriveInput, dt = FIXED_STEP) {
    this.followGround(dt);
    const speed = this.signedSpeed;
    this.powertrain.update(dt, speed, input);
    // Negative throttle brakes at road speed and walks the bike backwards only when stopped.
    const braking = input.brake || (input.throttle < 0 && speed > 0.5);
    const reverse = input.throttle < 0 && speed <= 0.5;
    this.throttle +=
      ((input.throttle > 0 && !braking ? 1 : 0) - this.throttle) *
      (1 - Math.exp(-dt * (input.boost ? 18 : 10)));
    const steerRange = 0.57 / (1 + this.speed * this.speed * 0.0028);
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
      const holding = input.throttle === 0 && this.speed < 0.35;
      this.controller.setWheelBrake(i, braking || holding ? (i ? 26 : 40) : engineBrake);
      this.controller.setWheelEngineForce(
        i,
        i === 0
          ? 0
          : reverse
            ? speed > -1.6
              ? -240 - Math.max(0, -this.forward.y) * this.body.mass() * 9.81
              : 0
            : this.throttle * this.powertrain.driveForce,
      );
    }
    this.controller.updateVehicle(dt, RAPIER.QueryFilterFlags.EXCLUDE_DYNAMIC);
    // Steering assistance supplies the yaw moment a balanced motorcycle produces
    // through countersteer. Tyres still provide traction, braking and suspension.
    const grounded = this.controller.wheelIsInContact(0) || this.controller.wheelIsInContact(1);
    const yawLimit = Math.min(1.6, (9 * this.grip) / Math.max(3, this.speed));
    const desiredYaw = grounded
      ? Math.max(-yawLimit, Math.min(yawLimit, (speed * Math.tan(this.steering)) / RR310.wheelbase))
      : 0;
    const yaw = this.body.angvel().y;
    this.body.setAngvel(
      { x: 0, y: yaw + (desiredYaw - yaw) * (1 - Math.exp(-dt * 12)), z: 0 },
      true,
    );
    if (grounded && input.throttle === 0 && this.speed < 0.08) {
      const velocity = this.body.linvel();
      this.body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
    }
    // A moderate contact load keeps keyboard/touch cornering predictable.
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
    const desiredLean = Math.atan((this.speed * desiredYaw) / 9.81);
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
