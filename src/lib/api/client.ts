/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  ERPNext API Client                                                          ║
 * ║                                                                              ║
 * ║  A beginner-friendly HTTP client that handles:                               ║
 * ║  • Building the correct URL for ERPNext                                      ║
 * ║  • Adding authentication headers automatically                               ║
 * ║  • Parsing JSON responses                                                    ║
 * ║  • Providing clear error messages                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * WHAT IS THIS?
 * Think of this as a "helper" that talks to your ERPNext server.
 * Instead of writing fetch() calls everywhere in your app, you call
 * erpNextClient.get("/api/resource/Sales Order") and it handles the rest.
 */

import { apiConfig } from "./config";

// ─── Custom Error Class ──────────────────────────────────────────────────
// This gives us better error messages when something goes wrong

export class ApiError extends Error {
  constructor(
    /** HTTP status code (e.g. 404 = Not Found, 500 = Server Error) */
    public status: number,
    /** Human-readable error message */
    message: string,
    /** Optional: the full response body from ERPNext */
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Build Headers ───────────────────────────────────────────────────────
// ERPNext uses "token api_key:api_secret" for authentication

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Check if we have a stored Laravel Sanctum token
  const token = typeof window !== "undefined" ? localStorage.getItem("hm_auth_token") : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (apiConfig.apiKey && apiConfig.apiSecret) {
    headers["Authorization"] = `token ${apiConfig.apiKey}:${apiConfig.apiSecret}`;
  }

  return headers;
}

// ─── Build Full URL ──────────────────────────────────────────────────────
// Combines the base URL with the endpoint path

function buildUrl(endpoint: string, params?: Record<string, string>): string {
  const base = apiConfig.baseUrl ? apiConfig.baseUrl.replace(/\/$/, "") : "";
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const fullPath = `${base}${path}`;
  const url = typeof window !== "undefined"
    ? new URL(fullPath, window.location.origin)
    : new URL(fullPath, "http://localhost");

  // Add query parameters (e.g. ?limit_page_length=100)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

// ─── Main API Functions ──────────────────────────────────────────────────

/**
 * Make a GET request to ERPNext.
 *
 * @example
 * // Get all Sales Orders
 * const orders = await erpNextClient.get("/api/resource/Sales Order");
 *
 * // Get a specific order
 * const order = await erpNextClient.get("/api/resource/Sales Order/SO-00001");
 *
 * // Get orders with filters
 * const filtered = await erpNextClient.get("/api/resource/Sales Order", {
 *   filters: '[["status","=","To Deliver and Bill"]]',
 *   limit_page_length: "100",
 * });
 */
async function get<T = unknown>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = buildUrl(endpoint, params);

  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      `ERPNext API Error (${response.status}): ${response.statusText}`,
      errorBody,
    );
  }

  return response.json();
}

/**
 * Make a POST request to ERPNext (create new records).
 *
 * @example
 * const newOrder = await erpNextClient.post("/api/resource/Sales Order", {
 *   customer: "CUST-001",
 *   delivery_date: "2026-12-31",
 *   items: [{ item_code: "ITEM-001", qty: 1, rate: 100 }],
 * });
 */
async function post<T = unknown>(endpoint: string, body: unknown): Promise<T> {
  const url = buildUrl(endpoint);

  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      `ERPNext API Error (${response.status}): ${response.statusText}`,
      errorBody,
    );
  }

  return response.json();
}

/**
 * Make a PUT request to ERPNext (update existing records).
 *
 * @example
 * const updated = await erpNextClient.put("/api/resource/Sales Order/SO-00001", {
 *   status: "Completed",
 * });
 */
async function put<T = unknown>(endpoint: string, body: unknown): Promise<T> {
  const url = buildUrl(endpoint);

  const response = await fetch(url, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      `ERPNext API Error (${response.status}): ${response.statusText}`,
      errorBody,
    );
  }

  return response.json();
}

/**
 * Make a DELETE request to ERPNext.
 *
 * @example
 * await erpNextClient.delete("/api/resource/Sales Order/SO-00001");
 */
async function del<T = unknown>(endpoint: string): Promise<T> {
  const url = buildUrl(endpoint);

  const response = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      `ERPNext API Error (${response.status}): ${response.statusText}`,
      errorBody,
    );
  }

  return response.json();
}

// ─── Export Everything as One Object ──────────────────────────────────────
// This way you can write: erpNextClient.get(...), erpNextClient.post(...)

export const erpNextClient = {
  get,
  post,
  put,
  delete: del,
};
