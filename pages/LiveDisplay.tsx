import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Gallery, GalleryFile } from '../types';
import { getOptimizedImageUrl } from '../utils/formatters';
import { generateSlug } from '../utils/slug';
import QRCode from 'react-qr-code';
import { Loader2, Camera } from 'lucide-react';

export const LiveDisplay: React.FC = () => {
    const { galleryId } = useParams<{ galleryId: string }>();
    const [gallery, setGallery] = useState<Gallery | null>(null);
    const [coverFile, setCoverFile] = useState<GalleryFile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGallery = async () => {
            if (!galleryId) return;
            try {
                const { data: gData, error: gError } = await supabase
                    .from('galleries')
                    .select('*')
                    .eq('id', galleryId)
                    .single();
                
                if (gError) throw gError;
                setGallery(gData);

                // Fetch latest photo
                const { data: fData } = await supabase
                    .from('files')
                    .select('*')
                    .eq('gallery_id', galleryId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                
                if (fData) {
                    setCoverFile(fData);
                }
            } catch (err) {
                console.error("Error fetching gallery:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchGallery();

        const interval = setInterval(async () => {
            if (!galleryId) return;
            const { data: fData } = await supabase
                .from('files')
                .select('*')
                .eq('gallery_id', galleryId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (fData) setCoverFile(fData);
        }, 15000);

        return () => clearInterval(interval);
    }, [galleryId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#ea3c24] animate-spin" />
            </div>
        );
    }

    if (!gallery) {
        return <div className="min-h-screen bg-stone-900 text-white flex items-center justify-center">Gallery not found.</div>;
    }

    const publicUrl = `${window.location.origin}/${generateSlug(gallery.client_name)}`;

    return (
        <div className="fixed inset-0 bg-stone-900 overflow-hidden flex items-center justify-center p-4 md:p-6 lg:p-8 font-sans z-50">
            {/* The Outer Frame */}
            <div className="relative w-full h-full max-w-7xl border-2 border-white/90 rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden flex flex-col shadow-2xl bg-black">
                
                {/* Background Image */}
                <div className="absolute inset-0 bg-stone-900">
                    {coverFile ? (
                        <img 
                            src={getOptimizedImageUrl(coverFile.file_url, 1920, 1080)} 
                            alt="Event Cover"
                            className="w-full h-full object-cover animate-fade-in-slow"
                            key={coverFile.id}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-16 h-16 text-white/20" />
                        </div>
                    )}
                    {/* Dark gradient overlay at the top for better text visibility */}
                    <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"></div>
                </div>

                {/* Top Left Element */}
                <div className="absolute top-8 left-8 md:top-10 md:left-12 z-20">
                    <span className="text-white font-medium tracking-wide text-sm md:text-base drop-shadow-md">
                        #livegallery
                    </span>
                </div>

                {/* Top Right Element */}
                <div className="absolute top-8 right-8 md:top-10 md:right-12 z-20">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-sm">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                        </div>
                        <span className="text-white font-bold text-xl drop-shadow-md hidden md:block">Mwabonje</span>
                    </div>
                </div>

                {/* Bottom Red Area */}
                <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col pointer-events-none">
                    {/* Wavy top part */}
                    <div className="w-full relative h-[60px] md:h-[100px] lg:h-[140px]">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 200" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full -mb-[1px]">
                            <path fill="#ea3c24" d="M0,200 L0,100 L520,100 C580,100 620,180 720,180 C820,180 860,100 920,100 L1440,100 L1440,200 Z"></path>
                        </svg>
                    </div>
                    
                    {/* Solid bottom part */}
                    <div className="bg-[#ea3c24] w-full px-8 md:px-16 lg:px-24 pb-8 md:pb-12 pt-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pointer-events-auto">
                        
                        {/* Text Section */}
                        <div className="flex-1 flex flex-col h-full justify-between">
                            <div className="animate-fade-in-up">
                                <h1 className="text-4xl md:text-5xl lg:text-7xl font-semibold text-white leading-tight mb-2 md:mb-4 max-w-2xl tracking-tight">
                                    {gallery.title || gallery.client_name}
                                </h1>
                                <p className="text-lg md:text-2xl text-white/90 font-light max-w-md">
                                    Scan to view and download photos instantly.
                                </p>
                            </div>
                            
                            {/* Author / Footer info */}
                            <div className="mt-8 md:mt-16 flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                <div className="w-12 h-12 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center overflow-hidden">
                                    <img src="/favicon.svg" alt="Logo" className="w-6 h-6 object-contain filter brightness-0 invert" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                    {/* Fallback icon if no favicon */}
                                    <Camera className="w-5 h-5 text-white absolute -z-10" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white font-semibold tracking-wide">Mwabonje Gallery</span>
                                    <span className="text-white/70 text-sm">Professional Photography</span>
                                </div>
                            </div>
                        </div>

                        {/* QR Code Section */}
                        <div className="w-full md:w-auto flex flex-col items-center md:items-end animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <div className="flex flex-col items-center md:items-end gap-4">
                                <div className="hidden md:flex flex-col gap-1 mb-2 text-white/90 font-medium text-lg text-right">
                                    <p className="flex items-center gap-2 justify-end"><span className="text-white/50">&gt;&gt;</span> access gallery.</p>
                                    <p className="flex items-center gap-2 justify-end"><span className="text-white/50">&gt;&gt;</span> download photos.</p>
                                </div>
                                
                                <div className="bg-white p-4 rounded-[2rem] shadow-2xl hover:scale-105 transition-transform duration-500 relative group">
                                    <QRCode value={publicUrl} size={150} level="H" />
                                    <div className="absolute inset-0 border-4 border-[#ea3c24]/10 rounded-[2rem] pointer-events-none"></div>
                                </div>
                                
                                <div className="flex items-center gap-2 bg-[#d1321d] px-5 py-2.5 rounded-full shadow-inner mt-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></div>
                                    <span className="text-white font-medium text-sm tracking-wide">Live Updating</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fade-in-slow {
                    from { opacity: 0; transform: scale(1.02); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-slow {
                    animation: fade-in-slow 1.5s ease-out forwards;
                }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out forwards;
                    opacity: 0;
                }
            `}} />
        </div>
    );
};
