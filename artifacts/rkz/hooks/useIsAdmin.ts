import { useApp } from "@/context/AppContext";
import { ADMIN_PHONES } from "@/constants/adminConfig";

/**
 * Returns true when the currently logged-in user's phone number is in the
 * ADMIN_PHONES whitelist, or when running in __DEV__ mode (no login screen).
 *
 * To grant yourself admin access:
 *   1. Open constants/adminConfig.ts
 *   2. Add your phone number to the ADMIN_PHONES array
 */
export function useIsAdmin(): boolean {
  const { user } = useApp();

  // Dev mode skips the login screen entirely — treat as admin for testing
  if (__DEV__) return true;

  if (!user?.phone) return false;
  return ADMIN_PHONES.includes(user.phone);
}
