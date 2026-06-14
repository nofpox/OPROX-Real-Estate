import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Returns the API base URL so fetch() calls work from both:
 *  - Expo Web   → relative "" (proxy handles /api/...)
 *  - Expo Native → absolute "https://<replit-domain>"
 */
export function getApiBase(): string {
  if (Platform.OS === "web") return "";
  const hostUri: string = (Constants.expoConfig?.hostUri as string | undefined) ?? "";
  const host = hostUri.split(":")[0];
  if (!host) return "";
  return `https://${host}`;
}
