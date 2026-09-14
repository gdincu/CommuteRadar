import type { Checkpoint, CheckpointEvent, CheckpointProximityState } from '../types/checkpoint';
import type { Trip } from '../types/trip';
import { calculateDistance } from '../utils/geo';
import { nowIso } from '../utils/time';

export function createProximityState(): CheckpointProximityState {
  return new Map();
}

/**
 * Rebuilds proximity state after a reload/recovery so sitting inside a
 * checkpoint's radius doesn't re-fire a duplicate event.
 *
 * Uses the recovered trip's last known position: a checkpoint that already
 * has an event in the recovered trip AND still contains that last position
 * restarts as 'inside' (next fix inside → no event). Everything else
 * restarts as 'outside', so a genuinely new entry — including a first entry
 * for a checkpoint that never fired before the reload — still fires.
 */
export function restoreProximityState(checkpoints: Checkpoint[], recoveredTrip: Trip): CheckpointProximityState {
  const state = createProximityState();
  const samples = recoveredTrip.samples;
  const last = samples.length > 0 ? samples[samples.length - 1] : undefined;
  const firedIds = new Set(recoveredTrip.checkpoints.map((e) => e.checkpointId));

  for (const checkpoint of checkpoints) {
    if (!checkpoint.enabled) continue;
    if (!last || !firedIds.has(checkpoint.id)) {
      state.set(checkpoint.id, 'outside');
      continue;
    }
    const distance = calculateDistance(last.latitude, last.longitude, checkpoint.latitude, checkpoint.longitude);
    state.set(checkpoint.id, distance <= checkpoint.radiusMeters ? 'inside' : 'outside');
  }

  return state;
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
