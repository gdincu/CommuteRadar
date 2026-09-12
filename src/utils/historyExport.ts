import type { Trip } from '../types/trip';
import type { UnitSystem } from '../types/settings';
import { formatDistance, formatSpeed, travelModeLabel } from './formatting';
import { formatDuration } from './time';
import { csvField, downloadBlob } from './download';

const HEADER = ['Date', 'Start datetime', 'Sport', 'Distance', 'Duration', 'Avg speed'];

/**
 * Builds a summary CSV — one row per trip — with the high-level metrics
 * someone would want to scan or import elsewhere. This intentionally does
 * NOT include GPS samples/segments/checkpoints; that per-trip detail is
 * still available via "Export JSON"/"Export CSV" on an individual trip.
 */
export function buildTripsSummaryCsv(trips: Trip[], units: UnitSystem): string {
  const rows = trips.map((trip) => {
    const started = new Date(trip.startedAt);
    return [
      started.toLocaleDateString(),
      started.toISOString(),
      travelModeLabel(trip.mode),
      formatDistance(trip.distanceMeters, units),
      formatDuration(trip.durationMs),
      formatSpeed(trip.averageSpeedMps ?? 0, units)
    ]
      .map(csvField)
      .join(',');
  });

  return [HEADER.map(csvField).join(','), ...rows].join('\n');
}

export function exportTripsSummaryCsv(trips: Trip[], units: UnitSystem): void {
  const csv = buildTripsSummaryCsv(trips, units);
  const blob = new Blob([csv], { type: 'text/csv' });
  const dateStamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `commuteradar-trips-${dateStamp}.csv`);
}
