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
function testAudio(seconds = 600) {
  const rate = 8000,
    // Longer than a full room tour on software-rendered CI.
    samples = rate * seconds,
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
      await page.route(/https:\/\/(?:cast1\.my-control-panel\.com|listen\.181fm\.com)\//, (route) =>
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
              radio: {
                phase: document.getElementById('radio-dialog')?.dataset.phase,
                status: document.getElementById('radio-status')?.textContent,
                media: [...document.querySelectorAll('audio')].map((a) => ({
                  station: a.dataset.station,
                  paused: a.paused,
                  time: a.currentTime,
                  ready: a.readyState,
                  network: a.networkState,
                  error: a.error?.code,
                })),
              },
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
  const dismiss = page.locator('#toast .toast-close');
  if (await dismiss.isVisible()) {
    try {
      await dismiss.click({ timeout: 18000 });
    } catch (error) {
      // A timed notification can expire between visibility and pointer dispatch on a slow runner.
      // Only accept its disappearance; a still-visible or otherwise broken control must fail.
      if (error.name !== 'TimeoutError' || (await dismiss.isVisible())) throw error;
    }
  }
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
      assert.ok(Math.abs(Number(await page.locator('#world').getAttribute('data-x')) + 56.5) < 0.1);
      assert.equal(await page.locator('#world').getAttribute('data-view'), 'drive');
      assert.equal(await page.locator('#project-dialog').evaluate((d) => d.open), false);
      await park(page, 'eagle-eye');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.getElementById('world').dataset.view === 'roof');
      await page.waitForTimeout(2000);
      await capture(page, 'roof.png');
      assert.equal(JSON.parse(await page.locator('#world').getAttribute('data-eagles')).length, 2);
      const yaw = Number(await page.locator('#world').getAttribute('data-look-yaw'));
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(
        (yaw) => Number(document.getElementById('world').dataset.lookYaw) < yaw - 0.1,
        yaw,
      );
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(
        (yaw) => Math.abs(Number(document.getElementById('world').dataset.lookYaw) - yaw) < 0.01,
        yaw,
      );
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
        () => Math.abs(Number(document.getElementById('world').dataset.x) + 56.5) < 0.1,
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
            assert.equal(await page.locator('#project-title').textContent(), 'Qualified leads.');
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('#project-title').textContent(), 'Revenue.');
          }
        }
        if (id === 'rift') {
          await page.keyboard.press('Enter');
          assert.match(await page.locator('.bank-result').textContent(), /3 DIFFERENCES.*0.01/);
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
            const a = document.querySelector('audio[data-station]');
            return { time: a.currentTime, volume: a.volume, ended: a.ended, duration: a.duration };
          });
          await page.waitForFunction(
            (time) => document.querySelector('audio[data-station]')?.currentTime > time + 0.1,
            radioBefore.time,
            { timeout: 10000 },
          );
          const radioAfter = await page.evaluate(() => {
            const a = document.querySelector('audio[data-station]');
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
    '390px touch driving, independent orbit, analog HUD and music',
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
      assert.equal(await page.locator('#world').getAttribute('data-view'), 'drive');
      assert.equal(await page.locator('#project-dialog').evaluate((d) => d.open), false);
      await page.reload();
      await page.waitForSelector('#world[data-rendered=true]', { timeout: 45000 });
      assert.equal(await page.locator('#world').getAttribute('data-view'), 'drive');
      await page.locator('#start-driving').click();
      await page.locator('#toast .toast-close').click();
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
      // Start this deliberate signal delay after the unrelated welcome interaction has settled.
      // First-gesture autoplay is covered separately by the radio lifecycle journey.
      await context.addInitScript(() => localStorage.setItem('jaysworld-radio-off', 'true'));
      const signalAudio = testAudio(60);
      let releaseSignal;
      const signalGate = new Promise((resolve) => {
        releaseSignal = resolve;
      });
      await page.route('https://cast1.my-control-panel.com/**', async (route) => {
        await signalGate;
        await route
          .fulfill({ status: 200, contentType: 'audio/wav', body: signalAudio })
          .catch(() => {});
      });
      await ready(page);
      await start(page);
      await page.keyboard.press('q');
      await page.keyboard.press('Enter');
      await page.waitForSelector('#radio-dialog[data-phase=tuning]', { state: 'attached' });
      await page.waitForTimeout(300);
      assert.match(await page.locator('#radio-status').textContent(), /SEEKING SIGNAL/);
      releaseSignal();
      await page.waitForSelector('#radio-dialog[data-phase=playing]', {
        state: 'attached',
        timeout: 20000,
      });
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
      // The road-first spawn is outside the pickup radius. Reach the actual studio stop.
      await park(page, 'eagle-eye');
      await page.keyboard.press('Escape');
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
        // Native dialog close dispatches asynchronously; wait for its resulting world view.
        await page.waitForFunction(
          () => document.getElementById('world').dataset.view !== 'interior',
        );
        if ((await page.locator('#world').getAttribute('data-view')) !== 'drive')
          await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.getElementById('world').dataset.view === 'drive');
        assert.equal(await page.locator('#settings-dialog').evaluate((d) => d.open), false);
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
      assert.equal(await page.locator('audio[data-station]').count(), 1);
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');
      await page.waitForSelector('#radio-dialog[data-phase=playing]', { state: 'attached' });
      assert.match(await page.locator('#radio-name').textContent(), /True Blues/);
      await clean(errors);
    },
  );
  await run(
    'road-first welcome, optional company journey and saved accomplishments',
    { viewport: { width: 1280, height: 800 } },
    async (page, context, errors) => {
      await ready(page, '#eagle-eye');
      assert.equal(await page.locator('#project-dialog').evaluate((d) => d.open), false);
      assert.equal(await page.locator('#world').getAttribute('data-view'), 'drive');
      await page.keyboard.press('Enter');
      await page.waitForSelector('body.started', { state: 'attached' });
      assert.match(await page.locator('#toast').textContent(), /Welcome to Jay/);
      const rect = await page.locator('#toast').boundingBox();
      assert.ok(Math.abs(rect.x + rect.width / 2 - 640) < 2, 'toast is centred');
      assert.equal(await page.locator('#toast .toast-choices button').count(), 3);
      await capture(page, 'journey-welcome.png');
      await page.getByRole('button', { name: 'Visit Eagle Eye', exact: true }).click();
      assert.match(await page.locator('#navigation-destination').textContent(), /Eagle Towers/);
      assert.equal(await page.locator('#world').getAttribute('data-view'), 'drive');
      await park(page, 'eagle-eye');
      await page.keyboard.press('Escape');
      await page.waitForSelector('#interaction-button:not([hidden])');
      await page.waitForFunction(() =>
        JSON.parse(document.getElementById('world').dataset.entryMarkers).some(
          (m) => m.name === 'entry-x:eagle-eye' && m.scale > 1.65,
        ),
      );
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => document.getElementById('world').dataset.view === 'storefront',
      );
      await page.keyboard.press('Enter');
      await page.waitForSelector('#project-dialog[open]');
      assert.ok(
        await page.evaluate(() =>
          JSON.parse(localStorage.getItem('jaysworld-journey-v1')).earned.includes('company'),
        ),
      );
      assert.match(await page.locator('#mission-route').textContent(), /rooftop/);
      await page.reload();
      await page.waitForSelector('#world[data-rendered=true]', { timeout: 45000 });
      assert.equal(await page.locator('#world').getAttribute('data-view'), 'drive');
      assert.equal(await page.locator('#project-dialog').evaluate((d) => d.open), false);
      await page.locator('#places-button').click();
      assert.equal(
        await page.locator('[data-accomplishment=company]').getAttribute('data-earned'),
        'true',
      );
      assert.equal(
        await page.locator('[data-accomplishment=first-road]').getAttribute('data-earned'),
        'false',
      );
      await clean(errors);
    },
  );
  await run(
    'radio keeps rendering every world frame and fare offer buttons stay stable',
    { viewport: { width: 1024, height: 700 } },
    async (page, context, errors) => {
      await ready(page);
      await start(page);
      await page.keyboard.press('t');
      await page.locator('#fare-offers button').first().focus();
      await page.evaluate(() => {
        window.__firstOffer = document.querySelector('#fare-offers button');
      });
      await page.waitForTimeout(1300);
      assert.ok(
        await page.evaluate(
          () => window.__firstOffer === document.querySelector('#fare-offers button'),
        ),
      );
      await page.locator('#radio-button').click();
      await page.waitForSelector('#radio-dialog[open]');
      const sample = () =>
        page.locator('#world').evaluate((c) => ({
          ticks: Number(c.dataset.frameTicks),
          rendered: Number(c.dataset.renderFrames),
        }));
      const before = await sample();
      await page.waitForTimeout(2100);
      const after = await sample();
      assert.ok(after.ticks > before.ticks + 3);
      assert.ok(
        after.rendered - before.rendered >= (after.ticks - before.ticks) * 0.95,
        'radio must not throttle the world to three frames per second',
      );
      assert.equal(
        await page
          .locator('#radio-dialog')
          .evaluate((d) => getComputedStyle(d, '::backdrop').backdropFilter),
        'none',
      );
      await capture(page, 'radio-live-backdrop.png');
      await clean(errors);
    },
  );
  await run(
    'phone instruments do not overlap; touch boost and rotation release controls',
    { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    async (page, context, errors) => {
      await ready(page);
      await start(page);
      for (const size of [
        { width: 320, height: 640 },
        { width: 430, height: 932 },
        { width: 844, height: 390 },
      ]) {
        await page.setViewportSize(size);
        await page.waitForTimeout(300);
        const geometry = await page.evaluate(() => {
          const rect = (id) => document.getElementById(id).getBoundingClientRect().toJSON();
          return {
            map: rect('minimap-button'),
            dial: rect('speedometer'),
            boost: rect('boost-button'),
            fare: rect('fare-card'),
            logo: document.querySelector('.identity').getBoundingClientRect().toJSON(),
          };
        });
        const overlaps = (a, b) =>
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
          Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        assert.equal(overlaps(geometry.map, geometry.boost), false);
        assert.equal(overlaps(geometry.dial, geometry.boost), false);
        assert.equal(overlaps(geometry.logo, geometry.fare), false);
        assert.ok(geometry.dial.bottom <= geometry.map.top + 1);
        assert.ok(geometry.map.right <= size.width && geometry.map.bottom <= size.height);
        await capture(page, 'instruments-' + size.width + '.png');
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      const stick = await page.locator('#joystick').boundingBox(),
        boost = await page.locator('#boost-button').boundingBox();
      const session = await context.newCDPSession(page);
      const finger = { id: 1, x: stick.x + stick.width / 2, y: stick.y + stick.height / 2 - 35 };
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          finger,
          { id: 2, x: boost.x + boost.width / 2, y: boost.y + boost.height / 2 },
        ],
      });
      await page.waitForFunction(
        () =>
          document.getElementById('world').dataset.boost === 'true' &&
          Number(document.getElementById('world').dataset.wheelie) > 0.05,
      );
      await capture(page, 'phone-boost.png');
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await page.waitForFunction(
        () =>
          document.getElementById('world').dataset.boost === 'false' &&
          Number(document.getElementById('world').dataset.wheelie) === 0,
      );
      assert.equal(await page.locator('#joystick-knob').evaluate((e) => e.style.transform), '');
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [finger] });
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForFunction(
        () => document.getElementById('joystick-knob').style.transform === '',
        undefined,
        { timeout: 5000 },
      );
      assert.equal(await page.locator('#joystick-knob').evaluate((e) => e.style.transform), '');
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await clean(errors);
    },
  );
  await run(
    'observatory driveway can be driven out and back through the actual guardrail opening',
    { viewport: { width: 1280, height: 800 } },
    async (page, context, errors) => {
      await ready(page);
      await start(page);
      await park(page, 'space');
      await page.keyboard.press('Escape');
      await page.keyboard.down('w');
      await page.keyboard.down('a');
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.yaw) > 0.46,
        undefined,
        { timeout: 20000 },
      );
      await page.keyboard.up('a');
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.z) < -212,
        undefined,
        { timeout: 25000 },
      );
      await page.keyboard.up('w');
      await page.keyboard.down('Space');
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.speed) < 0.3,
        undefined,
        { timeout: 15000 },
      );
      await page.keyboard.up('Space');
      assert.ok(Number(await page.locator('#world').getAttribute('data-x')) < 55);
      assert.ok(Number(await page.locator('#world').getAttribute('data-elevation')) > 20);
      await capture(page, 'observatory-driveway.png');
      await page.keyboard.down('s');
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.z) > -207,
        undefined,
        { timeout: 25000 },
      );
      await page.keyboard.up('s');
      await page.keyboard.down('Space');
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.speed) < 0.3,
        undefined,
        { timeout: 15000 },
      );
      await page.keyboard.up('Space');
      await page.waitForSelector('#interaction-button:not([hidden])');
      await page.keyboard.press('Enter');
      await page.waitForFunction(
        () => document.getElementById('world').dataset.view === 'storefront',
      );
      assert.match(await page.locator('#view-panel').textContent(), /Observatory/i);
      await clean(errors);
    },
  );
  await run(
    'traffic lane motion, police spacing and populated market',
    { viewport: { width: 1024, height: 700 } },
    async (page, context, errors) => {
      await ready(page);
      await start(page);
      const before = JSON.parse(await page.locator('#world').getAttribute('data-traffic-actors'));
      const time = Number(await page.locator('#world').getAttribute('data-signal-time'));
      await page.waitForFunction(
        (t) => Number(document.getElementById('world').dataset.signalTime) > t + 8,
        time,
        { timeout: 60000 },
      );
      const actors = JSON.parse(await page.locator('#world').getAttribute('data-traffic-actors'));
      assert.ok(actors.every((a) => a.recoveries === 0));
      assert.ok(actors.filter((a, i) => a.odometer > before[i].odometer + 2).length >= 6);
      const police = JSON.parse(await page.locator('#world').getAttribute('data-police'));
      assert.equal(police.length, 15);
      police.forEach((p, i) =>
        assert.ok(police.slice(0, i).every((o) => Math.hypot(p.x - o.x, p.z - o.z) >= 1.55)),
      );
      assert.ok(Number(await page.locator('#world').getAttribute('data-market-residents')) >= 14);
      await capture(page, 'traffic-lanes.png');
      await clean(errors);
    },
  );
  await run(
    'computer centre and high command on portrait and landscape phones',
    { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    async (page, context, errors) => {
      await ready(page);
      await start(page);
      for (const size of [
        { width: 320, height: 568 },
        { width: 430, height: 932 },
        { width: 852, height: 393 },
      ]) {
        await page.setViewportSize(size);
        for (const id of ['rift', 'opsflash']) {
          await visit(page, id);
          const screen = page.locator(id === 'rift' ? '.bank-terminal' : '.command-console');
          const box = await screen.boundingBox();
          assert.ok(box.x >= 0 && box.x + box.width <= size.width + 1);
          const frames = id === 'rift' ? 5 : 4;
          for (let i = 0; i < frames; i++) {
            if (i) await page.keyboard.press('ArrowRight');
            assert.equal(
              await page.locator('#project-dialog').getAttribute('data-page'),
              String(i),
            );
            assert.ok(await screen.isVisible());
            const bounds = await screen.boundingBox(),
              story = await page.locator('.room-story').boundingBox();
            if (size.height > size.width)
              assert.ok(
                bounds.y + bounds.height <= story.y + 2,
                'instrument does not overlap its story',
              );
            assert.equal(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
              true,
            );
            if (id === 'rift' && i === 3)
              assert.match(await page.locator('.bank-result').textContent(), /RESIDUAL ₹0.00/);
            if (id === 'opsflash') {
              assert.equal(await page.locator('.map-signal').count(), 5);
              const layer = page.locator(`[data-layer="${i}"]`);
              assert.equal(await layer.getAttribute('aria-pressed'), 'true');
              const demo = await page.locator('.command-console > footer').boundingBox();
              assert.ok(
                demo.y + demo.height <= bounds.y + bounds.height + 1,
                'demo label stays inside the command console',
              );
              const buttonBox = await layer.boundingBox();
              assert.ok(
                buttonBox.y + buttonBox.height <= size.height - 60,
                'map layer controls stay above slide navigation',
              );
            }
          }
          if (id === 'opsflash') {
            await page.locator('[data-layer="0"]').tap();
            assert.equal(await page.locator('#project-dialog').getAttribute('data-page'), '0');
          }
          await capture(page, `${id}-${size.width}x${size.height}.png`);
          await closeProject(page);
        }
      }
      await clean(errors);
    },
  );
  await run(
    'sportsbike keys, persistent unlock, dedicated HUD and desktop riding',
    { viewport: { width: 1280, height: 800 } },
    async (page, context, errors) => {
      await context.addInitScript(() => {
        if (!localStorage.getItem('jaysworld-journey-v1'))
          localStorage.setItem(
            'jaysworld-journey-v1',
            JSON.stringify({
              version: 1,
              trail: 'company',
              bikeKeys: false,
              visits: ['about', 'eagle-eye', 'opsflash', 'rift', 'music', 'saltwater', 'space'],
              earned: [
                'first-road',
                'company',
                'fare',
                'beat',
                'roof',
                'wetland',
                'stars',
                'explorer',
              ],
            }),
          );
      });
      await ready(page);
      await start(page);
      assert.equal(await page.locator('#world').getAttribute('data-bike-unlocked'), 'false');
      await park(page, 'eagle-eye');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#world').getAttribute('data-vehicle'), 'auto');
      await park(page, 'space');
      await page.waitForSelector('#bike-keys-dialog[open]');
      await capture(page, 'rr310-keys.png');
      await page.locator('#bike-reward-route').click();
      assert.match(await page.locator('#navigation-destination').textContent(), /Eagle Towers/);
      assert.equal(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('jaysworld-journey-v1')).bikeKeys,
        ),
        true,
      );
      await park(page, 'eagle-eye');
      await page.keyboard.press('Escape');
      await page.locator('#interaction-button').click();
      await page.waitForFunction(() => document.getElementById('world').dataset.vehicle === 'bike');
      assert.equal(await page.locator('#fare-card').isVisible(), false);
      assert.equal(await page.locator('#speedometer').isVisible(), false);
      assert.equal(await page.locator('#bike-hud').isVisible(), true);
      await page.waitForFunction(() => {
        const world = document.getElementById('world');
        return (
          Number(world.dataset.speed) < 0.1 &&
          Number(world.dataset.bikeRightFoot) > 0.99 &&
          Number(world.dataset.upright) > 0.999
        );
      });
      await capture(page, 'rr310-mounted.png');
      await page.mouse.move(400, 240);
      await page.mouse.down();
      await page.mouse.move(1040, 240, { steps: 12 });
      await page.mouse.up();
      await page.mouse.wheel(0, -400);
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.zoom) < 4,
        undefined,
        { timeout: 15000 },
      );
      await page.waitForTimeout(1200);
      await capture(page, 'rr310-close-detail.png');
      await page.mouse.move(1000, 240);
      await page.mouse.down();
      await page.mouse.move(360, 240, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(1200);
      await capture(page, 'rr310-tail-detail.png');
      await page.locator('#settings-button').click();
      await page.locator('#camera-close').click();
      await page.locator('#world').focus();
      await page.keyboard.down('w');
      await page.keyboard.down('Shift');
      await page.waitForFunction(
        () =>
          Number(document.getElementById('world').dataset.speed) > 2 &&
          Number(document.getElementById('world').dataset.wheelie) > 0.05,
        undefined,
        { timeout: 15000 },
      );
      assert.ok(Number(await page.locator('#bike-speed').textContent()) > 0);
      await capture(page, 'rr310-wheelie.png');
      await page.keyboard.up('Shift');
      await page.keyboard.up('w');
      await page.keyboard.down('Space');
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.speed) < 0.4,
        undefined,
        { timeout: 15000 },
      );
      await page.keyboard.up('Space');
      await page.keyboard.press('r');
      await page.waitForFunction(
        () => Math.abs(Number(document.getElementById('world').dataset.x) + 49.2) < 0.8,
      );
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.bikeRightFoot) > 0.99,
      );
      // Exercise both directions from the same bay, including the formerly unstable east/west heading.
      for (const [key, direction] of [
        ['d', -1],
        ['a', 1],
      ]) {
        await page.keyboard.press('r');
        await page.waitForTimeout(800);
        const heading = Number(await page.locator('#world').getAttribute('data-bike-heading'));
        await page.keyboard.down('w');
        await page.keyboard.down(key);
        await page.waitForFunction(
          ({ heading, direction }) => {
            const world = document.getElementById('world');
            const change = Math.atan2(
              Math.sin(Number(world.dataset.bikeHeading) - heading),
              Math.cos(Number(world.dataset.bikeHeading) - heading),
            );
            return (
              change * direction > 0.18 &&
              Number(world.dataset.speed) > 1 &&
              Number(world.dataset.bikeRightFoot) < 0.1
            );
          },
          { heading, direction },
          { timeout: 20000 },
        );
        assert.ok(Number(await page.locator('#world').getAttribute('data-upright')) > 0.999);
        assert.ok(
          Number(await page.locator('#world').getAttribute('data-bike-lean')) * direction > 0,
        );
        await capture(page, `rr310-turn-${key}.png`);
        await page.keyboard.up(key);
        await page.keyboard.up('w');
        await page.keyboard.down('Space');
        await page.waitForFunction(
          () => Number(document.getElementById('world').dataset.speed) < 0.1,
          undefined,
          { timeout: 15000 },
        );
        await page.keyboard.up('Space');
        await page.waitForFunction(
          () => Number(document.getElementById('world').dataset.bikeRightFoot) > 0.99,
        );
      }
      await page.keyboard.press('r');
      await page.waitForTimeout(1000);
      await page.locator('#toast').waitFor({ state: 'hidden', timeout: 20000 });
      await capture(page, 'rr310-stopped-right-foot.png');
      await page.locator('#bike-return-button').click();
      await page.waitForFunction(() => document.getElementById('world').dataset.vehicle === 'auto');
      assert.equal(await page.locator('#bike-hud').isVisible(), false);
      assert.equal(await page.locator('#fare-card').isVisible(), true);
      await page.reload();
      await page.waitForSelector('#world[data-rendered=true]', { timeout: 45000 });
      assert.equal(await page.locator('#world').getAttribute('data-bike-unlocked'), 'true');
      assert.equal(await page.locator('#bike-keys-dialog').evaluate((d) => d.open), false);
      await clean(errors);
    },
  );
  await run(
    'sportsbike TFT and touch controls on portrait and landscape phones',
    { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    async (page, context, errors) => {
      await context.addInitScript(() =>
        localStorage.setItem(
          'jaysworld-journey-v1',
          JSON.stringify({
            version: 1,
            bikeKeys: true,
            visits: ['about', 'eagle-eye', 'opsflash', 'rift', 'music', 'saltwater', 'space'],
            earned: [
              'first-road',
              'company',
              'fare',
              'beat',
              'roof',
              'wetland',
              'stars',
              'explorer',
            ],
          }),
        ),
      );
      await ready(page);
      await start(page);
      await park(page, 'eagle-eye');
      await page.keyboard.press('Escape');
      await page.locator('#interaction-button').click();
      await page.waitForFunction(() => document.getElementById('world').dataset.vehicle === 'bike');
      for (const size of [
        { width: 320, height: 640 },
        { width: 430, height: 932 },
        { width: 844, height: 390 },
      ]) {
        await page.setViewportSize(size);
        await page.waitForTimeout(300);
        const hud = await page.locator('#bike-hud').boundingBox(),
          map = await page.locator('#minimap-button').boundingBox();
        const boost = await page.locator('#boost-button').boundingBox();
        const overlaps = (a, b) =>
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1;
        assert.ok(
          hud.x >= 0 &&
            hud.y >= 0 &&
            hud.x + hud.width <= size.width + 1 &&
            hud.y + hud.height <= size.height + 1,
          'TFT fits viewport',
        );
        assert.equal(overlaps(hud, map), false, 'TFT and map stay separate');
        assert.equal(overlaps(hud, boost), false, 'TFT and boost stay separate');
        assert.equal(await page.locator('#fare-card').isVisible(), false);
        await capture(page, 'rr310-phone-' + size.width + '.png');
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      const stick = await page.locator('#joystick').boundingBox(),
        boost = await page.locator('#boost-button').boundingBox();
      const session = await context.newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { id: 1, x: stick.x + stick.width / 2, y: stick.y + stick.height / 2 - 35 },
          { id: 2, x: boost.x + boost.width / 2, y: boost.y + boost.height / 2 },
        ],
      });
      await page.waitForFunction(
        () =>
          document.getElementById('world').dataset.boost === 'true' &&
          Number(document.getElementById('world').dataset.speed) > 1,
        undefined,
        { timeout: 15000 },
      );
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await clean(errors);
    },
  );
  await run(
    'amphitheatre five-piece production and animated childrens grove park',
    { viewport: { width: 1440, height: 900 } },
    async (page, context, errors) => {
      await ready(page);
      await start(page);
      assert.equal(await page.locator('#world').getAttribute('data-band-members'), '5');
      await places(page);
      await page.locator('#landmark-concert').click();
      await page.waitForFunction(
        () => Math.abs(Number(document.getElementById('world').dataset.x) + 182) < 1,
      );
      await page.waitForFunction(
        () => document.getElementById('concert-audio').dataset.phase === 'playing',
        undefined,
        { timeout: 15000 },
      );
      const sound = await page.evaluate(() => {
        const concert = document.querySelector('audio[data-concert="classic-rock"]');
        const radio = document.querySelector('audio[data-station]');
        return {
          concert: { paused: concert.paused, muted: concert.muted, volume: concert.volume },
          radioVolume: radio.volume,
        };
      });
      assert.equal(sound.concert.paused, false);
      assert.equal(sound.concert.muted, false);
      assert.ok(sound.concert.volume > 0.05);
      assert.equal(sound.radioVolume, 0, 'vehicle radio does not overlap the classic-rock concert');
      await page.waitForTimeout(1200);
      await capture(page, 'brickyard-day.png');
      await page.locator('#settings-button').click();
      await page.locator('#time-button').click();
      await page.locator('#time-button').click();
      await page.locator('#settings-dialog [data-close]').click();
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.night) > 0.6,
        undefined,
        { timeout: 15000 },
      );
      await capture(page, 'brickyard-night.png');
      await places(page);
      await page.locator('#landmark-park').click();
      await page.waitForFunction(
        () => Math.abs(Number(document.getElementById('world').dataset.x) + 177) < 1,
      );
      await page.locator('#settings-button').click();
      await page.locator('#time-button').click();
      await page.locator('#settings-dialog [data-close]').click();
      await page.waitForTimeout(1600);
      await capture(page, 'childrens-park.png');
      await park(page, 'eagle-eye');
      await page.waitForFunction(() => {
        const concert = document.querySelector('audio[data-concert="classic-rock"]');
        const radio = document.querySelector('audio[data-station]');
        return concert.paused && radio.volume > 0;
      });
      assert.equal(await page.locator('#world').getAttribute('data-bike-unlocked'), 'false');
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
