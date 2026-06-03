import { useRef, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Image as ImageIcon } from 'lucide-react';

/**
 * Bottom-sheet chooser that lets the user pick where a photo comes from:
 * "Take photo" (rear camera, via `capture="environment"`) or "Choose from
 * gallery" (the OS photo library, no `capture` hint). Both routes feed the
 * same hidden `<input type="file">` plumbing and report the selected File(s)
 * through `onFiles`.
 *
 * We need two inputs because `capture` is the only thing that distinguishes
 * "force the camera" from "let me browse" on mobile — a single input can't be
 * both. The inputs live outside the portal so they persist regardless of the
 * sheet's open state, which keeps the `click()` call inside the user gesture.
 *
 * Rendered through a portal at `z-50` so it floats above the app's modals
 * (which sit at `z-40`) when a picker is opened from inside one. It does not
 * touch `document.body` overflow, so nesting it under another Modal is safe.
 */
export function PhotoSourceSheet({
  open,
  onClose,
  multiple = false,
  onFiles,
}: {
  open: boolean;
  onClose: () => void;
  /** Allow selecting more than one image (used by the completion screens). */
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting the same file later
    onClose();
    if (files.length > 0) onFiles(files);
  };

  return (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        className="hidden"
        onChange={handle}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={handle}
      />
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
            <div
              className="absolute inset-0 bg-ink-950/40 dark:bg-ink-950/70"
              onClick={onClose}
              aria-hidden
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Add photo"
              className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-4 shadow-sheet dark:bg-ink-900 md:rounded-2xl"
              style={{ paddingBottom: 'var(--safe-bottom)' }}
            >
              <h2 className="px-1 pb-3 text-base font-semibold">Add photo</h2>
              <div className="space-y-2">
                <SourceButton
                  icon={<Camera size={20} />}
                  label="Take photo"
                  hint="Use your camera"
                  onClick={() => cameraRef.current?.click()}
                />
                <SourceButton
                  icon={<ImageIcon size={20} />}
                  label="Choose from gallery"
                  hint="Pick an existing image"
                  onClick={() => galleryRef.current?.click()}
                />
              </div>
              <button type="button" className="btn-ghost mt-3 w-full justify-center" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function SourceButton({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-ink-200 p-3 text-left transition hover:border-ink-300 dark:border-ink-800 dark:hover:border-ink-700"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-300">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-ink-500 dark:text-ink-400">{hint}</span>
      </span>
    </button>
  );
}
