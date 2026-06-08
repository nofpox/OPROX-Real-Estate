export async function isAvailableAsync() { return false; }
export async function preventScreenCaptureAsync(_key?: string) {}
export async function allowScreenCaptureAsync(_key?: string) {}
export function usePreventScreenCapture(_key?: string) {}
export function addScreenshotListener(_listener: () => void) { return { remove: () => {} }; }
export function removeScreenshotListener(_sub: { remove: () => void }) {}
export function useScreenshotListener(_listener: () => void) {}
export async function getPermissionsAsync() { return { granted: true, status: 'granted', expires: 'never', canAskAgain: true }; }
export async function requestPermissionsAsync() { return { granted: true, status: 'granted', expires: 'never', canAskAgain: true }; }
export function usePermissions() { return [{ granted: true, status: 'granted' }, async () => ({ granted: true, status: 'granted' }), () => {}] as const; }
export async function enableAppSwitcherProtectionAsync(_blur?: number) {}
export async function disableAppSwitcherProtectionAsync() {}
export const PermissionStatus = { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' };
