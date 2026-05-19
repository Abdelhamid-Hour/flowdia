/**
 * @file api.js
 * @description Centralized API helper for interacting with the Flowdia backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api"

/**
 * Shared API wrapper that handles authentication and common error scenarios.
 * @param {string} path - The relative endpoint path (e.g., '/topics').
 * @param {Object} options - Standard fetch options (method, body, etc.).
 * @param {Object} session - The current Supabase session object.
 */
export async function callApi(path, options = {}, session) {
  if (!session?.access_token) {
    throw new Error("You must be authenticated to perform this action.")
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
    ...(options.headers || {}),
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Request failed with status ${response.status}`)
  }

  return payload
}
