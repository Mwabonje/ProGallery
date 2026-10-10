import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Gallery } from '../types';
import { getOptimizedImageUrl } from '../utils/formatters';
import { generateSlug } from '../utils/slug';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, Menu, X, ArrowUpRight, Play, ArrowRight } from 'lucide-react';

interface PortfolioGallery extends Gallery {
  baseCategory?: string;
  coverUrl?: string | null;
  coverType?: string | null;
}

const CardMedia = ({ gallery }: { gallery: PortfolioGallery }) => {
  const isVideo = gallery.coverType?.startsWith('video') || (gallery.category && gallery.category.toLowerCase().includes('film'));

  const primaryUrl = gallery.coverUrl ? getOptimizedImageUrl(gallery.coverUrl, 1000, 1200, 85) : '';
  const [currentSrc, setCurrentSrc] = useState(primaryUrl);
  const [hasError, setHasError] = useState(!primaryUrl);

  useEffect(() => {
    const nextUrl = gallery.coverUrl ? getOptimizedImageUrl(gallery.coverUrl, 1000, 1200, 85) : '';
    setCurrentSrc(nextUrl);
    setHasError(!nextUrl);
  }, [gallery.coverUrl]);

  if (isVideo && gallery.coverUrl) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-slate-900">
        <video 
          src={gallery.coverUrl} 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <div className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
          <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900 flex items-center justify-center">
      {currentSrc && !hasError ? (
        <img 
          src={currentSrc}
          alt={gallery.client_name}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 text-center text-white">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2">
            {gallery.baseCategory || 'PORTFOLIO'}
          </span>
          <span className="font-serif text-xl md:text-2xl font-light text-slate-200">
            {gallery.client_name}
          </span>
        </div>
      )}
    </div>
  );
};

export function Portfolio({ photographerId }: { photographerId?: string }) {
  const [galleries, setGalleries] = useState<PortfolioGallery[]>([]);
  const [aboutGallery, setAboutGallery] = useState<PortfolioGallery | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    brandName: "MWABONJE",
    heroLocation: "Lamu · Watamu · Mombasa",
    heroTitle: "Hospitality, Portraits & Documentary Photography",
    heroSubtitle: "Capturing light, architecture, and authentic coastal visual stories along the Kenyan coast.",
    contactLink: "https://mwabonjebooking.netlify.app/",
    footerEmail: "hello@mwabonje.studio",
    instagramLink: "https://www.instagram.com/mwabonje_/",
    tiktokLink: "https://www.tiktok.com/@mwabonje_"
  });

  const selectedCategory = searchParams.get('category') || 'ALL';

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        let query = supabase.from('galleries').select('*').order('created_at', { ascending: false });
        if (photographerId) {
          query = query.eq('photographer_id', photographerId);
        }
        const { data: galleriesData, error } = await query;
        if (error) throw error;

        let allGalleries = galleriesData || [];
        if (!photographerId && allGalleries.length > 0) {
          const mostRecentPortfolio = allGalleries.find(g => g.category && g.category.trim() !== '' && g.category !== 'SETTINGS' && g.category !== 'ABOUT');
          if (mostRecentPortfolio) {
            allGalleries = allGalleries.filter(g => g.photographer_id === mostRecentPortfolio.photographer_id);
          }
        }

        // 1. Settings Gallery
        const settingsGal = allGalleries.find(g => g.category === 'SETTINGS');
        if (settingsGal) {
          if (settingsGal.title) {
            try {
              const parsed = JSON.parse(settingsGal.title);
              setSettings(prev => ({ ...prev, ...parsed }));
            } catch (e) {
              // ignore
            }
          }
          
          const { data: settingsFiles } = await supabase
            .from('files')
            .select('file_url')
            .eq('gallery_id', settingsGal.id)
            .neq('file_path', 'GALLERY_PASSWORD')
            .order('created_at', { ascending: false })
            .limit(1);
              
          if (settingsFiles && settingsFiles.length > 0) {
            setHeroImageUrl(settingsFiles[0].file_url);
          }
        }

        // 2. About Gallery
        const aboutGal = allGalleries.find(g => g.client_name === '__ABOUT__' || g.category === 'ABOUT');
        if (aboutGal) {
          const { data: aboutFiles } = await supabase
            .from('files')
            .select('file_url')
            .eq('gallery_id', aboutGal.id)
            .neq('file_path', 'GALLERY_PASSWORD')
            .order('created_at', { ascending: false })
            .limit(1);
          if (aboutFiles && aboutFiles.length > 0) {
            setAboutGallery({ ...aboutGal, coverUrl: aboutFiles[0].file_url, baseCategory: 'ABOUT' });
          }
        }

        // 3. Portfolio items - strictly exclude delivery galleries
        const rawPortfolioItems = allGalleries.filter(
          g => g.category && 
               g.category.trim() !== '' && 
               g.category.toLowerCase() !== 'delivery' &&
               g.category !== 'SETTINGS' && 
               g.category !== 'ABOUT'
        );

        // Prioritize Tamu Hotel, Lamu, Kilele House at the top
        const priorityOrder = ['tamu hotel', 'lamu', 'kilele house', 'kilelele house'];

        const sortedItems = [...rawPortfolioItems].sort((a, b) => {
          let nameA = a.client_name.trim().toLowerCase();
          let nameB = b.client_name.trim().toLowerCase();
          if (nameA === 'rafiki hotel') nameA = 'tamu hotel';
          if (nameB === 'rafiki hotel') nameB = 'tamu hotel';

          const indexA = priorityOrder.indexOf(nameA);
          const indexB = priorityOrder.indexOf(nameB);

          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;

          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        // Fetch cover image for each portfolio gallery
        const enrichedGalleries = await Promise.all(
          sortedItems.map(async (gallery) => {
            const { data: files } = await supabase
              .from('files')
              .select('file_url, file_type')
              .eq('gallery_id', gallery.id)
              .neq('file_path', 'GALLERY_PASSWORD')
              .order('created_at', { ascending: false })
              .limit(1);

            let cleanName = gallery.client_name;
            if (cleanName === 'RAFIKI HOTEL') cleanName = 'Tamu Hotel';

            const rawCover = files && files.length > 0 ? files[0].file_url : null;

            return {
              ...gallery,
              client_name: cleanName,
              baseCategory: (gallery.category?.replace(/\s*\[(swipe|grid)\]/gi, '').trim() || '').toUpperCase(),
              coverUrl: rawCover,
              coverType: files && files.length > 0 ? files[0].file_type : null,
            };
          })
        );

        setGalleries(enrichedGalleries);
      } catch (error) {
        console.error("Error loading portfolio:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [photographerId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCategorySelect = (cat: string) => {
    if (cat === 'ALL') {
      setSearchParams({});
    } else {
      setSearchParams({ category: cat });
    }
  };

  const categories = [
    { label: 'ALL', value: 'ALL' },
    { label: 'HOSPITALITY', value: 'AIRBNB' },
    { label: 'PLACES & PORTRAITS', value: 'PLACES' },
    { label: 'PORTRAITS', value: 'PORTRAITS' },
    { label: 'WEDDINGS', value: 'WEDDING' },
    { label: 'COUPLES', value: 'COUPLES' },
    { label: 'FILMS', value: 'FILMS' },
  ];

  const filteredGalleries = selectedCategory === 'ALL'
    ? galleries
    : galleries.filter(g => {
        const cat = (g.baseCategory || '').toUpperCase();
        const sel = selectedCategory.toUpperCase();
        if (sel === 'AIRBNB' || sel === 'HOSPITALITY') {
          return cat.includes('AIRBNB') || cat.includes('HOSPITALITY');
        }
        if (sel === 'PLACES') {
          return cat.includes('PLACES');
        }
        return cat.includes(sel);
      });

  // Hero Background image: prioritize configured hero image or top portfolio gallery image
  const firstPortfolioCover = galleries.find(g => g.coverUrl)?.coverUrl || null;
  const heroBg = heroImageUrl || firstPortfolioCover;

  // About image: prioritize configured about image or top portrait portfolio image
  const firstPortraitCover = galleries.find(g => g.baseCategory?.includes('PORTRAIT') && g.coverUrl)?.coverUrl || firstPortfolioCover;
  const aboutImageSrc = aboutGallery?.coverUrl || firstPortraitCover;

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      <Helmet>
        <title>{settings.brandName} — East African Photography & Film, Kenyan Coast</title>
        <meta name="description" content="East African photographer based in Malindi and Lamu specializing in hospitality, portraits, weddings, and documentary visual storytelling." />
      </Helmet>

      {/* Modern Editorial Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="font-serif text-2xl md:text-3xl font-bold tracking-widest text-slate-900 group-hover:text-slate-600 transition-colors">
              {settings.brandName}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] tracking-widest uppercase font-semibold text-slate-600">
            <a 
              href="#work" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
              }} 
              className="hover:text-slate-950 transition-colors"
            >
              Portfolio
            </a>
            <a 
              href="#films" 
              onClick={(e) => {
                e.preventDefault();
                handleCategorySelect('FILMS');
                document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
              }} 
              className="hover:text-slate-950 transition-colors"
            >
              Films
            </a>
            <Link to="/prints" className="hover:text-slate-950 transition-colors">
              Prints
            </Link>
            <Link to="/blog" className="hover:text-slate-950 transition-colors">
              Journal
            </Link>
            <a 
              href="#about" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
              }} 
              className="hover:text-slate-950 transition-colors"
            >
              About
            </a>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-4">
            <a 
              href={settings.contactLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center justify-center px-6 py-2.5 bg-slate-900 text-white rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-800 transition-all shadow-sm hover:shadow"
            >
              Enquire
            </a>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="md:hidden p-2 text-slate-900 hover:text-slate-600 transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-6 space-y-4 animate-in slide-in-from-top duration-200">
            <div className="flex flex-col space-y-4 text-xs font-semibold tracking-widest uppercase text-slate-800">
              <a 
                href="#work" 
                onClick={() => {
                  setIsMenuOpen(false);
                  document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="py-2 border-b border-slate-100"
              >
                Portfolio
              </a>
              <a 
                href="#films" 
                onClick={() => {
                  setIsMenuOpen(false);
                  handleCategorySelect('FILMS');
                  document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="py-2 border-b border-slate-100"
              >
                Films
              </a>
              <Link to="/prints" onClick={() => setIsMenuOpen(false)} className="py-2 border-b border-slate-100">
                Prints
              </Link>
              <Link to="/blog" onClick={() => setIsMenuOpen(false)} className="py-2 border-b border-slate-100">
                Journal
              </Link>
              <a 
                href="#about" 
                onClick={() => {
                  setIsMenuOpen(false);
                  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="py-2 border-b border-slate-100"
              >
                About
              </a>
              <a 
                href={settings.contactLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-block text-center mt-2 px-6 py-3 bg-slate-900 text-white rounded-full font-bold"
              >
                Book a Session
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center justify-center bg-slate-950 text-white overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-100 hover:scale-105"
          style={{ 
            backgroundImage: heroBg 
              ? `linear-gradient(180deg, rgba(15, 23, 42, 0.45) 0%, rgba(15, 23, 42, 0.75) 100%), url(${getOptimizedImageUrl(heroBg, 1920, 1080, 85)})` 
              : 'radial-gradient(ellipse at 50% 40%, #1e293b 0%, #0f172a 70%, #020617 100%)'
          }}
        />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] md:text-xs tracking-widest uppercase font-semibold text-white/90 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{settings.heroLocation}</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight text-white mb-6 leading-[1.1] max-w-3xl">
            {settings.heroTitle}
          </h1>

          <p className="font-sans text-sm md:text-lg text-slate-200/90 max-w-2xl font-light leading-relaxed mb-10">
            {settings.heroSubtitle}
          </p>

          <button 
            onClick={() => document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-white/80 hover:text-white transition-colors cursor-pointer group"
          >
            <span>Explore Works</span>
            <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-1" />
          </button>
        </div>
      </section>

      {/* Portfolio Showcase Section */}
      <section id="work" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-slate-100 gap-6">
          <div>
            <h2 className="font-serif text-3xl md:text-5xl font-normal text-slate-900 tracking-tight mb-3">
              Selected Works
            </h2>
            <p className="text-slate-500 text-sm md:text-base max-w-xl">
              Curated architectural spaces, hospitality retreats, and intimate moments captured along East Africa&apos;s coastline.
            </p>
          </div>

          {/* Filter Categories */}
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => handleCategorySelect(cat.value)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer ${
                  selectedCategory.toUpperCase() === cat.value.toUpperCase()
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Portfolio Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 py-12">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-[4/5] bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredGalleries.length === 0 ? (
          <div className="text-center py-24 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-slate-500 text-base font-serif italic mb-4">No galleries found in this collection.</p>
            <button 
              onClick={() => handleCategorySelect('ALL')}
              className="text-xs uppercase tracking-widest font-bold text-slate-900 hover:underline"
            >
              View All Works
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredGalleries.map((gallery) => {
              const displayCategory = gallery.baseCategory || 'PHOTOGRAPHY';
              const slug = generateSlug(gallery.client_name);

              return (
                <Link
                  key={gallery.id}
                  to={`/${slug}`}
                  className="group relative block aspect-[4/5] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 bg-slate-100"
                >
                  {/* Card Media Image or Video */}
                  <CardMedia gallery={gallery} />

                  {/* Gentle Gradient Shadow on Lower Half */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent pointer-events-none" />

                  {/* Top Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase text-slate-900 shadow-sm">
                      {displayCategory}
                    </span>
                  </div>

                  {/* Bottom Information */}
                  <div className="absolute bottom-0 inset-x-0 p-6 z-10 flex items-end justify-between">
                    <div>
                      <h3 className="font-serif text-2xl md:text-3xl font-medium text-white tracking-wide group-hover:translate-x-1 transition-transform duration-300">
                        {gallery.client_name}
                      </h3>
                      <p className="text-slate-300 text-xs tracking-wider uppercase mt-1 font-sans">
                        View Gallery
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:bg-white group-hover:text-slate-900 transition-all duration-300">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-slate-50 border-t border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Image */}
            <div className="relative aspect-[3/4] max-w-md mx-auto md:max-w-none w-full rounded-2xl overflow-hidden shadow-xl bg-slate-900 flex items-center justify-center">
              {aboutImageSrc ? (
                <img 
                  src={getOptimizedImageUrl(aboutImageSrc, 900, 1200, 85)}
                  alt="Michael Mwabonje Ringa"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-8 text-center text-white">
                  <span className="font-serif text-3xl font-light tracking-wide text-slate-200">
                    MWABONJE
                  </span>
                  <span className="text-xs uppercase tracking-widest text-slate-400 mt-2">
                    Studio & Field
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-6">
              <span className="text-xs uppercase tracking-widest font-bold text-slate-400">
                About the Photographer
              </span>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-normal text-slate-900 leading-tight">
                Preserving fleeting moments, translating emotions into visuals.
              </h2>
              
              <div className="space-y-4 text-slate-600 leading-relaxed text-sm md:text-base font-light">
                {aboutGallery?.title ? (
                  aboutGallery.title.split('\n').filter(Boolean).map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))
                ) : (
                  <>
                    <p>
                      I am Michael Mwabonje Ringa, an East African photographer based in Malindi specializing in hospitality, portraits, weddings, and documentary visual storytelling.
                    </p>
                    <p>
                      My work is heavily inspired by the coastal beauty of Kenya and the intimate stories of the people who inhabit it. For me, photography is more than just clicking a button; it is about preserving fleeting moments and crafting narratives that transcend time.
                    </p>
                    <p>
                      Available for travel worldwide. Let&apos;s create something timeless together.
                    </p>
                  </>
                )}
              </div>

              <div className="pt-4 flex flex-wrap gap-4">
                <a
                  href={settings.contactLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 text-white rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-800 transition-all shadow-md"
                >
                  <span>Book a Session</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <Link
                  to="/prints"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white border border-slate-200 text-slate-800 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-100 transition-all"
                >
                  <span>Browse Fine Art Prints</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Footer */}
      <footer className="bg-slate-950 text-white py-20 px-6 md:px-12">
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
}
