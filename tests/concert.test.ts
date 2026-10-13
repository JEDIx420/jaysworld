import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConcertAudio } from '../src/concert-audio';

test('a stalled classic-rock connection times out even before reaching the stage', () => {
  const descriptors = ['Audio', 'document', 'window'].map(
    (key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const,
  );
  const pending = new Map<number, () => void>();
  let serial = 0;
  class Media extends EventTarget {
    static instances: Media[] = [];
    hidden = false;
    dataset = {};
    preload = '';
    volume = 0;
    muted = false;
    src = '';
    constructor() {
      super();
      Media.instances.push(this);
    }
    play() {
      return new Promise<void>(() => {});
    }
    pause() {}
    removeAttribute() {}
    load() {}
    remove() {}
  }
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: Media });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { hidden: false, body: { append() {} } },
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      setTimeout(callback: () => void) {
        const id = ++serial;
        pending.set(id, callback);
        return id;
      },
    },
  });
  const oldClear = globalThis.clearTimeout;
  globalThis.clearTimeout = ((id: number) => pending.delete(id)) as typeof clearTimeout;
  try {
    const panel = { hidden: true, dataset: {} } as unknown as HTMLElement;
    const button = { textContent: '', setAttribute() {} } as unknown as HTMLButtonElement;
    const concert = new ConcertAudio(panel, button);
    concert.unlock();
    concert.update(150, true);
    for (let attempt = 0; attempt < 2; attempt++) {
      const media = Media.instances[attempt];
      media.dispatchEvent(new Event('waiting'));
      assert.equal(pending.size, 1, 'loading still has a deadline outside the stage radius');
      const [id, callback] = [...pending][0];
      pending.delete(id);
      callback();
    }
    assert.match(Media.instances[1].src, /64k\.aac$/);
    concert.update(22, true);
    assert.equal(panel.dataset.phase, 'unavailable');
    assert.match(button.textContent!, /Retry/);
    concert.dispose();
    assert.equal(pending.size, 0);
  } finally {
    globalThis.clearTimeout = oldClear;
    for (const [key, descriptor] of descriptors)
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
  }
});
