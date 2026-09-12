export type UnitSystem = 'metric' | 'imperial';
export type Theme = 'dark' | 'light';

export type GpsProfile = 'batterySaver' | 'balanced' | 'highAccuracy';

export interface GeolocationTuning {
  enableHighAccuracy: boolean;
  maximumAgeMs: number;
  timeoutMs: number;
  /** Reject samples reporting worse accuracy (larger radius, in meters) than this. */
  maxAcceptableAccuracyMeters: number;
  /** Ignore movement smaller than this between samples — treats it as GPS noise. */
  minMeaningfulDistanceMeters: number;
  /** Reject a jump between consecutive samples implying a speed above this (m/s). */
  maxPlausibleSpeedMps: number;
}

export const GPS_PROFILES: Record<GpsProfile, GeolocationTuning> = {
  batterySaver: {
    enableHighAccuracy: false,
    maximumAgeMs: 15000,
    timeoutMs: 20000,
    maxAcceptableAccuracyMeters: 75,
    minMeaningfulDistanceMeters: 8,
    maxPlausibleSpeedMps: 45
  },
  balanced: {
    enableHighAccuracy: true,
    maximumAgeMs: 5000,
    timeoutMs: 10000,
    maxAcceptableAccuracyMeters: 40,
    minMeaningfulDistanceMeters: 5,
    maxPlausibleSpeedMps: 45
  },
  highAccuracy: {
    enableHighAccuracy: true,
    maximumAgeMs: 0,
    timeoutMs: 15000,
    maxAcceptableAccuracyMeters: 20,
    minMeaningfulDistanceMeters: 3,
    maxPlausibleSpeedMps: 45
  }
};

export interface AppSettings {
  schemaVersion: 1;
  units: UnitSystem;
  theme: Theme;
  gpsProfile: GpsProfile;
  notificationsEnabled: boolean;
  /** Whether the user has been shown the location permission rationale card. */
  hasSeenLocationRationale: boolean;
  hasSeenNotificationRationale: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  units: 'metric',
  theme: 'dark',
  gpsProfile: 'balanced',
  notificationsEnabled: false,
  hasSeenLocationRationale: false,
  hasSeenNotificationRationale: false
};
