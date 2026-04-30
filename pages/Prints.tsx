import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Gallery } from '../types';
import { getOptimizedImageUrl, rewriteUrlToR2 } from '../utils/formatters';

interface PrintItem {
    id: string;
    file_url: string;
    file_type: string;
    client_name: string;
    title: string;
    caption?: string;
}

export const Prints: React.FC = () => {
    const navigate = useNavigate();
    const [prints, setPrints] = useState<PrintItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrints = async () => {
            try {
                // Fetch public galleries with category 'Prints'
                const { data: galleriesData, error } = await supabase
                    .from('galleries')
                    .select('id, client_name, title')
                    .ilike('category', 'prints')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                let allPrints: PrintItem[] = [];

                if (galleriesData && galleriesData.length > 0) {
                    const galleryIds = galleriesData.map(g => g.id);
                    
                    const { data: files } = await supabase
                        .from('files')
                        .select('*')
                        .in('gallery_id', galleryIds)
                        .order('created_at', { ascending: false });
                        
                    if (files) {
                        const galleryNameMap = new Map(galleriesData.map(g => [g.id, g.client_name]));
                        const galleryTitleMap = new Map(galleriesData.map(g => [g.id, g.title]));
                        allPrints = files.map(f => ({
                            id: f.id,
                            file_url: f.file_url,
                            file_type: f.file_type,
                            client_name: galleryNameMap.get(f.gallery_id) || 'Print',
                            title: galleryTitleMap.get(f.gallery_id) || '',
                            caption: f.caption
                        }));
                    }
                }

                setPrints(allPrints);
            } catch (error) {
                console.error("Error loading prints:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPrints();
    }, []);

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white flex flex-col">
            <header className="w-full flex items-center justify-between p-4 md:p-8 bg-white border-b border-slate-100 sticky top-0 z-50 transition-all duration-300">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors text-xs tracking-widest font-bold"
                >
                    <ArrowLeft className="w-4 h-4" />
                    BACK
                </button>
                <div className="font-serif tracking-widest uppercase text-xl font-bold flex-1 text-center pr-16 md:pr-[70px]">
                    PRINTS
                </div>
            </header>

            <main className="flex-1 max-w-[1400px] mx-auto w-full p-6 md:p-12">
                <div className="flex flex-col items-center justify-center text-center mb-12 md:mb-16">
                    <h1 className="text-2xl md:text-4xl font-serif tracking-widest uppercase text-slate-800 mb-4 font-bold">
                        Fine Art Prints
                    </h1>
                    <p className="max-w-xl text-slate-500 leading-relaxed text-sm md:text-base">
                        A curated collection of archival quality prints from my portfolio collections. 
                        Each piece is printed on museum-grade cotton rag paper to ensure longevity and exceptional color reproduction.
                    </p>
                </div>

                {loading ? (
                    <div className="h-[40vh] flex items-center justify-center">
                        <div className="animate-pulse tracking-[0.2em] uppercase text-xs text-slate-400 font-medium">Loading Prints...</div>
                    </div>
                ) : prints.length > 0 ? (
                    <div className="columns-1 sm:columns-2 gap-8 md:gap-16 pt-4 md:pt-8 w-full">
                        {prints.map((print) => (
                            <div 
                                key={print.id}
                                className="block relative p-4 break-inside-avoid mb-8"
                            >
                                <div className="bg-white border-[8px] md:border-[16px] border-[#151515] relative w-full shadow-2xl flex items-center justify-center p-[4%] md:p-[6%]">
                                    <div className="w-full relative shadow-[inset_0_0_1px_rgba(0,0,0,0.2)]">
                                        {print.file_type === 'video' ? (
                                            <video 
                                                src={rewriteUrlToR2(print.file_url)} 
                                                className="w-full h-auto block"
                                                muted playsInline loop autoPlay preload="metadata"
                                            />
                                        ) : print.file_url ? (
                                            <img 
                                                src={getOptimizedImageUrl(print.file_url, 1200, undefined, 85)} 
                                                alt={print.client_name}
                                                className="w-full h-auto block"
                                                loading="lazy"
                                            />
                                        ) : null}
                                    </div>
                                </div>
                                {print.caption && (
                                    <div className="mt-6 md:mt-8 text-left">
                                        <p className="text-sm md:text-base text-slate-600 leading-relaxed font-light">
                                            {print.caption}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-[20vh] flex flex-col items-center justify-center text-center mt-12">
                        <div className="bg-slate-50 border border-slate-100 px-8 py-4 rounded-sm">
                            <p className="text-slate-400 tracking-[0.2em] text-[10px] uppercase font-bold">No prints available yet</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
