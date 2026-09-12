import type { Trip } from '../../types/trip';
import type { UnitSystem } from '../../types/settings';
import { formatDistance, formatSpeed, travelModeIcon, travelModeLabel } from '../../utils/formatting';
import { formatDuration } from '../../utils/time';

interface LastCommuteSummaryProps {
  trip: Trip | null;
  units: UnitSystem;
}

export function LastCommuteSummary({ trip, units }: LastCommuteSummaryProps) {
  if (!trip) {
    return (
      <div className="card">
        <p style={{ margin: 0 }}>No commutes tracked yet — start your first trip above.</p>
      </div>
    );
  }

  return (
    <div className="card stack">
      <span className="metric-label">
        {travelModeIcon(trip.mode)} Last commute · {travelModeLabel(trip.mode)}
      </span>
      <div style={{ display: 'flex', gap: 20 }}>
        <div>
          <div className="metric-value" style={{ fontSize: '1.5rem' }}>
            {formatDistance(trip.distanceMeters, units)}
          </div>
        </div>
        <div>
          <div className="metric-value" style={{ fontSize: '1.5rem' }}>
            {formatDuration(trip.durationMs)}
          </div>
        </div>
        <div>
          <div className="metric-value" style={{ fontSize: '1.5rem' }}>
            {formatSpeed(trip.averageSpeedMps ?? 0, units)}
          </div>
        </div>
      </div>
    </div>
  );
}
