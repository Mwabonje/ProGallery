import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Gallery } from '../types';
import { getOptimizedImageUrl, rewriteUrlToR2 } from '../utils/formatters';
import { generateSlug } from '../utils/slug';
import { Instagram, Globe, Mail, Menu, X, Youtube, Video, MessageCircle } from 'lucide-react';

// --- Analytics Tracking ---
const trackedImpressions = new Set<string>();
let impressionTimeout: any = null;
const pendingImpressions = new Set<string>();

const flushImpressions = () => {
    if (pendingImpressions.size === 0) return;
    const ids = Array.from(pendingImpressions);
    pendingImpressions.clear();
    
    const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
    Promise.all(ids.map(id => fetch(isNetlify ? '/.netlify/functions/sys-interaction' : '/api/sys/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryId: id, event: 'view' }),
        keepalive: true
    }))).catch(console.warn);
};

const trackImpression = (galleryId: string) => {
    if (trackedImpressions.has(galleryId)) return;
    trackedImpressions.add(galleryId);
    pendingImpressions.add(galleryId);
    if (!impressionTimeout) {
        impressionTimeout = setTimeout(() => {
            flushImpressions();
            impressionTimeout = null;
        }, 1500); 
    }
};

const trackClick = (galleryId: string) => {
    const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
    fetch(isNetlify ? '/.netlify/functions/sys-interaction' : '/api/sys/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ galleryId, event: 'click' }),
        keepalive: true
    }).catch(console.warn);
};

interface PortfolioGallery extends Gallery {
  coverUrl?: string | null;
  coverType?: string | null;
  itemCount?: number;
}

const GalleryCard = ({ gallery, index, isFilmsCategory }: { gallery: PortfolioGallery, index: number, isFilmsCategory: boolean }) => {
    const linkRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                trackImpression(gallery.id);
                observer.disconnect();
            }
        }, { threshold: 0.1 });
        if (linkRef.current) observer.observe(linkRef.current);
        return () => observer.disconnect();
    }, [gallery.id]);

    return (
        <Link 
            ref={linkRef}
            to={`/${generateSlug(gallery.client_name)}`} 
            key={gallery.id}
            onClick={() => trackClick(gallery.id)}
            className={`group block relative ${isFilmsCategory ? 'flex-none h-full snap-center aspect-[4/5]' : 'aspect-[4/5]'}`}
        >
            <div className="bg-slate-50 overflow-hidden relative w-full h-full">
                {gallery.coverType === 'video' ? (
                    <video 
                        src={rewriteUrlToR2(gallery.coverUrl!)} 
                        className="w-full h-full object-cover block transform transition-transform duration-[1.5s] group-hover:scale-[1.02]"
                        muted playsInline loop preload="metadata"
                        onMouseOver={(e) => (e.target as HTMLVideoElement).play().catch(()=> {})}
                        onMouseOut={(e) => {
                            const v = e.target as HTMLVideoElement;
                            v.pause();
                            v.currentTime = 0;
                        }}
                    />
                ) : (
                    <img 
                        src={getOptimizedImageUrl(gallery.coverUrl!, 800, 1000, 70)}
                        alt={gallery.client_name}
                        className="w-full h-full object-cover block transform transition-transform duration-[1.5s] group-hover:scale-[1.02]"
                        loading={index < 4 ? "eager" : "lazy"}
                    />
                )}
                
                {/* Title Overlay */}
                <div className="absolute inset-x-0 bottom-10 md:bottom-16 pointer-events-none z-10 transition-transform duration-700 md:group-hover:-translate-y-3 flex justify-center">
                    <h3 className="text-base md:text-xl font-bold tracking-[0.2em] uppercase text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-center px-4">
                        {gallery.client_name}
                    </h3>
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/0 group-hover:from-black/60 transition-colors duration-700 pointer-events-none" />
            </div>
        </Link>
    );
};

export const Portfolio: React.FC = () => {
    const { photographerId } = useParams<{ photographerId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const [galleries, setGalleries] = useState<PortfolioGallery[]>([]);
    const [loading, setLoading] = useState(true);
    const activeCategory = searchParams.get('category') || 'All';
    const setActiveCategory = (cat: string) => {
        if (cat === 'All') {
            searchParams.delete('category');
            setSearchParams(searchParams);
        } else {
            setSearchParams({ category: cat });
        }
    };
    const [photographerName, setPhotographerName] = useState<string>("My Portfolio");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const horizontalRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const fetchPortfolio = async () => {
            try {
                // Fetch public galleries (if photographerId is provided, filter by it, otherwise fetch all)
                let query = supabase
                    .from('galleries')
                    .select('*')
                    .order('created_at', { ascending: false });
                    
                if (photographerId) {
                    query = query.eq('photographer_id', photographerId);
                }
                
                const { data: galleriesData, error } = await query;

                if (error) throw error;

                // Configure photographer name placeholder
                if (galleriesData && galleriesData.length > 0) {
                     setPhotographerName("Mwabonje"); // Updated to match inspiration style
                }

                // Filter out non-portfolio items (client deliveries without a category)
                const portfolioItems = (galleriesData || []).filter(g => g.category && g.category.trim() !== '');

                const enrichedGalleries = await Promise.all(
                    portfolioItems.map(async (gallery) => {
                        // The cover is defined as the most recently updated file (by created_at)
                        const { data: files } = await supabase
                            .from('files')
                            .select('file_url, file_type')
                            .eq('gallery_id', gallery.id)
                            .order('created_at', { ascending: false })
                            .limit(1);

                        return {
                            ...gallery,
                            coverUrl: files && files.length > 0 ? files[0].file_url : null,
                            coverType: files && files.length > 0 ? files[0].file_type : null,
                        };
                    })
                );

                // Filter out empty galleries for the public portfolio
                setGalleries(enrichedGalleries.filter(g => g.coverUrl));
            } catch (error) {
                console.error("Error loading portfolio:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPortfolio();
    }, [photographerId]);

    const isFilmsCategory = activeCategory.toLowerCase() === 'films' || activeCategory.toLowerCase() === 'video';

    useEffect(() => {
        const el = horizontalRef.current;
        if (!el || !isFilmsCategory) return;
        const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.preventDefault();
                const isTrackpad = Math.abs(e.deltaY) < 40;
                if (isTrackpad) {
                    el.scrollLeft += e.deltaY;
                } else {
                    el.scrollBy({ left: Math.sign(e.deltaY) * 300, behavior: 'smooth' });
                }
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [galleries, activeCategory, isFilmsCategory]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center">
                <div className="animate-pulse tracking-[0.2em] uppercase text-xs text-slate-400 font-medium">Loading Portfolio...</div>
            </div>
        );
    }

    // Extract unique categories (defaulting heavily to un-categorized if not set)
    const categories = ['All', ...Array.from(new Set(galleries.map(g => g.category).filter(c => Boolean(c) && c?.toLowerCase() !== 'prints' && c?.toLowerCase() !== 'about')))];
    
    const homeKeywords = ["rafiki", "lamu", "kilele"];
    
    const filteredGalleries = activeCategory === 'All' 
        ? galleries.filter(g => homeKeywords.some(keyword => g.client_name.toLowerCase().includes(keyword)))
        : galleries.filter(g => g.category === activeCategory);

    return (
        <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
            
            {/* Top Navigation Header */}
            <header className="w-full pt-8 pb-2 md:pt-16 md:pb-4 px-4 md:px-8 flex flex-col items-center relative">
                
                <div className="flex w-full justify-between items-center md:justify-center relative">
                    {/* Spacer for symmetry on mobile */}
                    <div className="w-10 md:hidden" /> 
                    
                    <h1 className="text-2xl md:text-3xl lg:text-[44px] uppercase tracking-wider font-bold md:mb-10 text-slate-800 text-center" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                        {photographerName}
                    </h1>
                    
                    {/* Mobile Hamburger Button */}
                    <button 
                        className="md:hidden text-slate-800 hover:text-black z-30 p-2 -mr-2"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        <Menu className="w-8 h-8" strokeWidth={1} />
                    </button>
                </div>

                {/* Desktop Navigation Links */}
                <nav className="hidden md:flex flex-wrap justify-center items-center gap-x-4 gap-y-2 lg:gap-x-8 xl:gap-x-10 lg:gap-y-4 text-[10px] xl:text-[11px] font-semibold tracking-[0.15em] uppercase text-slate-500 w-full max-w-7xl mx-auto px-4">
                    {categories.length > 0 && categories.map((cat) => {
                        const isAll = cat === 'All';
                        const catGalleries = galleries.filter(g => g.category === cat);
                        const hasDropdown = !isAll && catGalleries.length > 0;
                        
                        const displayCatName = isAll ? 'HOME' : (String(cat).toLowerCase() === 'airbnb' ? 'HOSPITALITY' : String(cat).toUpperCase());

                        return (
                            <div key={cat as string} className="relative group">
                                <button
                                    onClick={() => setActiveCategory(cat as string)}
                                    className={`py-2 lg:py-4 flex items-center hover:text-slate-900 transition-colors duration-300 ${
                                        activeCategory === cat 
                                        ? 'text-slate-900' 
                                        : ''
                                    }`}
                                >
                                    {displayCatName}
                                    {hasDropdown && <span>+</span>}
                                </button>

                                {hasDropdown && (
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                        <div className="bg-slate-100 px-8 py-6 shadow-xl flex flex-col gap-4 min-w-[240px] items-start">
                                            {catGalleries.map(g => (
                                                <Link 
                                                    key={g.id} 
                                                    to={`/${generateSlug(g.client_name)}`}
                                                    className="text-[10px] md:text-[11px] font-semibold tracking-[0.15em] uppercase text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap text-left block w-full"
                                                >
                                                    {g.client_name.toUpperCase()}
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <button onClick={() => setActiveCategory('ABOUT')} className={`py-2 lg:py-4 hover:text-slate-900 transition-colors duration-300 ${activeCategory === 'ABOUT' ? 'text-slate-900' : 'text-slate-500'}`}>ABOUT</button>
                    <a href="https://mwabonjebooking.netlify.app/" target="_blank" rel="noopener noreferrer" className="py-2 lg:py-4 hover:text-slate-900 transition-colors duration-300">CONTACT</a>
                    <Link to="/prints" className="py-2 lg:py-4 hover:text-slate-900 transition-colors duration-300">PRINTS</Link>
                </nav>
            </header>

            {/* Mobile Sidebar Navigation */}
            <>
                <div 
                    className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                />
                <aside 
                    className={`fixed inset-y-0 left-0 w-64 bg-white z-50 md:hidden flex flex-col p-8 transform transition-transform duration-300 ease-in-out shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <button 
                        className="self-end text-slate-400 hover:text-slate-900 -mr-2 p-2 mb-4"
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-label="Close menu"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    
                    <nav className="flex flex-col gap-6 text-[11px] font-semibold tracking-[0.15em] uppercase text-slate-500 mt-4">
                        {categories.length > 0 && categories.map((cat) => {
                            const isAll = cat === 'All';
                            const catGalleries = galleries.filter(g => g.category === cat);
                            const hasDropdown = !isAll && catGalleries.length > 0;
                            const displayCatName = isAll ? 'HOME' : (cat.toLowerCase() === 'airbnb' ? 'HOSPITALITY' : (cat as string).toUpperCase());

                            return (
                                <button
                                    key={cat as string}
                                    onClick={() => {
                                        setActiveCategory(cat as string);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`flex items-center text-left hover:text-slate-900 transition-colors duration-300 ${
                                        activeCategory === cat 
                                        ? 'text-slate-900' 
                                        : ''
                                    }`}
                                >
                                    {displayCatName}
                                    {hasDropdown && <span>+</span>}
                                </button>
                            );
                        })}
                        <div className="h-px w-8 bg-slate-100 my-2" />
                        <button onClick={() => { setActiveCategory('ABOUT'); setIsMobileMenuOpen(false); }} className={`text-left hover:text-slate-900 transition-colors duration-300 font-semibold tracking-[0.15em] uppercase text-[11px] ${activeCategory === 'ABOUT' ? 'text-slate-900' : 'text-slate-500'}`}>ABOUT</button>
                        <a href="https://mwabonjebooking.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 transition-colors duration-300">CONTACT</a>
                        <Link to="/prints" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-slate-900 transition-colors duration-300">PRINTS</Link>
                    </nav>

                    <div className="mt-auto pt-8">
                        <div className="flex gap-4">
                            <a href="#" onClick={(e) => e.preventDefault()} className="text-slate-400 hover:text-slate-900 transition-colors cursor-default"><Instagram className="w-4 h-4" /></a>
                            <a href="#" onClick={(e) => e.preventDefault()} className="text-slate-400 hover:text-slate-900 transition-colors cursor-default"><Globe className="w-4 h-4" /></a>
                            <a href="#" onClick={(e) => e.preventDefault()} className="text-slate-400 hover:text-slate-900 transition-colors cursor-default"><Mail className="w-4 h-4" /></a>
                        </div>
                    </div>
                </aside>
            </>

            {/* Main Content Gallery */}
            {activeCategory === 'ABOUT' ? (() => {
                const aboutData = galleries.find(g => g.category?.toUpperCase() === 'ABOUT');
                const defaultImage = "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?q=80&w=2940&auto=format&fit=crop";
                const displayImage = aboutData?.coverUrl || defaultImage;
                const rawText = aboutData?.title || "I am an East African photographer specializing in hospitality, portraits, and documentary visual storytelling.\n\nFor me, photography is more than just clicking a button; it is about preserving fleeting moments, translating emotions into visuals, and crafting narratives that transcend time.\n\nAvailable for travel worldwide. Let's create something beautiful together.";
                
                return (
                <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-4 md:py-8 grid md:grid-cols-2 gap-8 md:gap-16 items-center animate-in fade-in duration-1000">
                    <div className="aspect-square md:aspect-[4/5] relative bg-slate-100 overflow-hidden">
                        <img 
                            src={displayImage} 
                            alt="Photographer Portrait" 
                            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                        />
                    </div>
                    <div className="flex flex-col gap-6 md:gap-8 justify-center text-center md:text-left">
                        <h2 className="text-3xl lg:text-5xl font-bold tracking-wider text-slate-900 md:leading-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                            Capturing the<br className="hidden md:block" /> Essence of the<br className="hidden md:block" /> Moment.
                        </h2>
                        <div className="w-12 h-px bg-slate-900 mx-auto md:mx-0"></div>
                        <div className="text-slate-600 leading-relaxed text-sm md:text-base font-light">
                            {rawText.split('\n').map((paragraph, index) => (
                                <p key={index} className="pb-4 whitespace-pre-wrap">{paragraph}</p>
                            ))}
                        </div>
                    </div>
                </main>
                );
            })() : (
            <main className={
                isFilmsCategory 
                ? "w-full overflow-hidden" 
                : "max-w-[1400px] mx-auto p-1 md:p-2 overflow-y-auto w-full"
            }>
                <div 
                    ref={isFilmsCategory ? horizontalRef : undefined}
                    className={
                        isFilmsCategory 
                        ? `flex overflow-x-auto snap-x snap-mandatory md:snap-proximity gap-2 md:gap-4 pb-8 pt-4 sm:pt-8 w-full items-center h-[calc(100vh-280px)] min-h-[500px] px-4 md:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${filteredGalleries.length === 1 ? 'justify-center' : ''}`
                        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 md:gap-2"
                    }
                >
                    {filteredGalleries.map((gallery, index) => (
                        <GalleryCard 
                            key={gallery.id} 
                            gallery={gallery} 
                            index={index} 
                            isFilmsCategory={isFilmsCategory} 
                        />
                    ))}
                </div>

                {filteredGalleries.length === 0 && !loading && (
                    <div className="h-full flex items-center justify-center p-32">
                        <p className="text-slate-400 tracking-[0.2em] text-xs uppercase font-medium">No collections available.</p>
                    </div>
                )}
            </main>
            )}
            
            {/* Footer */}
            <footer className="w-full py-6 md:py-8 flex flex-col items-center justify-center gap-2 md:gap-3 border-t border-slate-100 mt-auto text-[#0a192f]">
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 items-center text-[10px] sm:text-xs font-bold tracking-widest px-4">
                    <a href="https://www.instagram.com/mwabonje_/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 sm:gap-2 hover:opacity-70 transition-opacity">
                        <Instagram className="w-3 h-3 sm:w-4 sm:h-4" /> INSTAGRAM
                    </a>
                    <a href="https://www.tiktok.com/@mwabonje_?is_from_webapp=1&sender_device=pc" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 sm:gap-2 hover:opacity-70 transition-opacity">
                        <Video className="w-3 h-3 sm:w-4 sm:h-4" /> TIK TOK
                    </a>
                    <a href="https://wa.me/254705268604" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 sm:gap-2 hover:opacity-70 transition-opacity">
                        <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" /> WHATSAPP
                    </a>
                </div>
                <p className="text-xs sm:text-sm font-normal text-slate-400 text-center px-4">
                    © 2026 Mwabonje Photography, All Rights Reserved
                </p>
            </footer>
        </div>
    );
};
