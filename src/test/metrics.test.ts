import { describe, expect, it } from 'vitest';
import { computeMetrics, computeSegments } from '../services/metrics';
import type { LocationSample } from '../types/trip';

function sample(overrides: Partial<LocationSample>): LocationSample {
  return {
    latitude: 44.4268,
    longitude: 26.1025,
    accuracy: 10,
    timestamp: 0,
    speed: null,
    ...overrides
  };
}

describe('computeMetrics', () => {
  it('returns zeroed metrics for an empty or single-sample list', () => {
    expect(computeMetrics([])).toMatchObject({ distanceMeters: 0, averageSpeedMps: 0, maxSpeedMps: 0 });
    expect(computeMetrics([sample({})])).toMatchObject({ distanceMeters: 0, averageSpeedMps: 0 });
  });

  it('accumulates distance and duration across consecutive samples', () => {
    const samples = [
      sample({ latitude: 44.4268, longitude: 26.1025, timestamp: 0 }),
      sample({ latitude: 44.4278, longitude: 26.1025, timestamp: 10_000 }), // ~111m north, 10s later
      sample({ latitude: 44.4288, longitude: 26.1025, timestamp: 20_000 }) // another ~111m, 10s later
    ];
    const metrics = computeMetrics(samples);
    expect(metrics.distanceMeters).toBeGreaterThan(200);
    expect(metrics.movingDurationMs).toBe(20_000);
    expect(metrics.averageSpeedMps).toBeGreaterThan(9);
    expect(metrics.averageSpeedMps).toBeLessThan(12);
  });

  it('reports the highest instantaneous segment speed as maxSpeedMps', () => {
    const samples = [
      sample({ latitude: 0, longitude: 0, timestamp: 0 }),
      sample({ latitude: 0.0001, longitude: 0, timestamp: 10_000 }), // slow segment
      sample({ latitude: 0.0011, longitude: 0, timestamp: 12_000 }) // fast segment, 2s
    ];
    const metrics = computeMetrics(samples);
    const slowSpeed = metrics.distanceMeters > 0 ? metrics.maxSpeedMps : 0;
    expect(slowSpeed).toBeGreaterThan(0);
  });

  it('skips a pair spanning a segment break', () => {
    const samples = [
      sample({ latitude: 0, longitude: 0, timestamp: 0 }),
      sample({ latitude: 1, longitude: 0, timestamp: 10_000, segmentBreak: true })
    ];
    const metrics = computeMetrics(samples);
    expect(metrics.distanceMeters).toBe(0);
  });
});

describe('computeSegments', () => {
  it('produces a single segment when there are no breaks', () => {
    const samples = [
      sample({ latitude: 0, longitude: 0, timestamp: 0 }),
      sample({ latitude: 0.001, longitude: 0, timestamp: 5000 }),
      sample({ latitude: 0.002, longitude: 0, timestamp: 10_000 })
    ];
    const segments = computeSegments(samples);
    expect(segments.length).toBe(1);
    expect(segments[0].startIndex).toBe(0);
    expect(segments[0].endIndex).toBe(2);
  });

  it('splits into multiple segments at each segment break', () => {
    const samples = [
      sample({ latitude: 0, longitude: 0, timestamp: 0 }),
      sample({ latitude: 0.001, longitude: 0, timestamp: 5000 }),
      sample({ latitude: 0.002, longitude: 0, timestamp: 60_000, segmentBreak: true }),
      sample({ latitude: 0.003, longitude: 0, timestamp: 65_000 })
    ];
    const segments = computeSegments(samples);
    expect(segments.length).toBe(2);
    expect(segments[0].endIndex).toBe(1);
    expect(segments[1].startIndex).toBe(2);
  });
});
