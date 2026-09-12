import { useState } from 'react';
import type { TravelMode, Trip } from '../types/trip';
import type { AppSettings } from '../types/settings';
import { StartTripCard } from '../components/Dashboard/StartTripCard';
import { LastCommuteSummary } from '../components/Dashboard/LastCommuteSummary';
import { PermissionCard } from '../components/common/PermissionCard';

interface HomeProps {
  settings: AppSettings;
  lastTrip: Trip | null;
  isGeolocationSupported: boolean;
  locationPermission: PermissionState | 'unsupported';
  onRequestLocationRationaleSeen: () => void;
  onStart: (mode: TravelMode) => void;
}

export function Home({
  settings,
  lastTrip,
  isGeolocationSupported,
  locationPermission,
  onRequestLocationRationaleSeen,
  onStart
}: HomeProps) {
  const [selectedMode, setSelectedMode] = useState<TravelMode>('bike');

  if (!isGeolocationSupported) {
    return (
      <div className="screen stack">
        <h1>CommuteRadar</h1>
        <div className="card">
          <p style={{ margin: 0 }}>This browser doesn't support location tracking, so CommuteRadar can't track a trip here.</p>
        </div>
      </div>
    );
  }

  if (locationPermission === 'denied') {
    return (
      <div className="screen stack">
        <h1>CommuteRadar</h1>
        <PermissionCard
          title="Location access"
          rationale=""
          actionLabel=""
          isDenied
          deniedMessage="Location access is disabled. Enable location permission in your browser settings to track a commute."
          onRequest={() => undefined}
        />
      </div>
    );
  }

  if (locationPermission === 'prompt' && !settings.hasSeenLocationRationale) {
    return (
      <div className="screen stack">
        <h1>CommuteRadar</h1>
        <PermissionCard
          title="Location access"
          rationale="CommuteRadar needs your location while a trip is active to calculate distance, speed, and checkpoints. Location is never used outside an active trip and never leaves this device."
          actionLabel="Allow Location"
          onRequest={onRequestLocationRationaleSeen}
        />
      </div>
    );
  }

  return (
    <div className="screen stack">
      <h1>CommuteRadar</h1>
      <StartTripCard
        selectedMode={selectedMode}
        onSelectMode={setSelectedMode}
        onStart={() => onStart(selectedMode)}
      />
      <LastCommuteSummary trip={lastTrip} units={settings.units} />
    </div>
  );
}
