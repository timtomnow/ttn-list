import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { dedupeTags, normalizeTag, tagKey, type TagSuggestion } from '@/lib/tags';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: TagSuggestion[];
  /** How many top-frequency tags to surface as quick-add chips. */
  topSuggestions?: number;
};

export function TagInput({ value, onChange, suggestions = [], topSuggestions = 6 }: Props) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedKeys = useMemo(() => new Set(value.map(tagKey)), [value]);

  const filteredSuggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    return suggestions
      .filter((s) => !selectedKeys.has(tagKey(s.tag)))
      .filter((s) => (q ? s.tag.toLowerCase().includes(q) : true));
  }, [suggestions, selectedKeys, draft]);

  const topChips = suggestions
    .filter((s) => !selectedKeys.has(tagKey(s.tag)))
    .slice(0, topSuggestions);

  const addTag = (raw: string) => {
    const n = normalizeTag(raw);
    if (!n) return;
    const next = dedupeTags([...value, n]);
    onChange(next);
    setDraft('');
  };

  const removeTag = (t: string) => {
    onChange(value.filter((v) => tagKey(v) !== tagKey(t)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (draft.trim()) addTag(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-2 py-1.5 transition focus-within:border-ink-900 focus-within:ring-2 focus-within:ring-ink-900/10 dark:border-ink-800 dark:bg-ink-900 dark:focus-within:border-ink-50 dark:focus-within:ring-ink-50/10">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-700 dark:bg-ink-800 dark:text-ink-200"
          >
            {t}
            <button
              type="button"
              className="rounded-full p-0.5 text-ink-500 hover:bg-ink-200 dark:text-ink-400 dark:hover:bg-ink-700"
              aria-label={`Remove tag ${t}`}
              onClick={() => removeTag(t)}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
          placeholder={value.length === 0 ? 'Add a tag…' : ''}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (draft.trim()) addTag(draft);
          }}
        />
      </div>

      {focused && draft.trim() && filteredSuggestions.length > 0 && (
        <ul className="mt-1 max-h-40 overflow-auto rounded-xl border border-ink-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-900">
          {filteredSuggestions.slice(0, 8).map((s) => (
            <li key={tagKey(s.tag)}>
              <button
                type="button"
                // onMouseDown so the click registers before the input's onBlur fires.
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(s.tag);
                }}
                className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800/60"
              >
                <span>{s.tag}</span>
                <span className="text-xs text-ink-400 dark:text-ink-500">{s.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {topChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-ink-400 dark:text-ink-500">
            Common
          </span>
          {topChips.map((s) => (
            <button
              key={tagKey(s.tag)}
              type="button"
              className="chip"
              onClick={() => addTag(s.tag)}
            >
              {s.tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
