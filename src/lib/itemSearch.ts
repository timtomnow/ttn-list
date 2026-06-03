// Shared fuzzy-ish search for the item pickers (group editor + list editor).
//
// Goals: cheap enough to run on every keystroke over the whole library, and
// smart enough that searching a tag surfaces its members. A query like "veg
// cucum" is split into terms that must ALL match — each term hits either the
// item name or one of its tags — so tags act as a second searchable field
// without a separate "search by tag" mode.
//
// Results are relevance-sorted: name-prefix beats name-substring beats a
// tag-only hit. Ties keep the caller's original (library) order, since the
// underlying sort is stable.

export type Searchable = { name: string; tags?: string[] };

/** Lowercased, whitespace-split query terms. Empty query → no terms. */
function queryTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Filter + relevance-sort `items` against `query`. Every term must match the
 * name or a tag (AND across terms). An empty query returns `items` untouched.
 */
export function searchItems<T extends Searchable>(items: T[], query: string): T[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return items;

  const scored: { item: T; score: number; idx: number }[] = [];
  items.forEach((item, idx) => {
    const name = item.name.toLowerCase();
    const tags = (item.tags ?? []).map((t) => t.toLowerCase());
    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      const at = name.indexOf(term);
      const tagHit = at === -1 && tags.some((t) => t.includes(term));
      if (at === -1 && !tagHit) {
        matchedAll = false;
        break;
      }
      // Weight: name prefix (3) > name substring (2) > tag-only hit (1).
      score += at === 0 ? 3 : at > 0 ? 2 : 1;
    }
    if (matchedAll) scored.push({ item, score, idx });
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored.map((s) => s.item);
}

/**
 * The item's own tags that matched the query — used to show the user *why* a
 * row appeared (e.g. "cucumber" surfacing under a search for "veg"). Returns
 * empty for an empty query.
 */
export function matchingTags(item: Searchable, query: string): string[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  return (item.tags ?? []).filter((t) => {
    const lt = t.toLowerCase();
    return terms.some((term) => lt.includes(term));
  });
}
