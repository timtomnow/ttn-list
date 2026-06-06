import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { TagInput } from './TagInput';
import { createProjectStep } from '@/db/repo';
import { dedupeTags, tagKey, type TagSuggestion } from '@/lib/tags';
import { normalizeUrl } from '@/lib/url';
import type { ProjectStep } from '@/types';

/**
 * Inline "create a new library step" affordance for the Add-steps picker. The
 * project sibling of QuickAddItem — name + tags + an optional reference link
 * (no notes or photo) so a brand-new step can be minted and added without
 * leaving the picker. The new step lands in the Projects library (unlike
 * list-only temporary steps) and is reported back via `onCreated` so the
 * caller can auto-select it.
 */
export function QuickAddStep({
  defaultName,
  existingSteps,
  onCreated,
}: {
  /** Prefilled into the name field when the form opens — usually the search query. */
  defaultName: string;
  /** The full library, for tag suggestions and duplicate-name detection. */
  existingSteps: { name: string; tags?: string[] }[];
  onCreated: (step: ProjectStep) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Prefill from the search query and focus the name field on each open.
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setTags([]);
      setUrl('');
      nameRef.current?.focus();
    }
    // Intentionally keyed on `open` only — we snapshot the query at open time
    // rather than tracking it live, so typing in the form isn't clobbered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const suggestions: TagSuggestion[] = useMemo(() => {
    const counts = new Map<string, { tag: string; count: number }>();
    for (const step of existingSteps) {
      for (const t of step.tags ?? []) {
        const k = tagKey(t);
        const prev = counts.get(k);
        if (prev) prev.count += 1;
        else counts.set(k, { tag: t, count: 1 });
      }
    }
    return [...counts.values()].sort((a, b) =>
      b.count !== a.count ? b.count - a.count : a.tag.localeCompare(b.tag),
    );
  }, [existingSteps]);

  const trimmed = name.trim();
  const isDuplicate = useMemo(() => {
    const k = trimmed.toLowerCase();
    return k.length > 0 && existingSteps.some((s) => s.name.trim().toLowerCase() === k);
  }, [trimmed, existingSteps]);
  const canCreate = trimmed.length > 0 && !isDuplicate && !busy;

  const create = async () => {
    if (!canCreate) return;
    setBusy(true);
    try {
      const step = await createProjectStep({
        name: trimmed,
        tags: tags.length > 0 ? tags : undefined,
        url: normalizeUrl(url),
      });
      onCreated(step);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-dashed border-ink-300 p-2.5 text-left text-sm font-medium text-ink-600 transition hover:border-ink-400 hover:text-ink-900 dark:border-ink-700 dark:text-ink-300 dark:hover:border-ink-600 dark:hover:text-ink-50"
      >
        <Plus size={16} />
        {defaultName.trim() ? `Create new step “${defaultName.trim()}”` : 'Create a new step'}
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-ink-300 bg-ink-50/60 p-3 dark:border-ink-700 dark:bg-ink-800/30">
      <div>
        <label className="label" htmlFor="quick-add-step-name">New step name</label>
        <input
          id="quick-add-step-name"
          ref={nameRef}
          className="input mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              create();
            }
          }}
          placeholder="Sand the rail"
        />
        {isDuplicate && (
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            “{trimmed}” is already in your library — search for it above.
          </p>
        )}
      </div>
      <div>
        <label className="label" htmlFor="quick-add-step-url">Link (optional)</label>
        <input
          id="quick-add-step-url"
          type="url"
          inputMode="url"
          className="input mt-1"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              create();
            }
          }}
          placeholder="https://example.com/guide"
        />
      </div>
      <div>
        <span className="label">Tags (optional)</span>
        <div className="mt-1">
          <TagInput value={tags} onChange={(next) => setTags(dedupeTags(next))} suggestions={suggestions} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={create} disabled={!canCreate}>
          <Plus size={14} /> Create &amp; add
        </button>
      </div>
    </div>
  );
}
