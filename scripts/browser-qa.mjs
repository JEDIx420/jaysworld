import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(import.meta.dirname, '..'),
  output = resolve(root, 'qa');
await mkdir(output, { recursive: true });
const fileMode = process.env.JAYSWORLD_TEST_FILE === '1',
  external = process.env.JAYSWORLD_BASE_URL;
const base =
  external ??
  (fileMode ? pathToFileURL(resolve(root, 'dist/index.html')).href : 'http://127.0.0.1:4173/');
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
      '4173',
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
    samples = rate * 120,
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
  if (process.env.JAYSWORLD_QA_FILTER && !new RegExp(process.env.JAYSWORLD_QA_FILTER).test(name))
    return;
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.JAYSWORLD_CHROMIUM_PATH,
      args,
      proxy,
    });
    const context = await browser.newContext({ ...contextOptions, ignoreHTTPSErrors: !!proxy }),
      page = await context.newPage(),
      errors = [];
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
    results.push({ test: name, status: 'pass' });
    console.log('PASS ' + name);
  } catch (error) {
    results.push({ test: name, status: 'fail', error: String(error) });
    console.error('FAIL ' + name + ': ' + error);
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
  await page.waitForSelector('#world[data-rendered=true]', { timeout: 30000 });
  await page.waitForTimeout(300);
}
async function places(page) {
  await page.getByRole('button', { name: /^Places/ }).click();
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

try {
  await run(
    'desktop rendering, driving, braking, modal pause and reset',
    { viewport: { width: 1440, height: 900 } },
    async (page, context, errors) => {
      await ready(page);
      await capture(page, 'desktop.png');
      const before = Number(await page.locator('#world').getAttribute('data-z'));
      await page.keyboard.down('w');
      await page.waitForFunction(
        (z) => Number(document.getElementById('world').dataset.z) < z - 1,
        before,
        { timeout: 15000 },
      );
      await page.keyboard.up('w');
      const after = Number(await page.locator('#world').getAttribute('data-z'));
      assert.ok(after < before - 1, 'auto moves forward');
      await page.keyboard.down('Space');
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.speed) < 0.5,
        undefined,
        { timeout: 10000 },
      );
      await page.keyboard.up('Space');
      assert.ok(
        Number(await page.locator('#world').getAttribute('data-speed')) < 0.5,
        'brake stops the auto',
      );
      await page.keyboard.down('w');
      await page.waitForTimeout(250);
      await places(page);
      await page.keyboard.up('w');
      await page.waitForTimeout(200);
      const pausedX = await page.locator('#world').getAttribute('data-x');
      await page.waitForTimeout(400);
      assert.equal(
        await page.locator('#world').getAttribute('data-x'),
        pausedX,
        'reading pauses physics',
      );
      await page.getByRole('button', { name: 'Close places' }).click();
      await page.keyboard.press('r');
      await page.waitForTimeout(200);
      assert.ok(Math.abs(Number(await page.locator('#world').getAttribute('data-x')) + 51) < 0.04);
      assert.deepEqual(errors, []);
    },
  );
  await run(
    'all seven exhibits, exact reconciliation, beat sequencer and evening',
    { viewport: { width: 1280, height: 800 } },
    async (page, context, errors) => {
      await ready(page);
      const destinations = [
        ['about', 'Hello, I’m Jay.'],
        ['eagle-eye', 'Eagle Eye'],
        ['opsflash', 'OpsFlash'],
        ['rift', 'RIFT'],
        ['music', 'Music & Beats'],
        ['saltwater', 'SALTWATER'],
        ['space', 'The Quiet Between Stars'],
      ];
      for (const [id, title] of destinations) {
        await visit(page, id);
        assert.equal(await page.locator('#project-title').textContent(), title);
        if (id === 'rift' || id === 'music') await page.locator('[data-page="2"]').click();
        if (id === 'rift') {
          await page.getByRole('button', { name: 'Compare records' }).click();
          assert.match(
            await page.locator('.rift-result').textContent(),
            /1 changed.*1 missing.*1 new/,
          );
          assert.equal(await page.locator('.rift-table tr.changed').count(), 3);
        }
        if (id === 'music') {
          await page.getByRole('button', { name: 'Kick, step 2' }).click();
          assert.equal(
            await page.getByRole('button', { name: 'Kick, step 2' }).getAttribute('aria-pressed'),
            'true',
          );
          await page.getByRole('button', { name: 'Play beat' }).click();
          await page.getByRole('button', { name: 'Stop beat' }).waitFor();
          await page.waitForTimeout(450);
          assert.ok((await page.locator('.beat-row button.playing').count()) > 0);
          await capture(page, 'music.png');
          await page.getByRole('button', { name: 'Stop beat' }).click();
        }
        await closeProject(page);
      }
      assert.equal(await page.locator('#visited-count').textContent(), '7 / 7');
      await page.getByRole('button', { name: 'Settings and controls' }).click();
      await page.getByRole('button', { name: 'Golden hour', exact: true }).click();
      await page.getByRole('button', { name: 'Close settings' }).click();
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.night) > 0.9,
        undefined,
        { timeout: 45000 },
      );
      assert.ok(await page.locator('body.night').count());
      await capture(page, 'evening.png');
      assert.deepEqual(errors, []);
    },
  );
  await run(
    '390px touch driving, two-pointer orbit, cancellation and dialogs',
    { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 },
    async (page, context, errors) => {
      await ready(page);
      await capture(page, 'mobile.png');
      assert.equal(await page.locator('#quality-button').textContent(), 'Performance');
      await page.locator('#start-driving').click();
      const box = await page.locator('#joystick').boundingBox();
      assert.ok(box && box.width >= 90);
      const x = box.x + box.width / 2,
        y = box.y + box.height / 2,
        session = await context.newCDPSession(page),
        before = Number(await page.locator('#world').getAttribute('data-z'));
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ id: 1, x, y }],
      });
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ id: 1, x: x + 9, y: y - 36 }],
      });
      await page.waitForFunction(
        (z) => Number(document.getElementById('world').dataset.z) < z - 1,
        before,
        { timeout: 15000 },
      );
      assert.ok(
        Number(await page.locator('#world').getAttribute('data-z')) < before - 1,
        'touch drives the auto',
      );
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { id: 1, x: x + 9, y: y - 36 },
          { id: 2, x: 230, y: 430 },
        ],
      });
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { id: 1, x: x + 9, y: y - 36 },
          { id: 2, x: 280, y: 450 },
        ],
      });
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      assert.equal(await page.locator('#joystick-knob').evaluate((e) => e.style.transform), '');
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await visit(page, 'music');
      await capture(page, 'mobile-exhibit.png');
      assert.equal(await page.locator('#project-title').textContent(), 'Music & Beats');
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      assert.deepEqual(errors, []);
    },
  );
  await run(
    '320px layout and direct-link reload',
    { viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true },
    async (page, context, errors) => {
      await ready(page, '#rift');
      assert.equal(await page.locator('#project-title').textContent(), 'RIFT');
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await page.reload();
      await page.waitForSelector('#project-dialog[open]', { timeout: 30000 });
      assert.equal(await page.locator('#project-title').textContent(), 'RIFT');
      await closeProject(page);
      await places(page);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await capture(page, 'small-screen.png');
      assert.deepEqual(errors, []);
    },
  );
  await run(
    'radio starts with experience, station recovery, effects and stop',
    { viewport: { width: 1100, height: 800 } },
    async (page, context, errors) => {
      await page.route('https://*.api.radio-browser.info/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{}',
          headers: { 'Access-Control-Allow-Origin': '*' },
        }),
      );
      let initialRadioRequests = 0;
      page.on('request', (r) => {
        if (/cast1|digitalmalayali|octosignals|securenetsystems/.test(r.url()))
          initialRadioRequests++;
      });
      await ready(page);
      assert.equal(initialRadioRequests, 0, 'stream starts with the first experience gesture');
      await page.locator('#start-driving').click();
      await page.waitForFunction(
        () => document.getElementById('radio-now-name').textContent === 'Ente Radio 91.2',
      );
      assert.equal(await page.locator('#effects-controls').isEnabled(), true);
      assert.equal(await page.locator('#world').getAttribute('data-sound'), 'on');
      await page.getByRole('button', { name: 'Radio', exact: true }).click();
      await page.locator('#fx-preset').selectOption('dub');
      assert.equal(await page.locator('#fx-echo').inputValue(), '0.65');
      await page.route('https://radio.digitalmalayali.in/**', (route) => route.abort('failed'));
      await page.getByRole('button', { name: 'Play Radio Digital Malayali', exact: true }).click();
      await page.waitForFunction(
        () => document.getElementById('radio-status').textContent.includes('unavailable'),
        undefined,
        { timeout: 18000 },
      );
      await page.unroute('https://radio.digitalmalayali.in/**');
      if (process.env.JAYSWORLD_LIVE_RADIO !== '1')
        await page.route('https://icecast.octosignals.com/radiomacfast', (route) =>
          route.fulfill({ status: 200, contentType: 'audio/wav', body: testAudio() }),
        );
      try {
        await page.getByRole('button', { name: 'Play Radio MACFAST 90.4', exact: true }).click();
        await page.waitForFunction(
          () => document.getElementById('radio-status').textContent.startsWith('Live:'),
          undefined,
          { timeout: 20000 },
        );
        assert.equal(await page.locator('#radio-now').isVisible(), true);
        await capture(page, 'radio.png');
        await page.getByRole('button', { name: 'Stop Radio MACFAST 90.4', exact: true }).click();
        assert.match(await page.locator('#radio-status').textContent(), /Radio off/);
      } catch (error) {
        throw new Error(
          String(error) +
            '; player status: ' +
            (await page.locator('#radio-status').textContent()) +
            '; console: ' +
            errors.join(' | '),
        );
      }
      assert.deepEqual(
        errors.filter((e) => !e.includes('net::ERR_FAILED')),
        [],
      );
    },
  );
  await run(
    'storefront, newspaper paging, funded tea purchases, crocodiles and telescope',
    { viewport: { width: 1440, height: 900 } },
    async (page, context, errors) => {
      await page.addInitScript(() =>
        localStorage.setItem(
          'jaysworld-duty-v1',
          JSON.stringify({ version: 1, wallet: 50, completed: 1, tea: 0, snacks: 0 }),
        ),
      );
      await ready(page);
      await page.locator('#start-driving').click();
      await places(page);
      await page.locator('[data-visit="about"]').click();
      await page.waitForSelector('#world[data-view="storefront"]');
      await page.locator('[data-buy="tea"]').click();
      await page.locator('[data-buy="pazhampori"]').click();
      assert.equal(await page.locator('#wallet').textContent(), '₹25');
      const wallet = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('jaysworld-duty-v1')),
      );
      assert.equal(wallet.tea, 1);
      assert.equal(wallet.snacks, 1);
      await page.waitForTimeout(800);
      await capture(page, 'tea-storefront.png');
      await page.locator('#read-paper').click();
      assert.equal(await page.locator('#project-summary').isVisible(), true);
      await capture(page, 'newspaper.png');
      await page.locator('#paper-next').click();
      assert.equal(await page.locator('#project-summary').isVisible(), false);
      assert.equal(await page.locator('#project-details').isVisible(), true);
      await page.locator('#paper-next').click();
      assert.equal(await page.locator('#paper-page-number').textContent(), 'PAGE 3 / 3');
      assert.equal(await page.locator('#paper-next').isDisabled(), true);
      await closeProject(page);
      await page.locator('#view-back').click();
      await places(page);
      await page.locator('[data-visit="saltwater"]').click();
      await page.locator('#view-experience').click();
      await page.waitForSelector('#world[data-view="croc"]');
      const zoom = Number(await page.locator('#world').getAttribute('data-zoom'));
      await page.locator('#zoom-in').click();
      await page.waitForFunction(
        (z) => Number(document.getElementById('world').dataset.zoom) < z,
        zoom,
      );
      await page.locator('#croc-select').selectOption('1');
      await page.waitForSelector('#world[data-croc="1"]');
      await page.locator('#croc-hunt').click();
      await page.waitForFunction(
        () => document.getElementById('view-detail').textContent.includes('Catching a fish'),
        undefined,
        { timeout: 45000 },
      );
      await capture(page, 'crocodiles.png');
      await page.locator('#view-back').click();
      await places(page);
      await page.locator('[data-visit="space"]').click();
      await page.locator('#view-experience').click();
      await page.waitForSelector('#world[data-view="stars"]');
      await page.locator('[data-star="crux"]').click();
      assert.equal(await page.locator('#view-title').textContent(), 'The Southern Cross');
      await page.waitForFunction(
        () => Number(document.getElementById('world').dataset.night) > 0.9,
        undefined,
        { timeout: 45000 },
      );
      await capture(page, 'telescope.png');
      await page.locator('#zoom-in').click();
      await page.waitForFunction(() => Number(document.getElementById('world').dataset.zoom) < 34);
      await page.locator('#view-back').click();
      await page.waitForSelector('#world[data-view="drive"]');
      assert.deepEqual(errors, []);
    },
  );
  await run(
    'passenger pickup, cancellation, wallet protection and unfunded tea',
    { viewport: { width: 900, height: 700 } },
    async (page, context, errors) => {
      await ready(page);
      await page.locator('#start-driving').click();
      await page.locator('#fare-action').click();
      await page.waitForSelector('#fare-card[data-onboard="true"]');
      assert.match(await page.locator('#fare-description').textContent(), /passenger on board/);
      await places(page);
      await page.locator('[data-visit="about"]').click();
      assert.equal(await page.locator('#fare-card').getAttribute('data-onboard'), 'false');
      assert.equal(await page.locator('#wallet').textContent(), '₹0');
      await page.locator('[data-buy="tea"]').click();
      assert.equal(await page.locator('#wallet').textContent(), '₹0');
      assert.match(await page.locator('#toast').textContent(), /Take a passenger fare/);
      assert.deepEqual(errors, []);
    },
  );
  await run(
    'no-JavaScript public content',
    { javaScriptEnabled: false, viewport: { width: 900, height: 700 } },
    async (page) => {
      await page.goto(base);
      await page.getByRole('heading', { name: 'Jayanand — Jay' }).waitFor({ state: 'visible' });
      await page
        .getByRole('link', { name: 'Music & Beats', exact: true })
        .waitFor({ state: 'visible' });
      assert.equal(await page.locator('#loading').isVisible(), false);
    },
  );
  await run(
    'no-WebGL project navigation',
    { viewport: { width: 900, height: 700 } },
    async (page) => {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          return type === 'webgl' || type === 'webgl2' ? null : original.call(this, type, ...args);
        };
      });
      await page.goto(base);
      await page.waitForSelector('#places-dialog[open]', { timeout: 30000 });
      assert.equal(await page.locator('.place-row').count(), 7);
      await page.locator('[data-place="eagle-eye"]').click();
      assert.equal(await page.locator('#project-title').textContent(), 'Eagle Eye');
      await page.getByRole('link', { name: 'Talk about a project' }).waitFor({ state: 'visible' });
    },
  );
} finally {
  server?.kill();
  await writeFile(
    resolve(
      output,
      process.env.JAYSWORLD_QA_FILTER ? 'browser-focused-results.json' : 'browser-results.json',
    ),
    JSON.stringify({ base, liveRadio: process.env.JAYSWORLD_LIVE_RADIO === '1', results }, null, 2),
  );
}
if (results.some((r) => r.status === 'fail')) process.exitCode = 1;
