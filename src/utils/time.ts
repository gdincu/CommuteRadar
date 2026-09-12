/**
 * Thin wrapper around performance.now() for trip/segment timing.
 *
 * IMPORTANT: performance.now() is relative to the page's navigation start
 * and is meaningless across reloads or as a persisted value. We only ever
 * use it to compute *elapsed* durations while the page is alive; the
 * absolute moment a trip started/ended is always captured separately as an
 * ISO wall-clock string (see Trip.startedAt / endedAt) so history displays
 * correctly after a reload.
 */
export function now(): number {
  return performance.now();
}

export function elapsedSince(start: number): number {
  return performance.now() - start;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** Formats milliseconds as H:MM:SS or M:SS. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = minutes.toString().padStart(hours > 0 ? 2 : 1, '0');
  const ss = seconds.toString().padStart(2, '0');

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Formats milliseconds as a compact "28m 42s" style string, for notifications/messages. */
export function formatDurationWords(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}
