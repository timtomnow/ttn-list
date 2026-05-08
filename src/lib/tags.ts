/** Tags are stored case-preserving but compared lower-case. */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, 32);
}

export function tagKey(t: string): string {
  return t.trim().toLowerCase();
}

export function dedupeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const n = normalizeTag(t);
    if (!n) continue;
    const k = tagKey(n);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

export type TagSuggestion = { tag: string; count: number };
