import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown, ArrowUpRight, LayoutGrid } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { supabase } from '../services/supabase';
import { getCleanGalleryTitle, getOptimizedImageUrl, getParentGalleryId, rewriteUrlToR2 } from '../utils/formatters';
import { generateSlug } from '../utils/slug';

export interface PortfolioNavItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  coverUrl?: string | null;
  coverType?: string | null;
}

interface PublicHeaderProps {
  /** Optional custom brand name if provided by parent */
  brandName?: string;
  /** Optional custom contact/booking link if provided by parent */
  contactLink?: string;
  /** Optional scroll progress indicator (0 to 100) for reading progress */
  scrollProgress?: number;
  /** Optional callback when Films category is selected on homepage */
  onSelectCategory?: (category: string) => void;
  /** Optional override for active nav item (e.g. 'portfolio' when inside a portfolio exhibition) */
  activeNav?: 'portfolio' | 'films' | 'journal' | 'about' | 'faq';
  /** True when currently viewing a portfolio gallery page */
  isGalleryView?: boolean;
  /** Slug of the currently active portfolio gallery (or parent collection) */
  currentGallerySlug?: string;
}

const DEFAULT_BRAND_NAME = 'MWABONJE';
const DEFAULT_CONTACT_LINK = 'https://mwabonjebooking.netlify.app/';
const VIDEO_FILE_REGEX = /\.(mp4|mov|webm|ogg)(\?|$)/i;

let memoryPortfolioNavItems: PortfolioNavItem[] | null = null;

function isVideoMedia(url?: string | null, fileType?: string | null): boolean {
  if (fileType && fileType.toLowerCase().startsWith('video')) return true;
  if (!url) return false;
  return VIDEO_FILE_REGEX.test(url);
}

function mapCachedPortfolioItems(): PortfolioNavItem[] {
  try {
    const raw = sessionStorage.getItem('mwabonje_portfolio_cache');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((g: any) => g && g.id && g.client_name && g.link_enabled !== false)
      .map((g: any) => ({
        id: String(g.id),
        title: getCleanGalleryTitle(g),
        slug: generateSlug(g.client_name),
        category: (g.baseCategory || g.category?.replace(/\s*\[(swipe|grid)\]/gi, '').trim() || 'PORTFOLIO').toUpperCase(),
        coverUrl: g.coverUrl || null,
        coverType: g.coverType || null,
      }));
  } catch {
    return [];
  }
}

interface PortfolioThumbnailProps {
  title: string;
  coverUrl?: string | null;
  coverType?: string | null;
  size?: 'sm' | 'md';
}

const PortfolioThumbnail: React.FC<PortfolioThumbnailProps> = ({
  title,
  coverUrl,
  coverType,
  size = 'md',
}) => {
  const rawUrl = coverUrl ? rewriteUrlToR2(coverUrl) : '';
  const isVideo = isVideoMedia(rawUrl, coverType);
  const optimizedUrl = !isVideo && rawUrl ? getOptimizedImageUrl(rawUrl, 160, 160, 80) : '';

  const [imgSrc, setImgSrc] = useState<string>(optimizedUrl || rawUrl);
  const [retriedRaw, setRetriedRaw] = useState(false);
  const [hasError, setHasError] = useState(!rawUrl);

  useEffect(() => {
    const nextRaw = coverUrl ? rewriteUrlToR2(coverUrl) : '';
    const nextIsVideo = isVideoMedia(nextRaw, coverType);
    const nextOpt = !nextIsVideo && nextRaw ? getOptimizedImageUrl(nextRaw, 160, 160, 80) : '';
    setImgSrc(nextOpt || nextRaw);
    setRetriedRaw(false);
    setHasError(!nextRaw);
  }, [coverUrl, coverType]);

  const handleImageError = () => {
    if (!retriedRaw && rawUrl && imgSrc !== rawUrl) {
      setRetriedRaw(true);
      setImgSrc(rawUrl);
    } else {
      setHasError(true);
    }
  };

  const dimensionClasses = size === 'sm' ? 'w-9 h-9 rounded-lg' : 'w-12 h-11 rounded-lg';

  return (
    <div
      className={`${dimensionClasses} relative shrink-0 overflow-hidden bg-slate-200/75 dark:bg-slate-800/90 border border-slate-900/[0.08] dark:border-white/[0.08]`}
    >
      {rawUrl && !hasError ? (
        isVideo ? (
          <video
            src={`${rawUrl}#t=0.001`}
            muted
            playsInline
            preload="metadata"
            onError={() => setHasError(true)}
            className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/item:scale-[1.06] group-focus-visible/item:scale-[1.06] motion-reduce:transform-none"
          />
        ) : (
          <img
            src={imgSrc}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/item:scale-[1.06] group-focus-visible/item:scale-[1.06] motion-reduce:transform-none"
          />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center font-serif text-sm font-semibold text-slate-600 dark:text-slate-300 select-none">
          {title.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
};

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  brandName: propBrandName,
  contactLink: propContactLink,
  scrollProgress,
  onSelectCategory,
  activeNav,
  isGalleryView = false,
  currentGallerySlug,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPortfolioDropdownOpen, setIsPortfolioDropdownOpen] = useState(false);
  const [isMobilePortfolioOpen, setIsMobilePortfolioOpen] = useState(isGalleryView);

  const dropdownContainerRef = useRef<HTMLDivElement>(null);
  const portfolioTriggerRef = useRef<HTMLAnchorElement>(null);
  const menuItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [portfolioItems, setPortfolioItems] = useState<PortfolioNavItem[]>(() => {
    const fromSession = mapCachedPortfolioItems();
    if (fromSession.length > 0) {
      memoryPortfolioNavItems = fromSession;
      return fromSession;
    }
    return memoryPortfolioNavItems || [];
  });

  // Local settings with fast local storage caching to eliminate navigation flash
  const [settings, setSettings] = useState(() => {
    let cached: any = null;
    try {
      const raw = localStorage.getItem('mwabonje_site_settings');
      if (raw) cached = JSON.parse(raw);
    } catch {}
    return {
      brandName: propBrandName || cached?.brandName || DEFAULT_BRAND_NAME,
      contactLink: propContactLink || cached?.contactLink || DEFAULT_CONTACT_LINK,
    };
  });

  // Sync with props if provided
  useEffect(() => {
    if (propBrandName || propContactLink) {
      setSettings(prev => ({
        brandName: propBrandName || prev.brandName,
        contactLink: propContactLink || prev.contactLink,
      }));
    }
  }, [propBrandName, propContactLink]);

  // Fetch live settings if not already provided
  useEffect(() => {
    if (propBrandName && propContactLink) return;

    let isMounted = true;
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('galleries')
          .select('title')
          .eq('category', 'SETTINGS')
          .maybeSingle();

        if (data?.title && isMounted) {
          const parsed = JSON.parse(data.title);
          const newBrand = propBrandName || parsed.brandName || DEFAULT_BRAND_NAME;
          const newContact = propContactLink || parsed.contactLink || DEFAULT_CONTACT_LINK;

          setSettings({
            brandName: newBrand,
            contactLink: newContact,
          });

          try {
            localStorage.setItem('mwabonje_site_settings', JSON.stringify({
              brandName: newBrand,
              contactLink: newContact,
            }));
          } catch {}
        }
      } catch {
        // Fallback to defaults
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, [propBrandName, propContactLink]);

  // Load portfolio galleries and resolve covers (including child sub-gallery collections like Lamu)
  useEffect(() => {
    let isMounted = true;

    const cachedFromSession = mapCachedPortfolioItems();
    if (cachedFromSession.length > 0) {
      memoryPortfolioNavItems = cachedFromSession;
      setPortfolioItems(cachedFromSession);
    }

    const fetchPortfolioNav = async () => {
      try {
        const { data, error } = await supabase
          .from('galleries')
          .select('id, client_name, title, category, created_at, photographer_id, link_enabled')
          .order('created_at', { ascending: false });

        if (error || !data || !isMounted) return;

        let allGalleries = [...data];
        if (allGalleries.length > 0) {
          const mostRecentPortfolio = allGalleries.find(
            g =>
              g.category &&
              g.category.trim() !== '' &&
              g.category !== 'SETTINGS' &&
              g.category !== 'ABOUT' &&
              g.category !== 'FAQ' &&
              g.client_name !== '__FAQ__' &&
              g.client_name !== '__ABOUT__' &&
              g.client_name !== 'SITE_SETTINGS'
          );
          if (mostRecentPortfolio) {
            allGalleries = allGalleries.filter(g => g.photographer_id === mostRecentPortfolio.photographer_id);
          }
        }

        const childIdsByParent = new Map<string, string[]>();
        allGalleries.forEach(g => {
          const parentId = getParentGalleryId(g);
          if (parentId) {
            const list = childIdsByParent.get(parentId) || [];
            list.push(String(g.id));
            childIdsByParent.set(parentId, list);
          }
        });

        const coverMap = new Map<string, { url: string; type: string | null }>();
        (memoryPortfolioNavItems || []).forEach(item => {
          if (item.coverUrl) {
            coverMap.set(item.id, { url: item.coverUrl, type: item.coverType || null });
          }
        });
        mapCachedPortfolioItems().forEach(item => {
          if (item.coverUrl) {
            coverMap.set(item.id, { url: item.coverUrl, type: item.coverType || null });
          }
        });

        const topLevelGalleries = allGalleries
          .filter(
            g =>
              g.link_enabled !== false &&
              g.category &&
              g.category.trim() !== '' &&
              g.category.toLowerCase() !== 'delivery' &&
              g.category !== 'SETTINGS' &&
              g.category !== 'ABOUT' &&
              g.category !== 'FAQ' &&
              g.client_name !== '__FAQ__' &&
              g.client_name !== '__ABOUT__' &&
              g.client_name !== 'SITE_SETTINGS' &&
              !getParentGalleryId(g)
          )
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const pickBestCover = (filesList: Array<{ file_url?: string | null; file_type?: string | null }> | null) => {
          if (!filesList || filesList.length === 0) return null;
          const imageFile = filesList.find(f => f.file_url && !isVideoMedia(f.file_url, f.file_type));
          const chosen = imageFile || filesList.find(f => Boolean(f.file_url));
          if (!chosen?.file_url) return null;
          return { url: chosen.file_url, type: chosen.file_type || null };
        };

        const resolvedCovers = await Promise.all(
          topLevelGalleries.map(async g => {
            const id = String(g.id);
            const existing = coverMap.get(id);
            if (existing?.url) return { id, cover: existing };

            const { data: directFiles } = await supabase
              .from('files')
              .select('file_url, file_type')
              .eq('gallery_id', g.id)
              .neq('file_path', 'GALLERY_PASSWORD')
              .order('created_at', { ascending: false })
              .limit(4);

            const directPick = pickBestCover(directFiles);
            if (directPick) return { id, cover: directPick };

            const childIds = childIdsByParent.get(id) || [];
            if (childIds.length > 0) {
              const { data: childFiles } = await supabase
                .from('files')
                .select('file_url, file_type')
                .in('gallery_id', childIds)
                .neq('file_path', 'GALLERY_PASSWORD')
                .order('created_at', { ascending: false })
                .limit(6);

              const childPick = pickBestCover(childFiles);
              if (childPick) return { id, cover: childPick };
            }

            return { id, cover: null };
          })
        );

        resolvedCovers.forEach(({ id, cover }) => {
          if (cover) coverMap.set(id, cover);
        });

        const topLevelItems: PortfolioNavItem[] = topLevelGalleries.map(g => {
          const resolved = coverMap.get(String(g.id));
          return {
            id: String(g.id),
            title: getCleanGalleryTitle(g),
            slug: generateSlug(g.client_name),
            category: (g.category?.replace(/\s*\[(swipe|grid)\]/gi, '').trim() || 'PORTFOLIO').toUpperCase(),
            coverUrl: resolved?.url || null,
            coverType: resolved?.type || null,
          };
        });

        if (isMounted && topLevelItems.length > 0) {
          memoryPortfolioNavItems = topLevelItems;
          setPortfolioItems(topLevelItems);
        }
      } catch {
        // Keep cached items if network call fails
      }
    };

    fetchPortfolioNav();
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  // Close menus on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsPortfolioDropdownOpen(false);
  }, [location.pathname, location.search, location.hash]);

  const closeDropdownAndRestoreFocus = useCallback((restoreFocus = false) => {
    setIsPortfolioDropdownOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => {
        portfolioTriggerRef.current?.focus();
      });
    }
  }, []);

  // Close menus on ESC key or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const wasDropdownOpen = isPortfolioDropdownOpen;
        setIsMenuOpen(false);
        closeDropdownAndRestoreFocus(wasDropdownOpen);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target as Node)
      ) {
        setIsPortfolioDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPortfolioDropdownOpen, closeDropdownAndRestoreFocus]);

  useEffect(() => {
    return () => {
      if (hoverCloseTimeoutRef.current) {
        clearTimeout(hoverCloseTimeoutRef.current);
      }
    };
  }, []);

  // Determine active route state
  const isHome = location.pathname === '/' || location.pathname === '';
  const searchParams = new URLSearchParams(location.search);
  const isFilmsActive = activeNav ? activeNav === 'films' : ((isHome && searchParams.get('category') === 'FILMS') || location.hash === '#films');
  const isPortfolioActive = activeNav ? activeNav === 'portfolio' : (isHome && !isFilmsActive);
  const isJournalActive = activeNav ? activeNav === 'journal' : location.pathname.startsWith('/blog');
  const isAboutActive = activeNav ? activeNav === 'about' : location.pathname === '/about';
  const isFaqActive = activeNav ? activeNav === 'faq' : location.pathname === '/faq';

  const normalizedPathSlug = location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || '';
  const activeSlug = currentGallerySlug || normalizedPathSlug;
  const isViewingGalleryRoute =
    isGalleryView ||
    (!isHome &&
      !isJournalActive &&
      !isAboutActive &&
      !isFaqActive &&
      portfolioItems.some(item => item.slug === activeSlug));

  useEffect(() => {
    if (isViewingGalleryRoute) {
      setIsMobilePortfolioOpen(true);
    }
  }, [isViewingGalleryRoute]);

  const openDropdownOnHover = () => {
    if (portfolioItems.length === 0) return;
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
    setIsPortfolioDropdownOpen(true);
  };

  const closeDropdownWithDelay = () => {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
    }
    hoverCloseTimeoutRef.current = setTimeout(() => {
      setIsPortfolioDropdownOpen(false);
    }, 180);
  };

  const handleDropdownContainerBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const nextFocused = e.relatedTarget as Node | null;
    if (nextFocused && dropdownContainerRef.current?.contains(nextFocused)) {
      return;
    }
    setIsPortfolioDropdownOpen(false);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if (portfolioItems.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsPortfolioDropdownOpen(true);
      requestAnimationFrame(() => {
        menuItemRefs.current[0]?.focus();
      });
    } else if (e.key === 'ArrowUp' && isPortfolioDropdownOpen) {
      e.preventDefault();
      const lastIndex = portfolioItems.length; // index 0 = All Portfolio Works, 1..N = items
      menuItemRefs.current[lastIndex]?.focus();
    }
  };

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const focusableItems = menuItemRefs.current.filter(
      (el): el is HTMLAnchorElement => el !== null && el.isConnected
    );
    if (focusableItems.length === 0) return;

    const currentIndex = focusableItems.indexOf(document.activeElement as HTMLAnchorElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % focusableItems.length;
      focusableItems[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentIndex <= 0) {
        closeDropdownAndRestoreFocus(true);
      } else {
        focusableItems[currentIndex - 1]?.focus();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusableItems[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      focusableItems[focusableItems.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdownAndRestoreFocus(true);
    }
  };

  // Navigation handlers
  const handlePortfolioClick = (e: React.MouseEvent) => {
    if (isViewingGalleryRoute && portfolioItems.length > 0) {
      e.preventDefault();
      setIsPortfolioDropdownOpen(prev => !prev);
      return;
    }

    setIsMenuOpen(false);
    setIsPortfolioDropdownOpen(false);
    if (isHome) {
      e.preventDefault();
      const workEl = document.getElementById('work');
      if (workEl) {
        workEl.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      navigate('/');
    }
  };

  const handleFilmsClick = (e: React.MouseEvent) => {
    setIsMenuOpen(false);
    setIsPortfolioDropdownOpen(false);
    if (isHome) {
      e.preventDefault();
      if (onSelectCategory) {
        onSelectCategory('FILMS');
      } else {
        navigate('/?category=FILMS#work');
      }
      const workEl = document.getElementById('work');
      if (workEl) workEl.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/?category=FILMS#work');
    }
  };

  const linkBaseClasses =
    "relative whitespace-nowrap shrink-0 transition-colors duration-200 pt-2 pb-1.5 text-[11px] lg:text-xs tracking-[0.16em] uppercase rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/70 dark:focus-visible:ring-amber-300/80 focus-visible:ring-offset-4 focus-visible:ring-offset-[#FAF8F5] dark:focus-visible:ring-offset-[#0b0f17] after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[1.5px] after:bg-slate-900 dark:after:bg-white after:transition-transform after:duration-200 after:ease-[cubic-bezier(0.16,1,0.3,1)] after:origin-left motion-reduce:after:transition-none";
  const activeClass = "text-slate-950 dark:text-white font-bold after:scale-x-100";
  const inactiveClass = "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-semibold after:scale-x-0 hover:after:scale-x-100";

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F5]/95 dark:bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-900/[0.08] dark:border-slate-800/90 transition-colors duration-300">
      {/* Optional scroll progress bar for reading view (e.g. BlogPost) */}
      {typeof scrollProgress === 'number' && (
        <div
          className="absolute top-0 left-0 h-1 bg-slate-900 dark:bg-amber-400 transition-all duration-150 ease-out z-20 pointer-events-none"
          style={{ width: `${Math.min(100, Math.max(0, scrollProgress))}%` }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-20 flex items-center justify-between gap-3 md:gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          className="flex items-center shrink-0 whitespace-nowrap group rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/70 dark:focus-visible:ring-amber-300/80 focus-visible:ring-offset-4 focus-visible:ring-offset-[#FAF8F5] dark:focus-visible:ring-offset-[#0b0f17]"
        >
          <span className="font-serif text-xl sm:text-[22px] lg:text-[26px] font-bold tracking-[0.16em] lg:tracking-[0.18em] text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors duration-200">
            {settings.brandName}
          </span>
        </Link>

        {/* Zone 2: Desktop & Tablet Navigation */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-4 lg:gap-7 xl:gap-9"
        >
          {/* Portfolio Item with Refined Quick-Switch Gallery Dropdown */}
          <div
            ref={dropdownContainerRef}
            className="relative flex items-center"
            onMouseEnter={openDropdownOnHover}
            onMouseLeave={closeDropdownWithDelay}
            onBlur={handleDropdownContainerBlur}
          >
            <a
              ref={portfolioTriggerRef}
              href={isHome ? "#work" : "/"}
              onClick={handlePortfolioClick}
              onKeyDown={handleTriggerKeyDown}
              aria-expanded={portfolioItems.length > 0 ? isPortfolioDropdownOpen : undefined}
              aria-haspopup={portfolioItems.length > 0 ? 'menu' : undefined}
              aria-controls={portfolioItems.length > 0 ? 'portfolio-nav-menu' : undefined}
              className={`${linkBaseClasses} inline-flex items-center gap-1.5 cursor-pointer ${
                isPortfolioActive
                  ? activeClass
                  : `${inactiveClass} ${isPortfolioDropdownOpen ? 'text-slate-950 dark:text-white after:scale-x-100' : ''}`
              }`}
            >
              <span>Portfolio</span>
              {portfolioItems.length > 0 && (
                <ChevronDown
                  aria-hidden="true"
                  className={`w-3.5 h-3.5 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
                    isPortfolioDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </a>

            {portfolioItems.length > 0 && (
              <div
                id="portfolio-nav-menu"
                role="menu"
                aria-label="Portfolio Galleries"
                aria-hidden={!isPortfolioDropdownOpen}
                onKeyDown={handleMenuKeyDown}
                className={`absolute left-0 top-full pt-2.5 z-50 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] origin-top-left motion-reduce:transition-none ${
                  isPortfolioDropdownOpen
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 -translate-y-1.5 pointer-events-none'
                }`}
              >
                <div className="w-[348px] lg:w-[372px] rounded-2xl bg-[#FAF8F5] dark:bg-[#111827] border border-slate-900/10 dark:border-slate-800 shadow-[0_20px_48px_-14px_rgba(15,23,42,0.16)] dark:shadow-[0_22px_52px_-12px_rgba(0,0,0,0.65)] overflow-hidden">
                  {/* Top Bar: All Portfolio Works + Gallery Count */}
                  <Link
                    ref={el => {
                      menuItemRefs.current[0] = el;
                    }}
                    to="/"
                    role="menuitem"
                    tabIndex={isPortfolioDropdownOpen ? 0 : -1}
                    onClick={() => setIsPortfolioDropdownOpen(false)}
                    className="group/all flex items-center justify-between px-4 py-3 border-b border-slate-900/[0.08] dark:border-white/[0.08] bg-white/55 dark:bg-white/[0.02] hover:bg-white/90 dark:hover:bg-white/[0.05] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900/75 dark:focus-visible:ring-amber-300/80"
                  >
                    <span className="flex items-center gap-2 text-[10.5px] font-bold tracking-[0.16em] uppercase text-slate-900 dark:text-white group-hover/all:text-slate-700 dark:group-hover/all:text-amber-200 transition-colors">
                      <LayoutGrid aria-hidden="true" className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover/all:text-slate-900 dark:group-hover/all:text-amber-200 transition-colors" />
                      <span>All Portfolio Works</span>
                    </span>
                    <span className="text-[10px] font-medium tracking-[0.06em] tabular-nums text-slate-500 dark:text-slate-400">
                      {portfolioItems.length} {portfolioItems.length === 1 ? 'Gallery' : 'Galleries'}
                    </span>
                  </Link>

                  {/* Gallery Switcher List */}
                  <div className="max-h-[min(68vh,512px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] divide-y divide-slate-900/[0.055] dark:divide-white/[0.06]">
                    {portfolioItems.map((item, idx) => {
                      const isCurrent = isViewingGalleryRoute && activeSlug === item.slug;

                      return (
                        <Link
                          key={item.id}
                          ref={el => {
                            menuItemRefs.current[idx + 1] = el;
                          }}
                          to={`/${item.slug}`}
                          role="menuitem"
                          tabIndex={isPortfolioDropdownOpen ? 0 : -1}
                          onClick={() => setIsPortfolioDropdownOpen(false)}
                          className={`group/item flex items-center justify-between gap-3 px-4 py-2.5 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900/75 dark:focus-visible:ring-amber-300/80 ${
                            isCurrent
                              ? 'bg-slate-900/[0.055] dark:bg-white/[0.08] text-slate-950 dark:text-white'
                              : 'text-slate-800 dark:text-slate-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <PortfolioThumbnail
                              title={item.title}
                              coverUrl={item.coverUrl}
                              coverType={item.coverType}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className={`font-serif text-[16px] leading-[1.2] tracking-[0.01em] truncate ${isCurrent ? 'font-bold text-slate-950 dark:text-white' : 'font-medium text-slate-900 dark:text-slate-100'}`}>
                                {item.title}
                              </div>
                              <div className="text-[10px] font-medium tracking-[0.16em] uppercase text-slate-500 dark:text-slate-400 mt-1 truncate">
                                {item.category}
                              </div>
                            </div>
                          </div>

                          {isCurrent ? (
                            <span className="shrink-0 text-[9.5px] font-semibold tracking-[0.16em] uppercase text-slate-700 dark:text-amber-300">
                              Viewing
                            </span>
                          ) : (
                            <ArrowUpRight
                              aria-hidden="true"
                              className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500 opacity-0 -translate-x-0.5 translate-y-0.5 group-hover/item:opacity-100 group-hover/item:translate-x-0 group-hover/item:translate-y-0 group-focus-visible/item:opacity-100 group-focus-visible/item:translate-x-0 group-focus-visible/item:translate-y-0 transition-all duration-200"
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <a
            href={isHome ? "#films" : "/?category=FILMS#work"}
            onClick={handleFilmsClick}
            className={`${linkBaseClasses} ${isFilmsActive ? activeClass : inactiveClass}`}
          >
            Films
          </a>

          <Link
            to="/blog"
            className={`${linkBaseClasses} ${isJournalActive ? activeClass : inactiveClass}`}
          >
            Journal
          </Link>

          <Link
            to="/about"
            className={`${linkBaseClasses} ${isAboutActive ? activeClass : inactiveClass}`}
          >
            About
          </Link>

          <Link
            to="/faq"
            className={`${linkBaseClasses} ${isFaqActive ? activeClass : inactiveClass}`}
          >
            FAQ
          </Link>
        </nav>

        {/* Zone 3: Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-3.5 shrink-0">
          <ThemeToggle className="text-slate-600 dark:text-amber-300 min-h-[40px] min-w-[40px] justify-center" />

          <a
            href={settings.contactLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center whitespace-nowrap shrink-0 min-h-[38px] px-4 lg:px-6 py-2 bg-slate-900 dark:bg-white text-[#FAF8F5] dark:text-slate-950 rounded-full text-[11px] font-semibold tracking-[0.16em] uppercase hover:bg-slate-800 dark:hover:bg-slate-100 transition-all duration-200 shadow-sm active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF8F5] dark:focus-visible:ring-offset-[#0b0f17]"
          >
            Enquire
          </a>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(prev => !prev)}
            className="md:hidden min-h-[44px] min-w-[44px] p-2.5 flex items-center justify-center text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300"
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation-drawer"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          className="md:hidden border-t border-slate-900/[0.08] dark:border-slate-800 bg-[#FAF8F5] dark:bg-[#0b0f17] px-5 py-5 shadow-xl transition-colors max-h-[calc(100dvh-4rem)] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <div className="flex flex-col space-y-1 text-xs font-semibold tracking-[0.16em] uppercase">
            <div className="border-b border-slate-900/[0.07] dark:border-slate-800/80">
              <div className="flex items-center justify-between gap-2">
                <a
                  href={isHome ? "#work" : "/"}
                  onClick={(e) => {
                    if (portfolioItems.length > 0 && isViewingGalleryRoute) {
                      e.preventDefault();
                      setIsMobilePortfolioOpen(prev => !prev);
                    } else {
                      handlePortfolioClick(e);
                    }
                  }}
                  className={`flex-1 min-h-[44px] flex items-center py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300 rounded-md ${
                    isPortfolioActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Portfolio
                </a>
                {portfolioItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsMobilePortfolioOpen(prev => !prev)}
                    aria-label="Toggle portfolio galleries list"
                    aria-expanded={isMobilePortfolioOpen}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300"
                  >
                    <ChevronDown
                      aria-hidden="true"
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isMobilePortfolioOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                )}
              </div>

              {portfolioItems.length > 0 && isMobilePortfolioOpen && (
                <div className="pb-3 pl-1 normal-case tracking-normal">
                  <div className="max-h-[42dvh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] divide-y divide-slate-900/[0.05] dark:divide-white/[0.06]">
                    {portfolioItems.map(item => {
                      const isCurrent = isViewingGalleryRoute && activeSlug === item.slug;
                      return (
                        <Link
                          key={item.id}
                          to={`/${item.slug}`}
                          onClick={() => setIsMenuOpen(false)}
                          className={`group/item flex items-center justify-between gap-3 min-h-[48px] py-2 px-2.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300 ${
                            isCurrent
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                              : 'text-slate-800 dark:text-slate-200 hover:bg-slate-900/[0.04] dark:hover:bg-slate-800/70'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <PortfolioThumbnail
                              title={item.title}
                              coverUrl={item.coverUrl}
                              coverType={item.coverType}
                              size="sm"
                            />
                            <span className="font-serif text-[15px] leading-tight truncate">
                              {item.title}
                            </span>
                          </div>
                          <span
                            className={`text-[9.5px] uppercase tracking-[0.14em] shrink-0 ${
                              isCurrent ? 'opacity-85 font-semibold' : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isCurrent ? 'Viewing' : item.category}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <a
              href={isHome ? "#films" : "/?category=FILMS#work"}
              onClick={handleFilmsClick}
              className={`min-h-[44px] flex items-center py-2.5 border-b border-slate-900/[0.07] dark:border-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300 rounded-md ${
                isFilmsActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              Films
            </a>

            <Link
              to="/blog"
              onClick={() => setIsMenuOpen(false)}
              className={`min-h-[44px] flex items-center py-2.5 border-b border-slate-900/[0.07] dark:border-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300 rounded-md ${
                isJournalActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              Journal
            </Link>

            <Link
              to="/about"
              onClick={() => setIsMenuOpen(false)}
              className={`min-h-[44px] flex items-center py-2.5 border-b border-slate-900/[0.07] dark:border-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300 rounded-md ${
                isAboutActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              About
            </Link>

            <Link
              to="/faq"
              onClick={() => setIsMenuOpen(false)}
              className={`min-h-[44px] flex items-center py-2.5 border-b border-slate-900/[0.07] dark:border-slate-800/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300 rounded-md ${
                isFaqActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              FAQ
            </Link>

            <div className="min-h-[44px] py-2.5 border-b border-slate-900/[0.07] dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Theme</span>
              <ThemeToggle showLabel />
            </div>

            <div className="pt-3">
              <a
                href={settings.contactLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="w-full min-h-[44px] inline-flex items-center justify-center px-6 py-3 bg-slate-900 dark:bg-white text-[#FAF8F5] dark:text-slate-950 rounded-full text-xs font-bold tracking-[0.16em] uppercase shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-amber-300"
              >
                Enquire
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
