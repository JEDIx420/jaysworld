import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..'),
  output = resolve(root, 'qa');
const shard = process.env.JAYSWORLD_QA_SHARD ?? '1/1',
  shardMatch = /^(\d+)\/(\d+)$/.exec(shard),
  shardNumber = Number(shardMatch?.[1]),
  shardCount = Number(shardMatch?.[2]);
if (
  !shardMatch ||
  !Number.isSafeInteger(shardNumber) ||
  !Number.isSafeInteger(shardCount) ||
  shardNumber < 1 ||
  shardCount < 1 ||
  shardNumber > shardCount
)
  throw new Error('JAYSWORLD_QA_SHARD must be a positive shard/count, such as 1/3.');
let scenarioNumber = 0;
const qaPort = 4172 + shardNumber;
await mkdir(output, { recursive: true });
const fileMode = process.env.JAYSWORLD_TEST_FILE === '1',
  external = process.env.JAYSWORLD_BASE_URL;
const base =
  external ??
  (fileMode
    ? pathToFileURL(resolve(root, 'dist/index.html')).href
    : 'http://127.0.0.1:' + qaPort + '/');
let server;
if (!fileMode && !external) {
  server = spawn(
    process.execPath,
    [
      resolve(root, 'node_modules/vite/bin/vite.js'),
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(qaPort),
      '--strictPort',
    ],
    { cwd: root, stdio: 'pipe' },
  );
  let serverLog = '';
  server.stdout.on('data', (chunk) => {
    serverLog += chunk;
  });
  server.stderr.on('data', (chunk) => {
    serverLog += chunk;
  });
  let healthy = false;
  for (let n = 0; n < 40; n++) {
    try {
      const response = await fetch(base);
      if (response.ok) {
        healthy = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  if (!healthy) {
    server.kill();
    throw new Error('Production preview did not become ready. ' + serverLog);
  }
}
const args = process.env.JAYSWORLD_CHROMIUM_PATH
  ? [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process',
      '--no-zygote',
      '--in-process-gpu',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      ...(fileMode ? ['--allow-file-access-from-files', '--disable-web-security'] : []),
    ]
  : ['--enable-unsafe-swiftshader'];
const results = [];
// A real PCM fixture verifies the browser's media lifecycle without broadcaster outages.
function testAudio() {
  const rate = 8000,
    // Longer than a full room tour on software-rendered CI.
    samples = rate * 600,
    body = Buffer.alloc(44 + samples * 2);
  body.write('RIFF', 0);
  body.writeUInt32LE(body.length - 8, 4);
  body.write('WAVEfmt ', 8);
  body.writeUInt32LE(16, 16);
  body.writeUInt16LE(1, 20);
  body.writeUInt16LE(1, 22);
  body.writeUInt32LE(rate, 24);
  body.writeUInt32LE(rate * 2, 28);
  body.writeUInt16LE(2, 32);
  body.writeUInt16LE(16, 34);
  body.write('data', 36);
  body.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    body.writeInt16LE(Math.round(Math.sin((i / rate) * 220 * Math.PI * 2) * 400), 44 + i * 2);
  return body;
}
const proxyValue =
  process.env.HTTPS_PROXY ??
  process.env.https_proxy ??
  process.env.HTTP_PROXY ??
  process.env.http_proxy;
let proxy;
if (proxyValue) {
  const url = new URL(proxyValue);
  proxy = {
    server: url.origin,
    bypass: '127.0.0.1,localhost',
    ...(url.username
      ? { username: decodeURIComponent(url.username), password: decodeURIComponent(url.password) }
      : {}),
  };
}
async function run(name, contextOptions, check) {
  if (scenarioNumber++ % shardCount !== shardNumber - 1) return;
  if (process.env.JAYSWORLD_QA_FILTER && !new RegExp(process.env.JAYSWORLD_QA_FILTER).test(name))
    return;
  let browser, page;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.JAYSWORLD_CHROMIUM_PATH,
      args,
      proxy,
    });
    const context = await browser.newContext({ ...contextOptions, ignoreHTTPSErrors: !!proxy });
    page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    if (process.env.JAYSWORLD_LIVE_RADIO !== '1')
      await page.route('https://cast1.my-control-panel.com/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'audio/wav',
          body: testAudio(),
          headers: { 'Access-Control-Allow-Origin': '*' },
        }),
      );
    await page.route('https://*.api.radio-browser.info/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
        headers: { 'Access-Control-Allow-Origin': '*' },
      }),
    );
    await check(page, context, errors);
    const diagnostics = await page.locator('#world').evaluate((c) => ({
      drawCalls: c.dataset.drawCalls,
      triangles: c.dataset.triangles,
      traffic: c.dataset.trafficActors,
      weather: c.dataset.weather,
      hour: c.dataset.hour,
    }));
    results.push({ test: name, status: 'pass', diagnostics });
    console.log('PASS ' + name);
  } catch (error) {
    if (page) {
      const namePart = name.replace(/[^a-z0-9]+/gi, '-').slice(0, 80);
      await writeFile(
        resolve(output, 'failure-' + namePart + '.json'),
        JSON.stringify(
          await page
            .evaluate(() => ({
              focus: document.activeElement?.outerHTML,
              dialogs: [...document.querySelectorAll('dialog')].map((d) => ({
                id: d.id,
                open: d.open,
                rect: d.getBoundingClientRect().toJSON(),
              })),
              view: document.getElementById('world')?.dataset.view,
            }))
            .catch(() => ({})),
          null,
          2,
        ),
      );
      await capture(page, 'failure-' + namePart + '.png').catch(() => {});
    }
    results.push({ test: name, status: 'fail', error: String(error) });
    console.error('FAIL ' + name + ': ' + error.stack);
    process.exitCode = 1;
  } finally {
    await browser?.close();
  }
}
// Hold only the world's render loop during still captures; Playwright's own
// animation frames, audio, and UI timers continue. Restore immediately afterward.
async function capture(page, name) {
  await page.evaluate(() => {
    const original = window.requestAnimationFrame;
    const held = [];
    window.__worldCapture = { original, held };
    window.requestAnimationFrame = (callback) => {
      if (String(callback).includes('dataset.zoom')) {
        held.push(callback);
        return 0;
      }
      return original.call(window, callback);
    };
  });
  try {
    await page.waitForTimeout(150);
    await page.screenshot({ path: resolve(output, name), timeout: 60000, animations: 'disabled' });
  } finally {
    await page.evaluate(() => {
      const { original, held } = window.__worldCapture;
      window.requestAnimationFrame = original;
      held.forEach((callback) => original.call(window, callback));
      delete window.__worldCapture;
    });
  }
}
async function ready(page, hash = '') {
  await page.goto(base + hash, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#world[data-rendered=true]', { timeout: 45000 });
  await page.waitForTimeout(300);
}
async function places(page) {
  await page.locator('#places-button').click();
  await page.waitForSelector('#places-dialog[open]');
}
async function visit(page, id) {
  await places(page);
  await page.locator('[data-place="' + id + '"]').click();
  await page.waitForSelector('#project-dialog[open]');
}
async function closeProject(page) {
  await page.getByRole('button', { name: 'Close project' }).click();
  await page.locator('#project-dialog').waitFor({ state: 'hidden' });
}

async function park(page, id) {
  await page.locator('#places-button').click();
  await page.locator('[data-visit="' + id + '"]').click();
  await page.waitForFunction(() => document.getElementById('world').dataset.view === 'storefront');
  await page.locator('#world').focus();
  await page.waitForTimeout(1000);
}
async function start(page) {
  await page.keyboard.press('Enter');
  await page.waitForSelector('body.started', { state: 'attached' });
}
async function clean(errors) {
  assert.deepEqual(
    errors.filter(
      (e) => !/(ERR_FAILED|ERR_ABORTED|ERR_CONNECTION|media|Failed to load resource)/i.test(e),
    ),
    [],
  );
}
try {
  await run(
    'desktop keyboard driving, brakes, Eagle Towers and roof',
    { viewport: { width: 1440, height: 900 } },
    async (page, context, errors) => {
      await ready(page);
      await capture(page, 'desktop.png');
      await start(page);
      assert.ok(Math.abs(Number(await page.locator('#world').getAttribute('data-x')) + 48) < 0.1);
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => document.getElementById('world').dataset.view === 'storefront',
      );
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.getElementById('world').dataset.view === 'roof');
      await page.waitForTimeout(2000);
      await capture(page, 'roof.png');
      const yaw = await page.locator('#world').getAttribute('data-yaw');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.getElementById('world').dataset.view === 'drive');
      const before = Number(await page.locator('#world').getAttribute('data-z'));
      await page.keyboard.down('w');
      await page.waitForFunction(
        (z) => Number(document.getElementById('world').dataset.z) < z - 2,
        before,
        { timeout: 25000 },
      );
      await page.keyboard.up('w');
      await page.keyboard.down('Space');
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.speed) < 0.7,
        undefined,
        { timeout: 20000 },
      );
      await page.keyboard.up('Space');
      await page.keyboard.press('m');
      const x = await page.locator('#world').getAttribute('data-x');
      await page.waitForTimeout(700);
      assert.equal(await page.locator('#world').getAttribute('data-x'), x);
      await page.keyboard.press('Escape');
      await page.keyboard.press('r');
      await page.waitForTimeout(500);
      await page.waitForFunction(
        () => Math.abs(Number(document.getElementById('world').dataset.x) + 48) < 0.1,
        undefined,
        { timeout: 15000 },
      );
      await clean(errors);
    },
  );
  await run(
    'seven short exhibits, keyboard instruments and beat restoration',
    { viewport: { width: 1280, height: 800 } },
    async (page, context, errors) => {
      await ready(page);
      await start(page);
      for (const id of ['about', 'eagle-eye', 'opsflash', 'rift', 'music', 'saltwater', 'space']) {
        await park(page, id);
        await page.keyboard.press('Enter');
        if (id === 'space' || id === 'saltwater') {
          await page.keyboard.press('Escape');
          await page.waitForSelector('#interaction-button:not([hidden])');
          await page.keyboard.press('Enter');
          await page.waitForFunction(
            () => document.getElementById('world').dataset.view === 'storefront',
          );
          await page.keyboard.press('ArrowRight');
          await page.keyboard.press('Enter');
        }
        await page.waitForSelector('#project-dialog[open]');
        await page.waitForFunction(
          () => document.getElementById('world').dataset.view === 'interior',
        );
        assert.equal(await page.locator('#project-dialog').getAttribute('data-venue'), id);
        assert.ok((await page.locator('.room-story p').textContent()).split(/\s+/).length < 20);
        assert.equal(await page.locator('#world').getAttribute('data-view'), 'interior');
        await page.waitForTimeout(600);
        await capture(page, 'room-' + id + '.png');
        if (id === 'eagle-eye' || id === 'opsflash') {
          await page.keyboard.press('ArrowRight');
          assert.equal(await page.locator('#project-dialog').getAttribute('data-page'), '1');
          if (id === 'opsflash') {
            await page.keyboard.press('ArrowRight');
            assert.equal(await page.locator('#project-title').textContent(), 'Just ask.');
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('#project-title').textContent(), 'Then take action.');
          }
        }
        if (id === 'rift') {
          await page.keyboard.press('Enter');
          assert.match(
            await page.locator('.reconciliation-tray output').textContent(),
            /0.01.*3 DIFFERENCES/,
          );
        }
        if (id === 'music') {
          await page.keyboard.press('ArrowRight');
          await page.keyboard.press('Enter');
          assert.equal(
            await page
              .getByRole('button', { name: 'kick, step 2', exact: true })
              .getAttribute('aria-pressed'),
            'true',
          );
          await page.keyboard.press('Space');
          await page.waitForSelector('.drum-machine[data-playing=true]');
          assert.equal(await page.locator('#radio-dialog').getAttribute('data-phase'), 'playing');
          const radioBefore = await page.evaluate(() => {
            const a = document.querySelector('audio');
            return { time: a.currentTime, volume: a.volume, ended: a.ended, duration: a.duration };
          });
          await page.waitForFunction(
            (time) => document.querySelector('audio')?.currentTime > time + 0.1,
            radioBefore.time,
            { timeout: 10000 },
          );
          const radioAfter = await page.evaluate(() => {
            const a = document.querySelector('audio');
            return { time: a.currentTime, volume: a.volume, ended: a.ended, duration: a.duration };
          });
          assert.ok(
            radioAfter.time > radioBefore.time,
            'radio keeps playing alongside beats: ' + JSON.stringify({ radioBefore, radioAfter }),
          );
          assert.equal(radioAfter.volume, radioBefore.volume, 'the studio does not duck the radio');
          await page.keyboard.press('q');
          await page.waitForSelector('#radio-dialog[open]');
          await page.keyboard.press('ArrowUp');
          assert.equal(await page.locator('.drum-machine').getAttribute('data-playing'), 'true');
          await page.keyboard.press('Escape');
          await page.waitForSelector('#radio-dialog:not([open])', { state: 'attached' });
          assert.equal(await page.locator('#project-dialog').getAttribute('open'), '');
          await capture(page, 'music.png');
          await page.keyboard.press('Space');
          await page.waitForSelector('.drum-machine[data-playing=false]');
        } else await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Escape');
        await page.waitForSelector('#project-dialog:not([open])', { state: 'attached' });
        await page.keyboard.press('Escape');
      }
      assert.equal(await page.locator('#visited-count').textContent(), '7 / 7');
      await clean(errors);
    },
  );
  await run(
    '390px touch driving, independent orbit, minimal HUD and music',
    { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 },
    async (page, context, errors) => {
      await ready(page);
      await page.locator('#start-driving').click();
      const box = await page.locator('#joystick').boundingBox(),
        session = await context.newCDPSession(page);
      const x = box.x + box.width / 2,
        y = box.y + box.height / 2,
        before = Number(await page.locator('#world').getAttribute('data-z'));
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ id: 1, x, y }],
      });
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ id: 1, x: x + 7, y: y - 37 }],
      });
      await page.waitForFunction(
        (z) => Number(document.getElementById('world').dataset.z) < z - 1,
        before,
        { timeout: 25000 },
      );
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { id: 1, x: x + 7, y: y - 37 },
          { id: 2, x: 230, y: 400 },
        ],
      });
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { id: 1, x: x + 7, y: y - 37 },
          { id: 2, x: 275, y: 420 },
        ],
      });
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      assert.equal(await page.locator('#joystick-knob').evaluate((e) => e.style.transform), '');
      await capture(page, 'mobile-riding.png');
      await park(page, 'music');
      await page.locator('[data-venue=act]').click();
      await page.waitForSelector('#project-dialog[open]');
      await capture(page, 'mobile-music.png');
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      const pads = await page.locator('.drum-pad:visible').count();
      assert.equal(pads, 12);
      await page.locator('.beat-bank').click();
      assert.equal(await page.locator('.drum-machine').getAttribute('data-bank'), '1');
      await clean(errors);
    },
  );
  await run(
    '320px and 430px layout, direct links and orientation change',
    { viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true },
    async (page, context, errors) => {
      await ready(page, '#rift');
      assert.equal(await page.locator('#project-title').textContent(), 'One paisa matters.');
      await page.reload();
      await page.waitForSelector('#project-dialog[open]', { timeout: 45000 });
      await page.keyboard.press('Escape');
      await page.locator('#start-driving').click();
      for (const size of [
        { width: 320, height: 640 },
        { width: 430, height: 932 },
        { width: 844, height: 390 },
      ]) {
        await page.setViewportSize(size);
        await page.waitForTimeout(400);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        await capture(page, 'layout-' + size.width + '.png');
      }
      await clean(errors);
    },
  );
  await run(
    'radio first gesture, real media, rapid seek, failure and power preference',
    { viewport: { width: 1100, height: 800 } },
    async (page, context, errors) => {
      let requests = 0;
      page.on('request', (r) => {
        if (/cast1.my-control/.test(r.url())) requests++;
      });
      await ready(page);
      assert.equal(requests, 0);
      await start(page);
      await page.waitForSelector('#radio-dialog[data-phase=playing]', {
        state: 'attached',
        timeout: 25000,
      });
      assert.equal(await page.locator('#world').getAttribute('data-sound'), 'on');
      await page.keyboard.press('q');
      await page.route('https://radio.digitalmalayali.in/**', (route) => route.abort('failed'));
      await page.keyboard.press('ArrowRight');
      await page.waitForSelector('#radio-dialog[data-phase=unavailable]', { timeout: 20000 });
      await page.route('https://icecast.octosignals.com/**', (route) =>
        route.fulfill({ status: 200, contentType: 'audio/wav', body: testAudio() }),
      );
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      await page.waitForSelector('#radio-dialog[data-phase=playing]', { timeout: 25000 });
      assert.equal(await page.locator('#radio-name').textContent(), 'Radio MACFAST 90.4');
      await capture(page, 'radio.png');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#radio-dialog').getAttribute('data-phase'), 'off');
      await page.keyboard.press('Escape');
      await page.reload();
      await page.waitForSelector('#world[data-ready=true]', { timeout: 45000 });
      await start(page);
      assert.equal(await page.locator('#radio-dialog').getAttribute('data-phase'), 'off');
      await clean(errors);
    },
  );
  await run(
    'crocodile stalking, catch, observer keys and hilltop stars',
    { viewport: { width: 1280, height: 800 } },
    async (page, context, errors) => {
      await ready(page);
      await start(page);
      await park(page, 'saltwater');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.getElementById('world').dataset.view === 'croc');
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => document.getElementById('view-detail').textContent.includes('Stalking'),
        undefined,
        { timeout: 20000 },
      );
      await capture(page, 'croc-stalk.png');
      await page.waitForFunction(
        () => document.getElementById('view-detail').textContent.includes('Catching'),
        undefined,
        { timeout: 45000 },
      );
      await capture(page, 'croc-catch.png');
      await page.keyboard.press('BracketRight');
      await page.waitForFunction(() => document.getElementById('world').dataset.croc === '1');
      await page.keyboard.press('Escape');
      await park(page, 'space');
      assert.ok(Number(await page.locator('#world').getAttribute('data-elevation')) > 20);
      await capture(page, 'observatory.png');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.getElementById('world').dataset.view === 'stars');
      await page.keyboard.press('Enter');
      assert.match(await page.locator('#view-title').textContent(), /Dipper/);
      const zoom = Number(await page.locator('#world').getAttribute('data-zoom'));
      await page.keyboard.press('Equal');
      await page.waitForTimeout(200);
      assert.ok(Number(await page.locator('#world').getAttribute('data-zoom')) < zoom);
      await capture(page, 'stars.png');
      await clean(errors);
    },
  );
  await run(
    'traffic moves, taxi offers, free roaming and saved wallet',
    { viewport: { width: 1360, height: 850 } },
    async (page, context, errors) => {
      await context.addInitScript(() =>
        localStorage.setItem(
          'jaysworld-duty-v1',
          JSON.stringify({ version: 1, wallet: 250, completed: 2, tea: 1, snacks: 0 }),
        ),
      );
      await ready(page);
      await start(page);
      assert.equal(await page.locator('#wallet').textContent(), '₹250');
      await page.keyboard.press('t');
      assert.equal(await page.locator('#fare-offers button').count(), 4);
      const before = JSON.parse(await page.locator('#world').getAttribute('data-traffic-actors'));
      await page.waitForFunction(
        (before) =>
          JSON.parse(document.getElementById('world').dataset.trafficActors).some(
            (a, i) => Math.hypot(a.x - before[i].x, a.z - before[i].z) > 3,
          ),
        before,
        { timeout: 45000 },
      );
      const progressed = JSON.parse(
        await page.locator('#world').getAttribute('data-traffic-actors'),
      );
      console.log(
        'TRAFFIC ' +
          JSON.stringify(
            progressed.map((a, i) => ({
              kind: a.kind,
              moved: Math.hypot(a.x - before[i].x, a.z - before[i].z).toFixed(2),
              speed: a.speed.toFixed(2),
            })),
          ),
      );
      await page.locator('#fare-offers button').nth(2).click();
      assert.equal(await page.locator('#fare-offers button[aria-pressed=true]').count(), 1);
      await page.keyboard.press('t');
      assert.equal(await page.locator('#fare-card').getAttribute('data-duty'), 'false');
      await park(page, 'about');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#wallet').textContent(), '₹240');
      await capture(page, 'tea.png');
      await clean(errors);
    },
  );
  await run(
    'day/night and rain remain visible with reduced motion',
    { viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' },
    async (page, context, errors) => {
      await ready(page);
      await start(page);
      await page.locator('#settings-button').click();
      await page.locator('#time-button').click();
      await page.locator('#time-button').click();
      await page.locator('#weather-button').click();
      await page.locator('#weather-button').click();
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () =>
          Number(document.getElementById('world').dataset.night) > 0.8 &&
          Number(document.getElementById('world').dataset.rain) > 0.7,
        undefined,
        { timeout: 45000 },
      );
      assert.ok(
        Number(await page.locator('#world').getAttribute('data-upright')) > 0.9,
        'parked auto stays upright beside traffic',
      );
      await capture(page, 'rain-night.png');
      await page.locator('#settings-button').click();
      await page.locator('#time-button').click();
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.night) < 0.2,
        undefined,
        { timeout: 45000 },
      );
      await capture(page, 'rain-day.png');
      await clean(errors);
    },
  );
  await run(
    'slow radio keeps static until playback and times out a missing signal',
    { viewport: { width: 1000, height: 700 } },
    async (page, context, errors) => {
      let releaseSignal;
      const signalGate = new Promise((resolve) => {
        releaseSignal = resolve;
      });
      await page.route('https://cast1.my-control-panel.com/**', async (route) => {
        await signalGate;
        await route
          .fulfill({ status: 200, contentType: 'audio/wav', body: testAudio() })
          .catch(() => {});
      });
      await ready(page);
      await start(page);
      await page.waitForSelector('#radio-dialog[data-phase=tuning]', { state: 'attached' });
      await page.waitForTimeout(300);
      releaseSignal();
      await page.waitForSelector('#radio-dialog[data-phase=playing]', {
        state: 'attached',
        timeout: 20000,
      });
      await page.keyboard.press('q');
      await page.route('https://radio.digitalmalayali.in/**', async (route) => {
        await new Promise((r) => setTimeout(r, 18000));
        await route.abort('failed').catch(() => {});
      });
      await page.keyboard.press('ArrowRight');
      await page.waitForSelector('#radio-dialog[data-phase=tuning]', { state: 'attached' });
      await page.waitForSelector('#radio-dialog[data-phase=unavailable]', { timeout: 17000 });
      assert.match(await page.locator('#radio-status').textContent(), /NO SIGNAL/);
      await clean(errors);
    },
  );
  await run(
    'WebGL fallback retains all public links and readable projects',
    { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    async (page, context) => {
      await context.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === 'webgl' || type === 'webgl2' ? null : original.call(this, type, ...args);
        };
      });
      await page.goto(base);
      await page.waitForSelector('#places-dialog[open]', { timeout: 30000 });
      assert.equal(await page.locator('.place-row').count(), 7);
      await page.locator('[data-place=eagle-eye]').click();
      assert.equal(await page.locator('#project-title').textContent(), 'Useful AI. Real work.');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      assert.ok((await page.locator('.retro-links a').count()) > 0);
    },
  );
  await run(
    'passenger pickup after clicking a fare offer and mobile pickup control',
    { viewport: { width: 1280, height: 800 } },
    async (page, context, errors) => {
      await ready(page);
      await start(page);
      await page.locator('#taxi-toggle').click();
      await page.locator('#fare-offers button').filter({ hasText: 'Meera' }).click();
      await page.waitForSelector('#interaction-button:not([hidden])');
      assert.match(await page.locator('#interaction-label').textContent(), /Pick up Meera/);
      // Enter after a pointer-selected offer must board, not re-activate the HUD button.
      await page.keyboard.press('Enter');
      await page.waitForSelector('#fare-card[data-onboard=true]');
      assert.match(await page.locator('#fare-title').textContent(), /Meera →/);
      assert.equal(await page.locator('#wallet').textContent(), '₹0');
      await capture(page, 'passenger-boarded.png');
      await page.keyboard.press('t');
      await page.keyboard.press('t');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator('#interaction-button').click();
      await page.waitForSelector('#fare-card[data-onboard=true]');
      assert.match(await page.locator('#fare-title').textContent(), /Meera →/);
      await clean(errors);
    },
  );
  await run(
    'map arrow previews, phone office slides and observable return to the auto',
    { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    async (page, context, errors) => {
      await ready(page);
      await start(page);
      await page.keyboard.press('m');
      await page.keyboard.press('Home');
      assert.equal(await page.locator('#map-preview').getAttribute('data-venue'), 'about');
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#map-preview').getAttribute('data-venue'), 'eagle-eye');
      assert.match(await page.locator('#map-preview-copy').textContent(), /rooftop/);
      await capture(page, 'mobile-map-preview.png');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#places-dialog:not([open])', { state: 'attached' });
      assert.equal(await page.locator('#navigation-destination').textContent(), 'Eagle Towers');
      for (const id of ['eagle-eye', 'opsflash', 'about', 'space', 'saltwater']) {
        await visit(page, id);
        await page.waitForFunction(
          () => document.getElementById('world').dataset.view === 'interior',
        );
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(250);
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        const exit = await page.locator('.room-exit').boundingBox();
        assert.ok(exit.x >= 0 && exit.y >= 0 && exit.width >= 44);
        await capture(page, 'mobile-room-' + id + '.png');
        await page.keyboard.press('Escape');
        await page.waitForSelector('#project-dialog:not([open])', { state: 'attached' });
        if ((await page.locator('#world').getAttribute('data-view')) !== 'drive')
          await page.keyboard.press('Escape');
      }
      await clean(errors);
    },
  );
  await run(
    'classic blues and rock seeking cancel stale stations without duplicate media',
    { viewport: { width: 960, height: 700 } },
    async (page, context, errors) => {
      await page.route('https://listen.181fm.com/**', (route) =>
        route.fulfill({ status: 200, contentType: 'audio/wav', body: testAudio() }),
      );
      await ready(page);
      await start(page);
      await page.keyboard.press('q');
      await page.keyboard.press('ArrowLeft');
      await page.waitForSelector('#radio-dialog[data-phase=playing]', { state: 'attached' });
      assert.match(await page.locator('#radio-name').textContent(), /The Eagle/);
      await page.keyboard.press('ArrowLeft');
      await page.waitForSelector('#radio-dialog[data-phase=playing]', { state: 'attached' });
      assert.match(await page.locator('#radio-name').textContent(), /True Blues/);
      assert.equal(await page.locator('audio').count(), 1);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      await page.waitForSelector('#radio-dialog[data-phase=playing]', { state: 'attached' });
      assert.match(await page.locator('#radio-name').textContent(), /True Blues/);
      await clean(errors);
    },
  );
} finally {
  server?.kill();
  await writeFile(
    resolve(
      output,
      shardCount > 1
        ? `browser-shard-${shardNumber}-results.json`
        : process.env.JAYSWORLD_QA_FILTER
          ? 'browser-focused-results.json'
          : 'browser-results.json',
    ),
    JSON.stringify(
      { base, shard, liveRadio: process.env.JAYSWORLD_LIVE_RADIO === '1', results },
      null,
      2,
    ),
  );
}
if (!results.length) {
  console.error('No browser journeys selected; check the shard and optional filter.');
  process.exitCode = 1;
}
if (results.some((r) => r.status === 'fail')) process.exitCode = 1;
