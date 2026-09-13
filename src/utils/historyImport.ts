import type { Trip, TravelMode } from '../types/trip';

export interface ParsedTripsCsvResult {
  trips: Trip[];
  errors: string[];
}

const REQUIRED_COLUMNS = ['Start datetime', 'Sport', 'Distance', 'Duration'] as const;

const SPORT_LABEL_TO_MODE: Record<string, TravelMode> = {
  cycling: 'bike',
  running: 'run',
  walking: 'walk',
  train: 'train',
  commute: 'other'
};

/**
 * Imports the summary CSV produced by historyExport.ts (Date, Start
 * datetime, Sport, Distance, Duration, Avg speed — one row per trip).
 *
 * IMPORTANT: this is a lossy round-trip. The summary CSV never contained
 * GPS samples, segments, or checkpoint events, so imported trips are
 * reconstructed with those left empty — only the top-line metrics survive.
 * This is intended for the "I recorded on my other phone, I just want it to
 * show up in history over here" case, not as a full backup/restore path.
 * For full fidelity, use a trip's own "Export JSON" (there is currently no
 * matching JSON import, only this CSV summary import).
 */
export function parseTripsSummaryCsv(csvText: string): ParsedTripsCsvResult {
  const lines = csvText.split(/\r\n|\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { trips: [], errors: ['The file is empty.'] };
  }

  const header = parseCsvLine(lines[0]).map((cell) => cell.trim());
  const columnIndex = (name: string) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const startIdx = columnIndex('Start datetime');
  const sportIdx = columnIndex('Sport');
  const distanceIdx = columnIndex('Distance');
  const durationIdx = columnIndex('Duration');
  const speedIdx = columnIndex('Avg speed');

  const missing = REQUIRED_COLUMNS.filter((name) => columnIndex(name) === -1);
  if (missing.length > 0) {
    return {
      trips: [],
      errors: [
        `This doesn't look like a CommuteRadar trips CSV — missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`
      ]
    };
  }

  const trips: Trip[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1; // 1-based, matches what a spreadsheet app would show
    const cols = parseCsvLine(lines[i]);

    const startedAtRaw = cols[startIdx]?.trim();
    const startedAtDate = startedAtRaw ? new Date(startedAtRaw) : null;
    if (!startedAtDate || Number.isNaN(startedAtDate.getTime())) {
      errors.push(`Row ${rowNumber}: couldn't parse start datetime "${startedAtRaw ?? ''}" — skipped.`);
      continue;
    }

    const durationMs = parseDurationMs(cols[durationIdx] ?? '');
    if (durationMs === null) {
      errors.push(`Row ${rowNumber}: couldn't parse duration "${cols[durationIdx] ?? ''}" — skipped.`);
      continue;
    }

    const distanceMeters = parseDistanceMeters(cols[distanceIdx] ?? '');
    if (distanceMeters === null) {
      errors.push(`Row ${rowNumber}: couldn't parse distance "${cols[distanceIdx] ?? ''}" — skipped.`);
      continue;
    }

    const parsedSpeed = speedIdx !== -1 ? parseSpeedMps(cols[speedIdx] ?? '') : null;
    const averageSpeedMps = parsedSpeed ?? (durationMs > 0 ? distanceMeters / (durationMs / 1000) : 0);
    const mode = parseSportLabel(cols[sportIdx] ?? '');

    const startedAt = startedAtDate.toISOString();
    const endedAt = new Date(startedAtDate.getTime() + durationMs).toISOString();

    trips.push({
      id: crypto.randomUUID(),
      schemaVersion: 1,
      mode,
      startedAt,
      endedAt,
      status: 'completed',
      distanceMeters,
      durationMs,
      movingDurationMs: durationMs,
      averageSpeedMps,
      maxSpeedMps: averageSpeedMps,
      samples: [],
      segments: [],
      checkpoints: [],
      sampleCount: 0,
      rejectedSampleCount: 0
    });
  }

  return { trips, errors };
}

/** Parses one CSV row, honoring double-quoted fields with "" as an escaped quote (RFC 4180). */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseDurationMs(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const numbers = parts.map((p) => parseInt(p, 10));
  if (numbers.some((n) => Number.isNaN(n))) return null;

  const seconds = numbers.length === 3 ? numbers[0] * 3600 + numbers[1] * 60 + numbers[2] : numbers[0] * 60 + numbers[1];
  return seconds * 1000;
}

function parseDistanceMeters(text: string): number | null {
  const match = text.trim().match(/^(-?[\d.]+)\s*(km|mi|m|ft)$/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return null;

  switch (match[2].toLowerCase()) {
    case 'km':
      return value * 1000;
    case 'mi':
      return value * 1609.344;
    case 'ft':
      return value / 3.28084;
    default: // 'm'
      return value;
  }
}

function parseSpeedMps(text: string): number | null {
  const match = text.trim().match(/^(-?[\d.]+)\s*(km\/h|mph)$/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (Number.isNaN(value)) return null;
  return match[2].toLowerCase() === 'mph' ? (value * 1609.344) / 3600 : value / 3.6;
}

function parseSportLabel(label: string): TravelMode {
  return SPORT_LABEL_TO_MODE[label.trim().toLowerCase()] ?? 'other';
}
