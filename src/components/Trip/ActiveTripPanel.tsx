import type { Trip } from '../../types/trip';
import type { UnitSystem } from '../../types/settings';
import { formatDistance, formatSpeed, travelModeIcon, travelModeLabel } from '../../utils/formatting';
import { formatDuration } from '../../utils/time';
import { StatusBadge } from '../common/StatusBadge';

interface ActiveTripPanelProps {
  trip: Trip;
  currentSpeedMps: number;
  units: UnitSystem;
  reachedCheckpointNames: string[];
  gpsWarning?: string;
}

/**
 * Deliberately just numbers — no charts, no map. This is the screen a
 * person glances at mid-stride or mid-pedal, so everything is large,
 * high-contrast, and requires zero interpretation.
 */
export function ActiveTripPanel({ trip, currentSpeedMps, units, reachedCheckpointNames, gpsWarning }: ActiveTripPanelProps) {
  return (
    <div className="stack" aria-live="off">
      <div style={{ textAlign: 'center' }}>
        <span className="badge">
          {travelModeIcon(trip.mode)} {travelModeLabel(trip.mode)}
        </span>
      </div>

      {gpsWarning && (
        <div role="status" style={{ textAlign: 'center' }}>
          <StatusBadge tone="warning" label={gpsWarning} />
        </div>
      )}

      <div className="card stack" style={{ textAlign: 'center' }}>
        <span className="metric-label">Elapsed time</span>
        <span className="metric-value" style={{ fontSize: '3rem' }} aria-live="polite">
          {formatDuration(trip.durationMs)}
        </span>
        <span className="metric-label">Distance</span>
        <span className="metric-value">{formatDistance(trip.distanceMeters, units)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="metric-label">Average speed</div>
          <div className="metric-value" style={{ fontSize: '1.6rem' }}>
            {formatSpeed(trip.averageSpeedMps ?? 0, units)}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="metric-label">Current speed</div>
          <div className="metric-value" style={{ fontSize: '1.6rem' }}>
            {formatSpeed(currentSpeedMps, units)}
          </div>
        </div>
      </div>

      {reachedCheckpointNames.length > 0 && (
        <div className="card stack">
          <span className="metric-label">Checkpoints</span>
          <div className="stack" style={{ gap: 6 }}>
            {reachedCheckpointNames.map((name, index) => (
              <StatusBadge key={`${name}-${index}`} tone="success" label={`${name} · Reached`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
