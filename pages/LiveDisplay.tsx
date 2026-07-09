import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Gallery, GalleryFile } from '../types';
import { getOptimizedImageUrl } from '../utils/formatters';
import { generateSlug } from '../utils/slug';
import QRCode from 'react-qr-code';
import { Loader2 } from 'lucide-react';

export const LiveDisplay: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [gallery, setGallery] = useState<Gallery | null>(null);
    const [coverFile, setCoverFile] = useState<GalleryFile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGallery = async () => {
            if (!id) return;
            try {
                const { data: gData, error: gError } = await supabase
                    .from('galleries')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (gError) throw gError;
                setGallery(gData);

                const { data: fData } = await supabase
                    .from('files')
                    .select('*')
                    .eq('gallery_id', id)
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

        // Optional: Auto-refresh the cover photo periodically?
        // Let's set up a subscription or just a simple interval for new photos.
        const interval = setInterval(async () => {
            if (!id) return;
            const { data: fData } = await supabase
                .from('files')
                .select('*')
                .eq('gallery_id', id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (fData) setCoverFile(fData);
        }, 15000); // Check for new latest photo every 15 seconds

        return () => clearInterval(interval);
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    if (!gallery) {
        return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Gallery not found.</div>;
    }

    const publicUrl = `${window.location.origin}/${generateSlug(gallery.client_name)}`;

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans text-white overflow-hidden">
            {/* Left side: Photo */}
            <div className="w-full md:w-3/5 h-[50vh] md:h-screen relative bg-slate-900 overflow-hidden">
                {coverFile ? (
                    <img 
                        src={getOptimizedImageUrl(coverFile.file_url, 1200, 1200)} 
                        alt="Event Cover"
                        className="w-full h-full object-cover animate-fade-in-slow"
                        key={coverFile.id} // Re-animate if latest photo changes
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <span className="text-slate-700">No photos yet</span>
                    </div>
                )}
                {/* Overlay gradient to blend into the right side */}
                <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-transparent to-slate-950" />
            </div>

            {/* Right side: QR Code & Info */}
            <div className="w-full md:w-2/5 h-[50vh] md:h-screen flex flex-col justify-center items-center p-8 md:p-16 relative z-10 bg-slate-950 -mt-8 md:mt-0 md:-ml-12 rounded-t-[3rem] md:rounded-none shadow-[0_-20px_50px_rgba(0,0,0,0.5)] md:shadow-none">
                <div className="max-w-md w-full flex flex-col items-center text-center space-y-8 md:space-y-12 animate-fade-in-up">
                    <div className="space-y-4">
                        <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400 font-serif">
                            {gallery.title || gallery.client_name}
                        </h1>
                        <p className="text-base md:text-lg text-slate-400">
                            Scan to view and download photos instantly
                        </p>
                    </div>

                    <div className="p-6 md:p-8 bg-white rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)] transition-transform hover:scale-105 duration-500">
                        <QRCode 
                            value={publicUrl} 
                            size={256}
                            level="H"
                            className="w-48 h-48 md:w-64 md:h-64"
                        />
                    </div>

                    <div className="text-slate-600 font-medium uppercase tracking-[0.3em] text-xs md:text-sm">
                        {window.location.host.replace('www.', '')}
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fade-in-slow {
                    from { opacity: 0; transform: scale(1.05); }
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
                    animation: fade-in-up 1s ease-out forwards;
                }
            `}} />
        </div>
    );
};
