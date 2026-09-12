import type { Trip as TripModel } from '../types/trip';
import type { AppSettings } from '../types/settings';
import type { TripTrackerState } from '../hooks/useTripTracker';
import { ActiveTripPanel } from '../components/Trip/ActiveTripPanel';
import type { GeolocationStatus } from '../services/geolocation';

interface TripPageProps {
  trip: TripModel;
  trackerState: TripTrackerState;
  currentSpeedMps: number;
  settings: AppSettings;
  reachedCheckpointNames: string[];
  gpsStatus: GeolocationStatus | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function TripPage({
  trip,
  trackerState,
  currentSpeedMps,
  settings,
  reachedCheckpointNames,
  gpsStatus,
  onPause,
  onResume,
  onStop
}: TripPageProps) {
  const gpsWarning =
    gpsStatus && gpsStatus.reason !== 'permission-denied' && gpsStatus.reason !== 'unsupported'
      ? gpsStatus.message
      : undefined;

  return (
    <div className="screen stack">
      <ActiveTripPanel
        trip={trip}
        currentSpeedMps={currentSpeedMps}
        units={settings.units}
        reachedCheckpointNames={reachedCheckpointNames}
        gpsWarning={gpsWarning}
      />

      <div className="stack" style={{ flexDirection: 'row' }}>
        {trackerState === 'active' ? (
          <button className="secondary-button" style={{ flex: 1 }} onClick={onPause}>
            Pause
          </button>
        ) : (
          <button className="secondary-button" style={{ flex: 1 }} onClick={onResume}>
            Resume
          </button>
        )}
        <button className="primary-button danger-button" style={{ flex: 1 }} onClick={onStop}>
          Stop Trip
        </button>
      </div>
    </div>
  );
}
