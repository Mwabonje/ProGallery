import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  Menu, 
  X, 
  Mail, 
  MessageCircle,
  Sun,
  Sparkles,
  Layers,
  Camera,
  Compass
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { ThemeToggle } from '../components/ThemeToggle';
import { getOptimizedImageUrl, rewriteUrlToR2 } from '../utils/formatters';
import { REAL_ABOUT_IMAGE_URL } from '../utils/portfolioImages';
import { 
  DisciplineItem, 
  EthosPillar,
  CustomAboutSection,
  isColorDark,
  DEFAULT_PAGE_HEADER_TITLE,
  DEFAULT_PAGE_HEADER_SUBTITLE,
  DEFAULT_BIO_QUOTE,
  DEFAULT_PLACARD_NAME,
  DEFAULT_PLACARD_ROLE,
  DEFAULT_PLACARD_BASE,
  DEFAULT_PLACARD_AVAILABILITY,
  DEFAULT_PLACARD_FOCUS,
  DEFAULT_PLACARD_BUTTON_TEXT,
  DEFAULT_DISCIPLINES, 
  DEFAULT_DISCIPLINES_EYEBROW, 
  DEFAULT_DISCIPLINES_TITLE, 
  DEFAULT_DISCIPLINES_SUBTITLE,
  DEFAULT_ETHOS_EYEBROW,
  DEFAULT_ETHOS_TITLE,
  DEFAULT_ETHOS_PILLARS,
  DEFAULT_INQUIRIES_EYEBROW,
  DEFAULT_INQUIRIES_TITLE,
  DEFAULT_INQUIRIES_SUBTITLE,
  DEFAULT_INQUIRIES_WHATSAPP_LABEL,
  DEFAULT_INQUIRIES_EMAIL_LABEL,
  DEFAULT_WHATSAPP_LINK,
  formatWhatsappUrl
} from '../components/AboutSettingsModal';

interface Settings {
  brandName: string;
  contactLink: string;
  whatsappLink?: string;
  instagramLink: string;
  tiktokLink: string;
  footerEmail: string;
}

export const About: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    brandName: 'MWABONJE',
    contactLink: 'https://mwabonjebooking.netlify.app/',
    whatsappLink: DEFAULT_WHATSAPP_LINK,
    instagramLink: 'https://www.instagram.com/mwabonje',
    tiktokLink: '',
    footerEmail: 'mwabonje@gmail.com',
  });

  const getCachedPayload = () => {
    try {
      const p = localStorage.getItem('mwabonje_about_payload');
      if (p) return JSON.parse(p);
    } catch {}
    return null;
  };

  const cached = getCachedPayload();

  // Top Page Header states
  const [pageHeaderTitle, setPageHeaderTitle] = useState<string>(
    cached?.pageHeaderTitle || DEFAULT_PAGE_HEADER_TITLE
  );
  const [pageHeaderSubtitle, setPageHeaderSubtitle] = useState<string>(
    cached?.pageHeaderSubtitle || DEFAULT_PAGE_HEADER_SUBTITLE
  );

  // Bio Quote & Text states
  const [bioQuote, setBioQuote] = useState<string>(
    cached?.bioQuote || DEFAULT_BIO_QUOTE
  );
  const [aboutText, setAboutText] = useState<string>(
    cached?.bioText || ''
  );
  const [aboutImage, setAboutImage] = useState<string>(() => {
    try {
      const cachedImg = localStorage.getItem('mwabonje_about_image');
      if (cachedImg && !cachedImg.includes('mwabonje_portrait.jpg')) {
        return cachedImg;
      }
    } catch {}
    return REAL_ABOUT_IMAGE_URL;
  });

  // Placard states
  const [placardName, setPlacardName] = useState<string>(
    cached?.placardName || DEFAULT_PLACARD_NAME
  );
  const [placardRole, setPlacardRole] = useState<string>(
    cached?.placardRole || DEFAULT_PLACARD_ROLE
  );
  const [placardBase, setPlacardBase] = useState<string>(
    cached?.placardBase || DEFAULT_PLACARD_BASE
  );
  const [placardAvailability, setPlacardAvailability] = useState<string>(
    cached?.placardAvailability || DEFAULT_PLACARD_AVAILABILITY
  );
  const [placardFocus, setPlacardFocus] = useState<string>(
    cached?.placardFocus || DEFAULT_PLACARD_FOCUS
  );
  const [placardButtonText, setPlacardButtonText] = useState<string>(
    cached?.placardButtonText || DEFAULT_PLACARD_BUTTON_TEXT
  );

  // Section visibility states
  const [showDisciplinesSection, setShowDisciplinesSection] = useState<boolean>(
    cached?.showDisciplinesSection !== undefined ? cached.showDisciplinesSection : true
  );
  const [showEthosSection, setShowEthosSection] = useState<boolean>(
    cached?.showEthosSection !== undefined ? cached.showEthosSection : true
  );
  const [showInquiriesSection, setShowInquiriesSection] = useState<boolean>(
    cached?.showInquiriesSection !== undefined ? cached.showInquiriesSection : true
  );

  // Card background styling states with color choices
  const [disciplinesCardBg, setDisciplinesCardBg] = useState<boolean>(
    cached?.disciplinesCardBg !== undefined ? cached.disciplinesCardBg : true
  );
  const [disciplinesCardBgColor, setDisciplinesCardBgColor] = useState<string>(
    cached?.disciplinesCardBgColor || '#FAF8F5'
  );
  const [ethosCardBg, setEthosCardBg] = useState<boolean>(
    cached?.ethosCardBg !== undefined ? cached.ethosCardBg : false
  );
  const [ethosCardBgColor, setEthosCardBgColor] = useState<string>(
    cached?.ethosCardBgColor || '#FAF8F5'
  );

  // Creative Disciplines states
  const [disciplinesEyebrow, setDisciplinesEyebrow] = useState<string>(
    cached?.disciplinesEyebrow || DEFAULT_DISCIPLINES_EYEBROW
  );
  const [disciplinesTitle, setDisciplinesTitle] = useState<string>(
    cached?.disciplinesTitle || DEFAULT_DISCIPLINES_TITLE
  );
  const [disciplinesSubtitle, setDisciplinesSubtitle] = useState<string>(
    cached?.disciplinesSubtitle !== undefined ? cached.disciplinesSubtitle : DEFAULT_DISCIPLINES_SUBTITLE
  );
  const [disciplines, setDisciplines] = useState<DisciplineItem[]>(
    Array.isArray(cached?.disciplines) ? cached.disciplines : DEFAULT_DISCIPLINES
  );

  // Ethos & Approach states
  const [ethosEyebrow, setEthosEyebrow] = useState<string>(
    cached?.ethosEyebrow || DEFAULT_ETHOS_EYEBROW
  );
  const [ethosTitle, setEthosTitle] = useState<string>(
    cached?.ethosTitle || DEFAULT_ETHOS_TITLE
  );
  const [ethosPillars, setEthosPillars] = useState<EthosPillar[]>(
    Array.isArray(cached?.ethosPillars) ? cached.ethosPillars : DEFAULT_ETHOS_PILLARS
  );

  // Custom sections states
  const [customSections, setCustomSections] = useState<CustomAboutSection[]>(
    Array.isArray(cached?.customSections) ? cached.customSections : []
  );

  // Inquiries CTA banner states
  const [inquiriesEyebrow, setInquiriesEyebrow] = useState<string>(
    cached?.inquiriesEyebrow || DEFAULT_INQUIRIES_EYEBROW
  );
  const [inquiriesTitle, setInquiriesTitle] = useState<string>(
    cached?.inquiriesTitle || DEFAULT_INQUIRIES_TITLE
  );
  const [inquiriesSubtitle, setInquiriesSubtitle] = useState<string>(
    cached?.inquiriesSubtitle || DEFAULT_INQUIRIES_SUBTITLE
  );
  const [inquiriesWhatsappLabel, setInquiriesWhatsappLabel] = useState<string>(
    cached?.inquiriesWhatsappLabel || DEFAULT_INQUIRIES_WHATSAPP_LABEL
  );
  const [inquiriesWhatsappLink, setInquiriesWhatsappLink] = useState<string>(
    cached?.inquiriesWhatsappLink || DEFAULT_WHATSAPP_LINK
  );
  const [inquiriesEmailLabel, setInquiriesEmailLabel] = useState<string>(
    cached?.inquiriesEmailLabel || DEFAULT_INQUIRIES_EMAIL_LABEL
  );

  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAboutData = async () => {
      try {
        const { data: rawGalleries } = await supabase
          .from('galleries')
          .select('*')
          .in('category', ['SETTINGS', 'ABOUT', 'PORTRAIT', 'PHOTOGRAPHY'])
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (rawGalleries && rawGalleries.length > 0) {
          // Parse settings
          const settingsGal = rawGalleries.find(g => g.category === 'SETTINGS');
          if (settingsGal?.title) {
            try {
              const parsed = JSON.parse(settingsGal.title);
              setSettings(prev => ({
                ...prev,
                brandName: parsed.brandName || prev.brandName,
                contactLink: parsed.contactLink || prev.contactLink,
                whatsappLink: parsed.whatsappLink || prev.whatsappLink,
                instagramLink: parsed.instagramLink || prev.instagramLink,
                tiktokLink: parsed.tiktokLink || prev.tiktokLink,
                footerEmail: parsed.footerEmail || prev.footerEmail,
              }));
            } catch (e) {
              // ignore parse errors
            }
          }

          // Fetch About payload & image
          const aboutGal = rawGalleries.find(g => g.client_name === '__ABOUT__' || g.category === 'ABOUT');
          if (aboutGal) {
            if (aboutGal.title) {
              try {
                const parsed = JSON.parse(aboutGal.title);
                if (parsed && typeof parsed === 'object') {
                  if (parsed.pageHeaderTitle) setPageHeaderTitle(parsed.pageHeaderTitle);
                  if (parsed.pageHeaderSubtitle) setPageHeaderSubtitle(parsed.pageHeaderSubtitle);

                  if (parsed.bioQuote) setBioQuote(parsed.bioQuote);
                  if (parsed.bioText) setAboutText(parsed.bioText);

                  if (parsed.placardName) setPlacardName(parsed.placardName);
                  if (parsed.placardRole) setPlacardRole(parsed.placardRole);
                  if (parsed.placardBase) setPlacardBase(parsed.placardBase);
                  if (parsed.placardAvailability) setPlacardAvailability(parsed.placardAvailability);
                  if (parsed.placardFocus) setPlacardFocus(parsed.placardFocus);
                  if (parsed.placardButtonText) setPlacardButtonText(parsed.placardButtonText);

                  if (parsed.showDisciplinesSection !== undefined) setShowDisciplinesSection(parsed.showDisciplinesSection);
                  if (parsed.showEthosSection !== undefined) setShowEthosSection(parsed.showEthosSection);
                  if (parsed.showInquiriesSection !== undefined) setShowInquiriesSection(parsed.showInquiriesSection);

                  if (parsed.disciplinesCardBg !== undefined) setDisciplinesCardBg(parsed.disciplinesCardBg);
                  if (parsed.disciplinesCardBgColor) setDisciplinesCardBgColor(parsed.disciplinesCardBgColor);
                  if (parsed.ethosCardBg !== undefined) setEthosCardBg(parsed.ethosCardBg);
                  if (parsed.ethosCardBgColor) setEthosCardBgColor(parsed.ethosCardBgColor);

                  if (parsed.disciplinesEyebrow) setDisciplinesEyebrow(parsed.disciplinesEyebrow);
                  if (parsed.disciplinesTitle) setDisciplinesTitle(parsed.disciplinesTitle);
                  if (parsed.disciplinesSubtitle !== undefined) setDisciplinesSubtitle(parsed.disciplinesSubtitle);
                  if (Array.isArray(parsed.disciplines)) {
                    setDisciplines(parsed.disciplines);
                  }

                  if (parsed.ethosEyebrow) setEthosEyebrow(parsed.ethosEyebrow);
                  if (parsed.ethosTitle) setEthosTitle(parsed.ethosTitle);
                  if (Array.isArray(parsed.ethosPillars)) {
                    setEthosPillars(parsed.ethosPillars);
                  }

                  if (Array.isArray(parsed.customSections)) {
                    setCustomSections(parsed.customSections);
                  }

                  if (parsed.inquiriesEyebrow) setInquiriesEyebrow(parsed.inquiriesEyebrow);
                  if (parsed.inquiriesTitle) setInquiriesTitle(parsed.inquiriesTitle);
                  if (parsed.inquiriesSubtitle) setInquiriesSubtitle(parsed.inquiriesSubtitle);
                  if (parsed.inquiriesWhatsappLabel) setInquiriesWhatsappLabel(parsed.inquiriesWhatsappLabel);
                  if (parsed.inquiriesWhatsappLink) setInquiriesWhatsappLink(parsed.inquiriesWhatsappLink);
                  if (parsed.inquiriesEmailLabel) setInquiriesEmailLabel(parsed.inquiriesEmailLabel);

                  try {
                    localStorage.setItem('mwabonje_about_payload', aboutGal.title);
                  } catch {}
                } else {
                  setAboutText(aboutGal.title);
                }
              } catch {
                setAboutText(aboutGal.title);
              }
            }

            const { data: aboutFiles } = await supabase
              .from('files')
              .select('file_url')
              .eq('gallery_id', aboutGal.id)
              .neq('file_path', 'GALLERY_PASSWORD')
              .order('created_at', { ascending: false })
              .limit(1);

            if (isMounted && aboutFiles && aboutFiles.length > 0 && aboutFiles[0].file_url) {
              const fetchedUrl = aboutFiles[0].file_url;
              setAboutImage(fetchedUrl);
              try {
                localStorage.setItem('mwabonje_about_image', fetchedUrl);
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error('Error fetching About data:', err);
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
    "Hey there! I am Michael Mwabonje Ringa, an East African photographer based in Malindi specialising in hospitality, Wedding, portraits, and documentary visual storytelling. My work is heavily inspired by the coastal beauty of Kenya and the intimate stories of the people who inhabit it.",
    "For me, photography is more than just clicking a button; it is about preserving fleeting moments, translating emotions into visuals, and crafting narratives that transcend time.",
    "Whether I'm shooting an elegant property or directing a visual project, my focus remains on authenticity, natural light, and elegant composition.",
    "Available for travel. Let's create something beautiful together."
  ];

  const bioParagraphs = aboutText && aboutText.trim().length > 0 
    ? aboutText.split('\n').filter(p => p.trim().length > 0)
    : defaultBio;

  const displayImage = aboutImage || REAL_ABOUT_IMAGE_URL;

  const renderPillarIcon = (icon: string) => {
    switch (icon) {
      case 'sun':
        return <Sun className="w-5 h-5" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5" />;
      case 'layers':
        return <Layers className="w-5 h-5" />;
      case 'camera':
        return <Camera className="w-5 h-5" />;
      case 'compass':
        return <Compass className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getEthosGridClass = () => {
    if (ethosPillars.length === 1) return "grid grid-cols-1 max-w-md mx-auto gap-6";
    if (ethosPillars.length === 2) return "grid grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto gap-6 sm:gap-8";
    if (ethosPillars.length === 3) return "grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-6 md:gap-8";
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-6 md:gap-8";
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 selection:bg-slate-900 selection:text-white">
      <Helmet>
        <title>About — {pageHeaderTitle || settings.brandName} | Visual Storyteller & Lifestyle Photographer</title>
        <meta name="description" content={pageHeaderSubtitle || `Discover the journey and vision of ${settings.brandName}, an East African visual storyteller and lifestyle photographer based on the Kenyan coast.`} />
      </Helmet>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#FAF8F5]/95 dark:bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 h-16 sm:h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="font-serif text-xl sm:text-2xl md:text-3xl font-bold tracking-widest text-slate-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
              {settings.brandName}
            </span>
          </Link>

          {/* Desktop & Tablet Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-[11px] tracking-widest uppercase font-semibold text-slate-600 dark:text-slate-300">
            <Link to="/" className="hover:text-slate-950 dark:hover:text-white transition-colors py-2">
              Portfolio
            </Link>
            <Link to="/?category=FILMS" className="hover:text-slate-950 dark:hover:text-white transition-colors py-2">
              Films
            </Link>
            <Link to="/blog" className="hover:text-slate-950 dark:hover:text-white transition-colors py-2">
              Journal
            </Link>
            <Link 
              to="/about" 
              className="text-slate-950 dark:text-white font-bold border-b-2 border-slate-900 dark:border-white pb-0.5 py-2"
            >
              About
            </Link>
            <Link to="/faq" className="hover:text-slate-950 dark:hover:text-white transition-colors py-2">
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
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="md:hidden min-h-[44px] min-w-[44px] p-2.5 flex items-center justify-center text-slate-900 dark:text-white hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200/60 dark:border-slate-800 bg-[#FAF8F5] dark:bg-[#0b0f17] px-6 py-6 animate-in slide-in-from-top-3 duration-200 shadow-xl">
            <div className="flex flex-col gap-3 text-xs font-semibold uppercase tracking-widest">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="py-3 border-b border-slate-200/60 dark:border-slate-800/80 active:text-slate-500">
                Portfolio
              </Link>
              <Link to="/?category=FILMS" onClick={() => setIsMenuOpen(false)} className="py-3 border-b border-slate-200/60 dark:border-slate-800/80 active:text-slate-500">
                Films
              </Link>
              <Link to="/blog" onClick={() => setIsMenuOpen(false)} className="py-3 border-b border-slate-200/60 dark:border-slate-800/80 active:text-slate-500">
                Journal
              </Link>
              <Link to="/about" onClick={() => setIsMenuOpen(false)} className="py-3 border-b border-slate-200/60 dark:border-slate-800/80 text-slate-950 dark:text-white font-bold">
                About
              </Link>
              <Link to="/faq" onClick={() => setIsMenuOpen(false)} className="py-3 border-b border-slate-200/60 dark:border-slate-800/80 active:text-slate-500">
                FAQ
              </Link>
              <a 
                href={settings.contactLink} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="mt-3 text-center min-h-[44px] flex items-center justify-center py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-full text-xs font-semibold tracking-widest uppercase active:scale-95 shadow-sm"
              >
                Enquire
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 md:py-16">
        {/* Section Header */}
        <div className="mb-8 sm:mb-12 md:mb-16 pb-6 sm:pb-8 border-b border-slate-200/80 dark:border-slate-800">
          <div className="max-w-3xl">
            <h1 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-slate-900 dark:text-white font-normal leading-[1.1] tracking-tight">
              {pageHeaderTitle}
            </h1>
            <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 font-light leading-relaxed">
              {pageHeaderSubtitle}
            </p>
          </div>
        </div>

        {/* Two-Column Biography Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-8 lg:gap-14 md:items-stretch">
          {/* Left Column: Portrait Card */}
          <div className="md:col-span-5 flex flex-col h-full">
            <div className="overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xl flex flex-col h-full">
              {/* Dynamic Image Container */}
              <div className="relative w-full aspect-[4/5] md:aspect-auto md:flex-1 min-h-[260px] sm:min-h-[320px] md:min-h-[220px] overflow-hidden bg-slate-950">
                <img 
                  src={getOptimizedImageUrl(displayImage, 900, 1125, 90)}
                  alt={`${placardName} — Visual Storyteller`}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.retried) {
                      target.dataset.retried = 'true';
                      target.src = rewriteUrlToR2(displayImage) || displayImage;
                    }
                  }}
                  className="absolute inset-0 w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-700 ease-out"
                />
              </div>

              {/* Editorial Spec Placard */}
              <div className="shrink-0 p-5 sm:p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200/70 dark:border-slate-800 space-y-3.5">
                <div>
                  <h2 className="font-editorial text-lg sm:text-xl font-medium text-slate-900 dark:text-white">
                    {placardName}
                  </h2>
                  <p className="text-[11px] sm:text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-0.5">
                    {placardRole}
                  </p>
                </div>

                <div className="space-y-2 text-xs border-t border-slate-200/70 dark:border-slate-800 pt-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">Base</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium text-right">{placardBase}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">Availability</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium text-right">{placardAvailability}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">Focus</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium text-right">{placardFocus}</span>
                  </div>
                </div>

                <div className="pt-1">
                  <a
                    href={
                      placardButtonText.toLowerCase().includes('whatsapp') || placardButtonText.toLowerCase().includes('chat')
                        ? formatWhatsappUrl(inquiriesWhatsappLink || settings.whatsappLink, DEFAULT_WHATSAPP_LINK)
                        : (settings.contactLink || formatWhatsappUrl(inquiriesWhatsappLink || settings.whatsappLink, DEFAULT_WHATSAPP_LINK))
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold tracking-wider uppercase hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm active:scale-98"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{placardButtonText}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Narrative Biography & Philosophy */}
          <div className="md:col-span-7 flex flex-col justify-start space-y-6 sm:space-y-8 mt-4 md:mt-0">
            {/* Featured Artist Quote / Opening Statement */}
            {bioQuote && (
              <div className="border-l-2 border-slate-900 dark:border-white pl-4 sm:pl-6 py-1">
                <blockquote className="font-editorial italic text-xl sm:text-2xl lg:text-3xl text-slate-900 dark:text-slate-100 font-light leading-snug">
                  &ldquo;{bioQuote}&rdquo;
                </blockquote>
              </div>
            )}

            {/* Narrative Story Paragraphs */}
            <div className="space-y-4 sm:space-y-6 text-slate-700 dark:text-slate-300 text-base sm:text-lg font-light leading-relaxed">
              {bioParagraphs.map((paragraph, index) => (
                <p key={index} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Section: Creative Disciplines / Areas of Practice (Conditional if enabled and has items) */}
        {showDisciplinesSection && disciplines.length > 0 && (
          <section className="mt-16 sm:mt-20 md:mt-28 pt-8 sm:pt-12 border-t border-slate-200/80 dark:border-slate-800">
            <div className="max-w-2xl mb-8 sm:mb-10">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
                {disciplinesEyebrow}
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl text-slate-900 dark:text-white font-normal">
                {disciplinesTitle}
              </h2>
              {disciplinesSubtitle ? (
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-light">
                  {disciplinesSubtitle}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {disciplines.map((item, idx) => {
                const isDark = isColorDark(disciplinesCardBgColor || '#FAF8F5');
                return (
                  <div 
                    key={item.id || idx}
                    style={disciplinesCardBg ? { backgroundColor: disciplinesCardBgColor || '#FAF8F5' } : undefined}
                    className={disciplinesCardBg
                      ? `p-5 sm:p-6 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${
                          isDark 
                            ? 'border-white/10 text-white hover:border-white/20' 
                            : 'border-slate-200/80 text-slate-900 hover:border-slate-300'
                        }`
                      : "p-4 sm:p-2 bg-transparent border-0 transition-colors"
                    }
                  >
                    <span className={`text-xs font-mono font-medium block mb-2 ${
                      disciplinesCardBg && isDark ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {item.number || String(idx + 1).padStart(2, '0')}
                    </span>
                    <h3 className={`font-editorial text-lg sm:text-xl font-medium mb-2 ${
                      disciplinesCardBg && isDark ? 'text-white' : 'text-slate-900 dark:text-white'
                    }`}>
                      {item.title}
                    </h3>
                    <p className={`text-xs sm:text-sm font-light leading-relaxed ${
                      disciplinesCardBg && isDark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section: Ethos & Working Philosophy (Conditional if enabled and has pillars) */}
        {showEthosSection && ethosPillars.length > 0 && (
          <section className="mt-16 sm:mt-20 md:mt-24 pt-8 sm:pt-12 border-t border-slate-200/80 dark:border-slate-800">
            <div className="max-w-2xl mb-8 sm:mb-10">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
                {ethosEyebrow}
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl text-slate-900 dark:text-white font-normal">
                {ethosTitle}
              </h2>
            </div>

            <div className={getEthosGridClass()}>
              {ethosPillars.map((pillar, idx) => {
                const isDark = isColorDark(ethosCardBgColor || '#FAF8F5');
                return (
                  <div 
                    key={pillar.id || idx} 
                    style={ethosCardBg ? { backgroundColor: ethosCardBgColor || '#FAF8F5' } : undefined}
                    className={ethosCardBg
                      ? `space-y-3 p-5 sm:p-6 rounded-2xl border transition-all duration-200 shadow-sm hover:shadow-md ${
                          isDark
                            ? 'border-white/10 text-white hover:border-white/20'
                            : 'border-slate-200/80 text-slate-900 hover:border-slate-300'
                        }`
                      : "space-y-3 p-4 sm:p-0 bg-transparent transition-colors"
                    }
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      ethosCardBg && isDark
                        ? 'bg-white/15 text-white'
                        : 'bg-slate-200/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}>
                      {renderPillarIcon(pillar.icon)}
                    </div>
                    <h4 className={`font-editorial text-base sm:text-lg font-medium ${
                      ethosCardBg && isDark ? 'text-white' : 'text-slate-900 dark:text-white'
                    }`}>
                      {pillar.title}
                    </h4>
                    <p className={`text-xs sm:text-sm font-light leading-relaxed ${
                      ethosCardBg && isDark ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {pillar.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section: Custom Sections (Dynamically Added/Deleted by User) */}
        {customSections && customSections.length > 0 && customSections.map((sec, idx) => {
          const isDark = isColorDark(sec.cardBgColor || '#FAF8F5');
          return (
            <section key={sec.id || idx} className="mt-16 sm:mt-20 md:mt-24 pt-8 sm:pt-12 border-t border-slate-200/80 dark:border-slate-800">
              <div className="max-w-2xl mb-8 sm:mb-10">
                {sec.eyebrow ? (
                  <span className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
                    {sec.eyebrow}
                  </span>
                ) : null}
                {sec.title ? (
                  <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl text-slate-900 dark:text-white font-normal">
                    {sec.title}
                  </h2>
                ) : null}
              </div>

              <div 
                style={sec.cardBg ? { backgroundColor: sec.cardBgColor || '#FAF8F5' } : undefined}
                className={sec.cardBg
                  ? `p-6 sm:p-8 rounded-2xl border transition-all duration-200 shadow-sm ${
                      isDark 
                        ? 'border-white/10 text-white' 
                        : 'border-slate-200/80 text-slate-900'
                    }`
                  : "p-4 sm:p-0 bg-transparent text-slate-700 dark:text-slate-300"
                }
              >
                <div className={`text-sm sm:text-base leading-relaxed whitespace-pre-line font-light ${
                  sec.cardBg && isDark ? 'text-slate-200' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  {sec.content}
                </div>
              </div>
            </section>
          );
        })}

        {/* Section: Direct Collaboration & Contact Invitation (Conditional if enabled) */}
        {showInquiriesSection && (
          <section className="mt-16 sm:mt-20 md:mt-28 p-6 sm:p-10 md:p-14 rounded-2xl sm:rounded-3xl bg-slate-900 dark:bg-slate-900/90 text-white border border-slate-800 shadow-2xl relative overflow-hidden text-center">
            <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 relative z-10">
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-400 block">
                {inquiriesEyebrow}
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal leading-tight">
                {inquiriesTitle}
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm md:text-base font-light leading-relaxed max-w-xl mx-auto">
                {inquiriesSubtitle}
              </p>
              
              <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4">
                <a
                  href={formatWhatsappUrl(inquiriesWhatsappLink || settings.whatsappLink, DEFAULT_WHATSAPP_LINK)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center min-h-[44px] gap-2 px-6 sm:px-8 py-3 bg-white text-slate-950 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-100 transition-all shadow-md active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{inquiriesWhatsappLabel}</span>
                </a>

                {settings.footerEmail && (
                  <a
                    href={`mailto:${settings.footerEmail}`}
                    className="inline-flex items-center justify-center min-h-[44px] gap-2 px-6 sm:px-8 py-3 bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-700 rounded-full text-xs font-semibold tracking-widest uppercase transition-all active:scale-95"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{inquiriesEmailLabel}</span>
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="bg-slate-950 text-white py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 mt-16 sm:mt-20 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-10 pb-10 sm:pb-12 border-b border-white/10">
          <div>
            <span className="font-serif text-2xl sm:text-3xl font-bold tracking-widest text-white">
              {settings.brandName}
            </span>
            <p className="text-slate-400 text-xs tracking-wider uppercase mt-2">
              East African Photography &amp; Film Studio
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs uppercase tracking-widest font-semibold text-slate-300">
            <Link to="/" className="hover:text-white transition-colors py-1">
              Portfolio
            </Link>
            <Link to="/blog" className="hover:text-white transition-colors py-1">
              Journal
            </Link>
            <Link to="/about" className="text-white font-bold border-b border-white py-1">
              About
            </Link>
            <Link to="/faq" className="hover:text-white transition-colors py-1">
              FAQ
            </Link>
            <a 
              href={settings.contactLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors py-1"
            >
              Contact
            </a>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} {settings.brandName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {settings.instagramLink && (
              <a 
                href={settings.instagramLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Instagram
              </a>
            )}
            <a 
              href={formatWhatsappUrl(inquiriesWhatsappLink || settings.whatsappLink, DEFAULT_WHATSAPP_LINK)} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-white transition-colors"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
