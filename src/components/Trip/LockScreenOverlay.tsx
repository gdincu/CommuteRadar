import { useState } from 'react';

interface LockScreenOverlayProps {
  onUnlock: () => void;
}

// Slide (or press End/arrow keys, for keyboard/assistive-tech access) to
// this value to unlock — matches the native <input type="range"> keyboard
// behavior for free, so no separate "Unlock" button is needed.
const UNLOCK_THRESHOLD = 95;

/**
 * Full-screen overlay shown while a trip is being tracked, so the phone can
 * sit in a pocket/on a handlebar mount without accidental taps pausing or
 * stopping the trip. Only the slider is interactive; everything else
 * (Pause/Stop, nav) is covered and unreachable until unlocked.
 */
export function LockScreenOverlay({ onUnlock }: LockScreenOverlayProps) {
  const [sliderValue, setSliderValue] = useState(0);

  const handleSliderChange = (value: number) => {
    if (value >= UNLOCK_THRESHOLD) {
      onUnlock();
      return;
    }
    setSliderValue(value);
  };

  return (
    <div className="touch-lock-overlay" role="dialog" aria-modal="true" aria-label="Screen locked while tracking">
      <div className="lock-status">🔒 Screen locked</div>

      <input
        type="range"
        min={0}
        max={100}
        value={sliderValue}
        onChange={(e) => handleSliderChange(Number(e.target.value))}
        className="unlock-slider"
        aria-label="Slide to unlock, or use arrow keys and press End"
      />
      <div className="unlock-hint">Slide to unlock</div>
    </div>
  );
}
