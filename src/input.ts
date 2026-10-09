export interface DriveInput {
  throttle: number;
  steer: number;
  brake: boolean;
  boost: boolean;
}
export const REST_INPUT: DriveInput = { throttle: 0, steer: 0, brake: false, boost: false };
const clamp = (n: number) => Math.max(-1, Math.min(1, n));

export function joystickInput(dx: number, dy: number, radius: number): DriveInput {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(radius) || radius <= 0)
    return { ...REST_INPUT };
  const length = Math.hypot(dx, dy);
  if (length < radius * 0.14) return { ...REST_INPUT };
  return { throttle: clamp(-dy / radius), steer: clamp(dx / radius), brake: false, boost: false };
}

export class Input {
  private keys = new Set<string>();
  private touch: DriveInput = { ...REST_INPUT };
  private stickPointer: number | null = null;
  private brakePointer: number | null = null;
  private orbitPointer: number | null = null;
  private previous = { x: 0, y: 0 };
  private abort = new AbortController();
  paused = false;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: {
      interact: () => void;
      places: () => void;
      reset: () => void;
      honk: () => void;
      orbit: (x: number, y: number) => void;
      zoom: (delta: number) => void;
    },
  ) {
    const signal = this.abort.signal;
    const drivingKeys = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Space',
      'ShiftLeft',
      'ShiftRight',
    ]);
    window.addEventListener(
      'keydown',
      (e) => {
        if (this.paused) return;
        if (
          (e.target as HTMLElement)?.closest?.('input,select,textarea') ||
          (['Space', 'Enter'].includes(e.code) && (e.target as HTMLElement)?.closest?.('button,a'))
        )
          return;
        if (drivingKeys.has(e.code)) {
          e.preventDefault();
          this.keys.add(e.code);
        }
        if (e.repeat) return;
        if (e.code === 'KeyE' || (e.code === 'Enter' && e.target === canvas)) callbacks.interact();
        if (e.code === 'KeyM') callbacks.places();
        if (e.code === 'KeyR') callbacks.reset();
        if (e.code === 'KeyH') callbacks.honk();
      },
      { signal },
    );
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), { signal });
    window.addEventListener('blur', () => this.clear(), { signal });
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.clear();
      },
      { signal },
    );

    const stick = document.getElementById('joystick')!;
    const knob = document.getElementById('joystick-knob')!;
    const moveStick = (e: PointerEvent) => {
      const box = stick.getBoundingClientRect();
      const dx = e.clientX - box.left - box.width / 2,
        dy = e.clientY - box.top - box.height / 2;
      this.touch = joystickInput(dx, dy, box.width * 0.4);
      const length = Math.hypot(dx, dy),
        scale = Math.min(1, (box.width * 0.3) / Math.max(length, 1));
      knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    };
    stick.addEventListener(
      'pointerdown',
      (e) => {
        if (this.paused || this.stickPointer !== null) return;
        this.stickPointer = e.pointerId;
        stick.setPointerCapture(e.pointerId);
        moveStick(e);
        e.preventDefault();
      },
      { signal },
    );
    stick.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerId === this.stickPointer) moveStick(e);
      },
      { signal },
    );
    const releaseStick = (e: PointerEvent) => {
      if (e.pointerId !== this.stickPointer) return;
      this.stickPointer = null;
      this.touch = { ...REST_INPUT };
      knob.style.transform = '';
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
      stick.addEventListener(name, releaseStick, { signal });

    const brake = document.getElementById('brake-button')!;
    brake.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.paused) {
          this.brakePointer = e.pointerId;
          brake.setPointerCapture(e.pointerId);
        }
      },
      { signal },
    );
    const releaseBrake = (e: PointerEvent) => {
      if (e.pointerId === this.brakePointer) this.brakePointer = null;
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
      brake.addEventListener(name, releaseBrake, { signal });
    document.getElementById('honk-button')!.addEventListener('click', callbacks.honk, { signal });

    canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (this.paused || this.orbitPointer !== null) return;
        this.orbitPointer = e.pointerId;
        this.previous = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
        if (e.pointerType === 'mouse') canvas.focus({ preventScroll: true });
      },
      { signal },
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerId !== this.orbitPointer) return;
        callbacks.orbit(e.clientX - this.previous.x, e.clientY - this.previous.y);
        this.previous = { x: e.clientX, y: e.clientY };
      },
      { signal },
    );
    const releaseOrbit = (e: PointerEvent) => {
      if (e.pointerId === this.orbitPointer) this.orbitPointer = null;
    };
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
      canvas.addEventListener(name, releaseOrbit, { signal });
    canvas.addEventListener(
      'wheel',
      (e) => {
        if (!this.paused) {
          e.preventDefault();
          callbacks.zoom(e.deltaY);
        }
      },
      { signal, passive: false },
    );
  }

  read(): DriveInput {
    if (this.paused || document.hidden) return { ...REST_INPUT };
    const key = (a: string, b: string) => Number(this.keys.has(a) || this.keys.has(b));
    return {
      throttle: clamp(key('KeyW', 'ArrowUp') - key('KeyS', 'ArrowDown') + this.touch.throttle),
      steer: clamp(key('KeyD', 'ArrowRight') - key('KeyA', 'ArrowLeft') + this.touch.steer),
      brake: this.keys.has('Space') || this.brakePointer !== null,
      boost: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
    };
  }

  clear() {
    this.keys.clear();
    this.touch = { ...REST_INPUT };
    this.stickPointer = this.brakePointer = this.orbitPointer = null;
    const knob = document.getElementById('joystick-knob');
    if (knob) knob.style.transform = '';
  }
  dispose() {
    this.abort.abort();
    this.clear();
  }
}
