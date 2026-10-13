import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowRight, 
  Menu, 
  X, 
  MapPin, 
  Compass, 
  Mail, 
  ArrowLeft,
  MessageCircle,
  Camera,
  Sun,
  Sparkles,
  Layers
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
        // Fetch site settings from SETTINGS and ABOUT galleries
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

          // Fetch About text and cover image
          const aboutGal = rawGalleries.find(g => g.client_name === '__ABOUT__' || g.category === 'ABOUT');
          if (aboutGal) {
            if (aboutGal.title) {
              setAboutText(aboutGal.title);
            }

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

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#FAF8F5]/95 dark:bg-[#0b0f17]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors duration-300">
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

          {/* Right Action Controls */}
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

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 md:px-12 py-10 md:py-16">
        {/* Top Breadcrumb & Section Header */}
        <div className="mb-12 md:mb-16 pb-8 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Portfolio</span>
            </Link>
            <span className="text-[11px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-medium">
              Malindi · Lamu · Worldwide
            </span>
          </div>

          <div className="max-w-3xl">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-500 dark:text-slate-400 block mb-3">
              About the Photographer
            </span>
            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl text-slate-900 dark:text-white font-normal leading-[1.1] tracking-tight">
              Michael Mwabonje Ringa
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 font-light leading-relaxed">
              Visual storyteller and lifestyle photographer capturing the authentic warmth, architectural quiet, and coastal narratives of East Africa.
            </p>
          </div>
        </div>

        {/* Two-Column Editorial Biography */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Photographer Portrait & Specifications (Sticky on desktop) */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-slate-950">
                <img 
                  src={getOptimizedImageUrl(displayImage, 900, 1125, 90)}
                  alt="Michael Mwabonje Ringa — Visual Storyteller"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.retried) {
                      target.dataset.retried = 'true';
                      target.src = rewriteUrlToR2(displayImage) || displayImage;
                    }
                  }}
                  className="w-full h-full object-cover object-top hover:scale-[1.02] transition-transform duration-700 ease-out"
                />
              </div>

              {/* Editorial Spec Placard */}
              <div className="p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200/70 dark:border-slate-800 space-y-4">
                <div>
                  <h2 className="font-editorial text-xl font-medium text-slate-900 dark:text-white">
                    Michael Mwabonje Ringa
                  </h2>
                  <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-0.5">
                    Photographer &amp; Filmmaker
                  </p>
                </div>

                <div className="space-y-2.5 text-xs border-t border-slate-200/70 dark:border-slate-800 pt-3">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">Base</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium text-right">Malindi &amp; Coast, Kenya</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">Availability</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium text-right">Kenya &amp; Worldwide Travel</span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium">Focus</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium text-right">Hospitality, Lifestyle, Prints</span>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={settings.contactLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold tracking-wider uppercase hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Inquire for Commissions</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Narrative Biography & Philosophy */}
          <div className="lg:col-span-7 space-y-10">
            {/* Featured Artist Quote / Opening Statement */}
            <div className="border-l-2 border-slate-900 dark:border-white pl-6 py-1">
              <blockquote className="font-editorial italic text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 font-light leading-snug">
                &ldquo;Photography is more than clicking a button; it is about preserving fleeting moments and crafting narratives that transcend time.&rdquo;
              </blockquote>
            </div>

            {/* Narrative Story Paragraphs */}
            <div className="space-y-6 text-slate-700 dark:text-slate-300 text-base sm:text-lg font-light leading-relaxed">
              {bioParagraphs.map((paragraph, index) => (
                <p key={index} className="leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Signature Block */}
            <div className="pt-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
              <div className="font-signature text-3xl sm:text-4xl text-slate-800 dark:text-slate-200">
                Michael Mwabonje Ringa
              </div>
              <p className="text-[11px] uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
                Visual Storyteller · East Africa
              </p>
            </div>

            {/* Direct Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href={settings.contactLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-md active:scale-95"
              >
                <span>Book a Session</span>
                <ArrowRight className="w-4 h-4" />
              </a>
              <Link
                to="/prints"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                <span>Browse Fine Art Prints</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Section: Creative Disciplines / Areas of Practice */}
        <section className="mt-20 md:mt-28 pt-12 border-t border-slate-200/80 dark:border-slate-800">
          <div className="max-w-2xl mb-10">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
              Areas of Practice
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl text-slate-900 dark:text-white font-normal">
              Creative Disciplines
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-light">
              Intentional visual storytelling tailored to editorial publications, private commissions, and luxury hospitality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-400 dark:hover:border-slate-700 transition-colors">
              <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 block mb-2">01</span>
              <h3 className="font-editorial text-xl font-medium text-slate-900 dark:text-white mb-2">
                Hospitality &amp; Architectural Spaces
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                Capturing boutique hotels, coastal private villas, safari camps, and interior architecture with natural ambient light and spatial elegance.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-400 dark:hover:border-slate-700 transition-colors">
              <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 block mb-2">02</span>
              <h3 className="font-editorial text-xl font-medium text-slate-900 dark:text-white mb-2">
                Lifestyle &amp; Editorial Portraits
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                Natural-light portraiture, commercial brand storytelling, and emotive human narratives that celebrate genuine character and East African culture.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-400 dark:hover:border-slate-700 transition-colors">
              <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 block mb-2">03</span>
              <h3 className="font-editorial text-xl font-medium text-slate-900 dark:text-white mb-2">
                Weddings &amp; Intimate Celebrations
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                Documentary, unscripted coverage of destination unions along the Kenyan coast, preserving raw emotions, intimacy, and joyful celebrations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800/80 hover:border-slate-400 dark:hover:border-slate-700 transition-colors">
              <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500 block mb-2">04</span>
              <h3 className="font-editorial text-xl font-medium text-slate-900 dark:text-white mb-2">
                Fine Art Prints &amp; Cinematic Reels
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                Museum-grade archival cotton rag prints for interior collectors, alongside cinematic short film reels documenting coastal heritage and natural beauty.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Ethos & Working Philosophy */}
        <section className="mt-20 md:mt-24 pt-12 border-t border-slate-200/80 dark:border-slate-800">
          <div className="max-w-2xl mb-10">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-500 dark:text-slate-400 block mb-2">
              Ethos &amp; Approach
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl text-slate-900 dark:text-white font-normal">
              How I See Through the Lens
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200">
                <Sun className="w-5 h-5" />
              </div>
              <h4 className="font-editorial text-lg font-medium text-slate-900 dark:text-white">
                The Coastal Light
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                Guided by the dawn hues of the Indian Ocean, equatorial golden hours, and the organic textures of coastal architecture.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="font-editorial text-lg font-medium text-slate-900 dark:text-white">
                Quiet Observation
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                Prioritizing unobtrusive storytelling and genuine connection, allowing moments to unfold naturally without rigid posing.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-editorial text-lg font-medium text-slate-900 dark:text-white">
                Archival Craft
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                Curated tone grading and museum-grade cotton rag paper selections that preserve memories for generations to come.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Direct Collaboration & Contact Invitation */}
        <section className="mt-20 md:mt-28 p-8 md:p-14 rounded-3xl bg-slate-900 dark:bg-slate-900/90 text-white border border-slate-800 shadow-2xl relative overflow-hidden text-center">
          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <span className="text-xs uppercase tracking-[0.25em] font-semibold text-slate-400 block">
              Inquiries &amp; Commissions
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-normal leading-tight">
              Ready to create something timeless together?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base font-light leading-relaxed max-w-xl mx-auto">
              Available for commercial hospitality briefs, editorial assignments, destination weddings, and private portraiture throughout Kenya and worldwide.
            </p>
            
            <div className="pt-4 flex flex-wrap justify-center items-center gap-4">
              <a
                href={settings.contactLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-slate-950 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-100 transition-all shadow-md active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>

              {settings.footerEmail && (
                <a
                  href={`mailto:${settings.footerEmail}`}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-800/80 hover:bg-slate-800 text-white border border-slate-700 rounded-full text-xs font-semibold tracking-widest uppercase transition-all active:scale-95"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send an Email</span>
                </a>
              )}

              <Link
                to="/prints"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-transparent hover:bg-white/10 text-slate-200 border border-slate-700/80 rounded-full text-xs font-semibold tracking-widest uppercase transition-all"
              >
                <span>Browse Prints</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Editorial Footer */}
      <footer className="bg-slate-950 text-white py-16 md:py-20 px-6 md:px-12 mt-20 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-10 pb-12 border-b border-white/10">
          <div>
            <span className="font-serif text-3xl font-bold tracking-widest text-white">
              {settings.brandName}
            </span>
            <p className="text-slate-400 text-xs tracking-wider uppercase mt-2">
              East African Photography &amp; Film Studio
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs uppercase tracking-widest font-semibold text-slate-300">
            <Link to="/" className="hover:text-white transition-colors">
              Portfolio
            </Link>
            <Link to="/prints" className="hover:text-white transition-colors">
              Prints
            </Link>
            <Link to="/blog" className="hover:text-white transition-colors">
              Journal
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

        <div className="max-w-6xl mx-auto pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {settings.brandName} Photography. All Rights Reserved.</p>
          <p>Mombasa, Lamu &amp; Malindi, Kenya</p>
        </div>
      </footer>
    </div>
  );
};
