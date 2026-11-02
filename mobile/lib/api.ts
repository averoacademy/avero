import { getToken, clearAuthStorage } from "./storage";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://www.avero.academy";

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  const contentType = response.headers.get("content-type");
  let data: any = null;

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      data = {
        message: `HTTP ${response.status}: ${response.statusText || "Resource not found on server"}`,
      };
    } else {
      data = { message: text };
    }
  }

  // Fallback: If token was not returned in JSON body (e.g. against older backend deployments),
  // attempt to extract from Set-Cookie header if available
  if (data && typeof data === "object" && !data.token) {
    const setCookie =
      response.headers.get("set-cookie") ||
      (response.headers as any)?.map?.["set-cookie"];
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie) ? setCookie.join(";") : String(setCookie);
      const match = cookieStr.match(/avero_user_token=([^;]+)/);
      if (match) {
        data.token = match[1];
      }
    }
  }

  if (response.status === 401) {
    // Session expired or logged in from another device
    await clearAuthStorage();
    throw new Error(data?.error || "Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};
