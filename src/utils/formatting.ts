import type { UnitSystem } from '../types/settings';

const METERS_PER_MILE = 1609.344;

export function formatDistance(meters: number, units: UnitSystem): string {
  if (units === 'imperial') {
    const miles = meters / METERS_PER_MILE;
    return miles < 0.1 ? `${Math.round(meters * 3.28084)} ft` : `${miles.toFixed(2)} mi`;
  }
  return meters < 100 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(2)} km`;
}

/** Converts a speed in meters/second to a "12.3 km/h" or "7.6 mph" string. */
export function formatSpeed(metersPerSecond: number, units: UnitSystem): string {
  if (!isFinite(metersPerSecond) || metersPerSecond < 0) metersPerSecond = 0;
  if (units === 'imperial') {
    const mph = (metersPerSecond * 3600) / METERS_PER_MILE;
    return `${mph.toFixed(1)} mph`;
  }
  const kmh = metersPerSecond * 3.6;
  return `${kmh.toFixed(1)} km/h`;
}

export function formatAccuracy(meters: number): string {
  return `±${Math.round(meters)} m`;
}

const TRAVEL_MODE_LABELS: Record<string, string> = {
  bike: 'Cycling',
  run: 'Running',
  walk: 'Walking',
  train: 'Train',
  other: 'Commute'
};

const TRAVEL_MODE_ICONS: Record<string, string> = {
  bike: '🚲',
  run: '🏃',
  walk: '🚶',
  train: '🚆',
  other: '📍'
};

export function travelModeLabel(mode: string): string {
  return TRAVEL_MODE_LABELS[mode] ?? 'Commute';
}

export function travelModeIcon(mode: string): string {
  return TRAVEL_MODE_ICONS[mode] ?? '📍';
}

export function formatClockDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  // Anything older needs the date itself — a bare weekday is ambiguous
  // ("Monday" could mean six different days).
  const sameYear = date.getFullYear() === today.getFullYear();
  return sameYear
    ? date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
