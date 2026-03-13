export function padOrdenNumber(value) {
  return String(Number(value) || 0).padStart(3, "0");
}

export function buildOrdenNumberMap(rows) {
  const sorted = [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const da = new Date(a?.created_at || 0).getTime();
    const db = new Date(b?.created_at || 0).getTime();
    return da - db;
  });

  const map = new Map();
  sorted.forEach((row, index) => {
    map.set(row?.id, padOrdenNumber(index + 1));
  });
  return map;
}

export function formatOrdenCode(value) {
  const padded = padOrdenNumber(value);
  return `ORDEN-${padded}`;
}
