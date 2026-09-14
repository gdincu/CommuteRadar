import type { LocationSample, TripSegment } from '../types/trip';
import { calculateDistance } from '../utils/geo';

export interface TripMetricsSnapshot {
  distanceMeters: number;
  movingDurationMs: number;
  averageSpeedMps: number;
  maxSpeedMps: number;
  currentSpeedMps: number;
}

export interface ComputeMetricsOptions {
  /** Lower bound for meaningful net displacement, mirroring GeolocationTuning.minMeaningfulDistanceMeters. */
  minMeaningfulDistanceMeters?: number;
}

/**
 * Recomputes cumulative metrics from a sample list.
 *
 * Pause/dwell handling: stationary GPS wobble must never accumulate into
 * distance, but per-pair skipping would also erase slow walking (each step
 * is below the noise floor on its own). So instead of trusting consecutive
 * deltas, this keeps an anchor — the last fix that counted as real
 * movement — and only advances it once the *net* displacement from the
 * anchor exceeds the noise floor (max of the configured minimum and half
 * the combined accuracy radius, same floor validateSample uses). Random
 * wobble around a red light / train stop never escapes the floor and adds
 * nothing; a slow walk eventually pushes net displacement past the floor
 * and the whole anchor→fix leg counts at once, preserving total distance.
 * Dwell time inside the floor does not advance movingDurationMs.
 */
export function computeMetrics(samples: LocationSample[], options?: ComputeMetricsOptions): TripMetricsSnapshot {
  let distanceMeters = 0;
  let movingDurationMs = 0;
  let maxSpeedMps = 0;

  if (samples.length === 0) {
    return { distanceMeters: 0, movingDurationMs: 0, averageSpeedMps: 0, maxSpeedMps: 0, currentSpeedMps: 0 };
  }

  const minMeaningful = options?.minMeaningfulDistanceMeters ?? 0;
  let anchor = samples[0];

  for (let i = 1; i < samples.length; i++) {
    const curr = samples[i];
    if (curr.segmentBreak) {
      anchor = curr;
      continue;
    }

    const elapsedMs = curr.timestamp - anchor.timestamp;
    if (elapsedMs <= 0) continue;

    const netDistance = calculateDistance(anchor.latitude, anchor.longitude, curr.latitude, curr.longitude);
    const noiseFloor = Math.max(minMeaningful, ((anchor.accuracy ?? 0) + (curr.accuracy ?? 0)) * 0.5);

    // Still inside the wobble radius around the anchor: dwell, don't count.
    if (netDistance < noiseFloor) continue;

    distanceMeters += netDistance;
    movingDurationMs += elapsedMs;

    const legSpeed = netDistance / (elapsedMs / 1000);
    if (legSpeed > maxSpeedMps) maxSpeedMps = legSpeed;
    anchor = curr;
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
export function computeSegments(samples: LocationSample[], options?: ComputeMetricsOptions): TripSegment[] {
  const segments: TripSegment[] = [];
  let startIndex = 0;

  const flush = (endIndex: number) => {
    if (endIndex <= startIndex) return;
    const slice = samples.slice(startIndex, endIndex + 1);
    const metrics = computeMetrics(slice, options);
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
