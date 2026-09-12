import { useCallback, useEffect, useRef, useState } from 'react';
import { GeolocationTracker, type GeolocationStatus, type RawFix } from '../services/geolocation';
import type { GeolocationTuning } from '../types/settings';

export interface UseGeolocationResult {
  isSupported: boolean;
  isWatching: boolean;
  lastFix: RawFix | null;
  status: GeolocationStatus | null;
  start: (tuning: GeolocationTuning) => void;
  stop: () => void;
}

/**
 * React-facing wrapper around GeolocationTracker. `onFix` is intentionally a
 * ref-backed callback (not re-subscribed on every render) so callers can
 * pass an inline function without churning the underlying watchPosition
 * subscription.
 */
export function useGeolocation(onFix: (fix: RawFix) => void): UseGeolocationResult {
  const [isWatching, setIsWatching] = useState(false);
  const [lastFix, setLastFix] = useState<RawFix | null>(null);
  const [status, setStatus] = useState<GeolocationStatus | null>(null);

  const onFixRef = useRef(onFix);
  onFixRef.current = onFix;

  const trackerRef = useRef<GeolocationTracker | null>(null);
  if (!trackerRef.current) {
    trackerRef.current = new GeolocationTracker(
      (fix) => {
        setLastFix(fix);
        onFixRef.current(fix);
      },
      (nextStatus) => {
        setStatus(nextStatus);
        if (nextStatus.reason === 'permission-denied' || nextStatus.reason === 'unsupported') {
          setIsWatching(false);
        }
      }
    );
  }

  useEffect(() => {
    const tracker = trackerRef.current!;
    return () => tracker.stop();
  }, []);

  const start = useCallback((tuning: GeolocationTuning) => {
    setStatus(null);
    trackerRef.current!.start(tuning);
    setIsWatching(true);
  }, []);

  const stop = useCallback(() => {
    trackerRef.current!.stop();
    setIsWatching(false);
  }, []);

  return {
    isSupported: trackerRef.current.isSupported(),
    isWatching,
    lastFix,
    status,
    start,
    stop
  };
}
