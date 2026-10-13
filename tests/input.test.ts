import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Input, REST_INPUT } from '../src/input';

test('driving accepts the first key immediately after a menu closes between frames', () => {
  const descriptors = ['window', 'document'].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  class Node extends EventTarget {
    style = {};
    setPointerCapture() {}
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 100, height: 100 };
    }
  }
  const windowTarget = new EventTarget();
  const documentTarget = Object.assign(new EventTarget(), {
    hidden: false,
    getElementById: () => new Node(),
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: windowTarget });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: documentTarget });
  let menuOpen = true;
  const noop = () => {};
  const input = new Input(new Node() as unknown as HTMLCanvasElement, {
    interact: noop,
    places: noop,
    reset: noop,
    honk: noop,
    orbit: noop,
    zoom: noop,
    isPaused: () => menuOpen,
  });
  const key = (type: string, code: string) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, 'code', { value: code });
    windowTarget.dispatchEvent(event);
  };
  try {
    input.paused = true;
    key('keydown', 'KeyW');
    assert.deepEqual(input.read(), REST_INPUT, 'menu blocks driving');
    menuOpen = false; // The renderer has not updated its cached paused flag yet.
    key('keydown', 'KeyW');
    key('keydown', 'ShiftLeft');
    assert.equal(input.read().throttle, 1);
    assert.equal(input.read().boost, true);
    key('keyup', 'KeyW');
    key('keyup', 'ShiftLeft');
    assert.deepEqual(input.read(), REST_INPUT);
    menuOpen = true;
    key('keydown', 'KeyD');
    assert.deepEqual(input.read(), REST_INPUT);
  } finally {
    input.dispose();
    for (const [key, descriptor] of descriptors)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
  }
});
