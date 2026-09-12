import { describe, expect, it } from 'vitest';
import { createProximityState, evaluateCheckpoints } from '../services/checkpoints';
import type { Checkpoint } from '../types/checkpoint';

const office: Checkpoint = {
  id: 'cp-office',
  schemaVersion: 1,
  name: 'Office',
  latitude: 44.4268,
  longitude: 26.1025,
  radiusMeters: 100,
  enabled: true,
  notificationEnabled: true,
  whatsappEnabled: false,
  createdAt: new Date().toISOString()
};

// A point ~1.1km away (well outside the 100m radius) and the checkpoint's own coordinates (inside).
const OUTSIDE = { latitude: 44.437, longitude: 26.1025 };
const INSIDE = { latitude: office.latitude, longitude: office.longitude };

describe('evaluateCheckpoints', () => {
  it('fires no event while outside remains outside', () => {
    const state = createProximityState();
    evaluateCheckpoints([office], state, OUTSIDE, 1000);
    const events = evaluateCheckpoints([office], state, OUTSIDE, 2000);
    expect(events).toHaveLength(0);
  });

  it('fires exactly one event on outside -> inside crossing', () => {
    const state = createProximityState();
    evaluateCheckpoints([office], state, OUTSIDE, 1000);
    const events = evaluateCheckpoints([office], state, INSIDE, 2000);
    expect(events).toHaveLength(1);
    expect(events[0].checkpointId).toBe('cp-office');
  });

  it('fires no additional event while inside remains inside', () => {
    const state = createProximityState();
    evaluateCheckpoints([office], state, OUTSIDE, 1000);
    evaluateCheckpoints([office], state, INSIDE, 2000);
    const events = evaluateCheckpoints([office], state, INSIDE, 3000);
    expect(events).toHaveLength(0);
  });

  it('resets on inside -> outside with no event, then fires again on re-entry', () => {
    const state = createProximityState();
    evaluateCheckpoints([office], state, OUTSIDE, 1000);
    evaluateCheckpoints([office], state, INSIDE, 2000); // event #1
    const resetEvents = evaluateCheckpoints([office], state, OUTSIDE, 3000);
    expect(resetEvents).toHaveLength(0);

    const reentryEvents = evaluateCheckpoints([office], state, INSIDE, 4000);
    expect(reentryEvents).toHaveLength(1);
  });

  it('ignores disabled checkpoints entirely', () => {
    const disabled = { ...office, enabled: false };
    const state = createProximityState();
    evaluateCheckpoints([disabled], state, OUTSIDE, 1000);
    const events = evaluateCheckpoints([disabled], state, INSIDE, 2000);
    expect(events).toHaveLength(0);
  });
});
