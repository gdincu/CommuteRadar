import type { CheckpointEvent } from './checkpoint';

export type TravelMode = 'bike' | 'run' | 'walk' | 'train' | 'other';

export type TripStatus = 'active' | 'completed' | 'cancelled';

/**
 * A single, reduced GPS sample. This is NOT meant to reconstruct a
 * navigation-grade route — it's a lightweight breadcrumb used for distance/
 * speed math and an optional simple polyline preview.
 */
export interface LocationSample {
  latitude: number;
  longitude: number;
  /** Reported GPS accuracy radius in meters. */
  accuracy: number;
  /** Wall-clock ms since epoch (Date.now() equivalent), NOT performance.now(). */
  timestamp: number;
  /** Device-reported speed in m/s, if available. */
  speed?: number | null;
  /** True if this sample starts a new visual segment (e.g. after a long GPS dropout or resume). */
  segmentBreak?: boolean;
}

/**
 * A derived slice of the trip, computed between two "meaningful" samples
 * (i.e. after filtering out stationary GPS noise).
 */
export interface TripSegment {
  startIndex: number;
  endIndex: number;
  distanceMeters: number;
  durationMs: number;
  averageSpeedMps: number;
}

/**
 * The persisted trip record. Fields are additive-friendly: new optional
 * fields can be introduced later without breaking trips already stored in
 * IndexedDB from an older schemaVersion.
 */
export interface Trip {
  id: string;
  schemaVersion: 1;
  mode: TravelMode;

  /** ISO wall-clock timestamp — safe to persist and display historically. */
  startedAt: string;
  endedAt?: string;

  status: TripStatus;

  distanceMeters: number;
  durationMs: number;
  movingDurationMs?: number;

  averageSpeedMps?: number;
  maxSpeedMps?: number;

  samples: LocationSample[];
  segments: TripSegment[];
  checkpoints: CheckpointEvent[];

  /** Number of raw GPS callbacks received (including ones filtered out). */
  sampleCount: number;
  /** Number of raw samples rejected as inaccurate, duplicate, or an implausible jump. */
  rejectedSampleCount: number;
}

/**
 * In-memory-only bookkeeping kept alongside a Trip while it's active.
 * Never persisted directly — derived data is written into the Trip record
 * on each throttled save. Uses performance.now() for precise elapsed-time
 * math, which is meaningless once the page reloads.
 */
export interface ActiveTripRuntime {
  trip: Trip;
  /** performance.now() value captured when the trip started (or resumed). */
  perfStart: number;
  /** Wall-clock ms accumulated from *previous* runs, for pause/resume support. */
  accumulatedDurationMs: number;
  lastSample?: LocationSample;
  /** perf.now() timestamp of the last sample that counted as "moving". */
  lastMovingPerf?: number;
}
