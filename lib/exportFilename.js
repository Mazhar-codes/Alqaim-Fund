/** Builds a download filename like "collection-report-09-09-2026_14-30-05.xlsx" — a fresh, sortable timestamp per export so repeated downloads never collide or silently overwrite each other. */
export function timestampedFilename(base, ext = "xlsx") {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const stamp = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `${base}-${stamp}.${ext}`;
}
