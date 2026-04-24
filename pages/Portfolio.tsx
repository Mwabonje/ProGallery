import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Gallery } from '../types';
import { getOptimizedImageUrl, rewriteUrlToR2 } from '../utils/formatters';
import { Instagram, Globe, Mail } from 'lucide-react';

interface PortfolioGallery extends Gallery {
  coverUrl?: string | null;
  coverType?: string | null;
  itemCount?: number;
}

export const Portfolio: React.FC = () => {
    const { photographerId } = useParams<{ photographerId: string }>();
    const [galleries, setGalleries] = useState<PortfolioGallery[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('All');
    const [photographerName, setPhotographerName] = useState<string>("My Portfolio");

    useEffect(() => {
        const fetchPortfolio = async () => {
            if (!photographerId) return;
            try {
                // Fetch public galleries for this photographer
                const { data: galleriesData, error } = await supabase
                    .from('galleries')
                    .select('*')
                    .eq('photographer_id', photographerId)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Configure photographer name placeholder
                if (galleriesData && galleriesData.length > 0) {
                     setPhotographerName("Mwabonje"); // Updated to match inspiration style
                }

                // Filter out non-portfolio items (client deliveries without a category)
                const portfolioItems = (galleriesData || []).filter(g => g.category && g.category.trim() !== '');

                const enrichedGalleries = await Promise.all(
                    portfolioItems.map(async (gallery) => {
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

    if (loading) {
        return (
            <div className="min-h-screen bg-white text-slate-900 flex items-center justify-center">
                <div className="animate-pulse tracking-[0.2em] uppercase text-xs text-slate-400 font-medium">Loading Portfolio...</div>
            </div>
        );
    }

    // Extract unique categories (defaulting heavily to un-categorized if not set)
    const categories = ['All', ...Array.from(new Set(galleries.map(g => g.category).filter(Boolean)))];
    
    const filteredGalleries = activeCategory === 'All' 
        ? galleries 
        : galleries.filter(g => g.category === activeCategory);

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
            
            {/* Sidebar / Left Column */}
            <aside className="w-full lg:w-72 xl:w-80 lg:shrink-0 lg:h-screen lg:sticky top-0 p-8 md:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-100 bg-white z-20">
                <div>
                   <h1 className="text-3xl lg:text-[40px] uppercase tracking-wider font-bold mb-16 leading-[1.1] drop-shadow-sm" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                       {photographerName.split(' ').map((word, i) => (
                           <React.Fragment key={i}>
                               {word}<br aria-hidden="true"/>
                           </React.Fragment>
                       ))}
                   </h1>

                   {/* Navigation */}
                   <nav className="flex flex-col gap-5 text-[11px] md:text-xs font-semibold tracking-[0.15em] uppercase">
                       {categories.length > 1 && categories.map((cat) => (
                           <button
                               key={cat}
                               onClick={() => setActiveCategory(cat as string)}
                               className={`text-left hover:text-slate-900 transition-colors duration-300 w-fit ${
                                   activeCategory === cat 
                                   ? 'text-slate-900' 
                                   : 'text-slate-400'
                               }`}
                           >
                               {cat}
                           </button>
                       ))}
                       <div className="h-px w-8 bg-slate-200 my-2" />
                       <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors duration-300 w-fit">About</a>
                       <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors duration-300 w-fit">Contact</a>
                   </nav>
                </div>

                <div className="hidden lg:block space-y-6 pt-12">
                    <p className="text-[9px] text-slate-400 tracking-[0.2em] uppercase">
                        © All rights reserved
                    </p>
                    <div className="flex gap-4">
                        <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><Instagram className="w-4 h-4" /></a>
                        <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><Globe className="w-4 h-4" /></a>
                        <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><Mail className="w-4 h-4" /></a>
                    </div>
                </div>
            </aside>

            {/* Main Content Gallery */}
            <main className="flex-1 p-0 md:p-8 overflow-y-auto">
                <div className="columns-1 md:columns-2 xl:columns-3 gap-4 md:gap-8 lg:gap-12">
                    {filteredGalleries.map((gallery, index) => (
                        <Link 
                            to={`/g/${gallery.id}`} 
                            key={gallery.id}
                            className="group block break-inside-avoid relative mb-4 md:mb-8 lg:mb-12"
                        >
                            <div className="bg-slate-50 overflow-hidden relative border border-slate-100">
                                {gallery.coverType === 'video' ? (
                                    <video 
                                        src={rewriteUrlToR2(gallery.coverUrl!)} 
                                        className="w-full h-auto transform transition-transform duration-[1.5s] group-hover:scale-[1.02]"
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
                                        className="w-full h-auto transform transition-transform duration-[1.5s] group-hover:scale-[1.02]"
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
                    ))}
                </div>

                {filteredGalleries.length === 0 && !loading && (
                    <div className="h-full flex items-center justify-center p-32">
                        <p className="text-slate-400 tracking-[0.2em] text-xs uppercase font-medium">No collections available.</p>
                    </div>
                )}
            </main>
        </div>
    );
};
