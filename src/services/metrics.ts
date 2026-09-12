import type { LocationSample, TripSegment } from '../types/trip';
import { calculateDistance } from '../utils/geo';

export interface TripMetricsSnapshot {
  distanceMeters: number;
  movingDurationMs: number;
  averageSpeedMps: number;
  maxSpeedMps: number;
  currentSpeedMps: number;
}

/**
 * Recomputes cumulative metrics from a sample list. Samples are assumed to
 * already be filtered (see utils/geo.validateSample) — this function trusts
 * consecutive samples as meaningful movement and does not re-filter them,
 * so it stays cheap enough to call after every accepted sample.
 */
export function computeMetrics(samples: LocationSample[]): TripMetricsSnapshot {
  let distanceMeters = 0;
  let movingDurationMs = 0;
  let maxSpeedMps = 0;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    if (curr.segmentBreak) continue;

    const segmentDistance = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const segmentDurationMs = curr.timestamp - prev.timestamp;
    if (segmentDurationMs <= 0) continue;

    distanceMeters += segmentDistance;
    movingDurationMs += segmentDurationMs;

    const instantaneousSpeed = segmentDistance / (segmentDurationMs / 1000);
    if (instantaneousSpeed > maxSpeedMps) maxSpeedMps = instantaneousSpeed;
  }

  const currentSpeedMps = samples.length > 0 ? samples[samples.length - 1].speed ?? 0 : 0;
  const averageSpeedMps = movingDurationMs > 0 ? distanceMeters / (movingDurationMs / 1000) : 0;

  return { distanceMeters, movingDurationMs, averageSpeedMps, maxSpeedMps, currentSpeedMps };
}

/**
 * Splits a sample list into segments at each explicit segment break (e.g.
 * after a pause/resume or a long GPS dropout), producing per-segment
 * distance/duration/average-speed — useful for a detailed trip breakdown.
 */
export function computeSegments(samples: LocationSample[]): TripSegment[] {
  const segments: TripSegment[] = [];
  let startIndex = 0;

  const flush = (endIndex: number) => {
    if (endIndex <= startIndex) return;
    const slice = samples.slice(startIndex, endIndex + 1);
    const metrics = computeMetrics(slice);
    segments.push({
      startIndex,
      endIndex,
      distanceMeters: metrics.distanceMeters,
      durationMs: samples[endIndex].timestamp - samples[startIndex].timestamp,
      averageSpeedMps: metrics.averageSpeedMps
    });
  };

  for (let i = 1; i < samples.length; i++) {
    if (samples[i].segmentBreak) {
      flush(i - 1);
      startIndex = i;
    }
  }
  flush(samples.length - 1);

  return segments;
}
