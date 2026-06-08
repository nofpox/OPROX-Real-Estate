export const MediaTypeOptions = { All: 'All', Videos: 'Videos', Images: 'Images' };
export const UIImagePickerPresentationStyle = { Automatic: 0, FullScreen: 1, PageSheet: 2, FormSheet: 3, CurrentContext: 4, OverFullScreen: 5, OverCurrentContext: 6, Popover: 7 };
export const CameraType = { front: 'front', back: 'back' };

export async function launchImageLibraryAsync(_opts?: unknown) {
  return { canceled: true, assets: [] };
}
export async function launchCameraAsync(_opts?: unknown) {
  return { canceled: true, assets: [] };
}
export async function getMediaLibraryPermissionsAsync() {
  return { status: 'denied', granted: false, expires: 'never', canAskAgain: false };
}
export async function requestMediaLibraryPermissionsAsync() {
  return { status: 'denied', granted: false, expires: 'never', canAskAgain: false };
}
export async function getCameraPermissionsAsync() {
  return { status: 'denied', granted: false, expires: 'never', canAskAgain: false };
}
export async function requestCameraPermissionsAsync() {
  return { status: 'denied', granted: false, expires: 'never', canAskAgain: false };
}
export function useMediaLibraryPermissions() {
  return [{ status: 'undetermined', granted: false }, async () => ({ status: 'denied', granted: false }), () => {}] as const;
}
export function useCameraPermissions() {
  return [{ status: 'undetermined', granted: false }, async () => ({ status: 'denied', granted: false }), () => {}] as const;
}
export const PermissionStatus = { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' };
