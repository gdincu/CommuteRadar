import { useEffect, useMemo, useState } from 'react';
import { useHashRoute } from './hooks/useHashRoute';
import { useTripTracker } from './hooks/useTripTracker';
import { Home } from './pages/Home';
import { TripPage } from './pages/Trip';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { BottomNav } from './components/common/BottomNav';
import {
  checkpointRepository,
  clearAllData,
  settingsRepository,
  tripRepository
} from './services/storage';
import { requestLocationPermissionState } from './services/geolocation';
import { DeepLinkWhatsAppService } from './services/whatsapp';
import type { Checkpoint } from './types/checkpoint';
import type { AppSettings } from './types/settings';
import { DEFAULT_SETTINGS } from './types/settings';
import type { Trip, TravelMode } from './types/trip';

const whatsappService = new DeepLinkWhatsAppService();

export default function App() {
  const [route, navigate] = useHashRoute();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [locationPermission, setLocationPermission] = useState<PermissionState | 'unsupported'>('unsupported');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void Promise.all([settingsRepository.get(), checkpointRepository.getAll(), tripRepository.getAll()]).then(
      ([storedSettings, storedCheckpoints, storedTrips]) => {
        setSettings(storedSettings);
        setCheckpoints(storedCheckpoints);
        setTrips(storedTrips);
        setLoaded(true);
      }
    );
    void requestLocationPermissionState().then(setLocationPermission);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const tracker = useTripTracker({ checkpoints, settings, whatsappService });

  // Keep the router in sync with tracker state — jump to the trip screen the
  // moment a trip starts (including a recovered paused trip after reload),
  // and back to the dashboard once it ends.
  useEffect(() => {
    if (tracker.state !== 'idle' && route !== 'trip') {
      navigate('trip');
    }
    // Intentionally not reacting to `route`/`navigate` changes themselves —
    // only to tracker.state transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracker.state]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void settingsRepository.save(next);
      return next;
    });
  };

  const saveCheckpoint = (checkpoint: Checkpoint) => {
    void checkpointRepository.save(checkpoint);
    setCheckpoints((prev) => {
      const exists = prev.some((c) => c.id === checkpoint.id);
      return exists ? prev.map((c) => (c.id === checkpoint.id ? checkpoint : c)) : [...prev, checkpoint];
    });
  };

  const toggleCheckpoint = (id: string, enabled: boolean) => {
    setCheckpoints((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, enabled } : c));
      const updated = next.find((c) => c.id === id);
      if (updated) void checkpointRepository.save(updated);
      return next;
    });
  };

  const deleteCheckpoint = (id: string) => {
    void checkpointRepository.delete(id);
    setCheckpoints((prev) => prev.filter((c) => c.id !== id));
  };

  const deleteTrip = (id: string) => {
    void tripRepository.delete(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  const handleStart = (mode: TravelMode) => {
    tracker.start(mode);
  };

  const handleStop = () => {
    void tracker.stop().then((finished) => {
      if (finished && finished.status === 'completed') {
        setTrips((prev) => [finished, ...prev]);
      }
      navigate('home');
    });
  };

  const lastTrip = useMemo(() => trips[0] ?? null, [trips]);

  if (!loaded) {
    return (
      <div className="app-shell">
        <div className="screen">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {route === 'home' && (
        <Home
          settings={settings}
          lastTrip={lastTrip}
          isGeolocationSupported={tracker.isSupported}
          locationPermission={locationPermission}
          onRequestLocationRationaleSeen={() => {
            updateSettings({ hasSeenLocationRationale: true });
            void requestLocationPermissionState().then(setLocationPermission);
          }}
          onStart={handleStart}
        />
      )}

      {route === 'trip' && tracker.trip && (
        <TripPage
          trip={tracker.trip}
          trackerState={tracker.state}
          currentSpeedMps={tracker.currentSpeedMps}
          settings={settings}
          reachedCheckpointNames={tracker.reachedCheckpointNames}
          gpsStatus={tracker.gpsStatus}
          onPause={tracker.pause}
          onResume={tracker.resume}
          onStop={handleStop}
        />
      )}

      {route === 'history' && <History trips={trips} settings={settings} onDeleteTrip={deleteTrip} />}

      {route === 'settings' && (
        <Settings
          settings={settings}
          checkpoints={checkpoints}
          onUpdateSettings={updateSettings}
          onSaveCheckpoint={saveCheckpoint}
          onToggleCheckpoint={toggleCheckpoint}
          onDeleteCheckpoint={deleteCheckpoint}
          onDeleteAllTrips={() => {
            void tripRepository.deleteAll();
            setTrips([]);
          }}
          onDeleteAllCheckpoints={() => {
            void checkpointRepository.deleteAll();
            setCheckpoints([]);
          }}
          onClearAllData={() => {
            void clearAllData();
            setTrips([]);
            setCheckpoints([]);
            setSettings(DEFAULT_SETTINGS);
          }}
        />
      )}

      {tracker.state === 'idle' && <BottomNav current={route} onNavigate={navigate} />}
    </div>
  );
}
