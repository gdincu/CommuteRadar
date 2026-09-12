export interface Checkpoint {
  id: string;
  schemaVersion: 1;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;

  enabled: boolean;
  notificationEnabled: boolean;

  whatsappEnabled: boolean;
  /** Template string, e.g. "Reached {checkpoint} in {tripTime}!" */
  whatsappMessage?: string;
  /** E.164-ish phone number, digits only (no leading +), for the wa.me link. */
  whatsappPhone?: string;

  createdAt: string;
}

/** Fired exactly once per outside→inside crossing of a checkpoint's radius. */
export interface CheckpointEvent {
  checkpointId: string;
  checkpointName: string;
  reachedAt: string;
  elapsedSinceTripStartMs: number;
  distanceFromCheckpointMeters: number;
}

/**
 * Per-trip, in-memory state machine tracking whether the user is currently
 * "inside" each enabled checkpoint's radius, so we only fire once per
 * crossing rather than on every sample while inside.
 */
export type CheckpointProximityState = Map<string, 'inside' | 'outside'>;
