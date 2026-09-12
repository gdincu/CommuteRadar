import type { TravelMode } from '../../types/trip';
import { travelModeIcon, travelModeLabel } from '../../utils/formatting';

const MODES: TravelMode[] = ['bike', 'run', 'walk', 'train', 'other'];

interface StartTripCardProps {
  selectedMode: TravelMode;
  onSelectMode: (mode: TravelMode) => void;
  onStart: () => void;
  disabled?: boolean;
}

export function StartTripCard({ selectedMode, onSelectMode, onStart, disabled }: StartTripCardProps) {
  return (
    <div className="card stack">
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="metric-label" style={{ marginBottom: 8 }}>
          Travel mode
        </legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {MODES.map((mode) => {
            const isSelected = mode === selectedMode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectMode(mode)}
                className="secondary-button"
                style={{
                  flexDirection: 'column',
                  display: 'flex',
                  gap: 4,
                  borderColor: isSelected ? 'var(--accent)' : undefined,
                  color: isSelected ? 'var(--accent)' : undefined
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '1.3rem' }}>
                  {travelModeIcon(mode)}
                </span>
                <span style={{ fontSize: '0.75rem' }}>{travelModeLabel(mode)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <button className="primary-button" onClick={onStart} disabled={disabled}>
        Start Trip
      </button>
      <p style={{ textAlign: 'center', margin: 0 }}>Ready to track</p>
    </div>
  );
}
