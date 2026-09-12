import type { LocationSample } from '../types/trip';

const EARTH_RADIUS_METERS = 6371e3;

/**
 * Great-circle distance between two coordinates in meters (Haversine formula).
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface SampleValidationResult {
  accepted: boolean;
  reason?: 'poor-accuracy' | 'implausible-jump' | 'stationary-noise';
  distanceMeters: number;
  elapsedMs: number;
  impliedSpeedMps: number;
}

/**
 * Decide whether a new raw GPS sample should be trusted and counted as
 * meaningful movement, given the previous accepted sample. This is the
 * single choke point for all three of the reference behaviors we need:
 * rejecting poor accuracy, rejecting implausible jumps, and ignoring tiny
 * stationary fluctuations.
 */
export function validateSample(
  previous: LocationSample | undefined,
  candidate: LocationSample,
  tuning: {
    maxAcceptableAccuracyMeters: number;
    minMeaningfulDistanceMeters: number;
    maxPlausibleSpeedMps: number;
  }
): SampleValidationResult {
  if (candidate.accuracy > tuning.maxAcceptableAccuracyMeters) {
    return { accepted: false, reason: 'poor-accuracy', distanceMeters: 0, elapsedMs: 0, impliedSpeedMps: 0 };
  }

  if (!previous) {
    return { accepted: true, distanceMeters: 0, elapsedMs: 0, impliedSpeedMps: 0 };
  }

  const distanceMeters = calculateDistance(
    previous.latitude,
    previous.longitude,
    candidate.latitude,
    candidate.longitude
  );
  const elapsedMs = candidate.timestamp - previous.timestamp;

  if (elapsedMs <= 0) {
    return { accepted: false, reason: 'stationary-noise', distanceMeters, elapsedMs, impliedSpeedMps: 0 };
  }

  const impliedSpeedMps = distanceMeters / (elapsedMs / 1000);

  // Combined accuracy radius of both fixes — movement smaller than this is
  // indistinguishable from GPS wobble and shouldn't count as travel.
  const combinedAccuracy = previous.accuracy + candidate.accuracy;
  const noiseFloor = Math.max(tuning.minMeaningfulDistanceMeters, combinedAccuracy * 0.5);

  if (distanceMeters < noiseFloor) {
    return { accepted: true, reason: 'stationary-noise', distanceMeters: 0, elapsedMs, impliedSpeedMps: 0 };
  }

  if (impliedSpeedMps > tuning.maxPlausibleSpeedMps) {
    return { accepted: false, reason: 'implausible-jump', distanceMeters, elapsedMs, impliedSpeedMps };
  }

  return { accepted: true, distanceMeters, elapsedMs, impliedSpeedMps };
}

/**
 * A minimal 1D Kalman filter, applied independently to latitude and
 * longitude. Optional smoothing used only at low speed (e.g. walking or
 * standing still at a checkpoint) where raw GPS wobble is most visible;
 * disabled/bypassed at higher speeds so real motion isn't lagged behind
 * (mirrors the "don't smooth away corners" idea from fast-moving GPS tracks).
 */
export class CoordinateSmoother {
  private latEstimate: number | null = null;
  private lonEstimate: number | null = null;
  private errorEstimate = 0;
  private readonly processNoise: number;

  constructor(processNoise = 0.15) {
    this.processNoise = processNoise;
  }

  reset(): void {
    this.latEstimate = null;
    this.lonEstimate = null;
    this.errorEstimate = 0;
  }

  /** Snap the filter's internal state to a known-good coordinate (e.g. after a fast-motion bypass). */
  seed(latitude: number, longitude: number): void {
    this.latEstimate = latitude;
    this.lonEstimate = longitude;
  }

  smooth(latitude: number, longitude: number, accuracyMeters: number): { latitude: number; longitude: number } {
    if (this.latEstimate === null || this.lonEstimate === null) {
      this.latEstimate = latitude;
      this.lonEstimate = longitude;
      this.errorEstimate = accuracyMeters;
      return { latitude, longitude };
    }

    this.errorEstimate += this.processNoise;
    const gain = this.errorEstimate / (this.errorEstimate + accuracyMeters);

    this.latEstimate += gain * (latitude - this.latEstimate);
    this.lonEstimate += gain * (longitude - this.lonEstimate);
    this.errorEstimate *= 1 - gain;

    return { latitude: this.latEstimate, longitude: this.lonEstimate };
  }
}

/**
 * Reduce the number of stored samples for a long trip using simple
 * distance-based decimation (drop points that are within `minGapMeters` of
 * the last kept point). This keeps storage bounded without needing a full
 * simplification algorithm like Douglas–Peucker.
 */
export function decimateSamples(samples: LocationSample[], minGapMeters = 15): LocationSample[] {
  if (samples.length <= 2) return samples;

  const kept: LocationSample[] = [samples[0]];
  for (let i = 1; i < samples.length - 1; i++) {
    const last = kept[kept.length - 1];
    const candidate = samples[i];
    const distance = calculateDistance(last.latitude, last.longitude, candidate.latitude, candidate.longitude);
    if (distance >= minGapMeters || candidate.segmentBreak) {
      kept.push(candidate);
    }
  }
  kept.push(samples[samples.length - 1]);
  return kept;
}
