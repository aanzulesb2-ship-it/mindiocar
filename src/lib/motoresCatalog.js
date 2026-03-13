const STORAGE_KEY = "mindiocar_motor_catalog_v1";
const UPDATE_EVENT = "mindiocar:motores-updated";

export function normalizeMotorName(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function sortMotores(list) {
  return [...list].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

export function readMotoresCatalog() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    const unique = Array.from(
      new Set(parsed.map((item) => normalizeMotorName(item)).filter(Boolean))
    );

    return sortMotores(unique);
  } catch {
    return [];
  }
}

export function writeMotoresCatalog(list) {
  if (typeof window === "undefined") return [];

  const unique = sortMotores(
    Array.from(new Set((Array.isArray(list) ? list : []).map((item) => normalizeMotorName(item)).filter(Boolean)))
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  return unique;
}

export function mergeMotoresCatalog(names) {
  const current = readMotoresCatalog();
  return writeMotoresCatalog([...current, ...(Array.isArray(names) ? names : [])]);
}

export function addMotorToCatalog(name) {
  const value = normalizeMotorName(name);
  if (!value) return readMotoresCatalog();
  return mergeMotoresCatalog([value]);
}

export function renameMotorInCatalog(oldName, nextName) {
  const oldValue = normalizeMotorName(oldName);
  const nextValue = normalizeMotorName(nextName);
  const current = readMotoresCatalog().filter((item) => item !== oldValue);
  if (nextValue) current.push(nextValue);
  return writeMotoresCatalog(current);
}

export function deleteMotorFromCatalog(name) {
  const value = normalizeMotorName(name);
  return writeMotoresCatalog(readMotoresCatalog().filter((item) => item !== value));
}

export function motoresCatalogEventName() {
  return UPDATE_EVENT;
}
