// Shared test setup. Individual test files still mock the specific browser
// APIs they exercise (geolocation, Notification, indexedDB) since the exact
// mock shape differs per test — this file only sets safe global defaults so
// importing modules that reference these APIs at module-load time doesn't throw.

if (typeof Notification === 'undefined') {
  (globalThis as unknown as { Notification: unknown }).Notification = class {
    static permission: NotificationPermission = 'default';
    static requestPermission = async (): Promise<NotificationPermission> => 'default';
    constructor(public title: string, public options?: NotificationOptions) {}
  };
}
