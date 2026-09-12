// Shared test setup. Individual test files still mock the specific browser
// APIs they exercise (geolocation, Notification, indexedDB) since the exact
// mock shape differs per test — this file only sets safe global defaults so
// importing modules that reference these APIs at module-load time doesn't throw.

if (typeof (globalThis as any).Notification === 'undefined') {
  (globalThis as any).Notification = class {
    static permission = 'default';
    static requestPermission = async () => 'default';
    constructor(public title: string, public options?: NotificationOptions) {}
  };
}
