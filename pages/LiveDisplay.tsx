import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Gallery, GalleryFile } from '../types';
import { getOptimizedImageUrl } from '../utils/formatters';
import { generateSlug } from '../utils/slug';
import QRCode from 'react-qr-code';
import { Loader2, QrCode, ShoppingCart, Search, Monitor, Star, ArrowLeft, User, Menu } from 'lucide-react';

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

                const { data: fData } = await supabase
                    .from('files')
                    .select('*')
                    .eq('gallery_id', galleryId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                
                if (fData) setCoverFile(fData);

            } catch (error) {
                console.error(error);
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
            <div className="min-h-screen bg-[#f36c21] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    if (!gallery) {
        return <div className="min-h-screen bg-[#f36c21] text-white flex items-center justify-center">Gallery not found.</div>;
    }

    const publicUrl = `${window.location.origin}/${generateSlug(gallery.client_name)}`;

    return (
        <div className="min-h-screen bg-[#f36c21] relative overflow-hidden flex flex-col md:flex-row items-center justify-center p-4 md:p-8 font-sans text-white">
            
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="triangles" width="200" height="200" patternUnits="userSpaceOnUse">
                            <path d="M100 0 L200 200 L0 200 Z" fill="none" stroke="white" strokeWidth="2" />
                            <path d="M0 0 L200 0 L100 200 Z" fill="none" stroke="white" strokeWidth="2" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#triangles)" />
                </svg>
            </div>

            {/* Decorative White Border (Top, Left, Bottom) */}
            <div className="hidden md:block absolute top-10 left-24 bottom-10 right-0 pointer-events-none z-0">
                <div className="absolute top-0 left-0 right-0 h-full border-t-[4px] border-l-[4px] border-b-[4px] border-white rounded-tl-[3rem] rounded-bl-[3rem]"></div>
            </div>

            {/* Main Content Container */}
            <div className="relative z-10 w-full max-w-5xl flex flex-col items-center md:items-start h-full py-12 md:pl-40">
                
                {/* Left Icons - Absolutely positioned on the border line */}
                <div className="hidden md:flex flex-col justify-center gap-8 absolute left-24 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10">
                    <div className="w-16 h-16 rounded-full border-[3px] border-white bg-[#f36c21] flex items-center justify-center text-white shadow-[0_0_0_10px_#f36c21]">
                        <QrCode size={32} strokeWidth={2.5} />
                    </div>
                    <div className="w-16 h-16 rounded-full border-[3px] border-white/30 bg-[#f36c21] flex items-center justify-center text-white/50 shadow-[0_0_0_10px_#f36c21]">
                        <ShoppingCart size={32} strokeWidth={1.5} />
                    </div>
                    <div className="w-16 h-16 rounded-full border-[3px] border-white/30 bg-[#f36c21] flex items-center justify-center text-white/50 shadow-[0_0_0_10px_#f36c21]">
                        <Search size={32} strokeWidth={1.5} />
                    </div>
                    <div className="w-16 h-16 rounded-full border-[3px] border-white/30 bg-[#f36c21] flex items-center justify-center text-white/50 shadow-[0_0_0_10px_#f36c21]">
                        <Monitor size={32} strokeWidth={1.5} />
                    </div>
                    <div className="w-16 h-16 rounded-full border-[3px] border-white/30 bg-[#f36c21] flex items-center justify-center text-white/50 shadow-[0_0_0_10px_#f36c21]">
                        <Star size={32} strokeWidth={1.5} />
                    </div>
                </div>

                {/* Text and Phone Container */}
                <div className="flex flex-col items-center md:items-start w-full gap-8 pl-0 md:pl-12">
                    
                    {/* Header Text */}
                    <div className="text-center md:text-left animate-fade-in-up w-full">
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-4" style={{ fontFamily: 'Georgia, serif', textShadow: '2px 2px 4px rgba(0,0,0,0.1)'}}>
                            {gallery.title || gallery.client_name}
                        </h1>
                        <p className="text-xl md:text-2xl text-white/90 font-light max-w-lg">
                            Scan to view and download photos instantly.
                        </p>
                    </div>

                    {/* Phone Mockup */}
                    <div className="flex justify-center md:justify-start w-full animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        <div className="w-full max-w-[340px] aspect-[9/19] bg-gray-900 rounded-[3rem] p-[12px] shadow-2xl relative">
                            {/* Screen */}
                            <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col relative">
                                {/* Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-gray-900 rounded-b-3xl z-20"></div>
                                
                                {/* App Header */}
                                <div className="w-full bg-[#f36c21] pt-10 pb-4 px-4 flex flex-col items-center justify-center text-white z-10 relative shadow-sm">
                                    <div className="text-sm font-semibold tracking-wider uppercase">
                                        {gallery.client_name}
                                    </div>
                                </div>

                                {/* Sub-header inside app */}
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 text-gray-700 bg-white text-xs font-semibold">
                                    <div className="flex items-center gap-2">
                                        <Menu size={16} />
                                        <span>Check In</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-500">
                                        <User size={14} />
                                        <span>Guest</span>
                                    </div>
                                </div>
                                
                                {/* App Content */}
                                <div className="flex-1 flex flex-col items-center bg-white overflow-y-auto pb-6">
                                    
                                    {/* Event Photo at top of content */}
                                    <div className="w-full h-44 bg-gray-100 relative mb-4">
                                        {coverFile ? (
                                            <img src={getOptimizedImageUrl(coverFile.file_url, 400, 400)} className="w-full h-full object-cover" alt="Event Cover" key={coverFile.id} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Photo Yet</div>
                                        )}
                                    </div>

                                    <h3 className="font-bold text-gray-900 text-lg mb-2 text-center px-4 leading-tight">Live Gallery Access</h3>
                                    <p className="text-xs text-gray-500 text-center px-6 mb-6">
                                        Scan the code below with your phone's camera for easy access!
                                    </p>
                                    
                                    <div className="text-sm font-bold text-gray-800 mb-2">{gallery.client_name}</div>
                                    
                                    {/* QR Code Container */}
                                    <div className="p-0">
                                        <QRCode value={publicUrl} size={150} level="H" />
                                    </div>

                                    <div className="mt-auto pt-6 pb-2 w-full px-8">
                                        <div className="w-full py-2.5 border border-gray-200 rounded-lg text-gray-600 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 cursor-pointer transition-colors">
                                            <ArrowLeft size={14} /> Back to Gallery
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
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
