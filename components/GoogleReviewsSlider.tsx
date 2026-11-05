import React, { useState, useEffect, useRef } from 'react';
import { Star, ChevronLeft, ChevronRight, CheckCircle2, ExternalLink, MessageSquare, Quote, Sparkles } from 'lucide-react';
import { GoogleBusinessProfileConfig, GoogleReviewItem, DEFAULT_GOOGLE_BUSINESS_CONFIG } from '../data/googleReviews';

interface GoogleReviewsSliderProps {
  config?: GoogleBusinessProfileConfig;
  className?: string;
}

export const GoogleReviewsSlider: React.FC<GoogleReviewsSliderProps> = ({
  config = DEFAULT_GOOGLE_BUSINESS_CONFIG,
  className = '',
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const reviews = config.reviews && config.reviews.length > 0 ? config.reviews : DEFAULT_GOOGLE_BUSINESS_CONFIG.reviews;
  const total = reviews.length;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto slide every 6 seconds if not paused by user
  useEffect(() => {
    if (isPaused || total <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 6000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, total]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % total);
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) handleNext();
    if (isRightSwipe) handlePrev();
  };

  if (!config.enabled || total === 0) return null;

  const currentReview = reviews[activeIndex];
  const googleProfileLink = config.googleProfileUrl || 'https://share.google/JNg3LLWIVUgmB1fFr';

  return (
    <section 
      aria-label="Google Client Reviews"
      className={`relative py-16 sm:py-24 overflow-hidden ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12">
        {/* Top Header with Google Business Badge */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-8 border-b border-slate-200 dark:border-white/10">
          <div>
            {/* Google Rating Trust Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 shadow-xs mb-4">
              {/* Google G Brand Icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.4 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.6 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span className="text-xs font-semibold tracking-wide text-slate-800 dark:text-slate-200">
                Google Reviews
              </span>
              <div className="flex items-center gap-0.5 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white ml-0.5">
                {config.rating.toFixed(1)}
              </span>
              <span className="text-[11px] text-slate-400">
                ({config.totalReviews} reviews)
              </span>
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 dark:text-white tracking-tight">
              {config.headline}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-light mt-2 max-w-2xl">
              {config.subheadline}
            </p>
          </div>

          {/* External Google Profile Link & Controls */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={googleProfileLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-white/40 transition-all hover:shadow-xs"
            >
              <span>View Google Profile</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>

            {/* Slider Navigation Arrows */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrev}
                aria-label="Previous review"
                className="w-9 h-9 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next review"
                className="w-9 h-9 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Featured Review Hero Card */}
        <div 
          className="relative bg-gradient-to-br from-slate-50 via-white to-slate-50/80 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-950 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm transition-all duration-500"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Subtle Decorative Quote Icon */}
          <div className="absolute top-6 right-6 sm:top-10 sm:right-10 text-slate-200 dark:text-white/5 pointer-events-none select-none">
            <Quote className="w-16 h-16 sm:w-24 sm:h-24" />
          </div>

          <div className="relative z-10 max-w-4xl">
            {/* Meta Tags: Shoot Type & Location */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {currentReview.shootType && (
                <span className="text-[11px] font-mono uppercase font-semibold tracking-wider px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  {currentReview.shootType}
                </span>
              )}
              {currentReview.location && (
                <span className="text-[11px] font-mono uppercase font-medium tracking-wider px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                  📍 {currentReview.location}
                </span>
              )}
              <span className="text-xs text-slate-400 font-mono">
                {currentReview.relativeTimeDescription}
              </span>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-1 text-amber-400 mb-6">
              {[...Array(currentReview.rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>

            {/* Highlighted Quote Header */}
            {currentReview.highlightQuote && (
              <h3 className="font-serif text-xl sm:text-2xl lg:text-3xl text-slate-900 dark:text-white font-normal leading-snug mb-4">
                “{currentReview.highlightQuote}”
              </h3>
            )}

            {/* Full Review Text */}
            <p className="text-sm sm:text-base lg:text-lg text-slate-700 dark:text-slate-300 font-light leading-relaxed mb-8">
              {currentReview.text}
            </p>

            {/* Reviewer Bio & Verified Badge */}
            <div className="flex items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-white/10 flex-wrap">
              <div className="flex items-center gap-3.5">
                {currentReview.authorPhoto ? (
                  <img
                    src={currentReview.authorPhoto}
                    alt={currentReview.authorName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-200 dark:ring-white/20 shadow-xs"
                    onError={(e) => {
                      // Fallback to initials if image fails
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-serif font-bold text-base flex items-center justify-center shadow-xs">
                    {currentReview.authorName.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white text-base flex items-center gap-1.5">
                    <span>{currentReview.authorName}</span>
                    {currentReview.verified && (
                      <span title="Verified Google Review">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>Verified Google Business Client</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">5.0 Star Experience</span>
                  </div>
                </div>
              </div>

              {/* Leave review or verify button */}
              <a
                href={googleProfileLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1.5 transition-colors underline underline-offset-4"
              >
                <span>Read review on Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Dots Pagination Indicators */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {reviews.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              aria-label={`Go to review ${idx + 1}`}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                activeIndex === idx 
                  ? 'w-8 bg-slate-900 dark:bg-white' 
                  : 'w-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
