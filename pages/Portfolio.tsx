import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Gallery, DEFAULT_SERVICES_SECTION, ServicesSectionConfig } from '../types';
import { getOptimizedImageUrl, rewriteUrlToR2, getCleanGalleryTitle, getParentGalleryId } from '../utils/formatters';
import { generateSlug } from '../utils/slug';
import { Helmet } from 'react-helmet-async';
import { ChevronDown, Menu, X, ArrowUpRight, Play } from 'lucide-react';
import { REAL_HERO_IMAGE_URL } from '../utils/portfolioImages';
import { ThemeToggle } from '../components/ThemeToggle';
import { formatWhatsappUrl } from '../components/AboutSettingsModal';
import { PublicHeader } from '../components/PublicHeader';

interface PortfolioGallery extends Gallery {
  baseCategory?: string;
  coverUrl?: string | null;
  coverType?: string | null;
  subGalleryCount?: number;
}

const CardMedia = ({ gallery }: { gallery: PortfolioGallery }) => {
  const isVideo = gallery.coverType?.startsWith('video') || (gallery.category && gallery.category.toLowerCase().includes('film'));

  const rawUrl = gallery.coverUrl ? rewriteUrlToR2(gallery.coverUrl) : '';
  const optimizedUrl = rawUrl ? getOptimizedImageUrl(rawUrl, 1000, 1200, 85) : '';
  const [currentSrc, setCurrentSrc] = useState(optimizedUrl || rawUrl);
  const [retried, setRetried] = useState(false);
  const [hasError, setHasError] = useState(!rawUrl);

  useEffect(() => {
    const raw = gallery.coverUrl ? rewriteUrlToR2(gallery.coverUrl) : '';
    const opt = raw ? getOptimizedImageUrl(raw, 1000, 1200, 85) : '';
    setCurrentSrc(opt || raw);
    setRetried(false);
    setHasError(!raw);
  }, [gallery.coverUrl]);

  const handleError = () => {
    if (!retried && rawUrl && currentSrc !== rawUrl) {
      setRetried(true);
      setCurrentSrc(rawUrl);
    } else {
      setHasError(true);
    }
  };

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

  const cleanTitle = getCleanGalleryTitle(gallery);
  const altText = cleanTitle
    ? `${cleanTitle} — ${gallery.baseCategory || 'Photography'} by Mwabonje Photography in Kenya`
    : 'Coastal photography showcase by Mwabonje Photography';

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-900 flex items-center justify-center">
      {currentSrc && !hasError ? (
        <img 
          src={currentSrc}
          alt={altText}
          loading="lazy"
          decoding="async"
          width={1000}
          height={1200}
          onError={handleError}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 text-center text-white">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 mb-2">
            {gallery.baseCategory || 'PORTFOLIO'}
          </span>
          <span className="font-serif text-xl md:text-2xl font-light text-slate-200">
            {cleanTitle}
          </span>
        </div>
      )}
    </div>
  );
};

const renderHeroTitle = (title: string) => {
  if (!title) return null;
  const lines = title.split('\n');
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*[^*]+\*)/g);
    return (
      <React.Fragment key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts.map((part, partIdx) => {
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return (
              <em key={partIdx} className="italic font-serif font-light">
                {part.slice(1, -1)}
              </em>
            );
          }
          return part;
        })}
      </React.Fragment>
    );
  });
};

export function Portfolio({ photographerId }: { photographerId?: string }) {
  const [galleries, setGalleries] = useState<PortfolioGallery[]>(() => {
    try {
      const cached = sessionStorage.getItem('mwabonje_portfolio_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [aboutGallery, setAboutGallery] = useState<PortfolioGallery | null>(null);
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem('mwabonje_portfolio_cache');
    } catch {
      return true;
    }
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const hasRestoredScroll = useRef(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(() => {
    try {
      const cached = localStorage.getItem('mwabonje_hero_image');
      if (cached) return cached;
    } catch (e) {}
    return "https://pub-722a104adad649c9bb882d954680ee50.r2.dev/uploads/1791789724420_cn0c24fmqhk/Screenshot_2026-10-04_162650.png";
  });

  const [settings, setSettings] = useState({
    brandName: "MWABONJE",
    heroLocation: "Malindi · Watamu · Lamu",
    heroTitle: "Visual Storyteller\n& *Lifestyle* Photographer",
    heroSubtitle: "Photography and film on the Kenyan coast — capturing authentic lifestyle moments, hospitality, weddings, and the quiet architecture of the places in between.",
    contactLink: "https://mwabonjebooking.netlify.app/",
    whatsappLink: "https://wa.me/254705268604",
    footerEmail: "hello@mwabonje.studio",
    instagramLink: "https://www.instagram.com/mwabonje_/",
    tiktokLink: "https://www.tiktok.com/@mwabonje_",
    servicesSection: DEFAULT_SERVICES_SECTION as ServicesSectionConfig | undefined
  });

  const selectedCategory = searchParams.get('category') || 'ALL';

  const handleGalleryClick = (slug: string, id: string) => {
    try {
      sessionStorage.setItem('portfolio_last_clicked_slug', slug);
      sessionStorage.setItem('portfolio_last_clicked_id', id);
      sessionStorage.setItem('portfolio_scroll_y', window.scrollY.toString());
      sessionStorage.setItem('portfolio_category_filter', selectedCategory);
    } catch {}
  };

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        let query = supabase.from('galleries').select('*').order('created_at', { ascending: false });
        if (photographerId) {
          query = query.eq('photographer_id', photographerId);
        }
        const { data: galleriesData, error } = await query;
        if (error) throw error;

        const rawGalleries = galleriesData || [];

        // 1. Settings Gallery: Lookup directly from raw galleries so it is NEVER stripped out
        const settingsGal = (photographerId 
          ? rawGalleries.find(g => g.category === 'SETTINGS' && g.photographer_id === photographerId) 
          : null) || rawGalleries.find(g => g.category === 'SETTINGS');

        if (settingsGal) {
          if (settingsGal.title) {
            try {
              const parsed = JSON.parse(settingsGal.title);
              // Migrate or upgrade old "Salt, light" title to the requested "Visual Storyteller & Lifestyle Photographer"
              if (!parsed.heroTitle || parsed.heroTitle.includes('Salt, light') || parsed.heroTitle.includes('*slow*') || parsed.heroTitle === 'Hospitality, Portraits & Documentary Photography') {
                parsed.heroTitle = "Visual Storyteller\n& *Lifestyle* Photographer";
                if (!parsed.heroSubtitle || (parsed.heroSubtitle.includes('quiet architecture') && !parsed.heroSubtitle.includes('lifestyle'))) {
                  parsed.heroSubtitle = "Photography and film on the Kenyan coast — capturing authentic lifestyle moments, hospitality, weddings, and the quiet architecture of the places in between.";
                }
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session?.user?.id) {
                    supabase
                      .from('galleries')
                      .update({ title: JSON.stringify(parsed), link_enabled: true })
                      .eq('id', settingsGal.id)
                      .then(() => {});
                  }
                }).catch(() => {});
              }
              setSettings(prev => ({ ...prev, ...parsed }));
              if (parsed.heroImageUrl) {
                setHeroImageUrl(parsed.heroImageUrl);
                try {
                  localStorage.setItem('mwabonje_hero_image', parsed.heroImageUrl);
                } catch (e) {}
              }
            } catch (e) {
              // ignore
            }
          }
          
          const { data: settingsFiles } = await supabase
            .from('files')
            .select('file_url, file_path')
            .eq('gallery_id', settingsGal.id)
            .neq('file_path', 'GALLERY_PASSWORD')
            .order('created_at', { ascending: false })
            .limit(1);
              
          if (settingsFiles && settingsFiles.length > 0 && settingsFiles[0].file_url) {
            const latestFileUrl = settingsFiles[0].file_url;
            setHeroImageUrl(prev => {
              const active = prev || latestFileUrl;
              try {
                localStorage.setItem('mwabonje_hero_image', active);
              } catch (e) {}
              return active;
            });
          }
        }

        // 2. About Gallery: Lookup directly from raw galleries
        const aboutGal = (photographerId 
          ? rawGalleries.find(g => (g.client_name === '__ABOUT__' || g.category === 'ABOUT') && g.photographer_id === photographerId) 
          : null) || rawGalleries.find(g => g.client_name === '__ABOUT__' || g.category === 'ABOUT');

        if (aboutGal) {
          const { data: aboutFiles } = await supabase
            .from('files')
            .select('file_url')
            .eq('gallery_id', aboutGal.id)
            .neq('file_path', 'GALLERY_PASSWORD')
            .order('created_at', { ascending: false })
            .limit(1);
          if (aboutFiles && aboutFiles.length > 0 && aboutFiles[0].file_url) {
            setAboutGallery({ ...aboutGal, coverUrl: aboutFiles[0].file_url, baseCategory: 'ABOUT' });
          }
        }

        // Auto-heal: If an authenticated session is active, ensure settings galleries are link_enabled: true
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.id) {
            supabase
              .from('galleries')
              .update({ link_enabled: true })
              .eq('photographer_id', session.user.id)
              .in('category', ['SETTINGS', 'ABOUT'])
              .eq('link_enabled', false)
              .then(() => {});
          }
        }).catch(() => {});

        // 3. Filter portfolio items for display
        let allGalleries = [...rawGalleries];
        if (!photographerId && allGalleries.length > 0) {
          const mostRecentPortfolio = allGalleries.find(g => 
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

        // Track sub-galleries count per parent collection
        const subGalleryCountMap = new Map<string, number>();
        allGalleries.forEach(g => {
          const parentId = getParentGalleryId(g);
          if (parentId) {
            subGalleryCountMap.set(parentId, (subGalleryCountMap.get(parentId) || 0) + 1);
          }
        });

        // 3. Portfolio items - strictly exclude child sub-galleries, delivery galleries and system configuration records
        const rawPortfolioItems = allGalleries.filter(
          g => g.category && 
               g.category.trim() !== '' && 
               g.category.toLowerCase() !== 'delivery' &&
               g.category !== 'SETTINGS' && 
               g.category !== 'ABOUT' &&
               g.category !== 'FAQ' &&
               g.client_name !== '__FAQ__' &&
               g.client_name !== '__ABOUT__' &&
               g.client_name !== 'SITE_SETTINGS' &&
               !getParentGalleryId(g) // exclude child sub-galleries so they live inside their parent collection
        );

        const sortedItems = [...rawPortfolioItems].sort((a, b) => {
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

            const rawCover = files && files.length > 0 ? files[0].file_url : null;

            return {
              ...gallery,
              client_name: gallery.client_name,
              baseCategory: (gallery.category?.replace(/\s*\[(swipe|grid)\]/gi, '').trim() || '').toUpperCase(),
              coverUrl: rawCover,
              coverType: files && files.length > 0 ? files[0].file_type : null,
              subGalleryCount: subGalleryCountMap.get(gallery.id) || 0,
            };
          })
        );

        setGalleries(enrichedGalleries);
        try {
          sessionStorage.setItem('mwabonje_portfolio_cache', JSON.stringify(enrichedGalleries));
        } catch {}
      } catch (error) {
        console.error("Error loading portfolio:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [photographerId]);

  useEffect(() => {
    // Disable automatic browser scroll restoration so it doesn't fight targeted element restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (galleries.length === 0 || hasRestoredScroll.current) return;

    const targetSlug = sessionStorage.getItem('portfolio_last_clicked_slug');
    const targetId = sessionStorage.getItem('portfolio_last_clicked_id');
    const savedScrollY = sessionStorage.getItem('portfolio_scroll_y');

    if (!targetSlug && !targetId && !savedScrollY) return;

    const performRestoration = () => {
      let targetEl: HTMLElement | null = null;
      if (targetSlug) {
        targetEl = document.getElementById(`gallery-item-${targetSlug}`);
      }
      if (!targetEl && targetId) {
        targetEl = (document.querySelector(`[data-gallery-id="${targetId}"]`) as HTMLElement) ||
                   document.getElementById(`gallery-item-id-${targetId}`);
      }

      if (targetEl) {
        hasRestoredScroll.current = true;
        const headerOffset = 84;
        const elementPosition = targetEl.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = Math.max(0, elementPosition - headerOffset);
        window.scrollTo({ top: offsetPosition, behavior: 'instant' });
      } else if (savedScrollY) {
        const y = parseInt(savedScrollY, 10);
        if (!isNaN(y) && y > 0) {
          hasRestoredScroll.current = true;
          window.scrollTo({ top: y, behavior: 'instant' });
        }
      }
    };

    // Immediate restoration on mount
    performRestoration();

    // Secondary passes to handle DOM rendering and image bounding boxes
    const rafId = requestAnimationFrame(() => {
      performRestoration();
    });
    const timerId = setTimeout(() => {
      performRestoration();
    }, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [galleries, loading, selectedCategory]);

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
  const heroBg = heroImageUrl || firstPortfolioCover || REAL_HERO_IMAGE_URL;

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 selection:bg-slate-900 selection:text-white">
      <Helmet>
        <title>Mwabonje Photography — Lifestyle, Wedding & Hospitality Photographer in Malindi</title>
        <meta name="description" content="Editorial and lifestyle photography studio based in Malindi, Kenya — capturing coastal weddings, hospitality retreats, portraits, and visual narratives across Watamu, Malindi, and Lamu." />
        <link rel="canonical" href="https://mwabonje.co.ke/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://mwabonje.co.ke/" />
        <meta property="og:title" content="Mwabonje Photography — Lifestyle, Wedding & Hospitality Photographer in Malindi" />
        <meta property="og:description" content="Editorial and lifestyle photography studio based in Malindi, Kenya — capturing coastal weddings, hospitality retreats, portraits, and visual narratives across Watamu, Malindi, and Lamu." />
        <meta property="og:image" content={heroBg.startsWith('http') ? heroBg : `https://mwabonje.co.ke${heroBg}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://mwabonje.co.ke/" />
        <meta name="twitter:title" content="Mwabonje Photography — Lifestyle, Wedding & Hospitality Photographer in Malindi" />
        <meta name="twitter:description" content="Editorial and lifestyle photography studio based in Malindi, Kenya — capturing coastal weddings, hospitality retreats, portraits, and visual narratives across Watamu, Malindi, and Lamu." />
        <meta name="twitter:image" content={heroBg.startsWith('http') ? heroBg : `https://mwabonje.co.ke${heroBg}`} />
      </Helmet>

      {/* Modern Editorial Header */}
      <PublicHeader 
        brandName={settings.brandName} 
        contactLink={settings.contactLink} 
        onSelectCategory={handleCategorySelect} 
      />

      {/* Hero Section */}
      <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center justify-center bg-slate-950 text-white overflow-hidden">
        {/* Hero Background Image */}
        <img 
          src={getOptimizedImageUrl(heroBg, 1920, 1080, 85)} 
          alt="Mwabonje Photography — Editorial, wedding, and hospitality photography on the Kenyan coast"
          loading="eager"
          // @ts-ignore
          fetchPriority="high"
          decoding="async"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 scale-100 hover:scale-105"
          onError={(e) => {
            const target = e.currentTarget;
            if (heroBg && target.src !== heroBg) {
              target.src = heroBg;
            } else if (target.src !== REAL_HERO_IMAGE_URL) {
              target.src = REAL_HERO_IMAGE_URL;
            }
          }}
        />
        {/* Dark Vignette Overlay for Text Legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-950/60 to-slate-950/80 pointer-events-none" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] md:text-xs tracking-widest uppercase font-semibold text-white/90 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{settings.heroLocation}</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal tracking-tight text-white mb-6 leading-[1.1] max-w-3xl">
            {renderHeroTitle(settings.heroTitle)}
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
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-slate-200/60 dark:border-slate-800 gap-6">
          <div>
            <h2 className="font-serif text-3xl md:text-5xl font-normal text-slate-900 dark:text-white tracking-tight mb-3">
              Selected Works
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-xl">
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
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-sm'
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300/80 dark:hover:bg-slate-700 hover:text-slate-950 dark:hover:text-white'
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
          <div className="text-center py-24 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <p className="text-slate-500 dark:text-slate-400 text-base font-serif italic mb-4">No galleries found in this collection.</p>
            <button 
              onClick={() => handleCategorySelect('ALL')}
              className="text-xs uppercase tracking-widest font-bold text-slate-900 dark:text-white hover:underline"
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
                  id={`gallery-item-${slug}`}
                  data-gallery-id={gallery.id}
                  to={`/${slug}`}
                  onClick={() => handleGalleryClick(slug, gallery.id)}
                  className="group relative block aspect-[4/5] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 bg-slate-100 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 scroll-mt-24"
                >
                  {/* Card Media Image or Video */}
                  <CardMedia gallery={gallery} />

                  {/* Gentle Gradient Shadow on Lower Half */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent pointer-events-none" />

                  {/* Top Badge */}
                  <div className="absolute top-4 left-4 z-10">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase text-slate-900 dark:text-white shadow-sm border border-black/5 dark:border-white/10">
                      {displayCategory}
                    </span>
                  </div>

                  {/* Bottom Information */}
                  <div className="absolute bottom-0 inset-x-0 p-6 z-10 flex items-end justify-between">
                    <div>
                      <h3 className="font-serif text-2xl md:text-3xl font-medium text-white tracking-wide group-hover:translate-x-1 transition-transform duration-300">
                        {getCleanGalleryTitle(gallery)}
                      </h3>
                      <p className="text-slate-300 text-xs tracking-wider uppercase mt-1 font-sans">
                        {gallery.subGalleryCount && gallery.subGalleryCount > 0
                          ? `${gallery.subGalleryCount} ${gallery.subGalleryCount === 1 ? 'Sub-Gallery' : 'Sub-Galleries'} · Explore Collection`
                          : 'View Gallery'}
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

      {/* Services & Coastal Storytelling Overview Section */}
      {(() => {
        const servicesConfig: ServicesSectionConfig = {
          ...DEFAULT_SERVICES_SECTION,
          ...(settings.servicesSection || {}),
          services: (settings.servicesSection?.services && Array.isArray(settings.servicesSection.services) && settings.servicesSection.services.length > 0)
            ? settings.servicesSection.services
            : DEFAULT_SERVICES_SECTION.services
        };

        if (servicesConfig.showSection === false) {
          return null;
        }

        return (
          <section className="py-20 md:py-28 px-6 md:px-12 bg-white/70 dark:bg-slate-900/60 border-t border-slate-200/60 dark:border-slate-800 transition-colors">
            <div className="max-w-7xl mx-auto">
              <div className="max-w-3xl mb-16">
                {servicesConfig.eyebrow && (
                  <span className="text-[11px] sm:text-xs uppercase tracking-[0.25em] font-semibold text-slate-500 dark:text-slate-400 block mb-3">
                    {servicesConfig.eyebrow}
                  </span>
                )}
                <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-slate-900 dark:text-white tracking-tight mb-4 leading-tight">
                  {servicesConfig.title}
                </h2>
                {servicesConfig.subtitle && (
                  <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg font-light leading-relaxed">
                    {servicesConfig.subtitle}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
                {servicesConfig.services.map((service, index) => {
                  const isInternal = service.linkUrl?.startsWith('/') && !service.linkUrl?.startsWith('//');
                  return (
                    <div 
                      key={service.id || index}
                      className="p-8 rounded-2xl bg-[#FAF8F5] dark:bg-[#151c28] border border-slate-200/70 dark:border-slate-800/80 flex flex-col justify-between transition-all hover:shadow-md"
                    >
                      <div>
                        <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 block mb-3">
                          {service.number || String(index + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-serif text-2xl font-normal text-slate-900 dark:text-white mb-3">
                          {service.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 text-sm font-light leading-relaxed mb-6">
                          {service.description}
                        </p>
                      </div>
                      {service.linkText && service.linkUrl && (
                        <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                          {isInternal ? (
                            <Link 
                              to={service.linkUrl} 
                              className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors inline-flex items-center gap-1.5"
                            >
                              {service.linkText} <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <a 
                              href={service.linkUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-xs uppercase tracking-wider font-semibold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 transition-colors inline-flex items-center gap-1.5"
                            >
                              {service.linkText} <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Connected Internal Exploration & Call to Action */}
              {servicesConfig.showCta !== false && (
                <div className="mt-16 p-8 md:p-10 rounded-2xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
                  <div className="text-center md:text-left">
                    <h3 className="font-serif text-2xl md:text-3xl font-normal mb-2 text-white">
                      {servicesConfig.ctaTitle}
                    </h3>
                    <p className="text-slate-300 text-sm font-light max-w-xl">
                      {servicesConfig.ctaSubtitle === "Read our client FAQ, learn about our creative vision, or explore coastal guides in our Journal." ? (
                        <>
                          Read our client <Link to="/faq" className="underline underline-offset-4 hover:text-white">FAQ</Link>, learn about <Link to="/about" className="underline underline-offset-4 hover:text-white">our creative vision</Link>, or explore coastal guides in our <Link to="/blog" className="underline underline-offset-4 hover:text-white">Journal</Link>.
                        </>
                      ) : (
                        servicesConfig.ctaSubtitle
                      )}
                    </p>
                  </div>
                  <a 
                    href={servicesConfig.ctaButtonLink || settings.contactLink} 
                    target={servicesConfig.ctaButtonLink?.startsWith('/') ? '_self' : '_blank'} 
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center justify-center px-8 py-3.5 bg-white text-slate-950 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-100 transition-all shadow-md active:scale-95"
                  >
                    {servicesConfig.ctaButtonText || "Enquire About a Session"}
                  </a>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* Editorial Footer */}
      <footer className="bg-slate-950 text-white py-20 px-6 md:px-12 border-t border-white/10">
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
            <Link to="/about" className="hover:text-white transition-colors">
              About
            </Link>
            <Link to="/faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
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
            <a 
              href={formatWhatsappUrl(settings.whatsappLink, 'https://wa.me/254705268604')} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-white transition-colors"
            >
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
