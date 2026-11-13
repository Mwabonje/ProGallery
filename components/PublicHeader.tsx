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
  /** Optional override for active nav item (e.g. 'portfolio' when inside a portfolio exhibition) */
  activeNav?: 'portfolio' | 'films' | 'journal' | 'about' | 'faq';
}

const DEFAULT_BRAND_NAME = 'MWABONJE';
const DEFAULT_CONTACT_LINK = 'https://mwabonjebooking.netlify.app/';

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  brandName: propBrandName,
  contactLink: propContactLink,
  scrollProgress,
  onSelectCategory,
  activeNav,
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
  const isFilmsActive = activeNav ? activeNav === 'films' : ((isHome && searchParams.get('category') === 'FILMS') || location.hash === '#films');
  const isPortfolioActive = activeNav ? activeNav === 'portfolio' : (isHome && !isFilmsActive);
  const isJournalActive = activeNav ? activeNav === 'journal' : location.pathname.startsWith('/blog');
  const isAboutActive = activeNav ? activeNav === 'about' : location.pathname === '/about';
  const isFaqActive = activeNav ? activeNav === 'faq' : location.pathname === '/faq';

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
      // Navigate to homepage without forced #work hash to allow precise scroll restoration
      navigate('/');
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

  const linkBaseClasses = "transition-colors py-2 text-[10px] sm:text-[11px] tracking-[0.18em] uppercase";
  const activeClass = "text-[#121110] dark:text-[#f9f6f0] font-semibold border-b border-[#c5a880] pb-1";
  const inactiveClass = "text-[#625b52] dark:text-[#c9c1b6] hover:text-[#121110] dark:hover:text-white font-medium";

  return (
    <header className="sticky top-0 z-50 bg-[#f9f6f0]/95 dark:bg-[#171512]/95 backdrop-blur-xl border-b border-[#8a8177]/30 dark:border-white/10 transition-colors duration-300">
      {/* Optional scroll progress bar for reading view (e.g. BlogPost) */}
      {typeof scrollProgress === 'number' && (
        <div 
          className="absolute top-0 left-0 h-1 bg-slate-900 dark:bg-amber-400 transition-all duration-150 ease-out z-20 pointer-events-none"
          style={{ width: `${Math.min(100, Math.max(0, scrollProgress))}%` }}
        />
      )}

      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 lg:px-12 h-[68px] sm:h-[76px] flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <span className="font-atelier-display text-xl sm:text-2xl md:text-[1.7rem] font-medium tracking-[0.16em] text-[#121110] dark:text-[#f9f6f0] group-hover:text-[#8a8177] dark:group-hover:text-[#c5a880] transition-colors">
            {settings.brandName}
          </span>
        </Link>

        {/* Desktop & Tablet Navigation */}
        <nav 
          aria-label="Main Navigation" 
          className="hidden md:flex items-center gap-6 lg:gap-9"
        >
          <a
            href={isHome ? "#work" : "/"}
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
            className="hidden sm:inline-flex items-center justify-center min-h-[40px] px-5 sm:px-6 py-2 bg-[#121110] dark:bg-[#f9f6f0] text-white dark:text-[#121110] rounded-none text-[10px] font-semibold tracking-[0.17em] uppercase hover:bg-[#725b38] dark:hover:bg-[#c5a880] transition-all active:scale-[0.98]"
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
          className="md:hidden border-t border-[#8a8177]/30 dark:border-white/10 bg-[#f9f6f0] dark:bg-[#171512] px-6 py-6 animate-in slide-in-from-top-2 duration-200 transition-colors"
        >
          <div className="flex flex-col space-y-3 text-xs font-semibold tracking-widest uppercase">
            <a
              href={isHome ? "#work" : "/"}
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
