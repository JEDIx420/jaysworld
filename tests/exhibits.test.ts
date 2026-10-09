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
