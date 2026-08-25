/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  ERPNext API Configuration                                                   ║
 * ║                                                                              ║
 * ║  This file reads your .env settings and creates the API config.              ║
 * ║  You should NOT need to edit this file — change .env instead.                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * HOW IT WORKS:
 * - Vite automatically reads variables from .env that start with "VITE_"
 * - We access them via import.meta.env.VITE_VARIABLE_NAME
 * - This config object centralizes all API settings in one place
 */

const getBackendUrl = (): string => {
  if (import.meta.env.DEV) {
    return "";
  }

  const isLocalHost = typeof window !== "undefined" && 
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  const backendEnv = import.meta.env.VITE_BACKEND_ENV;

  if (backendEnv === "local" || (isLocalHost && backendEnv !== "dev")) {
    return (import.meta.env.VITE_API_URL_LOCAL as string) || "http://127.0.0.1:8000";
  }

  return (import.meta.env.VITE_API_URL_DEV as string) || (import.meta.env.VITE_ERPNEXT_URL as string) || "https://delivery-management.hmws.qatar123.com/public";
};

export const apiConfig = {
  /**
   * When true, the app uses built-in dummy data (no API calls).
   * When false, the app makes real API calls to your server.
   *
   * Change this in your .env file: VITE_USE_MOCK_DATA=true or false
   */
  useMockData: import.meta.env.VITE_USE_MOCK_DATA !== "false",

  /**
   * Your server base URL (automatically switches between dev and local urls)
   */
  baseUrl: getBackendUrl(),

  /**
   * API Key from ERPNext (optional fallback)
   */
  apiKey: (import.meta.env.VITE_ERPNEXT_API_KEY as string) || "",

  /**
   * API Secret from ERPNext (optional fallback)
   */
  apiSecret: (import.meta.env.VITE_ERPNEXT_API_SECRET as string) || "",
};

/**
 * Quick check: Is the API properly configured?
 * Returns true if we have a base URL.
 */
export function isApiConfigured(): boolean {
  return import.meta.env.DEV || !!apiConfig.baseUrl;
}

/**
 * Are we currently running in demo mode (using mock data)?
 */
export function isDemoMode(): boolean {
  return apiConfig.useMockData;
}
