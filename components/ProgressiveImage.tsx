import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  getLowResPreviewUrl,
  getOptimizedImageUrl,
  getResponsiveImageSrcSet,
  rewriteUrlToR2,
} from '../utils/formatters';
import { markImagePreloaded } from '../utils/imagePreloader';

export type ImagePriority = 'hero' | 'above-fold' | 'lazy';

export interface ProgressiveImageProps {
  src: string;
  alt: string;
  widths?: number[];
  sizes?: string;
  /**
   * Optional height/width ratio (e.g., 4 / 3 for a 3:4 portrait card, 5 / 4 for a 4:5 card).
   * Omit for natural aspect ratio (e.g., hero or full-screen lightbox).
   */
  aspectRatio?: number;
  quality?: number;
  priority?: ImagePriority;
  className?: string;
  containerClassName?: string;
  placeholderClassName?: string;
  fallbackSrc?: string;
  objectFit?: 'cover' | 'contain';
  disablePreviewBlur?: boolean;
  draggable?: boolean;
  style?: React.CSSProperties;
  onLoadComplete?: () => void;
  onFinalError?: () => void;
  onContextMenu?: React.MouseEventHandler<HTMLImageElement>;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  widths = [400, 800, 1200],
  sizes,
  aspectRatio,
  quality = 82,
  priority = 'lazy',
  className = 'w-full h-full object-cover',
  containerClassName = 'relative w-full h-full overflow-hidden bg-[#EFEBE4] dark:bg-slate-900 flex items-center justify-center',
  placeholderClassName = '',
  fallbackSrc,
  objectFit = 'cover',
  disablePreviewBlur = false,
  draggable,
  style,
  onLoadComplete,
  onFinalError,
  onContextMenu,
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [fallbackStage, setFallbackStage] = useState<'optimized' | 'raw' | 'custom' | 'failed'>('optimized');

  const rawUrl = useMemo(() => (src ? rewriteUrlToR2(src) : ''), [src]);

  const previewUrl = useMemo(() => {
    if (!src || disablePreviewBlur) return '';
    return getLowResPreviewUrl(src, aspectRatio);
  }, [src, aspectRatio, disablePreviewBlur]);

  const srcSet = useMemo(() => {
    if (!src) return '';
    return getResponsiveImageSrcSet(src, widths, aspectRatio, quality);
  }, [src, widths, aspectRatio, quality]);

  const primarySrc = useMemo(() => {
    if (!src) return '';
    const sorted = [...widths].filter((w) => w > 0).sort((a, b) => a - b);
    const defaultWidth = sorted[Math.max(0, sorted.length - 1)] || 800;
    const defaultHeight = aspectRatio ? Math.max(1, Math.round(defaultWidth * aspectRatio)) : undefined;
    return getOptimizedImageUrl(src, defaultWidth, defaultHeight, quality);
  }, [src, widths, aspectRatio, quality]);

  // Reset state cleanly whenever the underlying image source changes
  useEffect(() => {
    setFallbackStage(src ? 'optimized' : 'failed');
    setLoaded(false);
  }, [src, primarySrc]);

  // Skip fade/blur flash when browser already holds decoded image in memory cache
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
      if (src) {
        markImagePreloaded({ url: src, widths, sizes, aspectRatio, quality });
      }
      onLoadComplete?.();
    }
  }, [src, primarySrc, fallbackStage]);

  const activeSrc =
    fallbackStage === 'optimized'
      ? primarySrc || rawUrl
      : fallbackStage === 'raw'
        ? rawUrl
        : fallbackStage === 'custom'
          ? fallbackSrc || ''
          : '';

  const handleLoad = () => {
    setLoaded(true);
    if (src) {
      markImagePreloaded({ url: src, widths, sizes, aspectRatio, quality });
    }
    onLoadComplete?.();
  };

  const handleError = () => {
    if (fallbackStage === 'optimized' && rawUrl && primarySrc !== rawUrl) {
      setFallbackStage('raw');
      return;
    }
    if (fallbackStage !== 'custom' && fallbackSrc && fallbackSrc !== rawUrl && fallbackSrc !== activeSrc) {
      setFallbackStage('custom');
      return;
    }
    setFallbackStage('failed');
    setLoaded(true);
    onFinalError?.();
  };

  const loadingAttr: 'eager' | 'lazy' = priority === 'lazy' ? 'lazy' : 'eager';
  const decodingAttr: 'sync' | 'async' = priority === 'hero' ? 'sync' : 'async';
  const fetchPriorityAttr: 'high' | 'auto' = priority === 'hero' ? 'high' : 'auto';
  const previewFitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover scale-105';

  return (
    <div className={containerClassName}>
      {/* Lightweight blurred low-resolution preview while full image streams in */}
      {!loaded && fallbackStage === 'optimized' && previewUrl && (
        <img
          src={previewUrl}
          alt=""
          aria-hidden="true"
          loading={loadingAttr}
          decoding="async"
          className={`absolute inset-0 w-full h-full ${previewFitClass} blur-md opacity-95 pointer-events-none select-none motion-reduce:blur-none motion-reduce:scale-100 ${placeholderClassName}`}
        />
      )}

      {fallbackStage !== 'failed' && activeSrc ? (
        <img
          ref={imgRef}
          src={activeSrc}
          srcSet={fallbackStage === 'optimized' && srcSet ? srcSet : undefined}
          sizes={fallbackStage === 'optimized' && srcSet ? sizes : undefined}
          alt={alt}
          loading={loadingAttr}
          decoding={decodingAttr}
          fetchPriority={fetchPriorityAttr}
          draggable={draggable}
          style={style}
          onLoad={handleLoad}
          onError={handleError}
          onContextMenu={onContextMenu}
          className={`${className} transition-opacity duration-500 ease-out motion-reduce:transition-none ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div
          className={`w-full h-full bg-[#EFEBE4] dark:bg-slate-900 flex items-center justify-center ${placeholderClassName}`}
          aria-label={alt || 'Image unavailable'}
        />
      )}
    </div>
  );
};
