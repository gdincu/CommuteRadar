import { describe, expect, it } from 'vitest';
import { parseTripsSummaryCsv } from '../utils/historyImport';
import { buildTripsSummaryCsv } from '../utils/historyExport';
import type { Trip } from '../types/trip';

function trip(overrides: Partial<Trip>): Trip {
  return {
    id: 'trip-1',
    schemaVersion: 1,
    mode: 'bike',
    startedAt: new Date('2026-09-12T08:13:18Z').toISOString(),
    status: 'completed',
    distanceMeters: 8400,
    durationMs: 28 * 60_000 + 42_000,
    averageSpeedMps: 4.89,
    samples: [],
    segments: [],
    checkpoints: [],
    sampleCount: 100,
    rejectedSampleCount: 0,
    ...overrides
  };
}

describe('parseTripsSummaryCsv', () => {
  it('rejects a file missing required columns', () => {
    const result = parseTripsSummaryCsv('"Foo","Bar"\n"1","2"');
    expect(result.trips).toHaveLength(0);
    expect(result.errors[0]).toContain('missing column');
  });

  it('reports an empty file as an error', () => {
    const result = parseTripsSummaryCsv('');
    expect(result.trips).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it('round-trips a CSV produced by buildTripsSummaryCsv', () => {
    const original = [trip({ mode: 'run', distanceMeters: 6100, durationMs: 34 * 60_000 + 20_000, averageSpeedMps: 2.96 })];
    const csv = buildTripsSummaryCsv(original, 'metric');

    const { trips, errors } = parseTripsSummaryCsv(csv);
    expect(errors).toHaveLength(0);
    expect(trips).toHaveLength(1);
    expect(trips[0].mode).toBe('run');
    expect(trips[0].startedAt).toBe(original[0].startedAt);
    expect(trips[0].durationMs).toBe(original[0].durationMs);
    // Distance/speed survive a lossy round-trip through display formatting,
    // so allow for the rounding introduced by toFixed(2)/toFixed(1) on export.
    expect(trips[0].distanceMeters).toBeCloseTo(original[0].distanceMeters, -1);
    expect(trips[0].averageSpeedMps).toBeCloseTo(original[0].averageSpeedMps!, 1);
  });

  it('reconstructs trips as empty-route summaries (no samples/segments/checkpoints)', () => {
    const csv = buildTripsSummaryCsv([trip({})], 'metric');
    const { trips } = parseTripsSummaryCsv(csv);
    expect(trips[0].samples).toEqual([]);
    expect(trips[0].segments).toEqual([]);
    expect(trips[0].checkpoints).toEqual([]);
    expect(trips[0].status).toBe('completed');
  });

  it('parses imperial units correctly', () => {
    const csv = buildTripsSummaryCsv([trip({})], 'imperial');
    const { trips, errors } = parseTripsSummaryCsv(csv);
    expect(errors).toHaveLength(0);
    // 8400m in the original — imperial round-trip should land close to that.
    expect(trips[0].distanceMeters).toBeCloseTo(8400, -2);
  });

  it('skips a row with an unparseable duration but still imports valid rows', () => {
    const csv = [
      '"Date","Start datetime","Sport","Distance","Duration","Avg speed"',
      '"9/12/2026","2026-09-12T08:13:18.000Z","Cycling","8.40 km","not-a-duration","17.6 km/h"',
      '"9/12/2026","2026-09-12T09:00:00.000Z","Running","5.00 km","25:00","12.0 km/h"'
    ].join('\n');

    const { trips, errors } = parseTripsSummaryCsv(csv);
    expect(trips).toHaveLength(1);
    expect(trips[0].mode).toBe('run');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Row 2');
  });

  it('falls back to "other" for an unrecognized sport label', () => {
    const csv = [
      '"Date","Start datetime","Sport","Distance","Duration","Avg speed"',
      '"9/12/2026","2026-09-12T08:13:18.000Z","Skateboarding","3.00 km","15:00","12.0 km/h"'
    ].join('\n');
    const { trips } = parseTripsSummaryCsv(csv);
    expect(trips[0].mode).toBe('other');
  });
});
