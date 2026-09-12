import { describe, expect, it } from 'vitest';
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

describe('buildTripsSummaryCsv', () => {
  it('includes a header row with the expected columns', () => {
    const csv = buildTripsSummaryCsv([], 'metric');
    expect(csv).toBe('"Date","Start datetime","Sport","Distance","Duration","Avg speed"');
  });

  it('emits one row per trip with formatted high-level metrics', () => {
    const csv = buildTripsSummaryCsv([trip({})], 'metric');
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"Cycling"');
    expect(lines[1]).toContain('"8.40 km"');
    expect(lines[1]).toContain('"28:42"');
    expect(lines[1]).toContain('km/h');
    expect(lines[1]).toContain('2026-09-12T08:13:18.000Z');
  });

  it('orders rows to match the input trip order', () => {
    const csv = buildTripsSummaryCsv(
      [trip({ id: 'a', mode: 'run' }), trip({ id: 'b', mode: 'walk' })],
      'metric'
    );
    const lines = csv.split('\n');
    expect(lines[1]).toContain('"Running"');
    expect(lines[2]).toContain('"Walking"');
  });

  it('switches distance/speed formatting to imperial units when requested', () => {
    const csv = buildTripsSummaryCsv([trip({})], 'imperial');
    expect(csv).toContain('mi"');
    expect(csv).toContain('mph"');
  });
});
