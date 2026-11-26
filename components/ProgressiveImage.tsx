import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  getLowResPreviewUrl,
  getOptimizedImageUrl,
  getResponsiveImageSrcSet,
  rewriteUrlToR2,
} from '../utils/formatters';
import { isImagePreloaded, markImagePreloaded } from '../utils/imagePreloader';

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

const DEFAULT_WIDTHS = [400, 800, 1200];

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  widths = DEFAULT_WIDTHS,
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
  const widthsKey = widths.join(',');

  const [stageState, setStageState] = useState<{
    forSrc: string;
    stage: 'optimized' | 'raw' | 'custom' | 'failed';
  }>(() => ({
    forSrc: src,
    stage: src ? 'optimized' : 'failed',
  }));

  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [instantReveal, setInstantReveal] = useState(false);

  const fallbackStage =
    stageState.forSrc === src ? stageState.stage : src ? 'optimized' : 'failed';

  const rawUrl = useMemo(() => (src ? rewriteUrlToR2(src) : ''), [src]);

  const previewUrl = useMemo(() => {
    if (!src || disablePreviewBlur) return '';
    return getLowResPreviewUrl(src, aspectRatio);
  }, [src, aspectRatio, disablePreviewBlur]);

  const srcSet = useMemo(() => {
    if (!src) return '';
    return getResponsiveImageSrcSet(src, widths, aspectRatio, quality);
  }, [src, widthsKey, aspectRatio, quality]);

  const primarySrc = useMemo(() => {
    if (!src) return '';
    const sorted = [...widths].filter((w) => w > 0).sort((a, b) => a - b);
    const defaultWidth = sorted[Math.max(0, sorted.length - 1)] || 800;
    const defaultHeight = aspectRatio
      ? Math.max(1, Math.round(defaultWidth * aspectRatio))
      : undefined;
    return getOptimizedImageUrl(src, defaultWidth, defaultHeight, quality);
  }, [src, widthsKey, aspectRatio, quality]);

  const activeSrc =
    fallbackStage === 'optimized'
      ? primarySrc || rawUrl
      : fallbackStage === 'raw'
        ? rawUrl
        : fallbackStage === 'custom'
          ? fallbackSrc || ''
          : '';

  const isPreloadedInCache = useMemo(
    () =>
      Boolean(
        src &&
          isImagePreloaded({
            url: src,
            widths,
            sizes,
            aspectRatio,
            quality,
          }),
      ),
    [src, widthsKey, sizes, aspectRatio, quality],
  );

  const isLoaded = Boolean(activeSrc && loadedUrl === activeSrc);

  // Synchronously reveal already-cached images before paint (and never revert via a post-paint effect)
  useLayoutEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0 && activeSrc) {
      if (loadedUrl !== activeSrc) {
        setInstantReveal(true);
        setLoadedUrl(activeSrc);
        if (src) {
          markImagePreloaded({ url: src, widths, sizes, aspectRatio, quality });
        }
        onLoadComplete?.();
      }
    }
  }, [activeSrc, loadedUrl, src, widthsKey, sizes, aspectRatio, quality]);

  const handleLoad = () => {
    if (activeSrc && loadedUrl !== activeSrc) {
      setInstantReveal(false);
      setLoadedUrl(activeSrc);
      if (src) {
        markImagePreloaded({ url: src, widths, sizes, aspectRatio, quality });
      }
      onLoadComplete?.();
    }
  };

  const handleError = () => {
    if (fallbackStage === 'optimized' && rawUrl && primarySrc !== rawUrl) {
      setStageState({ forSrc: src, stage: 'raw' });
      return;
    }
    if (
      fallbackStage !== 'custom' &&
      fallbackSrc &&
      fallbackSrc !== rawUrl &&
      fallbackSrc !== activeSrc
    ) {
      setStageState({ forSrc: src, stage: 'custom' });
      return;
    }
    setStageState({ forSrc: src, stage: 'failed' });
    setLoadedUrl(null);
    onFinalError?.();
  };

  const loadingAttr: 'eager' | 'lazy' = priority === 'lazy' ? 'lazy' : 'eager';
  const decodingAttr: 'sync' | 'async' = priority === 'hero' ? 'sync' : 'async';
  const fetchPriorityAttr: 'high' | 'auto' = priority === 'hero' ? 'high' : 'auto';
  const previewFitClass =
    objectFit === 'contain' ? 'object-contain' : 'object-cover scale-105';
  const showBlurredPreview =
    !isLoaded &&
    !isPreloadedInCache &&
    fallbackStage === 'optimized' &&
    Boolean(previewUrl);

  return (
    <div className={containerClassName}>
      {/* Lightweight blurred low-resolution preview while uncached full image streams in */}
      {showBlurredPreview && (
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
          className={`${className} ${
            instantReveal || isPreloadedInCache
              ? 'transition-none opacity-100'
              : `transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                  isLoaded ? 'opacity-100' : 'opacity-0'
                }`
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
