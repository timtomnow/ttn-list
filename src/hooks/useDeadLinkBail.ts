import { useEffect, useState } from 'react';

/**
 * `useLiveQuery` returns `undefined` for both "still loading" and "not found",
 * so we can't tell them apart synchronously. For deep-linked detail pages
 * (e.g. an `.ics` reminder pointing to a list that's since been deleted),
 * wait `delayMs` and treat continued absence as missing. Caller redirects.
 *
 * Pass `enabled = false` for create mode (no id to look up).
 */
export function useDeadLinkBail(
  entity: unknown,
  enabled: boolean,
  delayMs = 800,
): boolean {
  const [bailed, setBailed] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    if (entity !== undefined) return;
    const t = setTimeout(() => setBailed(true), delayMs);
    return () => clearTimeout(t);
  }, [entity, enabled, delayMs]);
  return bailed;
}
