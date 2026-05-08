import { useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { addPhoto, deletePhoto } from '@/db/repo';
import { Thumbnail } from '@/components/ui/Thumbnail';

type Props = {
  photoId: string | undefined;
  /** Called with the new photoId (or undefined when cleared). */
  onChange: (next: string | undefined) => void;
  /** When true, the previous photo row is deleted on replace/remove. Default true. */
  deleteOnReplace?: boolean;
  size?: number;
  ariaLabel?: string;
};

/**
 * Single-photo picker. Tapping the thumbnail (or the empty placeholder) opens
 * the OS image picker — `capture="environment"` hints at the rear camera on
 * mobile but lets the user choose from library too. The picker writes the
 * Blob through `addPhoto` immediately and surfaces the resulting id via
 * `onChange`. On replace/remove, the old photo row is deleted.
 */
export function PhotoPicker({
  photoId,
  onChange,
  deleteOnReplace = true,
  size = 88,
  ariaLabel = 'Add photo',
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const onPick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    try {
      const previous = photoId;
      const photo = await addPhoto(file);
      onChange(photo.id);
      if (deleteOnReplace && previous) await deletePhoto(previous);
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    const previous = photoId;
    onChange(undefined);
    if (deleteOnReplace && previous) await deletePhoto(previous);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        aria-label={photoId ? 'Replace photo' : ariaLabel}
        className="relative shrink-0 rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-ink-900/20 dark:focus-visible:ring-ink-50/20 disabled:opacity-50"
      >
        {photoId ? (
          <Thumbnail photoId={photoId} size={size} alt="" />
        ) : (
          <div
            className="grid place-items-center rounded-xl border border-dashed border-ink-300 bg-white text-ink-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-400"
            style={{ width: size, height: size }}
          >
            <Camera size={Math.max(18, size * 0.32)} />
          </div>
        )}
      </button>
      {photoId && (
        <button
          type="button"
          className="btn-ghost h-9 px-2 text-xs"
          onClick={onRemove}
          disabled={busy}
        >
          <X size={14} /> Remove
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}
