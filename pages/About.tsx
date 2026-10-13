import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowRight, 
  Menu, 
  X, 
  Camera, 
  MapPin, 
  Compass, 
  Award, 
  Mail, 
  Instagram, 
  ArrowLeft 
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { ThemeToggle } from '../components/ThemeToggle';
import { getOptimizedImageUrl, rewriteUrlToR2 } from '../utils/formatters';
import { REAL_ABOUT_IMAGE_URL } from '../utils/portfolioImages';

interface Settings {
  brandName: string;
  contactLink: string;
  instagramLink: string;
  tiktokLink: string;
  footerEmail: string;
}

export const About: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    brandName: 'MWABONJE',
    contactLink: 'https://wa.me/254705268604',
    instagramLink: 'https://www.instagram.com/mwabonje',
    tiktokLink: '',
    footerEmail: 'mwabonje@gmail.com',
  });

  const [aboutText, setAboutText] = useState<string>('');
  const [aboutImage, setAboutImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAboutData = async () => {
      try {
        // 1. Fetch site settings from SETTINGS gallery
        const { data: rawGalleries } = await supabase
          .from('galleries')
          .select('*')
          .in('category', ['SETTINGS', 'ABOUT', 'PORTRAIT', 'PHOTOGRAPHY'])
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (rawGalleries && rawGalleries.length > 0) {
          // Parse settings if available
          const settingsGal = rawGalleries.find(g => g.category === 'SETTINGS');
          if (settingsGal?.title) {
            try {
              const parsed = JSON.parse(settingsGal.title);
              setSettings(prev => ({
                ...prev,
                brandName: parsed.brandName || prev.brandName,
                contactLink: parsed.contactLink || prev.contactLink,
                instagramLink: parsed.instagramLink || prev.instagramLink,
                tiktokLink: parsed.tiktokLink || prev.tiktokLink,
                footerEmail: parsed.footerEmail || prev.footerEmail,
              }));
            } catch (e) {
              // ignore parse errors
            }
          }

          // 2. Fetch About content
          const aboutGal = rawGalleries.find(g => g.client_name === '__ABOUT__' || g.category === 'ABOUT');
          if (aboutGal) {
            if (aboutGal.title) {
              setAboutText(aboutGal.title);
            }

            // Fetch cover image for ABOUT gallery
            const { data: aboutFiles } = await supabase
              .from('files')
              .select('file_url')
              .eq('gallery_id', aboutGal.id)
              .neq('file_path', 'GALLERY_PASSWORD')
              .order('created_at', { ascending: false })
              .limit(1);

            if (isMounted && aboutFiles && aboutFiles.length > 0 && aboutFiles[0].file_url) {
              setAboutImage(aboutFiles[0].file_url);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching about data:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAboutData();

    return () => {
      isMounted = false;
    };
  }, []);

  const defaultBio = [
    "I am Michael Mwabonje Ringa, an East African visual storyteller and lifestyle photographer based in Malindi, capturing hospitality, portraits, weddings, and authentic coastal narratives.",
    "My work is heavily inspired by the coastal beauty of Kenya and the intimate stories of the people who inhabit it. For me, photography is more than just clicking a button; it is about preserving fleeting moments and crafting narratives that transcend time.",
    "Available for travel worldwide. Let's create something timeless together."
  ];

  const bioParagraphs = aboutText && aboutText.trim().length > 0 
    ? aboutText.split('\n').filter(p => p.trim().length > 0)
    : defaultBio;

  const displayImage = aboutImage || REAL_ABOUT_IMAGE_URL;

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 selection:bg-slate-900 selection:text-white">
      <Helmet>
        <title>About — {settings.brandName} | Visual Storyteller & Lifestyle Photographer</title>
        <meta name="description" content={`Discover the journey and vision of ${settings.brandName}, an East African visual storyteller and lifestyle photographer based on the Kenyan coast.`} />
      </Helmet>

      {/* Modern Editorial Header */}
      <header className="sticky top-0 z-50 bg-[#FAF8F5]/95 dark:bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="font-serif text-2xl md:text-3xl font-bold tracking-widest text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
              {settings.brandName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] tracking-widest uppercase font-semibold text-slate-600 dark:text-slate-300">
            <Link to="/" className="hover:text-slate-950 dark:hover:text-white transition-colors">
              Portfolio
            </Link>
            <Link to="/?category=FILMS" className="hover:text-slate-950 dark:hover:text-white transition-colors">
              Films
            </Link>
            <Link to="/prints" className="hover:text-slate-950 dark:hover:text-white transition-colors">
              Prints
            </Link>
            <Link to="/blog" className="hover:text-slate-950 dark:hover:text-white transition-colors">
              Journal
            </Link>
            <Link 
              to="/about" 
              className="text-slate-950 dark:text-white font-bold border-b border-slate-900 dark:border-white pb-0.5"
            >
              About
            </Link>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-3 md:gap-4">
            <ThemeToggle className="text-slate-600 dark:text-amber-300" />
            <a 
              href={settings.contactLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center justify-center px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-sm hover:shadow"
            >
              Enquire
            </a>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="md:hidden p-2 text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200/60 dark:border-slate-800 bg-[#FAF8F5] dark:bg-[#0b0f17] px-6 py-8 animate-in slide-in-from-top-4 duration-200">
            <div className="flex flex-col gap-4 text-xs font-semibold uppercase tracking-widest">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="py-2 border-b border-slate-200/60 dark:border-slate-800">
                Portfolio
              </Link>
              <Link to="/?category=FILMS" onClick={() => setIsMenuOpen(false)} className="py-2 border-b border-slate-200/60 dark:border-slate-800">
                Films
              </Link>
              <Link to="/prints" onClick={() => setIsMenuOpen(false)} className="py-2 border-b border-slate-200/60 dark:border-slate-800">
                Prints
              </Link>
              <Link to="/blog" onClick={() => setIsMenuOpen(false)} className="py-2 border-b border-slate-200/60 dark:border-slate-800">
                Journal
              </Link>
              <Link to="/about" onClick={() => setIsMenuOpen(false)} className="py-2 border-b border-slate-200/60 dark:border-slate-800 text-slate-950 dark:text-white font-bold">
                About
              </Link>
              <a 
                href={settings.contactLink} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="mt-4 text-center py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-full text-xs font-semibold tracking-widest uppercase"
              >
                Enquire
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main About Editorial Showcase */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 lg:py-24">
        {/* Breadcrumb / Top Return Link */}
        <div className="mb-10">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Portfolio</span>
          </Link>
        </div>

        {/* Two-Column Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Photographer Portrait Column */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-200/50 dark:border-slate-800">
              <img 
                src={getOptimizedImageUrl(displayImage, 900, 1200, 88)}
                alt="Michael Mwabonje Ringa"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.retried) {
                    target.dataset.retried = 'true';
                    target.src = rewriteUrlToR2(displayImage) || displayImage;
                  }
                }}
                className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-5 left-5 right-5 text-white pointer-events-none">
                <p className="font-serif text-lg font-medium tracking-wide">Michael Mwabonje Ringa</p>
                <p className="text-[11px] uppercase tracking-widest text-slate-300 font-sans mt-0.5">East Africa • Coastal Kenya</p>
              </div>
            </div>

            {/* Quick Meta Cards */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Base</span>
                </div>
                <p className="font-serif text-sm font-medium text-slate-900 dark:text-white">Malindi &amp; Coast, Kenya</p>
              </div>

              <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold mb-1">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Availability</span>
                </div>
                <p className="font-serif text-sm font-medium text-slate-900 dark:text-white">Worldwide Travel</p>
              </div>
            </div>
          </div>

          {/* Biography & Vision Column */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <span className="text-xs uppercase tracking-[0.25em] font-bold text-slate-400 dark:text-slate-500 block mb-3">
                About the Photographer
              </span>
              <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl font-normal text-slate-900 dark:text-white leading-[1.15]">
                Preserving fleeting moments, translating emotions into visuals.
              </h1>
            </div>

            {/* Narrative Paragraphs */}
            <div className="space-y-5 text-slate-700 dark:text-slate-300 leading-relaxed text-base md:text-lg font-light">
              {bioParagraphs.map((paragraph, index) => (
                <p key={index} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Disciplines / What I Do */}
            <div className="pt-6 border-t border-slate-200/70 dark:border-slate-800">
              <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500 mb-4">
                Creative Disciplines
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
                  <h4 className="font-serif text-base font-medium text-slate-900 dark:text-white mb-1">Hospitality &amp; Architecture</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">Boutique hotels, private coastal villas, luxury retreats, and spatial aesthetics.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
                  <h4 className="font-serif text-base font-medium text-slate-900 dark:text-white mb-1">Lifestyle &amp; Portraits</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">Natural light portraiture, brand campaigns, and genuine human narratives.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
                  <h4 className="font-serif text-base font-medium text-slate-900 dark:text-white mb-1">Weddings &amp; Intimate Events</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">Documentary, unscripted moments, emotive coverage of destination unions.</p>
                </div>
                <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
                  <h4 className="font-serif text-base font-medium text-slate-900 dark:text-white mb-1">Fine Art Prints &amp; Film</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">Curated archival cotton prints and cinematic visual reels of the East African coast.</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-wrap gap-4">
              <a
                href={settings.contactLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md active:scale-95"
              >
                <span>Book a Session</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                to="/prints"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                <span>Browse Fine Art Prints</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Editorial Footer */}
      <footer className="bg-slate-950 text-white py-20 px-6 md:px-12 mt-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-10 pb-12 border-b border-white/10">
          <div>
            <span className="font-serif text-3xl font-bold tracking-widest text-white">
              {settings.brandName}
            </span>
            <p className="text-slate-400 text-xs tracking-wider uppercase mt-2">
              East African Photography &amp; Film Studio
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs uppercase tracking-widest font-semibold text-slate-300">
            {settings.instagramLink && (
              <a href={settings.instagramLink} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Instagram
              </a>
            )}
            {settings.tiktokLink && (
              <a href={settings.tiktokLink} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                TikTok
              </a>
            )}
            <a href="https://wa.me/254705268604" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              WhatsApp
            </a>
            {settings.footerEmail && (
              <a href={`mailto:${settings.footerEmail}`} className="hover:text-white transition-colors">
                Email
              </a>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {settings.brandName} Photography. All Rights Reserved.</p>
          <p>Mombasa, Lamu &amp; Malindi, Kenya</p>
        </div>
      </footer>
    </div>
  );
};
