// web/src/lib/api.js

// Example: VITE_API_BASE = https://uvalue-api.onrender.com/api
export const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");
// Strip trailing "/api" → backend origin for static files (to serve /static/* images)
export const BACKEND_BASE = API_BASE.replace(/\/api$/, "");

// ------------------ small utils ------------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      mode: "cors",
      ...opts,
      signal: ctrl.signal,
      headers: {
        ...(opts.headers || {}),
        "Pragma": "no-cache",
        "Cache-Control": "no-cache",
      },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function handle(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) return {};
  return res.json();
}

/**
 * GET with retry/backoff — helps during Render cold starts (502/503/504 or network errors).
 */
async function getJSONWithRetry(
  url,
  { tries = 6, backoffMs = 1500, timeoutMs = 20000 } = {}
) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetchWithTimeout(url, {}, timeoutMs);
      if ([502, 503, 504].includes(res.status)) {
        throw new Error(`Transient status ${res.status}`);
      }
      return await handle(res);
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) await sleep(backoffMs * Math.pow(1.3, i));
    }
  }
  throw lastErr;
}

// ------------------ health / warmup ------------------
/**
 * Poll an endpoint until backend is ready. Tries /health, then falls back to /cities.
 */
export async function waitForHealth({ maxWaitMs = 90000, pollMs = 3000 } = {}) {
  const start = Date.now();
  const probe = async (url) => {
    try {
      const res = await fetchWithTimeout(url, {}, Math.max(1000, pollMs - 250));
      if (res.ok) return true;
    } catch {
      /* ignore */
    }
    return false;
  };

  while (Date.now() - start < maxWaitMs) {
    if (await probe(`${API_BASE}/health`)) return true;
    if (await probe(`${API_BASE}/cities`)) return true;
    await sleep(pollMs);
  }
  throw new Error("Backend is taking too long to wake up.");
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
  if (city) u.searchParams.set("city", city);
  if (assembly) u.searchParams.set("assembly", assembly);
  return getJSONWithRetry(u.toString());
}

export async function postCalculate(payload) {
  // POST with small retry (handles brief network hiccups during cold start)
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}/calculate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        30000
      );
      return await handle(res);
    } catch (e) {
      lastErr = e;
      await sleep(1000);
    }
  }
  throw lastErr;
}

// ------------------ save/load designs ------------------
export async function saveDesign(payload) {
  const res = await fetch(`${API_BASE}/save-design`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text().catch(() => "Failed to save"));
  return res.json(); // { public_id, url }
}

export async function loadDesign(publicId) {
  const res = await fetch(`${API_BASE}/design/${encodeURIComponent(publicId)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Design not found");
  return res.json(); // { title, city, assembly, layers, result, created_at }
}

// ------------------ image URL helpers (served by backend) ------------------
export function descriptionImageUrl(filename) {
  return `${BACKEND_BASE}/static/materials/description/${filename}`;
}

export function graphicImageUrl(filename) {
  return `${BACKEND_BASE}/static/materials/graphic/${filename}`;
}
