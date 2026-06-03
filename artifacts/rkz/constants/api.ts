import { Platform } from "react-native";

const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost";

export const API_BASE =
  Platform.OS === "web"
    ? "/api"
    : `https://${domain}/api`;

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}
