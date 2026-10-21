import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronDown, 
  Search, 
  X, 
  MessageCircle, 
  Mail, 
  Menu, 
  Compass
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { ThemeToggle } from '../components/ThemeToggle';
import { PublicHeader } from '../components/PublicHeader';
import { SEO } from '../components/SEO';
import { FAQItem } from '../types';
import { 
  DEFAULT_FAQ_DATA, 
  FAQ_CATEGORY_OPTIONS,
  DEFAULT_FAQ_HEADER_EYEBROW,
  DEFAULT_FAQ_HEADER_TITLE,
  DEFAULT_FAQ_HEADER_SUBTITLE,
  DEFAULT_FAQ_CTA_EYEBROW,
  DEFAULT_FAQ_CTA_TITLE,
  DEFAULT_FAQ_CTA_SUBTITLE
} from '../utils/defaultFaqs';

export const FAQ: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQItem[]>(DEFAULT_FAQ_DATA);
  const [headerEyebrow, setHeaderEyebrow] = useState(DEFAULT_FAQ_HEADER_EYEBROW);
  const [headerTitle, setHeaderTitle] = useState(DEFAULT_FAQ_HEADER_TITLE);
  const [headerSubtitle, setHeaderSubtitle] = useState(DEFAULT_FAQ_HEADER_SUBTITLE);
  const [ctaEyebrow, setCtaEyebrow] = useState(DEFAULT_FAQ_CTA_EYEBROW);
  const [ctaTitle, setCtaTitle] = useState(DEFAULT_FAQ_CTA_TITLE);
  const [ctaSubtitle, setCtaSubtitle] = useState(DEFAULT_FAQ_CTA_SUBTITLE);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(DEFAULT_FAQ_DATA[0]?.id || null);
  const [settings, setSettings] = useState({
    brandName: 'MWABONJE',
    contactLink: 'https://wa.me/254705268604',
    whatsappLink: 'https://wa.me/254705268604',
    instagramLink: 'https://instagram.com/mwabonje',
    footerEmail: 'mwabonjephotography@gmail.com'
  });

  // Fetch live settings and custom FAQs from Supabase
  useEffect(() => {
    // 1. Fetch website settings
    supabase
      .from('galleries')
      .select('title')
      .eq('category', 'SETTINGS')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.title) {
          try {
            const p = JSON.parse(data.title);
            setSettings(prev => ({
              ...prev,
              brandName: p.brandName || prev.brandName,
              contactLink: p.contactLink || prev.contactLink,
              whatsappLink: p.whatsappLink || prev.whatsappLink,
              instagramLink: p.instagramLink || prev.instagramLink,
              footerEmail: p.footerEmail || prev.footerEmail,
            }));
          } catch (e) {}
        }
      });

    // 2. Fetch custom edited FAQs and Header from dashboard
    supabase
      .from('galleries')
      .select('title')
      .eq('category', 'FAQ')
      .eq('link_enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.title) {
          try {
            const parsed = JSON.parse(data.title);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setFaqs(parsed);
              if (parsed[0]?.id) {
                setExpandedId(parsed[0].id);
              }
            } else if (parsed && typeof parsed === 'object') {
              if (Array.isArray(parsed.items) && parsed.items.length > 0) {
                setFaqs(parsed.items);
                if (parsed.items[0]?.id) {
                  setExpandedId(parsed.items[0].id);
                }
              }
              if (parsed.headerEyebrow) setHeaderEyebrow(parsed.headerEyebrow);
              if (parsed.headerTitle) setHeaderTitle(parsed.headerTitle);
              if (parsed.headerSubtitle) setHeaderSubtitle(parsed.headerSubtitle);
              if (parsed.ctaEyebrow) setCtaEyebrow(parsed.ctaEyebrow);
              if (parsed.ctaTitle) setCtaTitle(parsed.ctaTitle);
              if (parsed.ctaSubtitle) setCtaSubtitle(parsed.ctaSubtitle);
            }
          } catch (e) {}
        }
      });
  }, []);

  const toggleItem = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Dynamically compute available categories from existing FAQs
  const categories = useMemo(() => {
    const list = [{ id: 'all', label: 'All Questions' }];
    const seen = new Set<string>();

    // Add options from standard options that exist in faqs
    FAQ_CATEGORY_OPTIONS.forEach(opt => {
      if (faqs.some(f => f.category === opt.id)) {
        list.push(opt);
        seen.add(opt.id);
      }
    });

    // Also include any custom categories that might have been added
    faqs.forEach(f => {
      if (f.category && !seen.has(f.category)) {
        list.push({ id: f.category, label: f.categoryLabel || f.category });
        seen.add(f.category);
      }
    });

    return list;
  }, [faqs]);

  // Filtered FAQ items based on category and search query
  const filteredFAQs = useMemo(() => {
    return faqs.filter(item => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.question.toLowerCase().includes(q) || 
        item.answer.toLowerCase().includes(q) ||
        (item.categoryLabel && item.categoryLabel.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [faqs, activeCategory, searchQuery]);

  // Schema.org FAQPage & BreadcrumbList Structured Data
  const faqSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://mwabonje.co.ke/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "FAQ",
            "item": "https://mwabonje.co.ke/faq"
          }
        ]
      },
      {
        "@type": "FAQPage",
        "mainEntity": faqs.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      }
    ]
  };

  const seoTitle = headerTitle && !headerTitle.toLowerCase().includes('inquiries')
    ? `${headerTitle} | Mwabonje Photography — Malindi & Kenyan Coast`
    : "Frequently Asked Questions | Mwabonje Photography — Malindi & Watamu";

  const seoDescription = headerSubtitle && headerSubtitle.length > 50
    ? headerSubtitle
    : "Find answers to frequently asked questions about booking wedding photography, portraits, hospitality shoots, payment schedules, and photo delivery with Mwabonje in Malindi, Watamu, and Lamu.";

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 selection:bg-slate-900 selection:text-white">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        url="https://mwabonje.co.ke/faq"
        type="website"
        structuredData={faqSchema}
      />

      {/* Navigation Header */}
      <PublicHeader brandName={settings.brandName} contactLink={settings.contactLink} />

      {/* Hero Header (Fully Editable via Dashboard) */}
      <section className="relative pt-12 sm:pt-16 md:pt-20 pb-10 sm:pb-12 px-4 sm:px-6 md:px-12 text-center max-w-4xl mx-auto">
        {headerEyebrow && (
          <span className="text-[11px] sm:text-xs uppercase tracking-[0.28em] font-semibold text-slate-500 dark:text-slate-400 block mb-3">
            {headerEyebrow}
          </span>
        )}
        <h1 className="font-editorial text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-tight text-slate-900 dark:text-white">
          {headerTitle}
        </h1>
        {headerSubtitle && (
          <p className="mt-4 sm:mt-6 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 font-light leading-relaxed max-w-2xl mx-auto">
            {headerSubtitle}
          </p>
        )}

        {/* Live Search Input */}
        <div className="mt-8 sm:mt-10 max-w-xl mx-auto relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic, delivery, weddings, travel..."
              className="w-full pl-11 sm:pl-12 pr-10 py-3 sm:py-3.5 bg-white dark:bg-[#151c28] border border-slate-200 dark:border-slate-800 rounded-full text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold tracking-wider transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Accordion List */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 md:px-12 pb-16 sm:pb-24">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white dark:bg-[#151c28] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8">
            <Compass className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
              No matching answers found
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              We couldn't find an answer for "{searchQuery}". Feel free to message us directly on WhatsApp or by email.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
              className="mt-4 px-4 py-2 text-xs font-semibold tracking-wider uppercase text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredFAQs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                    isExpanded 
                      ? 'bg-white dark:bg-[#151c28] border-slate-300 dark:border-slate-700 shadow-md ring-1 ring-slate-900/5 dark:ring-white/5' 
                      : 'bg-white/70 dark:bg-[#151c28]/70 border-slate-200/70 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-[#151c28]'
                  }`}
                >
                  <button
                    onClick={() => toggleItem(faq.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`faq-answer-${faq.id}`}
                    className="w-full text-left px-5 sm:px-7 py-4 sm:py-5 flex items-start justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white rounded-2xl"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] sm:text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 block">
                        {faq.categoryLabel}
                      </span>
                      <h3 className="font-editorial text-lg sm:text-xl md:text-2xl text-slate-900 dark:text-white font-normal leading-snug">
                        {faq.question}
                      </h3>
                    </div>
                    <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${
                      isExpanded 
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 rotate-180' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      id={`faq-answer-${faq.id}`}
                      role="region"
                      className="px-5 sm:px-7 pb-5 sm:pb-6 pt-1 text-sm sm:text-base text-slate-600 dark:text-slate-300 font-light leading-relaxed border-t border-slate-100 dark:border-slate-800/80 mt-1 animate-in fade-in-50 duration-200 whitespace-pre-line"
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Still Have Questions CTA (Editable via Dashboard) */}
        <div className="mt-14 sm:mt-18 p-8 sm:p-10 md:p-12 rounded-3xl bg-slate-900 dark:bg-slate-900/90 text-white border border-slate-800 shadow-2xl text-center relative overflow-hidden">
          <div className="max-w-xl mx-auto space-y-3 sm:space-y-4 relative z-10">
            {ctaEyebrow && (
              <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-slate-400 block">
                {ctaEyebrow}
              </span>
            )}
            <h2 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-normal leading-tight">
              {ctaTitle}
            </h2>
            {ctaSubtitle && (
              <p className="text-slate-300 text-xs sm:text-sm font-light leading-relaxed">
                {ctaSubtitle}
              </p>
            )}

            <div className="pt-4 flex flex-col sm:flex-row justify-center items-stretch sm:items-center gap-3 sm:gap-4">
              <a
                href={settings.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center min-h-[44px] gap-2 px-6 sm:px-8 py-3 bg-white text-slate-950 rounded-full text-xs font-semibold tracking-widest uppercase hover:bg-slate-100 transition-all shadow-md active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on WhatsApp</span>
              </a>

              {settings.footerEmail && (
                <a
                  href={`mailto:${settings.footerEmail}`}
                  className="inline-flex items-center justify-center min-h-[44px] gap-2 px-6 sm:px-8 py-3 bg-slate-800/90 hover:bg-slate-800 text-white border border-slate-700 rounded-full text-xs font-semibold tracking-widest uppercase transition-all active:scale-95"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send an Email</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
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
            <Link to="/about" className="hover:text-white transition-colors py-1">
              About
            </Link>
            <Link to="/faq" className="text-white font-bold border-b border-white py-1">
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
              href={settings.whatsappLink} 
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
export default FAQ;
