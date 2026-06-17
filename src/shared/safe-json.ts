// Robustly parse JSON that a model returned: strip code fences, find the first
// {...} block, then parse. Returns null on failure so callers can fall back.
export function parseJsonLoose<T = unknown>(text: string): T | null {
  if (!text) return null;
  let t = text.trim();
  t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) t = t.slice(start, end + 1);
  try { return JSON.parse(t) as T; } catch { return null; }
}
