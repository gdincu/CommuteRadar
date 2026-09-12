import { describe, expect, it } from 'vitest';
import { buildTemplateVariables, buildWhatsAppDeepLink, renderTemplate } from '../services/whatsapp';
import type { Checkpoint, CheckpointEvent } from '../types/checkpoint';
import type { Trip } from '../types/trip';

describe('renderTemplate', () => {
  const variables = {
    checkpoint: 'Office',
    tripTime: '28m 42s',
    distance: '8.4 km',
    averageSpeed: '17.6 km/h',
    date: '9/12/2026',
    time: '08:42'
  };

  it('substitutes every supported variable', () => {
    const template =
      'Reached {checkpoint} at {time} on {date}. Took {tripTime} over {distance}, avg {averageSpeed}.';
    const result = renderTemplate(template, variables);
    expect(result).toBe('Reached Office at 08:42 on 9/12/2026. Took 28m 42s over 8.4 km, avg 17.6 km/h.');
  });

  it('leaves unrecognized placeholders untouched', () => {
    const result = renderTemplate('Hello {unknown} {checkpoint}', variables);
    expect(result).toBe('Hello {unknown} Office');
  });

  it('substitutes a repeated variable every time it appears', () => {
    const result = renderTemplate('{checkpoint}, {checkpoint}, {checkpoint}!', variables);
    expect(result).toBe('Office, Office, Office!');
  });
});

describe('buildWhatsAppDeepLink', () => {
  it('URL-encodes the message and strips non-digit characters from the phone number', () => {
    const url = buildWhatsAppDeepLink('+40 712-345-678', 'Hi there! I reached Office & I am on time.');
    expect(url).toBe(
      'https://wa.me/40712345678?text=' + encodeURIComponent('Hi there! I reached Office & I am on time.')
    );
  });
});

describe('buildTemplateVariables', () => {
  const checkpoint: Checkpoint = {
    id: 'cp-1',
    schemaVersion: 1,
    name: 'Office',
    latitude: 0,
    longitude: 0,
    radiusMeters: 100,
    enabled: true,
    notificationEnabled: true,
    whatsappEnabled: true,
    whatsappPhone: '40712345678',
    whatsappMessage: 'Reached {checkpoint}!',
    createdAt: new Date().toISOString()
  };

  const event: CheckpointEvent = {
    checkpointId: 'cp-1',
    checkpointName: 'Office',
    reachedAt: new Date('2026-09-12T08:42:00Z').toISOString(),
    elapsedSinceTripStartMs: 28 * 60_000 + 42_000,
    distanceFromCheckpointMeters: 12
  };

  const trip: Trip = {
    id: 'trip-1',
    schemaVersion: 1,
    mode: 'bike',
    startedAt: new Date('2026-09-12T08:13:18Z').toISOString(),
    status: 'active',
    distanceMeters: 8400,
    durationMs: 28 * 60_000 + 42_000,
    averageSpeedMps: 4.89,
    samples: [],
    segments: [],
    checkpoints: [],
    sampleCount: 100,
    rejectedSampleCount: 0
  };

  it('formats trip time as words and distance/speed using the given unit system', () => {
    const variables = buildTemplateVariables(checkpoint, event, trip, 'metric');
    expect(variables.checkpoint).toBe('Office');
    expect(variables.tripTime).toBe('28m 42s');
    expect(variables.distance).toBe('8.40 km');
    expect(variables.averageSpeed).toContain('km/h');
  });

  it('switches to imperial units when requested', () => {
    const variables = buildTemplateVariables(checkpoint, event, trip, 'imperial');
    expect(variables.distance).toContain('mi');
    expect(variables.averageSpeed).toContain('mph');
  });
});
