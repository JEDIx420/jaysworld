import test from 'node:test';
import assert from 'node:assert/strict';
import { exactCents, compareDemoRecords } from '../src/demos';
import { directoryStations, publicHttps, CURATED_STATIONS } from '../src/radio';

test('reconciliation example preserves a one-paisa difference beyond floating-point safe integers', () => {
  assert.equal(exactCents('9007199254740991.01'), 900719925474099101n);
  const rows = compareDemoRecords(
    [{ id: 'a', amount: '9007199254740991.01', status: 'ok' }],
    [{ id: 'a', amount: '9007199254740991.02', status: 'ok' }],
  );
  assert.equal(rows[0].state, 'changed');
  assert.equal(exactCents('-0.01'), -1n);
  assert.throws(() => exactCents('1e10'));
});
test('reconciliation distinguishes missing/new records and rejects duplicate keys', () => {
  const a = { id: 'a', amount: '1.00', status: 'ok' },
    b = { id: 'b', amount: '1.00', status: 'ok' };
  assert.deepEqual(
    compareDemoRecords([a], [b]).map((r) => r.state),
    ['missing', 'new'],
  );
  assert.throws(() => compareDemoRecords([a, a], [b]));
});
test('station discovery accepts supported Malayalam streams and filters unusable or private URLs', () => {
  const station = {
    name: 'Radio',
    url_resolved: 'https://radio.example.org/live.mp3',
    homepage: 'https://example.org',
    codec: 'MP3',
    lastcheckok: 1,
    language: 'malayalam',
  };
  const stations = directoryStations([
    station,
    station,
    { ...station, url_resolved: 'http://example.org/live' },
    { ...station, url_resolved: 'https://127.0.0.1/live' },
    { ...station, url_resolved: 'https://example.org/list.m3u8' },
    { ...station, url_resolved: 'https://example.org/english.mp3', language: 'english' },
    { ...station, url_resolved: 'https://example.org/off.mp3', lastcheckok: 0 },
  ]);
  assert.equal(stations.length, 1);
  assert.equal(directoryStations({}).length, 0);
  assert.equal(publicHttps('https://user:password@example.org'), false);
  assert.equal(publicHttps('https://192.168.1.3/live'), false);
  assert.ok(CURATED_STATIONS.every((s) => publicHttps(s.url) && publicHttps(s.homepage)));
});

test('the bank case explains three differences and balances both sides exactly in paisa', async () => {
  const { BANK_CASE, ADJUSTED_BANK, ADJUSTED_LEDGER } = await import('../src/bank-reconciliation');
  assert.equal(BANK_CASE.ledger, 1295075n);
  assert.equal(BANK_CASE.bank, 1162576n);
  assert.deepEqual(
    BANK_CASE.rows.filter((r) => r.state !== 'equal').map((r) => r.state),
    ['changed', 'missing', 'new'],
  );
  assert.equal(BANK_CASE.correction, 1n);
  assert.equal(ADJUSTED_BANK, 1282576n);
  assert.equal(ADJUSTED_BANK, ADJUSTED_LEDGER);
  const { bankScreen } = await import('../src/venue-screens');
  assert.match(bankScreen(3, true), /RESIDUAL ₹0.00/);
  assert.match(bankScreen(2, true), /deposit in transit|Deposit in transit/i);
});
test('each command-map layer uses the same regions and exposes fictional metrics accessibly', async () => {
  const { COMMAND_LAYERS, COMMAND_REGIONS, commandMapSvg } = await import('../src/command-map');
  const { commandScreen } = await import('../src/venue-screens');
  assert.deepEqual(
    COMMAND_LAYERS.map((l) => l.key),
    ['search', 'social', 'leads', 'revenue'],
  );
  COMMAND_LAYERS.forEach((layer, i) => {
    const svg = commandMapSvg(i),
      html = commandScreen(i);
    assert.match(html, /DEMO DATA/);
    assert.equal((svg.match(/data-region=/g) ?? []).length, 5);
    COMMAND_REGIONS.forEach((r) => {
      assert.ok(r[layer.key] > 0);
      assert.ok(html.includes(r.name));
    });
    assert.ok(svg.includes(layer.label));
  });
});
