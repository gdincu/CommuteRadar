export type NotificationPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

export function getNotificationSupport(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!getNotificationSupport()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/**
 * Requests notification permission. Callers are responsible for only
 * invoking this from a direct user gesture (e.g. a settings toggle), and
 * for not calling it again once the user has made a choice — repeated
 * requests after a denial are a no-op in every browser anyway, but we also
 * track `hasSeenNotificationRationale` in settings so we never prompt
 * automatically on load.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!getNotificationSupport()) return 'unsupported';
  if (Notification.permission !== 'default') {
    return Notification.permission as NotificationPermissionState;
  }
  const result = await Notification.requestPermission();
  return result as NotificationPermissionState;
}

export interface CheckpointNotificationInput {
  checkpointName: string;
  tripTimeLabel: string;
  distanceLabel: string;
  averageSpeedLabel: string;
}

export function showCheckpointNotification(input: CheckpointNotificationInput): void {
  if (getNotificationPermission() !== 'granted') return;

  const body = `You reached ${input.checkpointName}.\nTrip time: ${input.tripTimeLabel}\nDistance: ${input.distanceLabel}\nAverage speed: ${input.averageSpeedLabel}`;

  try {
    new Notification('CommuteRadar', {
      body,
      // Base-relative so this still resolves when served from a subpath
      // (e.g. a GitHub Pages project site) rather than the domain root.
      icon: `${import.meta.env.BASE_URL}icons/icon-192.svg`,
      tag: `checkpoint-${input.checkpointName}` // collapse duplicate notifications for the same checkpoint
    });
  } catch {
    // Some browsers (notably iOS Safari outside of an installed PWA) throw
    // when constructing Notification directly. Fail silently — the in-app
    // "Reached" badge already communicates the same event.
  }
}
