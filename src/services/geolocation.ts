import type { GeolocationTuning } from '../types/settings';

export type GeolocationErrorReason =
  | 'unsupported'
  | 'permission-denied'
  | 'position-unavailable'
  | 'timeout';

export interface GeolocationStatus {
  reason: GeolocationErrorReason;
  message: string;
  /** True once we've fallen back to lower-accuracy mode after a high-accuracy timeout. */
  usingFallback: boolean;
}

export interface RawFix {
  latitude: number;
  longitude: number;
  accuracy: number;
  /** Device-reported speed in m/s, if the platform provides it. */
  speed: number | null;
  /** pos.timestamp — wall-clock ms since epoch for this fix. */
  timestamp: number;
}

type FixHandler = (fix: RawFix) => void;
type StatusHandler = (status: GeolocationStatus) => void;

/**
 * Wraps navigator.geolocation.watchPosition with the graceful-degradation
 * behavior from the reference implementation: if a high-accuracy watch times
 * out, fall back to a lower-accuracy watch (allowing Wi-Fi/cell
 * triangulation) rather than failing outright. All other errors are
 * surfaced to the caller as human-readable status rather than thrown.
 */
export class GeolocationTracker {
  private watchId: number | null = null;
  private usingFallback = false;

  constructor(
    private readonly onFix: FixHandler,
    private readonly onStatus: StatusHandler
  ) {}

  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  start(tuning: GeolocationTuning): void {
    if (!this.isSupported()) {
      this.onStatus({
        reason: 'unsupported',
        message: 'This browser does not support location tracking.',
        usingFallback: false
      });
      return;
    }
    this.usingFallback = false;
    this.watch({
      enableHighAccuracy: tuning.enableHighAccuracy,
      maximumAge: tuning.maximumAgeMs,
      timeout: tuning.timeoutMs
    });
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.usingFallback = false;
  }

  get isActive(): boolean {
    return this.watchId !== null;
  }

  private watch(options: PositionOptions): void {
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err, options),
      options
    );
  }

  private handlePosition(pos: GeolocationPosition): void {
    this.onFix({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed,
      timestamp: pos.timestamp
    });
  }

  private handleError(err: GeolocationPositionError, previousOptions: PositionOptions): void {
    // TIMEOUT while using high accuracy: retry once with high accuracy
    // disabled so Wi-Fi/cell triangulation can still produce a (coarser) fix
    // instead of tracking simply dying indoors or in poor-sky conditions.
    if (err.code === err.TIMEOUT && previousOptions.enableHighAccuracy && !this.usingFallback) {
      this.usingFallback = true;
      if (this.watchId !== null) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      }
      this.onStatus({
        reason: 'timeout',
        message: 'High-accuracy GPS timed out — retrying with standard accuracy.',
        usingFallback: true
      });
      this.watch({ enableHighAccuracy: false, maximumAge: 0, timeout: 30000 });
      return;
    }

    if (err.code === err.PERMISSION_DENIED) {
      this.stop();
      this.onStatus({
        reason: 'permission-denied',
        message: 'Location permission was denied or revoked.',
        usingFallback: this.usingFallback
      });
      return;
    }

    if (err.code === err.POSITION_UNAVAILABLE) {
      this.onStatus({
        reason: 'position-unavailable',
        message: 'Location is temporarily unavailable — will keep trying.',
        usingFallback: this.usingFallback
      });
      return;
    }

    this.onStatus({
      reason: 'timeout',
      message: 'Location request timed out — will keep trying.',
      usingFallback: this.usingFallback
    });
  }
}

export async function requestLocationPermissionState(): Promise<PermissionState | 'unsupported'> {
  if (!('permissions' in navigator)) return 'unsupported';
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state;
  } catch {
    return 'unsupported';
  }
}
