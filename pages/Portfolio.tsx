import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Gallery } from '../types';
import { getOptimizedImageUrl } from '../utils/formatters';
import { Camera, Instagram, Globe, Mail } from 'lucide-react';

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
    const [photographerName, setPhotographerName] = useState<string>("Photographer");

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

                // We attempt to get the photographer's email/name if they have a public profile, 
                // but for now we'll just extract from the first gallery or keep generic
                if (galleriesData && galleriesData.length > 0) {
                     setPhotographerName("My Portfolio"); // Placeholder, could be customized later
                }

                const enrichedGalleries = await Promise.all(
                    (galleriesData || []).map(async (gallery) => {
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
            <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
                <div className="animate-pulse tracking-widest uppercase text-sm text-white/50 font-light">Loading Portfolio...</div>
            </div>
        );
    }

    // Extract unique categories (defaulting heavily to un-categorized if not set)
    const categories = ['All', ...Array.from(new Set(galleries.map(g => g.category).filter(Boolean)))];
    
    const filteredGalleries = activeCategory === 'All' 
        ? galleries 
        : galleries.filter(g => g.category === activeCategory);

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-rose-500 selection:text-white">
            {/* Header */}
            <header className="p-8 md:p-12 flex justify-center md:justify-between items-center border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-white/70" />
                    <span className="font-medium tracking-[0.2em] uppercase text-sm">{photographerName}</span>
                </div>
                <div className="hidden md:flex gap-6 text-white/50">
                    <a href="#" className="hover:text-white transition-colors"><Instagram className="w-4 h-4" /></a>
                    <a href="#" className="hover:text-white transition-colors"><Globe className="w-4 h-4" /></a>
                    <a href="#" className="hover:text-white transition-colors"><Mail className="w-4 h-4" /></a>
                </div>
            </header>

            <main className="px-8 py-16 md:px-12 md:py-24 max-w-[1600px] mx-auto">
                
                {/* Hero Typographic Section */}
                <div className="mb-24 md:w-3/4">
                    <h1 className="text-5xl md:text-8xl font-light tracking-tighter leading-[0.9] mb-8">
                        Selected <br/> <span className="italic font-serif text-white/60">Works.</span>
                    </h1>
                    <p className="text-white/60 text-lg md:text-xl font-light max-w-xl leading-relaxed">
                        A curated collection of recent commissions, visual stories, and fine art documentation.
                    </p>
                </div>

                {/* Categories Navigation */}
                {categories.length > 1 && (
                    <nav className="flex flex-wrap gap-4 mb-16">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat as string)}
                                className={`px-6 py-2 rounded-full text-xs tracking-widest uppercase transition-all duration-300 ${
                                    activeCategory === cat 
                                    ? 'bg-white text-black font-semibold' 
                                    : 'bg-transparent border border-white/20 text-white/70 hover:border-white/50 hover:text-white'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </nav>
                )}

                {/* Masonry / Grid Portfolio */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
                    {filteredGalleries.map((gallery, index) => (
                        <Link 
                            to={`/g/${gallery.id}`} 
                            key={gallery.id}
                            className="group block"
                        >
                            <div className="relative aspect-[3/4] md:aspect-[4/5] bg-white/5 rounded-sm overflow-hidden mb-6">
                                {gallery.coverType === 'video' ? (
                                    <video 
                                        src={gallery.coverUrl!} 
                                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                        muted
                                        playsInline
                                        loop
                                        preload="metadata"
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
                                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                        loading={index < 4 ? "eager" : "lazy"}
                                    />
                                )}
                                
                                {/* Overlay gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </div>

                            {/* Meta Labels */}
                            <div className="flex flex-col gap-2">
                                <h3 className="text-xl md:text-2xl font-light tracking-tight">{gallery.client_name}</h3>
                                <div className="flex justify-between items-center text-xs tracking-widest uppercase text-white/50">
                                    <span>{gallery.category || 'Commission'}</span>
                                    <span>{new Date(gallery.created_at).getFullYear()}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {filteredGalleries.length === 0 && (
                    <div className="text-center py-32 text-white/40 font-light tracking-widest uppercase text-sm">
                        No galleries found in this collection.
                    </div>
                )}
            </main>
        </div>
    );
};
