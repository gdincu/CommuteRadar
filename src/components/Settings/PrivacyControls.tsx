import { useState } from 'react';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface PrivacyControlsProps {
  onDeleteTrips: () => void;
  onDeleteCheckpoints: () => void;
  onClearAll: () => void;
}

type PendingAction = 'trips' | 'checkpoints' | 'all' | null;

export function PrivacyControls({ onDeleteTrips, onDeleteCheckpoints, onClearAll }: PrivacyControlsProps) {
  const [pending, setPending] = useState<PendingAction>(null);

  const confirmAndRun = () => {
    if (pending === 'trips') onDeleteTrips();
    if (pending === 'checkpoints') onDeleteCheckpoints();
    if (pending === 'all') onClearAll();
    setPending(null);
  };

  return (
    <div className="card stack">
      <h3>Privacy</h3>
      <p>
        Your location and trip data stay on this device. CommuteRadar has no account, no analytics, no ad SDK, and
        never uploads location data to a server.
      </p>
      <button className="secondary-button" onClick={() => setPending('trips')}>
        Delete all trip history
      </button>
      <button className="secondary-button" onClick={() => setPending('checkpoints')}>
        Delete all checkpoints
      </button>
      <button className="secondary-button danger-button" onClick={() => setPending('all')}>
        Clear all CommuteRadar data
      </button>

      <ConfirmDialog
        open={pending !== null}
        title={pending === 'all' ? 'Clear all data?' : 'Delete this data?'}
        description={
          pending === 'all'
            ? 'This deletes every trip, checkpoint, and setting stored by CommuteRadar on this device. This cannot be undone.'
            : 'This permanently deletes the selected data from this device. This cannot be undone.'
        }
        confirmLabel="Delete"
        onCancel={() => setPending(null)}
        onConfirm={confirmAndRun}
      />
    </div>
  );
}
