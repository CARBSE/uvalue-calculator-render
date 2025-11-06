// web/src/lib/api.js

// Example: VITE_API_BASE = https://uvalue-api.onrender.com/api
export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
// Strip trailing "/api" → backend origin for static files
export const BACKEND_BASE = API_BASE.replace(/\/api$/, '');

// ------------------ utilities ------------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function handle(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

/**
 * GET with retry/backoff — helpful during Render cold starts (502/503/504).
 */
async function getJSONWithRetry(url, {
  tries = 6,
  backoffMs = 1500,
  timeoutMs = 20000
} = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetchWithTimeout(url, {}, timeoutMs);
      if ([502, 503, 504].includes(res.status)) throw new Error(`Cold start: ${res.status}`);
      return await handle(res);
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) {
        await sleep(backoffMs * Math.pow(1.2, i));
      }
    }
  }
  throw lastErr;
}

// ------------------ health / warmup ------------------
/**
 * Poll /api/health until backend is ready.
 * Use this on your landing/warmup screen.
 */
export async function waitForHealth({ maxWaitMs = 90000, pollMs = 3000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/health`, {}, pollMs - 250);
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        // accept any truthy "ok" or any 200 response as healthy
        if (j?.ok !== false) return j;
      }
    } catch (_) { /* ignore and retry */ }
    await sleep(pollMs);
  }
  throw new Error('Backend is taking too long to wake up.');
}

// ------------------ public API calls ------------------
export async function getMaterials() {
  return getJSONWithRetry(`${API_BASE}/materials`);
}

export async function getCities() {
  return getJSONWithRetry(`${API_BASE}/cities`);
}

export async function getFilms(city, assembly) {
  const u = new URL(`${API_BASE}/films`, window.location.origin);
  if (city) u.searchParams.set('city', city);
  if (assembly) u.searchParams.set('assembly', assembly);
  return getJSONWithRetry(u.toString());
}

export async function postCalculate(payload) {
  // POST with small retry (network hiccups during cold start)
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, 30000);
      return await handle(res);
    } catch (e) {
      lastErr = e;
      await sleep(1000);
    }
  }
  throw lastErr;
}

// ------------------ image URL helpers (served by backend) ------------------
export function descriptionImageUrl(filename) {
  return `${BACKEND_BASE}/static/materials/description/${filename}`;
}

export function graphicImageUrl(filename) {
  return `${BACKEND_BASE}/static/materials/graphic/${filename}`;
}
