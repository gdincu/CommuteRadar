import { useState } from 'react';
import type { Trip } from '../../types/trip';
import type { UnitSystem } from '../../types/settings';
import { formatDistance, formatSpeed, travelModeIcon, travelModeLabel } from '../../utils/formatting';
import { formatDuration } from '../../utils/time';
import { RoutePreview } from '../Trip/RoutePreview';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { downloadBlob } from '../../utils/download';

interface TripDetailProps {
  trip: Trip;
  units: UnitSystem;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export function TripDetail({ trip, units, onBack, onDelete }: TripDetailProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(trip, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `commuteradar-trip-${trip.id}.json`);
  };

  const exportCsv = () => {
    const header = 'latitude,longitude,accuracy,timestamp,speed\n';
    const rows = trip.samples
      .map((s) => `${s.latitude},${s.longitude},${s.accuracy},${s.timestamp},${s.speed ?? ''}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    downloadBlob(blob, `commuteradar-trip-${trip.id}.csv`);
  };

  return (
    <div className="stack">
      <button className="secondary-button" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        ← Back to history
      </button>

      <div className="card stack">
        <h2>
          {travelModeIcon(trip.mode)} {travelModeLabel(trip.mode)}
        </h2>
        <p>{new Date(trip.startedAt).toLocaleString()}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <Metric label="Distance" value={formatDistance(trip.distanceMeters, units)} />
          <Metric label="Duration" value={formatDuration(trip.durationMs)} />
          <Metric label="Avg speed" value={formatSpeed(trip.averageSpeedMps ?? 0, units)} />
          <Metric label="Max speed" value={formatSpeed(trip.maxSpeedMps ?? 0, units)} />
          <Metric label="GPS samples" value={String(trip.sampleCount)} />
          <Metric label="Checkpoints" value={String(trip.checkpoints.length)} />
        </div>
      </div>

      <RoutePreview samples={trip.samples} />

      {trip.checkpoints.length > 0 && (
        <div className="card stack">
          <h3>Checkpoints reached</h3>
          {trip.checkpoints.map((event, index) => (
            <div key={`${event.checkpointId}-${index}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{event.checkpointName}</span>
              <span style={{ color: 'var(--text-muted)' }}>{formatDuration(event.elapsedSinceTripStartMs)}</span>
            </div>
          ))}
        </div>
      )}

      {trip.segments.length > 1 && (
        <div className="card stack">
          <h3>Segments</h3>
          {trip.segments.map((segment, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Segment {index + 1}</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {formatDistance(segment.distanceMeters, units)} · {formatDuration(segment.durationMs)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="stack" style={{ flexDirection: 'row' }}>
        <button className="secondary-button" style={{ flex: 1 }} onClick={exportJson}>
          Export JSON
        </button>
        <button className="secondary-button" style={{ flex: 1 }} onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <button className="secondary-button danger-button" onClick={() => setConfirmingDelete(true)}>
        Delete this trip
      </button>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this trip?"
        description="This permanently removes the trip and its route data from this device. This cannot be undone."
        confirmLabel="Delete trip"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete(trip.id);
        }}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="metric-label">{label}</div>
      <div style={{ fontWeight: 700 }}>{value}</div>
    </div>
  );
}
