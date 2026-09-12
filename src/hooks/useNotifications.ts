import { useCallback, useEffect, useState } from 'react';
import {
  getNotificationPermission,
  getNotificationSupport,
  requestNotificationPermission,
  type NotificationPermissionState
} from '../services/notifications';

export interface UseNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermissionState;
  requestPermission: () => Promise<NotificationPermissionState>;
}

export function useNotifications(): UseNotificationsResult {
  const [permission, setPermission] = useState<NotificationPermissionState>(() => getNotificationPermission());

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  return { isSupported: getNotificationSupport(), permission, requestPermission };
}
