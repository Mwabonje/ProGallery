import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { supabase } from '../services/supabase';

interface PublicHeaderProps {
  /** Optional custom brand name if provided by parent */
  brandName?: string;
  /** Optional custom contact/booking link if provided by parent */
  contactLink?: string;
  /** Optional scroll progress indicator (0 to 100) for reading progress */
  scrollProgress?: number;
  /** Optional callback when Films category is selected on homepage */
  onSelectCategory?: (category: string) => void;
}

const DEFAULT_BRAND_NAME = 'MWABONJE';
const DEFAULT_CONTACT_LINK = 'https://mwabonjebooking.netlify.app/';

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  brandName: propBrandName,
  contactLink: propContactLink,
  scrollProgress,
  onSelectCategory,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
      } catch (err) {
        // Fallback to defaults
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, [propBrandName, propContactLink]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.search, location.hash]);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Determine active route state
  const isHome = location.pathname === '/' || location.pathname === '';
  const searchParams = new URLSearchParams(location.search);
  const isFilmsActive = (isHome && searchParams.get('category') === 'FILMS') || location.hash === '#films';
  const isPortfolioActive = isHome && !isFilmsActive;
  const isJournalActive = location.pathname.startsWith('/blog');
  const isAboutActive = location.pathname === '/about';
  const isFaqActive = location.pathname === '/faq';

  // Navigation handlers
  const handlePortfolioClick = (e: React.MouseEvent) => {
    setIsMenuOpen(false);
    if (isHome) {
      e.preventDefault();
      const workEl = document.getElementById('work');
      if (workEl) {
        workEl.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // Navigate to homepage #work
      navigate('/#work');
    }
  };

  const handleFilmsClick = (e: React.MouseEvent) => {
    setIsMenuOpen(false);
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

  const linkBaseClasses = "transition-colors py-2 text-[11px] sm:text-xs tracking-widest uppercase";
  const activeClass = "text-slate-950 dark:text-white font-bold border-b-2 border-slate-900 dark:border-white pb-0.5";
  const inactiveClass = "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-semibold";

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F5]/95 dark:bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-300">
      {/* Optional scroll progress bar for reading view (e.g. BlogPost) */}
      {typeof scrollProgress === 'number' && (
        <div 
          className="absolute top-0 left-0 h-1 bg-slate-900 dark:bg-amber-400 transition-all duration-150 ease-out z-20 pointer-events-none"
          style={{ width: `${Math.min(100, Math.max(0, scrollProgress))}%` }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold tracking-widest text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
            {settings.brandName}
          </span>
        </Link>

        {/* Desktop & Tablet Navigation */}
        <nav 
          aria-label="Main Navigation" 
          className="hidden md:flex items-center gap-6 lg:gap-8"
        >
          <a
            href={isHome ? "#work" : "/#work"}
            onClick={handlePortfolioClick}
            className={`${linkBaseClasses} ${isPortfolioActive ? activeClass : inactiveClass}`}
          >
            Portfolio
          </a>

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

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <ThemeToggle className="text-slate-600 dark:text-amber-300" />
          
          <a
            href={settings.contactLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center justify-center min-h-[40px] px-5 sm:px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-sm active:scale-95"
          >
            Enquire
          </a>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden min-h-[44px] min-w-[44px] p-2.5 flex items-center justify-center text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div 
          className="md:hidden border-t border-slate-200/80 dark:border-slate-800 bg-[#FAF8F5] dark:bg-[#0b0f17] px-6 py-6 animate-in slide-in-from-top-2 duration-200 shadow-xl transition-colors"
        >
          <div className="flex flex-col space-y-3 text-xs font-semibold tracking-widest uppercase">
            <a
              href={isHome ? "#work" : "/#work"}
              onClick={handlePortfolioClick}
              className={`py-3 border-b border-slate-200/60 dark:border-slate-800/80 ${isPortfolioActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}
            >
              Portfolio
            </a>

            <a
              href={isHome ? "#films" : "/?category=FILMS#work"}
              onClick={handleFilmsClick}
              className={`py-3 border-b border-slate-200/60 dark:border-slate-800/80 ${isFilmsActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}
            >
              Films
            </a>

            <Link
              to="/blog"
              onClick={() => setIsMenuOpen(false)}
              className={`py-3 border-b border-slate-200/60 dark:border-slate-800/80 ${isJournalActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}
            >
              Journal
            </Link>

            <Link
              to="/about"
              onClick={() => setIsMenuOpen(false)}
              className={`py-3 border-b border-slate-200/60 dark:border-slate-800/80 ${isAboutActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}
            >
              About
            </Link>

            <Link
              to="/faq"
              onClick={() => setIsMenuOpen(false)}
              className={`py-3 border-b border-slate-200/60 dark:border-slate-800/80 ${isFaqActive ? 'text-slate-950 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'}`}
            >
              FAQ
            </Link>

            <div className="py-3 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Theme</span>
              <ThemeToggle showLabel />
            </div>

            <a
              href={settings.contactLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsMenuOpen(false)}
              className="inline-block text-center mt-3 px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-full font-bold shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              Book a Session
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
