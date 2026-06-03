import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "localhost";

export const API_BASE =
  Platform.OS === "web"
    ? "/api"
    : `https://${domain}/api`;

const TOKEN_KEY = "rkz_auth_token";

export async function getAuthToken(): Promise<string | null> {
  try { return await AsyncStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export async function setAuthToken(token: string): Promise<void> {
  try { await AsyncStorage.setItem(TOKEN_KEY, token); } catch {}
}

export async function clearAuthToken(): Promise<void> {
  try { await AsyncStorage.removeItem(TOKEN_KEY); } catch {}
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => String(res.status));
    throw new Error(`API ${path} failed (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => String(res.status));
    throw new Error(`API ${path} failed (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => String(res.status));
    throw new Error(`API ${path} failed (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => String(res.status));
    throw new Error(`API ${path} failed (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}
