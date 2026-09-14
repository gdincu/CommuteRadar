import { useState } from 'react';
import type { AppSettings, GpsProfile, UnitSystem } from '../types/settings';
import type { Checkpoint } from '../types/checkpoint';
import { CheckpointForm } from '../components/Checkpoints/CheckpointForm';
import { CheckpointListItem } from '../components/Checkpoints/CheckpointListItem';
import { PrivacyControls } from '../components/Settings/PrivacyControls';
import { PermissionCard } from '../components/common/PermissionCard';
import { useNotifications } from '../hooks/useNotifications';

interface SettingsProps {
  settings: AppSettings;
  checkpoints: Checkpoint[];
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onSaveCheckpoint: (checkpoint: Checkpoint) => void;
  onToggleCheckpoint: (id: string, enabled: boolean) => void;
  onDeleteCheckpoint: (id: string) => void;
  onDeleteAllTrips: () => void;
  onDeleteAllCheckpoints: () => void;
  onClearAllData: () => void;
}

export function Settings({
  settings,
  checkpoints,
  onUpdateSettings,
  onSaveCheckpoint,
  onToggleCheckpoint,
  onDeleteCheckpoint,
  onDeleteAllTrips,
  onDeleteAllCheckpoints,
  onClearAllData
}: SettingsProps) {
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [creatingCheckpoint, setCreatingCheckpoint] = useState(false);
  const notifications = useNotifications();

  const showingForm = creatingCheckpoint || editingCheckpoint !== null;

  return (
    <div className="screen stack">
      <h1>Settings</h1>

      <div className="card stack">
        <h3>Units</h3>
        <div className="stack" style={{ flexDirection: 'row' }}>
          {(['metric', 'imperial'] as UnitSystem[]).map((unit) => (
            <button
              key={unit}
              className="secondary-button"
              style={{
                flex: 1,
                borderColor: settings.units === unit ? 'var(--accent)' : undefined,
                color: settings.units === unit ? 'var(--accent)' : undefined
              }}
              aria-pressed={settings.units === unit}
              onClick={() => onUpdateSettings({ units: unit })}
            >
              {unit === 'metric' ? 'Metric (km)' : 'Imperial (mi)'}
            </button>
          ))}
        </div>
      </div>

      <div className="card stack">
        <h3>Battery &amp; GPS accuracy</h3>
        <p>
          Higher accuracy gives smoother tracking but uses more battery. This trades continuous GPS precision for
          battery life — it never disables tracking outright.
        </p>
        {(
          [
            ['batterySaver', 'Battery saver', 'Lower accuracy, less frequent updates'],
            ['balanced', 'Balanced', 'Good accuracy for most commutes (recommended)'],
            ['highAccuracy', 'High accuracy', 'Best precision, uses the most battery']
          ] as [GpsProfile, string, string][]
        ).map(([value, label, description]) => (
          <label key={value} className="card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input
              type="radio"
              name="gps-profile"
              checked={settings.gpsProfile === value}
              onChange={() => onUpdateSettings({ gpsProfile: value })}
              style={{ marginTop: 4 }}
            />
            <span>
              <div style={{ fontWeight: 600 }}>{label}</div>
              <div className="metric-label" style={{ textTransform: 'none', letterSpacing: 0 }}>
                {description}
              </div>
            </span>
          </label>
        ))}
      </div>

      <div className="card stack">
        <h3>Theme</h3>
        <div className="stack" style={{ flexDirection: 'row' }}>
          <button
            className="secondary-button"
            style={{ flex: 1, borderColor: settings.theme === 'dark' ? 'var(--accent)' : undefined }}
            aria-pressed={settings.theme === 'dark'}
            onClick={() => onUpdateSettings({ theme: 'dark' })}
          >
            Dark
          </button>
          <button
            className="secondary-button"
            style={{ flex: 1, borderColor: settings.theme === 'light' ? 'var(--accent)' : undefined }}
            aria-pressed={settings.theme === 'light'}
            onClick={() => onUpdateSettings({ theme: 'light' })}
          >
            Light
          </button>
        </div>
      </div>

      {notifications.isSupported && notifications.permission !== 'granted' && (
        <PermissionCard
          title="Notifications"
          rationale="Get a notification when you reach a checkpoint, even if you're not looking at the app."
          actionLabel="Enable notifications"
          isDenied={notifications.permission === 'denied'}
          deniedMessage="Notifications are disabled. Enable them in your browser settings to get checkpoint alerts."
          onRequest={async () => {
            const result = await notifications.requestPermission();
            onUpdateSettings({ hasSeenNotificationRationale: true, notificationsEnabled: result === 'granted' });
          }}
        />
      )}

      {notifications.isSupported && (
        <div className="card stack">
          <h3>Checkpoint alerts</h3>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              disabled={notifications.permission !== 'granted'}
              onChange={(e) => onUpdateSettings({ notificationsEnabled: e.target.checked })}
              style={{ marginTop: 4 }}
            />
            <span>
              <div style={{ fontWeight: 600 }}>Enable checkpoint notifications</div>
              <div className="metric-label" style={{ textTransform: 'none', letterSpacing: 0 }}>
                {notifications.permission !== 'granted'
                  ? 'Grant browser permission above first — then turn alerts on here.'
                  : 'Master switch for all checkpoint arrival notifications. Individual checkpoints still opt in separately.'}
              </div>
            </span>
          </label>
        </div>
      )}

      <div className="card stack">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Checkpoints</h3>
          {!showingForm && (
            <button className="secondary-button" onClick={() => setCreatingCheckpoint(true)}>
              + Add
            </button>
          )}
        </div>

        {showingForm ? (
          <CheckpointForm
            initial={editingCheckpoint ?? undefined}
            onCancel={() => {
              setCreatingCheckpoint(false);
              setEditingCheckpoint(null);
            }}
            onSave={(checkpoint) => {
              onSaveCheckpoint(checkpoint);
              setCreatingCheckpoint(false);
              setEditingCheckpoint(null);
            }}
          />
        ) : checkpoints.length === 0 ? (
          <p>No checkpoints yet. Add your office, home, or a station to get alerts when you arrive.</p>
        ) : (
          checkpoints.map((checkpoint) => (
            <CheckpointListItem
              key={checkpoint.id}
              checkpoint={checkpoint}
              onToggle={onToggleCheckpoint}
              onEdit={setEditingCheckpoint}
              onDelete={onDeleteCheckpoint}
            />
          ))
        )}
      </div>

      <PrivacyControls
        onDeleteTrips={onDeleteAllTrips}
        onDeleteCheckpoints={onDeleteAllCheckpoints}
        onClearAll={onClearAllData}
      />

      <div className="card stack">
        <h3>Install CommuteRadar</h3>
        <p>
          For the best experience — including offline access — install CommuteRadar to your home screen using your
          browser's "Add to Home Screen" or "Install app" option.
        </p>
      </div>
    </div>
  );
}
