import type { Trip } from '../../types/trip';
import type { UnitSystem } from '../../types/settings';
import { formatClockDate, formatDistance, formatSpeed, travelModeIcon, travelModeLabel } from '../../utils/formatting';
import { formatDuration } from '../../utils/time';

interface TripListItemProps {
  trip: Trip;
  units: UnitSystem;
  onOpen: (trip: Trip) => void;
}

export function TripListItem({ trip, units, onOpen }: TripListItemProps) {
  return (
    <button
      className="card"
      style={{ textAlign: 'left', width: '100%', border: '1px solid var(--border)' }}
      onClick={() => onOpen(trip)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="metric-label">{formatClockDate(trip.startedAt)}</span>
        {trip.checkpoints.length > 0 && (
          <span className="metric-label">
            {trip.checkpoints.length} checkpoint{trip.checkpoints.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {travelModeIcon(trip.mode)} {travelModeLabel(trip.mode)}
      </div>
      <div style={{ color: 'var(--text-muted)' }}>
        {formatDistance(trip.distanceMeters, units)} · {formatDuration(trip.durationMs)} ·{' '}
        {formatSpeed(trip.averageSpeedMps ?? 0, units)}
      </div>
    </button>
  );
}
