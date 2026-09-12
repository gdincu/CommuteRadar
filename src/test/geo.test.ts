import { describe, expect, it } from 'vitest';
import { calculateDistance, validateSample, decimateSamples } from '../utils/geo';
import type { LocationSample } from '../types/trip';

const tuning = {
  maxAcceptableAccuracyMeters: 40,
  minMeaningfulDistanceMeters: 5,
  maxPlausibleSpeedMps: 45
};

function sample(overrides: Partial<LocationSample>): LocationSample {
  return {
    latitude: 44.4268,
    longitude: 26.1025,
    accuracy: 10,
    timestamp: 1_000_000,
    speed: null,
    ...overrides
  };
}

describe('calculateDistance', () => {
  it('returns ~0 for identical coordinates', () => {
    expect(calculateDistance(44.4268, 26.1025, 44.4268, 26.1025)).toBeCloseTo(0, 3);
  });

  it('matches a known reference distance (roughly 111km per degree of latitude at the equator)', () => {
    const distance = calculateDistance(0, 0, 1, 0);
    expect(distance).toBeGreaterThan(110_000);
    expect(distance).toBeLessThan(112_000);
  });

  it('is symmetric', () => {
    const a = calculateDistance(44.4268, 26.1025, 44.43, 26.11);
    const b = calculateDistance(44.43, 26.11, 44.4268, 26.1025);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('validateSample', () => {
  it('accepts the first sample unconditionally (aside from accuracy)', () => {
    const result = validateSample(undefined, sample({}), tuning);
    expect(result.accepted).toBe(true);
  });

  it('rejects a sample with worse accuracy than the configured threshold', () => {
    const result = validateSample(undefined, sample({ accuracy: 100 }), tuning);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('poor-accuracy');
  });

  it('treats tiny movement within the combined accuracy radius as stationary noise', () => {
    const previous = sample({ latitude: 44.4268, longitude: 26.1025, accuracy: 10, timestamp: 1000 });
    // ~1 meter of drift, well within the noise floor
    const candidate = sample({ latitude: 44.42681, longitude: 26.1025, accuracy: 10, timestamp: 2000 });
    const result = validateSample(previous, candidate, tuning);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('stationary-noise');
    expect(result.distanceMeters).toBe(0);
  });

  it('rejects an implausible GPS jump exceeding the max plausible speed', () => {
    const previous = sample({ latitude: 44.4268, longitude: 26.1025, accuracy: 10, timestamp: 1000 });
    // ~5km jump in 1 second — far beyond any commute mode
    const candidate = sample({ latitude: 44.472, longitude: 26.1025, accuracy: 10, timestamp: 2000 });
    const result = validateSample(previous, candidate, tuning);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('implausible-jump');
  });

  it('accepts plausible consecutive movement at a walking/cycling pace', () => {
    const previous = sample({ latitude: 44.4268, longitude: 26.1025, accuracy: 10, timestamp: 1000 });
    // ~20 meters in 5 seconds = 4 m/s, a brisk cycling pace
    const candidate = sample({ latitude: 44.42698, longitude: 26.1025, accuracy: 10, timestamp: 6000 });
    const result = validateSample(previous, candidate, tuning);
    expect(result.accepted).toBe(true);
    expect(result.distanceMeters).toBeGreaterThan(0);
  });

  it('rejects a non-positive elapsed time between samples', () => {
    const previous = sample({ timestamp: 5000 });
    const candidate = sample({ timestamp: 5000, latitude: 44.5 });
    const result = validateSample(previous, candidate, tuning);
    expect(result.accepted).toBe(false);
  });
});

describe('decimateSamples', () => {
  it('keeps the first and last sample regardless of gap size', () => {
    const samples: LocationSample[] = [
      sample({ latitude: 0, longitude: 0, timestamp: 1 }),
      sample({ latitude: 0.00001, longitude: 0, timestamp: 2 }),
      sample({ latitude: 0.00002, longitude: 0, timestamp: 3 })
    ];
    const result = decimateSamples(samples, 15);
    expect(result[0]).toBe(samples[0]);
    expect(result[result.length - 1]).toBe(samples[samples.length - 1]);
  });

  it('drops intermediate points closer together than the minimum gap', () => {
    const samples: LocationSample[] = [
      sample({ latitude: 0, longitude: 0, timestamp: 1 }),
      sample({ latitude: 0.00001, longitude: 0, timestamp: 2 }), // ~1m away, should be dropped
      sample({ latitude: 0.01, longitude: 0, timestamp: 3 }) // ~1.1km away, should be kept
    ];
    const result = decimateSamples(samples, 15);
    expect(result.length).toBe(2);
  });

  it('always keeps a sample flagged as a segment break', () => {
    const samples: LocationSample[] = [
      sample({ latitude: 0, longitude: 0, timestamp: 1 }),
      sample({ latitude: 0.00001, longitude: 0, timestamp: 2, segmentBreak: true }),
      sample({ latitude: 0.00002, longitude: 0, timestamp: 3 })
    ];
    const result = decimateSamples(samples, 15);
    expect(result.some((s) => s.segmentBreak)).toBe(true);
  });
});
