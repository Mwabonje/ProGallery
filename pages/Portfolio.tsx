
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Gallery } from '../types';
import { getOptimizedImageUrl } from '../utils/formatters';
import { generateSlug } from '../utils/slug';
import { Helmet } from 'react-helmet-async';

interface PortfolioGallery extends Gallery {
  baseCategory?: string;
  coverUrl?: string | null;
  coverType?: string | null;
}

export function Portfolio({ photographerId }: { photographerId?: string }) {
  const [galleries, setGalleries] = useState<PortfolioGallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category');

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        let query = supabase.from('galleries').select('*').order('created_at', { ascending: false });
        if (photographerId) {
          query = query.eq('photographer_id', photographerId);
        }
        const { data: galleriesData, error } = await query;
        if (error) throw error;

        const portfolioItems = (galleriesData || []).filter(g => g.category && g.category.trim() !== '');

        const enrichedGalleries = await Promise.all(
          portfolioItems.map(async (gallery) => {
            const { data: files } = await supabase
              .from('files')
              .select('file_url, file_type')
              .eq('gallery_id', gallery.id)
              .neq('file_path', 'GALLERY_PASSWORD')
              .order('created_at', { ascending: false })
              .limit(1);

            return {
              ...gallery,
              baseCategory: (gallery.category?.replace(/\s*\[(swipe|grid)\]/gi, '').trim() || '').toUpperCase(),
              coverUrl: files && files.length > 0 ? files[0].file_url : null,
              coverType: files && files.length > 0 ? files[0].file_type : null,
            };
          })
        );
        setGalleries(enrichedGalleries.filter(g => g.coverUrl));
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

  const handleCategoryClick = (e: React.MouseEvent, category: string) => {
    e.preventDefault();
    setSearchParams({ category });
    setIsMenuOpen(false);
    document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
  };

  const aboutGallery = galleries.find(g => g.client_name === '_ABOUT_' || g.baseCategory === 'ABOUT');
  const portfolioGalleries = galleries.filter(g => g.id !== aboutGallery?.id);

  const filteredGalleries = selectedCategory 
    ? portfolioGalleries.filter(g => g.baseCategory?.toLowerCase().includes(selectedCategory.toLowerCase())) 
    : portfolioGalleries;

  return (
    <div className="mwabonje-wrapper">
      <Helmet>
        <title>Mwabonje — Photography & Film, Kenyan Coast</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
        <style>{`  :root{
    --ink:#0E1310;
    --ink-soft:#161C18;
    --paper:#F3EEE4;
    --paper-dim:#E9E2D2;
    --gold:#B9922F;
    --teal:#1F3D39;
    --line-dark: rgba(243,238,228,.14);
    --line-light: rgba(14,19,16,.14);
  }

  /* Scoped Globals */
  .mwabonje-wrapper {
    background:var(--ink);
    color:var(--paper);
    font-family:'Inter', sans-serif;
    font-weight:400;
    -webkit-font-smoothing:antialiased;
    min-height: 100vh;
    overflow-x: hidden;
    width: 100%;
  }

  .mwabonje-wrapper * { box-sizing:border-box; }
  .mwabonje-wrapper a { color:inherit; text-decoration:none; }

  .mwabonje-wrapper .serif {
    font-family:'Fraunces', serif;
    font-optical-sizing:auto;
  }

  .mwabonje-wrapper .mono-tag {
    font-family:'Inter', sans-serif;
    font-size:.7rem;
    letter-spacing:.06em;
    color:var(--gold);
    font-variant-numeric: tabular-nums;
  }

  /* ---------- NAV ---------- */
  .mwabonje-header {
    position:sticky;
    top:0; left:0; right:0;
    z-index:100;
    padding:1.4rem clamp(1.25rem, 4vw, 3rem);
    background:var(--paper);
    color:var(--ink);
    border-bottom:1px solid rgba(14,19,16,0.06);
  }

  .header-layout {
    display:flex;
    justify-content:space-between;
    align-items:center;
  }

  .brand-logo {
    display:flex;
    align-items:center;
    gap:0.75rem;
    color:var(--ink);
    text-decoration:none;
  }

  .m-circle {
    width:36px;
    height:36px;
    border:1px solid var(--ink);
    border-radius:50%;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:1.15rem;
    font-style:italic;
  }

  .brand-text {
    font-weight:600;
    letter-spacing:0.18em;
    font-size:0.8rem;
  }

  .primary-nav {
    display:flex;
    align-items:center;
    gap:clamp(1.5rem, 2.5vw, 2.5rem);
  }

  .nav-dropdown {
    position: relative;
    padding: 1.5rem 0;
    margin: -1.5rem 0;
  }

  .nav-dropdown-content {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(10px);
    background: var(--paper);
    min-width: 180px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.08);
    border: 1px solid rgba(14,19,16,0.06);
    display: flex;
    flex-direction: column;
    padding: 0.5rem 0;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    z-index: 1000;
  }

  .nav-dropdown:hover .nav-dropdown-content {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }

  .nav-dropdown-content a {
    padding: 0.8rem 1.5rem;
    font-size: 0.7rem;
    width: 100%;
    text-align: left;
    display: block;
  }
  
  .nav-dropdown-content a:hover {
    background: rgba(14,19,16,0.03);
    color: var(--ink);
  }

  .primary-nav > a, .nav-dropdown > a {
    font-size:0.75rem;
    font-weight:500;
    letter-spacing:0.1em;
    color:rgba(14,19,16,.65);
    text-decoration:none;
    display:flex;
    align-items:center;
    gap:0.25rem;
    transition:color 0.2s ease;
    position: relative;
  }
  
  .primary-nav > a::after, .nav-dropdown > a::after {
    content: '';
    position: absolute;
    width: 100%;
    transform: scaleX(0);
    height: 1px;
    bottom: -4px;
    left: 0;
    background-color: var(--ink);
    transform-origin: bottom right;
    transition: transform 0.3s ease;
  }

  .primary-nav > a:hover::after, .nav-dropdown > a:hover::after,
  .primary-nav > a.active::after, .nav-dropdown > a.active::after {
    transform: scaleX(1);
    transform-origin: bottom left;
  }

  .primary-nav > a.active, .nav-dropdown > a.active {
    color:var(--ink);
  }

  .primary-nav > a:hover, .nav-dropdown > a:hover {
    color:var(--ink);
  }

  .primary-nav a .dot {
    font-size:1.2rem;
    line-height:0;
    margin-top:-2px;
  }
  
  .header-actions {
    display:flex;
    align-items:center;
    gap: 1rem;
  }

  .enquire-btn {
    border:1px solid var(--ink);
    padding:0.65rem 1.6rem;
    font-size:0.75rem;
    font-weight:500;
    letter-spacing:0.1em;
    color:var(--ink);
    text-decoration:none;
    transition:background 0.3s ease, color 0.3s ease;
  }

  .enquire-btn:hover {
    background:var(--ink);
    color:var(--paper);
  }

  .mobile-menu-btn {
    display:none;
  }

  .mobile-menu-btn .bars {
    display:flex;
    flex-direction:column;
    gap:4px;
    cursor:pointer;
  }
  
  .mobile-menu-btn .bars span {
    width:22px; height:1px; background:var(--ink);
  }

  /* ---------- HERO ---------- */
  .mwabonje-hero {
    position:relative;
    min-height:100vh;
    display:flex;
    flex-direction:column;
    justify-content:flex-end;
    padding:0 clamp(1.25rem, 4vw, 3rem) clamp(2rem, 5vw, 3.5rem);
    overflow:hidden;
  }

  .mwabonje-wrapper .hero-bg {
    position:absolute; inset:0;
    background:
      radial-gradient(circle at 22% 30%, rgba(185,146,47,.16), transparent 45%),
      radial-gradient(circle at 78% 70%, rgba(31,61,57,.5), transparent 55%),
      linear-gradient(180deg, #0A0E0C 0%, #10160F 55%, #0E1310 100%);
  }

  .mwabonje-wrapper .hero-bg::after {
    content:'';
    position:absolute; inset:0;
    background-image:
      repeating-linear-gradient(115deg, rgba(243,238,228,.025) 0px, rgba(243,238,228,.025) 1px, transparent 1px, transparent 90px);
    opacity:.6;
  }

  .mwabonje-wrapper .hero-content {
    position:relative;
    z-index:2;
  }

  .mwabonje-wrapper .hero-eyebrow {
    display:flex;
    align-items:center;
    gap:.6rem;
    margin-bottom:1.5rem;
    color:rgba(243,238,228,.55);
    font-size:.85rem;
  }
  .mwabonje-wrapper .hero-eyebrow .dot {
    width:6px; height:6px; border-radius:50%;
    background:var(--gold);
    animation:pulse 2.4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%,100%{opacity:.4; transform:scale(1);}
    50%{opacity:1; transform:scale(1.3);}
  }

  .mwabonje-wrapper h1.hero-title {
    font-weight:400;
    line-height:.92;
    font-size:clamp(3.2rem, 9.5vw, 8.5rem);
    letter-spacing:-.01em;
    margin: 0;
  }
  .mwabonje-wrapper h1.hero-title em {
    font-style:italic;
    font-weight:300;
    color:var(--gold);
  }

  .mwabonje-wrapper .hero-foot {
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
    margin-top:2.5rem;
    padding-top:1.75rem;
    border-top:1px solid var(--line-dark);
    gap:2rem;
    flex-wrap:wrap;
  }

  .mwabonje-wrapper .hero-foot p {
    max-width:34ch;
    font-size:.95rem;
    line-height:1.55;
    color:rgba(243,238,228,.7);
    margin: 0;
  }

  .mwabonje-wrapper .scroll-cue {
    font-size:.75rem;
    color:rgba(243,238,228,.5);
    display:flex;
    align-items:center;
    gap:.6rem;
    white-space:nowrap;
  }
  .mwabonje-wrapper .scroll-cue .stem {
    width:1px; height:28px;
    background:linear-gradient(to bottom, var(--gold), transparent);
  }

  /* ---------- INDEX (light section) ---------- */
/* ---------- ABOUT ME SECTION ---------- */
  .mwabonje-about {
    background:var(--paper);
    color:var(--ink);
    padding:clamp(3.5rem, 8vw, 6.5rem) clamp(1.25rem, 4vw, 3rem);
  }
  
  .about-me-grid {
    display:grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap:clamp(3rem, 8vw, 6rem);
    align-items:center;
  }
  
  .about-me-image {
    position:relative;
    width:100%;
    aspect-ratio: 4/5;
    border-radius:2px;
    overflow:hidden;
  }
  
  .about-me-image img {
    width:100%;
    height:100%;
    object-fit:cover;
  }
  
  .about-me-content h2 {
    font-size:clamp(2.5rem, 5vw, 4.2rem);
    line-height:1.05;
    margin-bottom:2rem;
    font-weight:400;
  }
  
  .about-me-content .about-text {
    font-size:clamp(1rem, 1.5vw, 1.1rem);
    line-height:1.75;
    color:rgba(14,19,16,.75);
    display:flex;
    flex-direction:column;
    gap:1.2rem;
    margin-bottom:2.5rem;
    max-width: 50ch;
  }
  
  .about-me-btn {
    display:inline-flex;
    align-items:center;
    padding:.8rem 1.8rem;
    border:1px solid var(--ink);
    border-radius:999px;
    font-size:.9rem;
    transition:background .3s ease, color .3s ease;
  }
  
  .about-me-btn:hover {
    background:var(--ink);
    color:var(--paper);
  }

  @media (max-width: 900px) {
    .about-me-grid { grid-template-columns:1fr; }
    .about-me-image { aspect-ratio: 1/1; }
  }

  .mwabonje-container {
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  .mwabonje-index {
    background:var(--paper);
    color:var(--ink);
    padding:clamp(3.5rem, 8vw, 6.5rem) clamp(1.25rem, 4vw, 3rem);
  }

  .mwabonje-wrapper .index-head {
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
    gap:2rem;
    margin-bottom:clamp(2.5rem, 6vw, 4rem);
    border-bottom:1px solid var(--line-light);
    padding-bottom:1.75rem;
    flex-wrap:wrap;
  }

  .mwabonje-wrapper .index-head h2 {
    font-size:clamp(1.9rem, 4vw, 2.6rem);
    font-weight:400;
    margin: 0;
  }

  .mwabonje-wrapper .index-head .count {
    font-size:.85rem;
    color:rgba(14,19,16,.55);
    max-width:32ch;
    text-align:right;
    margin: 0;
  }

  .mwabonje-grid {
    display:grid;
    grid-template-columns:repeat(12, 1fr);
    gap:1.5rem;
  }

  .mwabonje-card {
    position:relative;
    border-radius:2px;
    overflow:hidden;
    display:flex;
    flex-direction:column;
    justify-content:flex-end;
    min-height:420px;
    padding:1.5rem;
    color:var(--paper) !important;
    transition: transform 0.3s ease;
    text-decoration: none !important;
  }
  .mwabonje-card:hover {
    transform: translateY(-4px);
  }

  .mwabonje-card .label {
    position:relative; z-index:2;
  }

  .mwabonje-card .place {
    font-family:'Fraunces', serif;
    font-size:1.6rem;
    margin-bottom:.4rem;
    text-transform: capitalize;
  }

  .mwabonje-card .coords {
    font-size:.72rem;
    color:var(--gold);
    letter-spacing:.03em;
  }

  .mwabonje-card::before {
    content:'';
    position:absolute; inset:0;
    z-index:1;
  }

  .mwabonje-card.c1,
  .mwabonje-card.c2,
  .mwabonje-card.c3,
  .mwabonje-card.c4,
  .mwabonje-card.c5 {
    grid-column: span 6;
  }

  .mwabonje-card .tag {
    position:absolute; top:1.25rem; right:1.25rem; z-index:2;
    font-size:.68rem;
    color:rgba(243,238,228,.7);
    border:1px solid rgba(243,238,228,.25);
    padding:.3rem .7rem;
    border-radius:999px;
    background: rgba(0,0,0,0.2);
    backdrop-filter: blur(4px);
  }

  /* ---------- ABOUT STRIP ---------- */
  .mwabonje-strip {
    background:var(--paper-dim);
    color:var(--ink);
    padding:clamp(3rem, 7vw, 5rem) clamp(1.25rem, 4vw, 3rem);
    border-top:1px solid var(--line-light);
  }

  .strip-grid {
    display:grid;
    grid-template-columns:1.1fr 1fr;
    gap:3rem;
  }

  .mwabonje-strip h3 {
    font-family:'Fraunces', serif;
    font-weight:400;
    font-size:clamp(1.8rem, 3.2vw, 2.4rem);
    line-height:1.25;
    max-width:16ch;
    margin: 0;
  }

  .mwabonje-strip .services {
    display:flex;
    flex-direction:column;
    gap:0;
  }
  .mwabonje-strip .services a {
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:1rem 0;
    border-bottom:1px solid var(--line-light);
    font-size:1.05rem;
  }
  .mwabonje-strip .services a:first-child { border-top:1px solid var(--line-light); }
  .mwabonje-strip .services span.n {
    font-size:.75rem;
    color:rgba(14,19,16,.45);
    font-family:'Inter', sans-serif;
  }

  /* ---------- FOOTER ---------- */
  .mwabonje-footer {
    background:var(--ink);
    padding:clamp(2.5rem, 6vw, 4rem) clamp(1.25rem, 4vw, 3rem) 2rem;
  }

  .mwabonje-wrapper .footer-top {
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:2rem;
    flex-wrap:wrap;
    padding-bottom:2.5rem;
    border-bottom:1px solid var(--line-dark);
  }

  .mwabonje-wrapper .footer-top .serif {
    font-size:clamp(2rem, 5vw, 3.2rem);
  }

  .mwabonje-wrapper .footer-links {
    display:flex;
    gap:2.5rem;
  }
  .mwabonje-wrapper .footer-links a {
    font-size:.9rem;
    color:rgba(243,238,228,.75);
    display:block;
  }
  .mwabonje-wrapper .footer-links a:hover { color:var(--gold); }

  .mwabonje-wrapper .footer-bottom {
    display:flex;
    justify-content:space-between;
    padding-top:1.5rem;
    font-size:.78rem;
    color:rgba(243,238,228,.45);
    flex-wrap:wrap;
    gap:.75rem;
  }

  /* ---------- OVERLAY MENU ---------- */
  .mwabonje-overlay {
    position:fixed; inset:0;
    z-index:200;
    background:#0E1310;
    padding:clamp(1.25rem, 4vw, 3rem);
    display:flex;
    flex-direction:column;
    opacity:0;
    pointer-events:none;
    transform:translateY(-12px);
    transition:opacity .35s ease, transform .35s ease;
  }
  .mwabonje-overlay.open {
    opacity:1;
    pointer-events:auto;
    transform:translateY(0);
  }

  .mwabonje-wrapper .overlay-head {
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:clamp(2.5rem, 6vw, 4.5rem);
  }

  .mwabonje-wrapper .close-btn {
    cursor:pointer;
    font-size:.9rem;
    display:flex;
    align-items:center;
    gap:.6rem;
    border:1px solid var(--line-dark);
    padding:.5rem 1.1rem;
    border-radius:999px;
  }

  .mwabonje-wrapper .overlay-grid {
    display:grid;
    grid-template-columns:repeat(3, 1fr);
    gap:2.5rem 2rem;
    flex:1;
  }

  .mwabonje-wrapper .overlay-group .group-label {
    font-size:.72rem;
    color:var(--gold);
    letter-spacing:.04em;
    margin-bottom:1.1rem;
    padding-bottom:.9rem;
    border-bottom:1px solid var(--line-dark);
  }

  .mwabonje-wrapper .overlay-group a {
    display:block;
    font-family:'Fraunces', serif;
    font-size:clamp(1.3rem, 2.2vw, 1.7rem);
    padding:.5rem 0;
    color:rgba(243,238,228,.82);
    transition:color .2s ease, transform .2s ease;
  }
  .mwabonje-wrapper .overlay-group a:hover {
    color:var(--paper);
    transform:translateX(6px);
  }

  .mwabonje-wrapper .overlay-foot {
    margin-top:2rem;
    padding-top:1.5rem;
    border-top:1px solid var(--line-dark);
    display:flex;
    justify-content:space-between;
    font-size:.85rem;
    color:rgba(243,238,228,.5);
    flex-wrap:wrap;
    gap:1rem;
  }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 860px) {
    .primary-nav { display:none; }
    .enquire-btn { display:none; }
    .mobile-menu-btn { display:block; }
    .mwabonje-grid { grid-template-columns:repeat(1, 1fr); }
    .mwabonje-card.c1, 
    .mwabonje-card.c2,
    .mwabonje-card.c3, 
    .mwabonje-card.c4, 
    .mwabonje-card.c5 { grid-column:span 1; min-height:340px; }
    .strip-grid { grid-template-columns:1fr; }
    .mwabonje-wrapper .overlay-grid { grid-template-columns:repeat(2,1fr); }
  }

  @media (max-width: 520px) {
    .mwabonje-wrapper .overlay-grid { grid-template-columns:1fr; }
    .mwabonje-wrapper .hero-foot { flex-direction:column; align-items:flex-start; }
  }

  @media (prefers-reduced-motion: reduce) {
    .mwabonje-wrapper { scroll-behavior:auto; }
    .mwabonje-wrapper .hero-eyebrow .dot { animation:none; }
    .mwabonje-wrapper * { transition:none !important; }
  }
`}</style>
      </Helmet>

<header className="mwabonje-header">
        <div className="mwabonje-container header-layout">
          <a href="#" className="brand-logo">
            <div className="m-circle serif">M</div>
            <span className="brand-text">MWABONJE</span>
          </a>
          <nav className="primary-nav">
            <a href="#">HOME</a>
            <div className="nav-dropdown">
              <a href="#work" className="active">PORTFOLIO</a>
              <div className="nav-dropdown-content">
                <a href="#" onClick={(e) => handleCategoryClick(e, 'Couples')}>COUPLES</a>
                <a href="#" onClick={(e) => handleCategoryClick(e, 'Portraits')}>PORTRAITS</a>
                <a href="#" onClick={(e) => handleCategoryClick(e, 'Wedding')}>WEDDING</a>
                <a href="#" onClick={(e) => handleCategoryClick(e, 'Events')}>EVENTS</a>
                <a href="#" onClick={(e) => handleCategoryClick(e, 'Airbnb')}>HOSPITALITY</a>
                <a href="#" onClick={(e) => handleCategoryClick(e, 'Places')}>PLACES & DETAILS</a>
              </div>
            </div>
            <a href="#films">FILMS</a>
            <a href="#about-me">ABOUT</a>
            <a href="#">BLOG</a>
            <a href="#">PRINTS</a>
          </nav>
          
          <div className="header-actions">
            <a href="https://mwabonjebooking.netlify.app/" className="enquire-btn">ENQUIRE</a>
            <div className="mobile-menu-btn" onClick={() => setIsMenuOpen(true)}>
              <div className="bars"><span></span><span></span><span></span></div>
            </div>
          </div>
        </div>
      </header>

      <section className="mwabonje-hero">
        <div 
          className="hero-bg"
          style={galleries.length > 0 && galleries[0].coverUrl ? {
            backgroundImage: `
              linear-gradient(180deg, rgba(10,14,12,0.4) 0%, rgba(10,14,12,0.8) 100%), 
              url(${getOptimizedImageUrl(galleries[0].coverUrl, 1920, 1080, 80)})
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : {}}
        ></div>
        <div className="hero-content mwabonje-container">
          <div className="hero-eyebrow">
            <span className="dot"></span>
            <span>Lamu · Shela · Mombasa</span>
          </div>
          <h1 className="serif hero-title">Salt, light<br/>&amp; <em>slow</em> hours</h1>
          <div className="hero-foot">
            <p>Photography and film on the Kenyan coast — hospitality, weddings, and the quiet architecture of the places in between.</p>
            <div className="scroll-cue">
              <div className="stem"></div>
              Recent work
            </div>
          </div>
        </div>
      </section>

      <section className="mwabonje-index" id="work">
        <div className="mwabonje-container">
          <div className="index-head">
            <h2 className="serif">
              {selectedCategory ? `${selectedCategory} places` : "Recent places"}
              {selectedCategory && (
                <span 
                  style={{ fontSize: '1rem', marginLeft: '1rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', color: 'rgba(14,19,16,0.6)' }}
                  onClick={() => setSearchParams({})}
                >
                  (Clear filter)
                </span>
              )}
            </h2>
            <p className="count">{filteredGalleries.length > 0 ? `${filteredGalleries.length} locations shot over the last season, from lantern-lit courtyards to open water.` : "Loading recent places..."}</p>
          </div>
          <div className="mwabonje-grid">
            {filteredGalleries.map((gallery, index) => {
               const classIndex = (index % 5) + 1;
               return (
                 <Link 
                   to={`/${generateSlug(gallery.client_name)}`}
                   key={gallery.id} 
                   className={`mwabonje-card c${classIndex}`}
                   style={{
                     backgroundImage: `linear-gradient(180deg, transparent 30%, rgba(10,14,12,.92) 100%), url(${getOptimizedImageUrl(gallery.coverUrl!, 800, 1000, 80)})`,
                     backgroundSize: 'cover',
                     backgroundPosition: 'center'
                   }}
                 >
                   <span 
                     className="tag"
                     onClick={(e) => handleCategoryClick(e, gallery.baseCategory || 'Photography')}
                     style={{ cursor: 'pointer' }}
                   >
                     {gallery.baseCategory || 'Photography'}
                   </span>
                   <div className="label">
                     <div className="place serif">{gallery.client_name.toLowerCase()}</div>
                     <div className="coords">2°16′S 40°54′E — Kenyan Coast</div>
                   </div>
                 </Link>
               );
            })}
          </div>
        </div>
      </section>

{aboutGallery && (
        <section className="mwabonje-about" id="about-me">
          <div className="mwabonje-container">
            <div className="about-me-grid">
              <div className="about-me-image">
                <img src={getOptimizedImageUrl(aboutGallery.coverUrl!, 1000, 1250, 80)} alt="Mwabonje" />
              </div>
              <div className="about-me-content">
                <h2 className="serif">
                  Capturing the<br/>
                  <em>Essence</em> of<br/>
                  the Moment.
                </h2>
                <div className="about-text">
                  {aboutGallery.title ? aboutGallery.title.split('\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  )) : (
                    <>
                      <p>I am an East African photographer specializing in hospitality, portraits, and documentary visual storytelling.</p>
                      <p>For me, photography is more than just clicking a button; it is about preserving fleeting moments, translating emotions into visuals, and crafting narratives that transcend time.</p>
                      <p>Available for travel worldwide. Let's create something beautiful together.</p>
                    </>
                  )}
                </div>
                <a href="https://mwabonjebooking.netlify.app/" className="about-me-btn">Book a Session</a>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mwabonje-strip" id="about">
        <div className="mwabonje-container strip-grid">
          <h3 className="serif">Studio work spanning couples, hospitality, and the coast itself.</h3>
          <div className="services">
            <a href="#" onClick={(e) => handleCategoryClick(e, 'Couples')}><span>Couples &amp; weddings</span><span className="n">01</span></a>
            <a href="#" onClick={(e) => handleCategoryClick(e, 'Airbnb')}><span>Hospitality &amp; hotels</span><span className="n">02</span></a>
            <a href="#films" id="films"><span>Film &amp; documentary</span><span className="n">03</span></a>
            <a href="#" onClick={(e) => handleCategoryClick(e, 'Events')}><span>Portraits &amp; events</span><span className="n">04</span></a>
            <a href="#" onClick={(e) => handleCategoryClick(e, 'Places')}><span>Places &amp; details</span><span className="n">05</span></a>
          </div>
        </div>
      </section>

      <footer className="mwabonje-footer" id="contact">
        <div className="mwabonje-container">
          <div className="footer-top">
            <span className="serif">Let's shoot<br/>something.</span>
            <div className="footer-links">
              <a href="https://www.instagram.com/mwabonje_/" target="_blank" rel="noopener noreferrer">Instagram</a>
              <a href="https://www.tiktok.com/@mwabonje_?is_from_webapp=1&sender_device=pc" target="_blank" rel="noopener noreferrer">TikTok</a>
              <a href="https://wa.me/254705268604" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Mwabonje Photography, All Rights Reserved</span>
            <span>Mombasa &amp; Lamu, Kenya</span>
          </div>
        </div>
      </footer>

      <div className={`mwabonje-overlay ${isMenuOpen ? 'open' : ''}`}>
        <div className="overlay-head">
          <span className="wordmark serif">Mwabonje</span>
          <div className="close-btn" onClick={() => setIsMenuOpen(false)}>
            <span>Close</span>
            <div className="bars"><span></span><span></span><span></span></div>
          </div>
        </div>
        <div className="overlay-grid">
          <div className="overlay-group">
            <div className="group-label">People</div>
            <a href="#" onClick={(e) => handleCategoryClick(e, 'Couples')}>Couples</a>
            <a href="#" onClick={(e) => handleCategoryClick(e, 'Portraits')}>Portraits</a>
            <a href="#" onClick={(e) => handleCategoryClick(e, 'Wedding')}>Wedding</a>
            <a href="#" onClick={(e) => handleCategoryClick(e, 'Events')}>Events</a>
          </div>
          <div className="overlay-group">
            <div className="group-label">Places</div>
            <a href="#" onClick={(e) => handleCategoryClick(e, 'Airbnb')}>Hospitality</a>
            <a href="#" onClick={(e) => handleCategoryClick(e, 'Places')}>Places &amp; details</a>
            <a href="#" onClick={(e) => handleCategoryClick(e, 'Portraits')}>Places &amp; portraits</a>
          </div>
          <div className="overlay-group">
            <div className="group-label">Studio</div>
            <a href="#" onClick={() => setIsMenuOpen(false)}>Films</a>
            <a href="#" onClick={() => setIsMenuOpen(false)}>About</a>
            <a href="https://mwabonjebooking.netlify.app/" onClick={() => setIsMenuOpen(false)}>Contact</a>
          </div>
        </div>
        <div className="overlay-foot">
          <span>Mombasa &amp; Lamu, Kenya</span>
          <span>hello@mwabonje.studio</span>
        </div>
      </div>
    </div>
  );
}
