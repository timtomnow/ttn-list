/** URL helpers for the optional reference link on project steps. */

/**
 * Prepend `https://` when the user omits a scheme, so the link resolves
 * absolutely (otherwise the browser treats `google.ca` as a relative path).
 * Returns `undefined` for an empty string.
 */
export function normalizeUrl(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
}
