import {
  getOptimizedImageUrl,
  getResponsiveImageSrcSet,
  isVideoMediaUrl,
} from './formatters';

export interface PreloadImageOptions {
  url: string;
  widths?: number[];
  sizes?: string;
  aspectRatio?: number;
  quality?: number;
}

const MAX_CACHE_ENTRIES = 160;
const preloadedKeys = new Set<string>();
const inFlightKeys = new Set<string>();

function buildCacheKey(opts: PreloadImageOptions): string {
  const widthsKey = (opts.widths || [800, 1280, 1800, 2200]).join(',');
  return `${opts.url}|${widthsKey}|${opts.aspectRatio ?? 'auto'}|${opts.quality ?? 88}`;
}

function rememberKey(key: string) {
  if (preloadedKeys.has(key)) {
    preloadedKeys.delete(key);
  }
  preloadedKeys.add(key);
  if (preloadedKeys.size > MAX_CACHE_ENTRIES) {
    const oldest = preloadedKeys.values().next().value;
    if (oldest) preloadedKeys.delete(oldest);
  }
}

export function markImagePreloaded(opts: PreloadImageOptions): void {
  if (!opts.url) return;
  rememberKey(buildCacheKey(opts));
}

export function isImagePreloaded(opts: PreloadImageOptions): boolean {
  if (!opts.url) return false;
  return preloadedKeys.has(buildCacheKey(opts));
}

/**
 * Preloads a single responsive image off-DOM using the same `srcSet` and `sizes`
 * descriptors used in rendering so the browser selects and caches the exact
 * DPR-appropriate WebP resource without re-fetching.
 */
export function preloadResponsiveImage(opts: PreloadImageOptions): void {
  if (typeof window === 'undefined' || !opts.url || isVideoMediaUrl(opts.url)) {
    return;
  }

  const widths = opts.widths && opts.widths.length > 0 ? opts.widths : [800, 1280, 1800, 2200];
  const quality = opts.quality ?? 88;
  const key = buildCacheKey({ ...opts, widths, quality });

  if (preloadedKeys.has(key) || inFlightKeys.has(key)) {
    return;
  }

  inFlightKeys.add(key);
  const img = new window.Image();
  img.decoding = 'async';

  const srcSet = getResponsiveImageSrcSet(opts.url, widths, opts.aspectRatio, quality);
  if (opts.sizes) {
    img.sizes = opts.sizes;
  }
  if (srcSet) {
    img.srcset = srcSet;
  }

  const defaultWidth = widths[widths.length - 1];
  const defaultHeight = opts.aspectRatio
    ? Math.max(1, Math.round(defaultWidth * opts.aspectRatio))
    : undefined;
  img.src = getOptimizedImageUrl(opts.url, defaultWidth, defaultHeight, quality);

  const finalize = () => {
    inFlightKeys.delete(key);
    rememberKey(key);
  };

  if (img.complete && img.naturalWidth > 0) {
    if (typeof img.decode === 'function') {
      img.decode().catch(() => {}).finally(finalize);
    } else {
      finalize();
    }
    return;
  }

  img.onload = () => {
    if (typeof img.decode === 'function') {
      img.decode().catch(() => {}).finally(finalize);
    } else {
      finalize();
    }
  };
  img.onerror = () => {
    inFlightKeys.delete(key);
  };
}

export const LIGHTBOX_IMAGE_WIDTHS = [800, 1280, 1800, 2200];
export const LIGHTBOX_IMAGE_SIZES = '(max-width: 768px) 100vw, 90vw';
export const LIGHTBOX_IMAGE_QUALITY = 88;

/**
 * Intelligently preloads adjacent photos around the active lightbox slide
 * (next, previous, and +2 ahead) without flooding bandwidth across the full gallery.
 */
export function preloadGalleryNeighborhood<T extends { id: string; file_url: string; file_type?: string | null }>(
  files: T[],
  currentIndex: number,
  getUrl: (file: T) => string,
  shouldSkip?: (file: T) => boolean
): void {
  if (!files || files.length <= 1 || currentIndex < 0) return;

  const total = files.length;
  const candidateOffsets = [1, -1, 2];
  const visitedIndices = new Set<number>([currentIndex]);

  for (const offset of candidateOffsets) {
    const idx = ((currentIndex + offset) % total + total) % total;
    if (visitedIndices.has(idx)) continue;
    visitedIndices.add(idx);

    const file = files[idx];
    if (!file || isVideoMediaUrl(file.file_url, file.file_type)) continue;
    if (shouldSkip && shouldSkip(file)) continue;

    const url = getUrl(file);
    if (!url) continue;

    preloadResponsiveImage({
      url,
      widths: LIGHTBOX_IMAGE_WIDTHS,
      sizes: LIGHTBOX_IMAGE_SIZES,
      quality: LIGHTBOX_IMAGE_QUALITY,
    });
  }
}
