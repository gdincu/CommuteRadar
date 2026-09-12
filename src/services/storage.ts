import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Trip } from '../types/trip';
import type { Checkpoint } from '../types/checkpoint';
import type { AppSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

interface CommuteRadarDB extends DBSchema {
  trips: {
    key: string;
    value: Trip;
    indexes: { 'by-startedAt': string };
  };
  checkpoints: {
    key: string;
    value: Checkpoint;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  activeTrip: {
    key: string;
    value: Trip;
  };
}

const DB_NAME = 'commuteradar';
const DB_VERSION = 1;
const SETTINGS_KEY = 'app-settings';
const ACTIVE_TRIP_KEY = 'current';

let dbPromise: Promise<IDBPDatabase<CommuteRadarDB>> | null = null;

export class StorageUnavailableError extends Error {
  // Declared explicitly rather than relying on lib.es2022.error's built-in
  // `cause` typing, since this project targets ES2020.
  cause?: unknown;

  constructor(cause?: unknown) {
    super('Local storage is unavailable in this browser.');
    this.name = 'StorageUnavailableError';
    this.cause = cause;
  }
}

function getDb(): Promise<IDBPDatabase<CommuteRadarDB>> {
  if (!('indexedDB' in window)) {
    return Promise.reject(new StorageUnavailableError());
  }
  if (!dbPromise) {
    dbPromise = openDB<CommuteRadarDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('trips')) {
          const store = db.createObjectStore('trips', { keyPath: 'id' });
          store.createIndex('by-startedAt', 'startedAt');
        }
        if (!db.objectStoreNames.contains('checkpoints')) {
          db.createObjectStore('checkpoints', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('activeTrip')) {
          db.createObjectStore('activeTrip');
        }
      }
    }).catch((err) => {
      throw new StorageUnavailableError(err);
    });
  }
  return dbPromise;
}

export const tripRepository = {
  async save(trip: Trip): Promise<void> {
    const db = await getDb();
    await db.put('trips', trip);
  },
  async getAll(): Promise<Trip[]> {
    const db = await getDb();
    const all = await db.getAllFromIndex('trips', 'by-startedAt');
    return all.reverse(); // most recent first
  },
  async getById(id: string): Promise<Trip | undefined> {
    const db = await getDb();
    return db.get('trips', id);
  },
  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('trips', id);
  },
  async deleteAll(): Promise<void> {
    const db = await getDb();
    await db.clear('trips');
  }
};

export const checkpointRepository = {
  async save(checkpoint: Checkpoint): Promise<void> {
    const db = await getDb();
    await db.put('checkpoints', checkpoint);
  },
  async getAll(): Promise<Checkpoint[]> {
    const db = await getDb();
    return db.getAll('checkpoints');
  },
  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('checkpoints', id);
  },
  async deleteAll(): Promise<void> {
    const db = await getDb();
    await db.clear('checkpoints');
  }
};

export const settingsRepository = {
  async get(): Promise<AppSettings> {
    const db = await getDb();
    const stored = await db.get('settings', SETTINGS_KEY);
    return stored ?? DEFAULT_SETTINGS;
  },
  async save(settings: AppSettings): Promise<void> {
    const db = await getDb();
    await db.put('settings', settings, SETTINGS_KEY);
  }
};

/**
 * Holds the in-progress trip so it survives an accidental reload/crash while
 * tracking. Cleared once a trip is finalized into `tripRepository`.
 */
export const activeTripRepository = {
  async get(): Promise<Trip | undefined> {
    const db = await getDb();
    return db.get('activeTrip', ACTIVE_TRIP_KEY);
  },
  async save(trip: Trip): Promise<void> {
    const db = await getDb();
    await db.put('activeTrip', trip, ACTIVE_TRIP_KEY);
  },
  async clear(): Promise<void> {
    const db = await getDb();
    await db.delete('activeTrip', ACTIVE_TRIP_KEY);
  }
};

/** Wipes every CommuteRadar object store. Used by the "Clear all data" privacy control. */
export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await Promise.all([
    db.clear('trips'),
    db.clear('checkpoints'),
    db.clear('settings'),
    db.clear('activeTrip')
  ]);
}

export async function estimateStorageUsage(): Promise<{ usageBytes: number; quotaBytes: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  return { usageBytes: usage ?? 0, quotaBytes: quota ?? 0 };
}
