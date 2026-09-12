import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeolocation } from './useGeolocation';
import { CoordinateSmoother, decimateSamples, validateSample } from '../utils/geo';
import { computeMetrics, computeSegments } from '../services/metrics';
import { createProximityState, evaluateCheckpoints } from '../services/checkpoints';
import { showCheckpointNotification } from '../services/notifications';
import { activeTripRepository, tripRepository } from '../services/storage';
import { formatDistance, formatSpeed } from '../utils/formatting';
import { formatDurationWords } from '../utils/time';
import type { Trip, LocationSample, TravelMode } from '../types/trip';
import type { Checkpoint, CheckpointProximityState } from '../types/checkpoint';
import type { AppSettings } from '../types/settings';
import { GPS_PROFILES } from '../types/settings';
import type { WhatsAppService } from '../services/whatsapp';
import type { GeolocationStatus, RawFix } from '../services/geolocation';

export type TripTrackerState = 'idle' | 'active' | 'paused';

export interface UseTripTrackerOptions {
  checkpoints: Checkpoint[];
  settings: AppSettings;
  whatsappService: WhatsAppService;
}

export interface UseTripTrackerResult {
  state: TripTrackerState;
  trip: Trip | null;
  currentSpeedMps: number;
  gpsStatus: GeolocationStatus | null;
  reachedCheckpointNames: string[];
  isSupported: boolean;
  start: (mode: TravelMode) => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<Trip | null>;
  cancel: () => void;
}

const PERSIST_INTERVAL_MS = 5000; // batched writes — avoid hammering IndexedDB on every GPS tick
const UI_UPDATE_INTERVAL_MS = 1000; // throttle re-renders to once per second regardless of GPS frequency
const LOW_SPEED_SMOOTHING_THRESHOLD_MPS = 3.3; // ~12 km/h — above this, bypass smoothing to avoid corner-cutting
const DROPOUT_SEGMENT_BREAK_MS = 45000;
const MAX_STORED_SAMPLES_BEFORE_DECIMATION = 1500;

function createTrip(mode: TravelMode): Trip {
  return {
    id: crypto.randomUUID(),
    schemaVersion: 1,
    mode,
    startedAt: new Date().toISOString(),
    status: 'active',
    distanceMeters: 0,
    durationMs: 0,
    samples: [],
    segments: [],
    checkpoints: [],
    sampleCount: 0,
    rejectedSampleCount: 0
  };
}

export function useTripTracker(options: UseTripTrackerOptions): UseTripTrackerResult {
  const { checkpoints, settings, whatsappService } = options;

  const [state, setState] = useState<TripTrackerState>('idle');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [currentSpeedMps, setCurrentSpeedMps] = useState(0);
  const [reachedCheckpointNames, setReachedCheckpointNames] = useState<string[]>([]);

  const tripRef = useRef<Trip | null>(null);
  const smootherRef = useRef(new CoordinateSmoother());
  const proximityRef = useRef<CheckpointProximityState>(createProximityState());
  // Typed loosely: WakeLockSentinel may not be present in every TS DOM lib
  // version, and the API itself is optionally supported per-browser anyway.
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const perfStartRef = useRef(0);
  const accumulatedPausedMsRef = useRef(0);
  const lastPersistRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const lastFixTimestampRef = useRef(0);
  const checkpointsRef = useRef(checkpoints);
  checkpointsRef.current = checkpoints;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator) || wakeLockRef.current) return;
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
    } catch {
      // Wake lock is a battery-life nicety, not a correctness requirement —
      // tracking continues fine (subject to normal mobile background
      // limitations) even if this fails or is unsupported.
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && tripRef.current?.status === 'active') {
        void requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [requestWakeLock]);

  const persistActiveTrip = useCallback((force = false) => {
    const current = tripRef.current;
    if (!current) return;
    const nowMs = Date.now();
    if (!force && nowMs - lastPersistRef.current < PERSIST_INTERVAL_MS) return;
    lastPersistRef.current = nowMs;
    void activeTripRepository.save(current).catch(() => {
      // Persistence failures shouldn't interrupt an in-progress trip; the
      // user can still finish and we'll retry on the next tick or on stop().
    });
  }, []);

  const handleFix = useCallback(
    (fix: RawFix) => {
      const current = tripRef.current;
      if (!current || current.status !== 'active') return;

      current.sampleCount += 1;

      const tuning = GPS_PROFILES[settingsRef.current.gpsProfile];
      const previous = current.samples[current.samples.length - 1];

      const candidateForValidation: LocationSample = {
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        timestamp: fix.timestamp,
        speed: fix.speed
      };

      const validation = validateSample(previous, candidateForValidation, tuning);
      if (!validation.accepted) {
        current.rejectedSampleCount += 1;
        return;
      }

      let segmentBreak = false;
      if (previous && fix.timestamp - lastFixTimestampRef.current > DROPOUT_SEGMENT_BREAK_MS) {
        segmentBreak = true;
        smootherRef.current.reset();
      }
      lastFixTimestampRef.current = fix.timestamp;

      const speedMps = fix.speed ?? 0;
      let finalLat = fix.latitude;
      let finalLon = fix.longitude;

      if (speedMps <= LOW_SPEED_SMOOTHING_THRESHOLD_MPS) {
        const smoothed = smootherRef.current.smooth(fix.latitude, fix.longitude, fix.accuracy);
        finalLat = smoothed.latitude;
        finalLon = smoothed.longitude;
      } else {
        // Moving fast enough that smoothing would cut corners — trust the
        // raw fix and re-seed the filter so it doesn't "slingshot" back
        // once the user slows down again.
        smootherRef.current.seed(fix.latitude, fix.longitude);
      }

      const sample: LocationSample = {
        latitude: finalLat,
        longitude: finalLon,
        accuracy: fix.accuracy,
        timestamp: fix.timestamp,
        speed: fix.speed,
        segmentBreak
      };

      current.samples.push(sample);
      if (current.samples.length > MAX_STORED_SAMPLES_BEFORE_DECIMATION) {
        current.samples = decimateSamples(current.samples);
      }

      const metrics = computeMetrics(current.samples);
      current.distanceMeters = metrics.distanceMeters;
      current.movingDurationMs = metrics.movingDurationMs;
      current.averageSpeedMps = metrics.averageSpeedMps;
      current.maxSpeedMps = Math.max(current.maxSpeedMps ?? 0, metrics.maxSpeedMps);
      current.durationMs = accumulatedPausedMsRef.current + performance.now() - perfStartRef.current;

      const elapsedSinceStart = current.durationMs;
      const events = evaluateCheckpoints(
        checkpointsRef.current,
        proximityRef.current,
        { latitude: finalLat, longitude: finalLon },
        elapsedSinceStart
      );

      if (events.length > 0) {
        current.checkpoints.push(...events);
        for (const event of events) {
          const checkpoint = checkpointsRef.current.find((c) => c.id === event.checkpointId);
          if (!checkpoint) continue;

          if (checkpoint.notificationEnabled) {
            showCheckpointNotification({
              checkpointName: checkpoint.name,
              tripTimeLabel: formatDurationWords(event.elapsedSinceTripStartMs),
              distanceLabel: formatDistance(current.distanceMeters, settingsRef.current.units),
              averageSpeedLabel: formatSpeed(current.averageSpeedMps ?? 0, settingsRef.current.units)
            });
          }
          if (checkpoint.whatsappEnabled) {
            void whatsappService.sendCheckpointMessage(checkpoint, event, current, settingsRef.current.units);
          }
        }
        setReachedCheckpointNames((prevNames) => [...prevNames, ...events.map((e) => e.checkpointName)]);
      }

      setCurrentSpeedMps(speedMps);

      const nowMs = Date.now();
      if (nowMs - lastUiUpdateRef.current >= UI_UPDATE_INTERVAL_MS) {
        lastUiUpdateRef.current = nowMs;
        setTrip({ ...current });
      }

      persistActiveTrip();
    },
    [persistActiveTrip, whatsappService]
  );

  const { isSupported, start: startWatch, stop: stopWatch, status: gpsStatus } = useGeolocation(handleFix);

  const start = useCallback(
    (mode: TravelMode) => {
      const newTrip = createTrip(mode);
      tripRef.current = newTrip;
      setTrip(newTrip);
      setReachedCheckpointNames([]);
      proximityRef.current = createProximityState();
      smootherRef.current.reset();
      accumulatedPausedMsRef.current = 0;
      perfStartRef.current = performance.now();
      lastFixTimestampRef.current = 0;
      lastPersistRef.current = 0;

      void requestWakeLock();
      startWatch(GPS_PROFILES[settingsRef.current.gpsProfile]);
      setState('active');
    },
    [requestWakeLock, startWatch]
  );

  const pause = useCallback(() => {
    if (!tripRef.current) return;
    stopWatch();
    releaseWakeLock();
    accumulatedPausedMsRef.current += performance.now() - perfStartRef.current;
    setState('paused');
    persistActiveTrip(true);
  }, [stopWatch, releaseWakeLock, persistActiveTrip]);

  const resume = useCallback(() => {
    if (!tripRef.current) return;
    perfStartRef.current = performance.now();
    // Force the next fix to start a new visual segment rather than draw a
    // straight line across the paused gap (mirrors requiresNewSegment in
    // the reference implementation).
    lastFixTimestampRef.current = 0;
    void requestWakeLock();
    startWatch(GPS_PROFILES[settingsRef.current.gpsProfile]);
    setState('active');
  }, [requestWakeLock, startWatch]);

  const finalize = useCallback(
    async (status: Trip['status']): Promise<Trip | null> => {
      const current = tripRef.current;
      stopWatch();
      releaseWakeLock();
      if (!current) {
        setState('idle');
        return null;
      }

      current.endedAt = new Date().toISOString();
      current.status = status;
      current.samples = decimateSamples(current.samples);
      current.segments = computeSegments(current.samples);

      if (status === 'completed') {
        await tripRepository.save(current);
      }
      await activeTripRepository.clear();

      tripRef.current = null;
      setTrip(null);
      setState('idle');
      return current;
    },
    [stopWatch, releaseWakeLock]
  );

  const stop = useCallback(() => finalize('completed'), [finalize]);
  const cancel = useCallback(() => {
    void finalize('cancelled');
  }, [finalize]);

  // Resume an interrupted trip (e.g. after an accidental reload) from the
  // active-trip store on mount, so in-progress data isn't silently lost.
  useEffect(() => {
    void activeTripRepository.get().then((recovered) => {
      if (recovered && recovered.status === 'active') {
        // Trip.status has no "paused" state (see types/trip.ts) — pausing is
        // a runtime-only concept tracked by TripTrackerState. We keep the
        // persisted trip's status as 'active' and simply don't restart the
        // GPS watch until the user explicitly taps Resume.
        tripRef.current = recovered;
        // Continue elapsed-time accounting from where the trip left off —
        // performance.now() resets to 0 on every page load, so the duration
        // already recorded has to be carried forward as "paused" time.
        accumulatedPausedMsRef.current = recovered.durationMs;
        setTrip(recovered);
        setState('paused');
        proximityRef.current = createProximityState();
      }
    });
  }, []);

  return {
    state,
    trip,
    currentSpeedMps,
    gpsStatus,
    reachedCheckpointNames,
    isSupported,
    start,
    pause,
    resume,
    stop,
    cancel
  };
}
