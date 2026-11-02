import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "avero_auth_token";
const USER_KEY = "avero_user_profile";

// In-memory fallback for environments where SecureStore is unavailable (e.g. web preview)
const memoryStorage: Record<string, string> = {};

export async function saveToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    memoryStorage[TOKEN_KEY] = token;
  }
}

export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    return memoryStorage[TOKEN_KEY] || null;
  }
}

export async function removeToken(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    delete memoryStorage[TOKEN_KEY];
  }
}

export async function saveUserProfile(user: any): Promise<void> {
  try {
    const serialized = JSON.stringify(user);
    if (Platform.OS === "web") {
      localStorage.setItem(USER_KEY, serialized);
    } else {
      await SecureStore.setItemAsync(USER_KEY, serialized);
    }
  } catch (error) {
    memoryStorage[USER_KEY] = JSON.stringify(user);
  }
}

export async function getUserProfile(): Promise<any | null> {
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      raw = localStorage.getItem(USER_KEY);
    } else {
      raw = await SecureStore.getItemAsync(USER_KEY);
    }
    if (!raw) raw = memoryStorage[USER_KEY] || null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearAuthStorage(): Promise<void> {
  await Promise.all([removeToken(), removeUserProfile()]);
}

export async function removeUserProfile(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.removeItem(USER_KEY);
    } else {
      await SecureStore.deleteItemAsync(USER_KEY);
    }
  } catch {
    delete memoryStorage[USER_KEY];
  }
}
