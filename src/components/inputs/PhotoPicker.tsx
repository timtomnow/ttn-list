import { useState } from 'react';
import { Camera, X } from 'lucide-react';
import { addPhoto, deletePhoto } from '@/db/repo';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { PhotoSourceSheet } from './PhotoSourceSheet';

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
 * a chooser sheet so the user can either take a new photo or pick one from
 * their gallery (see PhotoSourceSheet). The chosen Blob is written through
 * `addPhoto` immediately and surfaced via `onChange`. On replace/remove, the
 * old photo row is deleted.
 */
export function PhotoPicker({
  photoId,
  onChange,
  deleteOnReplace = true,
  size = 88,
  ariaLabel = 'Add photo',
}: Props) {
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);

  const onFiles = async (files: File[]) => {
    const file = files[0];
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
        onClick={() => setChoosing(true)}
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
      <PhotoSourceSheet open={choosing} onClose={() => setChoosing(false)} onFiles={onFiles} />
    </div>
  );
}
