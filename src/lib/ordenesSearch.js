export function buildOrdenSearchText(orden) {
  const parts = [
    orden?.motor,
    orden?.cliente,
    orden?.mecanico_dueno,
    orden?.mecanico,
    orden?.fecha_estimada,
    orden?.created_at,
    orden?.estado,
  ];

  return parts
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

export function matchesOrdenSearch(orden, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return true;
  return buildOrdenSearchText(orden).includes(q);
}
