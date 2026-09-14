import { useRef, useState, type ChangeEvent } from 'react';
import type { Trip } from '../types/trip';
import type { AppSettings } from '../types/settings';
import { TripListItem } from '../components/History/TripListItem';
import { TripDetail } from '../components/History/TripDetail';
import { exportTripsSummaryCsv } from '../utils/historyExport';
import { filterDuplicateTrips, parseTripsSummaryCsv } from '../utils/historyImport';
import { StatusBadge } from '../components/common/StatusBadge';

interface HistoryProps {
  trips: Trip[];
  settings: AppSettings;
  onDeleteTrip: (id: string) => void;
  onImportTrips: (trips: Trip[]) => void;
}

interface ImportResult {
  importedCount: number;
  skippedDuplicates: number;
  errors: string[];
}

export function History({ trips, settings, onDeleteTrip, onImportTrips }: HistoryProps) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? null;

  const handleImportClick = () => {
    setImportResult(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;

    try {
      const text = await file.text();
      const { trips: parsedTrips, errors } = parseTripsSummaryCsv(text);
      const { newTrips, skippedCount } = filterDuplicateTrips(trips, parsedTrips);

      if (newTrips.length > 0) {
        onImportTrips(newTrips);
      }
      setImportResult({ importedCount: newTrips.length, skippedDuplicates: skippedCount, errors });
    } catch {
      setImportResult({ importedCount: 0, skippedDuplicates: 0, errors: ['Could not read the selected file.'] });
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>History</h1>
        <div className="stack" style={{ flexDirection: 'row', gap: 8 }}>
          <button className="secondary-button" onClick={handleImportClick}>
            Import CSV
          </button>
          {trips.length > 0 && (
            <button className="secondary-button" onClick={() => exportTripsSummaryCsv(trips, settings.units)}>
              Export CSV
            </button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleFileChange}
        className="visually-hidden"
        aria-label="Import trips from CSV"
      />

      {importResult && (
        <div className="card stack" role="status">
          {importResult.importedCount > 0 && (
            <StatusBadge tone="success" label={`Imported ${importResult.importedCount} trip${importResult.importedCount === 1 ? '' : 's'}`} />
          )}
          {importResult.skippedDuplicates > 0 && (
            <StatusBadge
              tone="warning"
              label={`Skipped ${importResult.skippedDuplicates} duplicate${importResult.skippedDuplicates === 1 ? '' : 's'} already in history`}
            />
          )}
          {importResult.errors.length > 0 && (
            <div className="stack" style={{ gap: 4 }}>
              {importResult.importedCount === 0 && <StatusBadge tone="danger" label="Import failed" />}
              {importResult.errors.map((error, index) => (
                <p key={index} style={{ margin: 0, fontSize: '0.85rem' }}>
                  {error}
                </p>
              ))}
            </div>
          )}
          <p style={{ margin: 0, fontSize: '0.8rem' }}>
            Imported trips only carry the summary metrics from the CSV (date, sport, distance, duration, average
            speed) — no route, segments, or checkpoints, since those aren't part of this export format.
          </p>
        </div>
      )}

      {trips.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0 }}>
            No trips yet — completed commutes will show up here, or import a CSV exported from another device.
          </p>
        </div>
      ) : (
        trips.map((trip) => (
          <TripListItem key={trip.id} trip={trip} units={settings.units} onOpen={(t) => setSelectedTripId(t.id)} />
        ))
      )}
    </div>
  );
}
