import type { Checkpoint, CheckpointEvent, CheckpointProximityState } from '../types/checkpoint';
import { calculateDistance } from '../utils/geo';
import { nowIso } from '../utils/time';

export function createProximityState(): CheckpointProximityState {
  return new Map();
}

/**
 * Evaluates one new fix against every enabled checkpoint and returns any
 * newly-fired events (outside → inside crossings only — see CheckpointEvent
 * doc comment). Mutates `state` in place to track per-checkpoint
 * inside/outside status across calls.
 */
export function evaluateCheckpoints(
  checkpoints: Checkpoint[],
  state: CheckpointProximityState,
  fix: { latitude: number; longitude: number },
  elapsedSinceTripStartMs: number
): CheckpointEvent[] {
  const events: CheckpointEvent[] = [];

  for (const checkpoint of checkpoints) {
    if (!checkpoint.enabled) continue;

    const distance = calculateDistance(fix.latitude, fix.longitude, checkpoint.latitude, checkpoint.longitude);
    const isInside = distance <= checkpoint.radiusMeters;
    const previousState = state.get(checkpoint.id) ?? 'outside';

    if (isInside && previousState === 'outside') {
      events.push({
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name,
        reachedAt: nowIso(),
        elapsedSinceTripStartMs,
        distanceFromCheckpointMeters: distance
      });
    }

    state.set(checkpoint.id, isInside ? 'inside' : 'outside');
  }

  return events;
}
