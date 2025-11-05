// web/src/lib/api.js
const BASE = (import.meta.env.VITE_API_BASE?.replace(/\/$/, "")) || "/api"; // proxy fallback

export async function getMaterials() {
  const r = await fetch(`${BASE}/materials`);
  if (!r.ok) throw new Error(`Failed to load materials (${r.status})`);
  return r.json();
}

export async function getCities() {
  const r = await fetch(`${BASE}/cities`);
  if (!r.ok) throw new Error(`Failed to load cities (${r.status})`);
  return r.json(); // { cities: [...] }
}

export async function getFilms(city, assembly) {
  const u = new URL(`${BASE}/films`, window.location.origin);
  u.searchParams.set("city", city);
  u.searchParams.set("assembly", assembly);
  const r = await fetch(u);
  if (!r.ok) throw new Error(`Failed to load Hi/Ho (${r.status})`);
  return r.json(); // { Hi, Ho }
}

export async function postCalculate(payload) {
  const r = await fetch(`${BASE}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
