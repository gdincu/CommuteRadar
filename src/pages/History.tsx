import { useState } from 'react';
import type { Trip } from '../types/trip';
import type { AppSettings } from '../types/settings';
import { TripListItem } from '../components/History/TripListItem';
import { TripDetail } from '../components/History/TripDetail';

interface HistoryProps {
  trips: Trip[];
  settings: AppSettings;
  onDeleteTrip: (id: string) => void;
}

export function History({ trips, settings, onDeleteTrip }: HistoryProps) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;

  if (selectedTrip) {
    return (
      <div className="screen">
        <TripDetail
          trip={selectedTrip}
          units={settings.units}
          onBack={() => setSelectedTripId(null)}
          onDelete={(id) => {
            onDeleteTrip(id);
            setSelectedTripId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="screen stack">
      <h1>History</h1>
      {trips.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>No trips yet — completed commutes will show up here.</p>
        </div>
      ) : (
        trips.map((trip) => (
          <TripListItem key={trip.id} trip={trip} units={settings.units} onOpen={(t) => setSelectedTripId(t.id)} />
        ))
      )}
    </div>
  );
}
