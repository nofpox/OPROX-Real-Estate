import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "rozoz_auth_token";

export async function getAuthToken(): Promise<string | null> {
  try { return await AsyncStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export async function setAuthToken(token: string): Promise<void> {
  try { await AsyncStorage.setItem(TOKEN_KEY, token); } catch {}
}

export async function clearAuthToken(): Promise<void> {
  try { await AsyncStorage.removeItem(TOKEN_KEY); } catch {}
}
