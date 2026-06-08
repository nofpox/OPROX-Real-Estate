export const Accuracy = {
  Lowest: 1,
  Low: 2,
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};

export async function requestForegroundPermissionsAsync() {
  return { status: 'denied', granted: false, expires: 'never', canAskAgain: false };
}

export async function requestBackgroundPermissionsAsync() {
  return { status: 'denied', granted: false, expires: 'never', canAskAgain: false };
}

export async function getForegroundPermissionsAsync() {
  return { status: 'denied', granted: false, expires: 'never', canAskAgain: false };
}

export async function getCurrentPositionAsync(_opts?: unknown) {
  throw new Error('Location not available on web');
}

export async function getLastKnownPositionAsync() {
  return null;
}

export async function reverseGeocodeAsync(_loc: unknown) {
  return [];
}

export async function geocodeAsync(_addr: string) {
  return [];
}

export async function hasServicesEnabledAsync() {
  return false;
}

export function useForegroundPermissions() {
  return [{ status: 'undetermined', granted: false }, async () => ({ status: 'denied', granted: false }), () => {}] as const;
}

export function useBackgroundPermissions() {
  return [{ status: 'undetermined', granted: false }, async () => ({ status: 'denied', granted: false }), () => {}] as const;
}
