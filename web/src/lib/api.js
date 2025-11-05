// web/src/lib/api.js

// Example: VITE_API_BASE = https://uvalue-api.onrender.com/api
export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');
// Strip trailing "/api" → backend origin for static files
export const BACKEND_BASE = API_BASE.replace(/\/api$/, '');

async function handle(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`);
  }
  return res.json();
}

// -------- API calls --------
export async function getMaterials() {
  return handle(await fetch(`${API_BASE}/materials`));
}

export async function getCities() {
  return handle(await fetch(`${API_BASE}/cities`));
}

export async function getFilms(city, assembly) {
  const u = new URL(`${API_BASE}/films`, window.location.origin);
  if (city) u.searchParams.set('city', city);
  if (assembly) u.searchParams.set('assembly', assembly);
  return handle(await fetch(u));
}

export async function postCalculate(payload) {
  return handle(await fetch(`${API_BASE}/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}

// -------- Image URL helpers (served by backend) --------
export function descriptionImageUrl(filename) {
  return `${BACKEND_BASE}/static/materials/description/${filename}`;
}

export function graphicImageUrl(filename) {
  return `${BACKEND_BASE}/static/materials/graphic/${filename}`;
}
