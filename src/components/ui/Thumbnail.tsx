import { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { usePhoto } from '@/db/repo';

/**
 * Returns a stable object URL for a Blob, revoking it on unmount or when the
 * Blob identity changes. Returns `undefined` while loading or if no blob.
 */
export function useBlobUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

/** Convenience: look up the photo by id and produce its object URL. */
export function usePhotoUrl(photoId: string | null | undefined): string | undefined {
  const photo = usePhoto(photoId);
  return useBlobUrl(photo?.blob);
}

type ThumbnailProps = {
  photoId: string | null | undefined;
  size?: number;
  alt?: string;
  className?: string;
};

export function Thumbnail({ photoId, size = 56, alt = '', className }: ThumbnailProps) {
  const url = usePhotoUrl(photoId);
  const dim = { width: size, height: size };
  if (!url) {
    return (
      <div
        className={[
          'grid shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500',
          className ?? '',
        ].join(' ')}
        style={dim}
        aria-hidden
      >
        <ImageIcon size={Math.max(14, size * 0.4)} />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className={['shrink-0 rounded-xl object-cover', className ?? ''].join(' ')}
      style={dim}
    />
  );
}
