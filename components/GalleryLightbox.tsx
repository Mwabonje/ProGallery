import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  Lock,
  X,
} from 'lucide-react';
import { GalleryFile } from '../types';
import {
  getOptimizedImageUrl,
  isVideoMediaUrl,
  rewriteUrlToR2,
} from '../utils/formatters';
import {
  LIGHTBOX_IMAGE_QUALITY,
  LIGHTBOX_IMAGE_SIZES,
  LIGHTBOX_IMAGE_WIDTHS,
  preloadGalleryNeighborhood,
} from '../utils/imagePreloader';
import { getThemedLookbookImages } from '../utils/portfolioImages';
import { ProgressiveImage } from './ProgressiveImage';

export interface GalleryLightboxProps {
  displayedFiles: GalleryFile[];
  currentFile: GalleryFile;
  onSelectFile: (file: GalleryFile) => void;
  onClose: () => void;
  galleryTitle: string;
  galleryClientName?: string;
  galleryCategory?: string;
  isPortfolio: boolean;
  isPrintsGallery: boolean;
  getDisplayUrl: (file: GalleryFile, isLightbox?: boolean) => string;
  isBalanceLocked: (fileId: string) => boolean;
  isExtraLocked: (fileId: string) => boolean;
  isFileLocked: (fileId: string) => boolean;
  isSelectionMode: boolean;
  selectionSubmitted: boolean;
  selectedFileIds: Set<string>;
  selectionNotes: Record<string, string>;
  updateSelectionNoteLocal: (fileId: string, note: string) => void;
  saveSelectionNoteDb: (fileId: string, note: string) => void;
  toggleSelection: (file: GalleryFile) => void;
  localFavouriteIds: Set<string>;
  toggleLocalFavourite: (file: GalleryFile) => void;
  downloadingId: string | null;
  singleDownloadStats: { loaded: number; total: number } | null;
  handleDownload: (file: GalleryFile) => void;
  cancelSingleDownload: () => void;
  onShowScreenshotWarning: () => void;
  onShowBalanceWarning: () => void;
  handleLongPressStart: () => void;
  handleLongPressEnd: () => void;
  watermarkOverlay: React.ReactNode;
}

const SLIDE_DURATION_MS = 340;
const SNAP_BACK_DURATION_MS = 250;
const SLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

export const GalleryLightbox: React.FC<GalleryLightboxProps> = ({
  displayedFiles,
  currentFile,
  onSelectFile,
  onClose,
  galleryTitle,
  galleryClientName,
  galleryCategory,
  isPortfolio,
  isPrintsGallery,
  getDisplayUrl,
  isBalanceLocked,
  isExtraLocked,
  isFileLocked,
  isSelectionMode,
  selectionSubmitted,
  selectedFileIds,
  selectionNotes,
  updateSelectionNoteLocal,
  saveSelectionNoteDb,
  toggleSelection,
  localFavouriteIds,
  toggleLocalFavourite,
  downloadingId,
  singleDownloadStats,
  handleDownload,
  cancelSingleDownload,
  onShowScreenshotWarning,
  onShowBalanceWarning,
  handleLongPressStart,
  handleLongPressEnd,
  watermarkOverlay,
}) => {
  const currentIndex = useMemo(
    () => displayedFiles.findIndex((f) => f.id === currentFile.id),
    [displayedFiles, currentFile.id],
  );

  const findNeighborIndex = useCallback(
    (fromIndex: number, step: 1 | -1): number => {
      const total = displayedFiles.length;
      if (total <= 1 || fromIndex < 0) return -1;
      for (let offset = 1; offset < total; offset++) {
        const candidateIdx = ((fromIndex + step * offset) % total + total) % total;
        const candidate = displayedFiles[candidateIdx];
        if (!candidate) continue;
        if (!isPortfolio && isBalanceLocked(candidate.id)) continue;
        return candidateIdx;
      }
      return -1;
    },
    [displayedFiles, isPortfolio, isBalanceLocked],
  );

  const prevIndex = useMemo(
    () => findNeighborIndex(currentIndex, -1),
    [findNeighborIndex, currentIndex],
  );
  const nextIndex = useMemo(
    () => findNeighborIndex(currentIndex, 1),
    [findNeighborIndex, currentIndex],
  );

  const prevFile = prevIndex >= 0 ? displayedFiles[prevIndex] : null;
  const nextFile = nextIndex >= 0 ? displayedFiles[nextIndex] : null;
  const hasMultiple = Boolean(prevFile && nextFile && displayedFiles.length > 1);

  // Carousel animation & touch swipe state
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapBack, setIsSnapBack] = useState(false);
  const [slideState, setSlideState] = useState<{
    direction: 'prev' | 'next';
    targetFile: GalleryFile;
  } | null>(null);

  const slideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapBackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    startTime: number;
    axisLock: 'horizontal' | 'vertical' | null;
    lastDx: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    axisLock: null,
    lastDx: 0,
  });

  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accumulatedDeltaRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (slideTimerRef.current) {
      clearTimeout(slideTimerRef.current);
      slideTimerRef.current = null;
    }
    if (snapBackTimerRef.current) {
      clearTimeout(snapBackTimerRef.current);
      snapBackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, [clearTimers]);

  // Reset drag state cleanly if external selection changes
  useEffect(() => {
    setDragOffsetPx(0);
    setIsDragging(false);
    setIsSnapBack(false);
    setSlideState(null);
    clearTimers();
  }, [currentFile.id, clearTimers]);

  // Preload adjacent & +2 photographs whenever current slide updates
  useEffect(() => {
    if (currentIndex < 0) return;
    preloadGalleryNeighborhood(
      displayedFiles,
      currentIndex,
      (file) => getDisplayUrl(file, true),
      (file) => !isPortfolio && isBalanceLocked(file.id),
    );
  }, [displayedFiles, currentIndex, getDisplayUrl, isPortfolio, isBalanceLocked]);

  // Scroll active thumbnail smoothly into center view
  useEffect(() => {
    const thumb = document.getElementById(`thumbnail-${currentFile.id}`);
    if (thumb) {
      thumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentFile.id]);

  // Lock body scroll while lightbox is mounted
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const prefersReducedMotion = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const commitSlide = useCallback(
    (targetFile: GalleryFile) => {
      clearTimers();
      setSlideState(null);
      setDragOffsetPx(0);
      setIsDragging(false);
      setIsSnapBack(false);
      onSelectFile(targetFile);
    },
    [clearTimers, onSelectFile],
  );

  const triggerSlide = useCallback(
    (direction: 'prev' | 'next') => {
      if (!hasMultiple) return;

      // Rapid navigation guard: if a slide is already animating, advance directly from its target
      if (slideState) {
        const pendingIndex = displayedFiles.findIndex((f) => f.id === slideState.targetFile.id);
        const stepIdx = findNeighborIndex(pendingIndex, direction === 'next' ? 1 : -1);
        const nextTarget = stepIdx >= 0 ? displayedFiles[stepIdx] : slideState.targetFile;
        commitSlide(nextTarget);
        return;
      }

      const targetFile = direction === 'next' ? nextFile : prevFile;
      if (!targetFile) return;

      if (prefersReducedMotion()) {
        commitSlide(targetFile);
        return;
      }

      clearTimers();
      setIsDragging(false);
      setIsSnapBack(false);
      setSlideState({ direction, targetFile });

      slideTimerRef.current = setTimeout(() => {
        commitSlide(targetFile);
      }, SLIDE_DURATION_MS + 20);
    },
    [
      hasMultiple,
      slideState,
      displayedFiles,
      findNeighborIndex,
      commitSlide,
      nextFile,
      prevFile,
      prefersReducedMotion,
      clearTimers,
    ],
  );

  // Keyboard navigation inside Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerSlide('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerSlide('next');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerSlide, onClose]);

  const handleTrackTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
    if (slideState) {
      commitSlide(slideState.targetFile);
    } else if (isSnapBack) {
      clearTimers();
      setIsSnapBack(false);
      setDragOffsetPx(0);
    }
  };

  // Touch drag / swipe gestures
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!hasMultiple || slideState || e.touches.length !== 1) return;
    const targetEl = e.target as HTMLElement | null;
    if (targetEl && targetEl.closest('button, textarea, input, a')) {
      return;
    }

    const touch = e.touches[0];
    touchStateRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: performance.now(),
      axisLock: null,
      lastDx: 0,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const ts = touchStateRef.current;
    if (!ts.active || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const dx = touch.clientX - ts.startX;
    const dy = touch.clientY - ts.startY;

    if (ts.axisLock === null) {
      const distance = Math.hypot(dx, dy);
      if (distance < 10) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.1) {
        ts.axisLock = 'horizontal';
        setIsDragging(true);
        setIsSnapBack(false);
      } else {
        ts.axisLock = 'vertical';
        ts.active = false;
        return;
      }
    }

    if (ts.axisLock === 'horizontal') {
      ts.lastDx = dx;
      setDragOffsetPx(dx);
    }
  };

  const handleTouchEnd = () => {
    const ts = touchStateRef.current;
    if (!ts.active) return;

    const wasHorizontal = ts.axisLock === 'horizontal';
    const dx = ts.lastDx;
    const elapsed = Math.max(1, performance.now() - ts.startTime);
    const velocity = dx / elapsed; // px per ms

    ts.active = false;
    ts.axisLock = null;
    ts.lastDx = 0;
    setIsDragging(false);

    if (!wasHorizontal) return;

    const shouldAdvanceNext = dx < -48 || (dx < -18 && velocity < -0.35);
    const shouldAdvancePrev = dx > 48 || (dx > 18 && velocity > 0.35);

    if (shouldAdvanceNext) {
      triggerSlide('next');
    } else if (shouldAdvancePrev) {
      triggerSlide('prev');
    } else {
      setIsSnapBack(true);
      setDragOffsetPx(0);
      snapBackTimerRef.current = setTimeout(() => {
        setIsSnapBack(false);
      }, SNAP_BACK_DURATION_MS + 20);
    }
  };

  // Trackpad / mouse wheel navigation
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    accumulatedDeltaRef.current += delta;

    const threshold = 60;
    if (accumulatedDeltaRef.current > threshold) {
      triggerSlide('next');
      accumulatedDeltaRef.current = 0;
    } else if (accumulatedDeltaRef.current < -threshold) {
      triggerSlide('prev');
      accumulatedDeltaRef.current = 0;
    }

    if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    wheelTimeoutRef.current = setTimeout(() => {
      accumulatedDeltaRef.current = 0;
    }, 150);
  };

  // Compute GPU-accelerated track transform & transition
  let trackTransform = 'translate3d(0%, 0, 0)';
  let trackTransition = 'none';

  if (hasMultiple) {
    if (slideState?.direction === 'next') {
      trackTransform = 'translate3d(-200%, 0, 0)';
      trackTransition = `transform ${SLIDE_DURATION_MS}ms ${SLIDE_EASING}`;
    } else if (slideState?.direction === 'prev') {
      trackTransform = 'translate3d(0%, 0, 0)';
      trackTransition = `transform ${SLIDE_DURATION_MS}ms ${SLIDE_EASING}`;
    } else if (isDragging) {
      trackTransform = `translate3d(calc(-100% + ${dragOffsetPx}px), 0, 0)`;
      trackTransition = 'none';
    } else if (isSnapBack) {
      trackTransform = 'translate3d(-100%, 0, 0)';
      trackTransition = `transform ${SNAP_BACK_DURATION_MS}ms ${SLIDE_EASING}`;
    } else {
      trackTransform = 'translate3d(-100%, 0, 0)';
      trackTransition = 'none';
    }
  }

  const renderSlideMedia = (file: GalleryFile, slot: 'prev' | 'current' | 'next') => {
    const fileIdx = displayedFiles.findIndex((f) => f.id === file.id);
    const isVideo = isVideoMediaUrl(file.file_url, file.file_type);
    const isActiveSlide = slot === 'current';

    if (isVideo) {
      return (
        <div className="relative w-full h-full flex items-center justify-center px-10 sm:px-16 md:px-20">
          <video
            key={`${slot}-${file.id}`}
            src={`${rewriteUrlToR2(file.file_url)}#t=0.001`}
            className="max-w-full max-h-full object-contain pointer-events-auto shadow-2xl"
            controls={isActiveSlide}
            controlsList={isFileLocked(file.id) ? 'nodownload nofullscreen' : ''}
            disablePictureInPicture={isFileLocked(file.id)}
            autoPlay={isActiveSlide}
            muted={!isActiveSlide}
            playsInline
            preload={isActiveSlide ? 'auto' : 'metadata'}
            onContextMenu={(e) => {
              if (!isPortfolio) {
                e.preventDefault();
                onShowScreenshotWarning();
              }
            }}
          />
          {isFileLocked(file.id) && !isPortfolio && watermarkOverlay}
        </div>
      );
    }

    const displayUrl = getDisplayUrl(file, true);
    const lookbook = isPortfolio
      ? getThemedLookbookImages(galleryClientName, galleryCategory)
      : [];
    const portfolioFallback =
      isPortfolio && lookbook.length > 0
        ? lookbook[Math.max(0, fileIdx) % lookbook.length]
        : undefined;

    return (
      <div className="relative w-full h-full flex items-center justify-center px-10 sm:px-16 md:px-20">
        <ProgressiveImage
          src={displayUrl}
          alt={`${galleryTitle || 'Gallery'} photograph ${fileIdx >= 0 ? fileIdx + 1 : ''}`}
          widths={LIGHTBOX_IMAGE_WIDTHS}
          sizes={LIGHTBOX_IMAGE_SIZES}
          quality={LIGHTBOX_IMAGE_QUALITY}
          priority={isActiveSlide ? 'hero' : 'above-fold'}
          objectFit="contain"
          fallbackSrc={portfolioFallback}
          containerClassName="relative w-full h-full flex items-center justify-center overflow-hidden"
          placeholderClassName="opacity-75"
          className="max-w-full max-h-full w-auto h-auto object-contain pointer-events-none drop-shadow-2xl select-none"
          draggable={false}
          style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
          onContextMenu={(e) => {
            if (!isPortfolio) {
              e.preventDefault();
              e.stopPropagation();
              onShowScreenshotWarning();
            }
          }}
        />
        {isFileLocked(file.id) && !isPortfolio && watermarkOverlay}
        {!isPortfolio && (
          <div
            className="absolute inset-0 z-10"
            style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShowScreenshotWarning();
            }}
            onTouchStart={handleLongPressStart}
            onTouchEnd={handleLongPressEnd}
            onTouchMove={handleLongPressEnd}
            onMouseDown={handleLongPressStart}
            onMouseUp={handleLongPressEnd}
            onMouseLeave={handleLongPressEnd}
            onDragStart={(e) => e.preventDefault()}
          />
        )}
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${galleryTitle || 'Gallery'} image viewer`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#090d16]/95 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Lightbox Header: Counter + Actions */}
      <div className="absolute top-0 inset-x-0 px-4 sm:px-6 py-3.5 flex items-center justify-between z-50 pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          {currentIndex >= 0 && displayedFiles.length > 0 && (
            <span className="text-xs font-sans font-medium tracking-[0.22em] uppercase text-white/80 tabular-nums">
              {currentIndex + 1} / {displayedFiles.length}
            </span>
          )}
          {isPortfolio && galleryTitle && (
            <span className="hidden sm:inline font-serif text-sm tracking-[0.14em] uppercase text-white/55">
              {galleryTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {!isPortfolio && !isSelectionMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (downloadingId === currentFile.id) {
                  cancelSingleDownload();
                } else {
                  handleDownload(currentFile);
                }
              }}
              disabled={downloadingId !== null && downloadingId !== currentFile.id}
              className="text-white/90 hover:text-white min-h-[44px] min-w-[44px] p-2.5 bg-black/50 hover:bg-black/80 rounded-full transition-colors flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              title="Download"
              aria-label="Download"
            >
              {downloadingId === currentFile.id ? (
                <X className="w-5 h-5 text-red-400" />
              ) : isFileLocked(currentFile.id) ? (
                <Lock className="w-5 h-5 text-amber-400" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-white/75 hover:text-white min-h-[44px] min-w-[44px] p-2.5 bg-black/40 hover:bg-black/75 rounded-full transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            title="Close (Esc)"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Carousel Stage */}
      <div
        className="relative w-full h-full flex items-center justify-center pt-14 pb-20 overflow-hidden touch-pan-y"
        style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
        onContextMenu={(e) => {
          if (!isPortfolio) {
            e.preventDefault();
            onShowScreenshotWarning();
          }
        }}
      >
        {(currentFile.is_edited || isExtraLocked(currentFile.id)) && !isPortfolio && (
          <div className="absolute top-14 left-4 z-50 flex items-center gap-2 pointer-events-none">
            {currentFile.is_edited && (
              <span className="bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-lg tracking-wide">
                EDITED
              </span>
            )}
            {isExtraLocked(currentFile.id) && (
              <span className="bg-amber-600 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-lg inline-flex items-center gap-1 tracking-wide">
                <Lock className="w-3 h-3" />
                EXTRA IMAGE · PAY FOR HIGH-RES
              </span>
            )}
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerSlide('prev');
              }}
              aria-label="Previous photograph"
              className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white min-h-[44px] min-w-[44px] p-2.5 sm:p-3 z-50 bg-black/40 hover:bg-black/75 rounded-full transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <ChevronLeft className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerSlide('next');
              }}
              aria-label="Next photograph"
              className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white min-h-[44px] min-w-[44px] p-2.5 sm:p-3 z-50 bg-black/40 hover:bg-black/75 rounded-full transition-colors flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7" />
            </button>
          </>
        )}

        {/* GPU-accelerated 3-panel slide track */}
        <div
          className="flex w-full h-full will-change-transform"
          style={{
            transform: trackTransform,
            transition: trackTransition,
          }}
          onTransitionEnd={handleTrackTransitionEnd}
        >
          {hasMultiple && prevFile ? (
            <>
              <div key="prev" className="w-full h-full shrink-0 flex items-center justify-center">
                {renderSlideMedia(prevFile, 'prev')}
              </div>
              <div key="current" className="w-full h-full shrink-0 flex items-center justify-center">
                {renderSlideMedia(currentFile, 'current')}
              </div>
              <div key="next" className="w-full h-full shrink-0 flex items-center justify-center">
                {renderSlideMedia(nextFile!, 'next')}
              </div>
            </>
          ) : (
            <div key="single" className="w-full h-full shrink-0 flex items-center justify-center">
              {renderSlideMedia(currentFile, 'current')}
            </div>
          )}
        </div>
      </div>

      {/* Print Info in Lightbox */}
      {(isPrintsGallery && currentFile.title?.trim()) ||
      (currentFile.description ?? currentFile.caption)?.trim() ||
      currentFile.print_size?.trim() ||
      currentFile.material?.trim() ||
      currentFile.price?.trim() ? (
        <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:max-w-md z-50 bg-black/60 backdrop-blur-md text-white p-5 rounded-lg border border-white/10 overflow-y-auto max-h-[40vh]">
          {currentFile.title?.trim() && isPrintsGallery && (
            <h3 className="font-sans text-2xl font-medium mb-1 drop-shadow-sm">
              {currentFile.title}
            </h3>
          )}
          {(currentFile.description ?? currentFile.caption)?.trim() && (
            <p className="text-sm text-slate-300 leading-relaxed mb-3 font-light">
              {currentFile.description ?? currentFile.caption}
            </p>
          )}
          {(currentFile.print_size?.trim() || currentFile.material?.trim()) && (
            <div className="text-xs text-slate-400 uppercase tracking-widest mt-2 flex flex-wrap items-center gap-2">
              {currentFile.print_size?.trim() && <span>{currentFile.print_size}</span>}
              {currentFile.print_size?.trim() && currentFile.material?.trim() && (
                <span className="opacity-50">|</span>
              )}
              {currentFile.material?.trim() && <span>{currentFile.material}</span>}
            </div>
          )}
          {currentFile.price?.trim() && (
            <p className="text-lg font-bold text-slate-300 mt-2">{currentFile.price}</p>
          )}
        </div>
      ) : null}

      {/* Action buttons in lightbox (client delivery & selection modes) */}
      <div className="absolute bottom-[90px] left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center gap-4 w-[90%] max-w-sm">
        {isSelectionMode ? (
          <>
            {selectedFileIds.has(currentFile.id) && (
              <div className="w-full bg-black/60 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 border border-white/20">
                <textarea
                  value={selectionNotes[currentFile.id] || ''}
                  placeholder="Add a note (e.g., Please crop this)..."
                  onChange={(e) => updateSelectionNoteLocal(currentFile.id, e.target.value)}
                  onBlur={(e) => saveSelectionNoteDb(currentFile.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                  disabled={selectionSubmitted}
                  className="w-full bg-transparent text-white placeholder-white/50 text-sm p-4 resize-none outline-none focus:bg-white/10 transition-colors"
                  rows={2}
                />
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSelection(currentFile);
              }}
              disabled={selectionSubmitted}
              className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-medium transition-all ${
                selectedFileIds.has(currentFile.id)
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-white text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Heart
                className={`w-5 h-5 ${selectedFileIds.has(currentFile.id) ? 'fill-current' : ''}`}
              />
              <span>{selectedFileIds.has(currentFile.id) ? 'Selected' : 'Select Photo'}</span>
            </button>
          </>
        ) : (
          !isPortfolio && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLocalFavourite(currentFile);
                }}
                className={`p-3 rounded-full shadow-2xl flex items-center justify-center transition-all border border-white/20 ${
                  localFavouriteIds.has(currentFile.id)
                    ? 'bg-rose-500 text-white hover:bg-rose-600'
                    : 'bg-white text-slate-800 hover:bg-slate-100'
                }`}
                title={
                  localFavouriteIds.has(currentFile.id)
                    ? 'Remove from Favourites'
                    : 'Save to Favourites'
                }
              >
                <Heart
                  className={`w-5 h-5 ${localFavouriteIds.has(currentFile.id) ? 'fill-current' : ''}`}
                />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (downloadingId === currentFile.id) {
                    cancelSingleDownload();
                  } else {
                    handleDownload(currentFile);
                  }
                }}
                disabled={downloadingId !== null && downloadingId !== currentFile.id}
                className={`px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 font-medium transition-all border border-white/20 ${
                  isFileLocked(currentFile.id)
                    ? 'bg-slate-100 text-slate-800'
                    : downloadingId === currentFile.id
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                      : 'bg-white text-slate-900 hover:bg-slate-100'
                }`}
              >
                {downloadingId === currentFile.id ? (
                  <X className="w-5 h-5" />
                ) : isFileLocked(currentFile.id) ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>
                  {downloadingId === currentFile.id
                    ? singleDownloadStats
                      ? singleDownloadStats.total
                        ? `Cancel (${Math.round((singleDownloadStats.loaded / singleDownloadStats.total) * 100)}%)`
                        : `Cancel (${(singleDownloadStats.loaded / 1024 / 1024).toFixed(1)}MB)`
                      : 'Cancel'
                    : isFileLocked(currentFile.id)
                      ? 'Locked'
                      : isVideoMediaUrl(currentFile.file_url, currentFile.file_type)
                        ? 'Download Video'
                        : 'Download Photo'}
                </span>
              </button>
            </div>
          )
        )}
      </div>

      {/* Thumbnail slider */}
      <div
        className="absolute bottom-4 left-0 right-0 z-50 px-4 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          id="lightbox-thumbnails-container"
          className="flex gap-2 overflow-x-auto pb-2 snap-x items-center justify-start max-w-4xl mx-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          onWheel={handleWheel}
        >
          {displayedFiles.map((file, index) => {
            const isThumbVideo = isVideoMediaUrl(file.file_url, file.file_type);
            return (
              <button
                key={file.id}
                id={`thumbnail-${file.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isPortfolio && isBalanceLocked(file.id)) {
                    onShowBalanceWarning();
                    return;
                  }
                  if (index === nextIndex) {
                    triggerSlide('next');
                  } else if (index === prevIndex) {
                    triggerSlide('prev');
                  } else {
                    onSelectFile(file);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!isPortfolio) {
                    onShowScreenshotWarning();
                  }
                }}
                onTouchStart={handleLongPressStart}
                onTouchEnd={handleLongPressEnd}
                onTouchMove={handleLongPressEnd}
                onMouseDown={handleLongPressStart}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                className={`relative shrink-0 snap-center rounded-none overflow-hidden transition-all duration-300 cursor-pointer ${
                  currentFile.id === file.id
                    ? 'w-16 h-16 border-2 border-white opacity-100 shadow-lg'
                    : 'w-12 h-12 border border-white/20 opacity-50 hover:opacity-100'
                }`}
              >
                {isThumbVideo ? (
                  <video
                    src={`${rewriteUrlToR2(file.file_url)}#t=0.001`}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={getOptimizedImageUrl(getDisplayUrl(file), 160, 160, 60)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const rawFallback = rewriteUrlToR2(getDisplayUrl(file));
                      if (!target.dataset.retried && rawFallback && target.src !== rawFallback) {
                        target.dataset.retried = 'true';
                        target.src = rawFallback;
                      } else if (isPortfolio) {
                        const lookbook = getThemedLookbookImages(
                          galleryClientName,
                          galleryCategory,
                        );
                        const fallbackPhoto = lookbook[index % lookbook.length];
                        if (target.src !== fallbackPhoto) {
                          target.src = fallbackPhoto;
                        }
                      }
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
