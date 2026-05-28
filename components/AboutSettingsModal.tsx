import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useUpload } from '../contexts/UploadContext';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const AboutSettingsModal = ({ 
    onClose,
    userId
}: { 
    onClose: () => void,
    userId: string
}) => {
    const { uploadFiles, uploading } = useUpload();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [galleryId, setGalleryId] = useState<string | null>(null);
    const [aboutText, setAboutText] = useState("");
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const init = async () => {
            try {
                // Find ABOUT gallery
                const { data, error } = await supabase
                    .from('galleries')
                    .select('*')
                    .eq('photographer_id', userId)
                    .eq('category', 'ABOUT')
                    .limit(1);

                if (error) throw error;

                if (data && data.length > 0) {
                    const gal = data[0];
                    setGalleryId(gal.id);
                    setAboutText(gal.title || "");

                    // fetch cover
                    const { data: files } = await supabase
                        .from('files')
                        .select('file_url')
                        .eq('gallery_id', gal.id)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (files && files.length > 0) {
                        setCoverUrl(files[0].file_url);
                    }
                } else {
                    // Create it if not exists
                    const { data: newGal, error: insertErr } = await supabase
                        .from('galleries')
                        .insert([{
                            photographer_id: userId,
                            client_name: '__ABOUT__',
                            category: 'ABOUT',
                            title: "I am an East African photographer specializing in hospitality, portraits, and documentary visual storytelling.\n\nFor me, photography is more than just clicking a button; it is about preserving fleeting moments.\n\nAvailable for travel worldwide. Let's create something beautiful together.",
                            link_enabled: false
                        }])
                        .select()
                        .single();

                    if (insertErr) throw insertErr;
                    setGalleryId(newGal.id);
                    setAboutText(newGal.title);
                }
            } catch (err: any) {
                toast.error("Failed to load About settings: " + err.message);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [userId]);

    const handleSave = async () => {
        if (!galleryId) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('galleries')
                .update({ title: aboutText })
                .eq('id', galleryId);

            if (error) throw error;
            toast.success("About text updated!");
            onClose();
        } catch (err: any) {
            toast.error("Failed to save: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !galleryId) return;
        const file = e.target.files[0];
        
        try {
            await uploadFiles(galleryId, [file], 87600); // 10 years expiry
            // Wait a moment for upload to complete and fetch the new cover
            setTimeout(async () => {
                const { data: files } = await supabase
                        .from('files')
                        .select('file_url')
                        .eq('gallery_id', galleryId)
                        .order('created_at', { ascending: false })
                        .limit(1);

                if (files && files.length > 0) {
                    setCoverUrl(files[0].file_url);
                    toast.success("Image updated successfully!");
                }
            }, 3000);
        } catch (err: any) {
            toast.error("Upload failed: " + err.message);
        }
        
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                <div className="bg-white rounded-xl shadow-xl p-8 flex items-center gap-3">
                    <Loader2 className="animate-spin text-slate-400" />
                    <span className="text-slate-600 font-medium">Loading settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h2 className="text-lg font-semibold text-slate-900">Edit About Section</h2>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={saving || uploading}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Image Section */}
                        <div className="flex flex-col gap-3">
                            <label className="block text-sm font-medium text-slate-700">Profile Image</label>
                            
                            <div className="aspect-[3/4] relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                {coverUrl ? (
                                    <img src={coverUrl} alt="About" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <ImageIcon className="w-8 h-8" />
                                        <span className="text-xs">No image uploaded</span>
                                    </div>
                                )}
                                
                                {uploading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                                       <Loader2 className="w-6 h-6 text-slate-600 animate-spin mb-2" />
                                       <span className="text-sm font-medium text-slate-600">Uploading...</span>
                                    </div>
                                )}
                            </div>

                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="w-full px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                                {coverUrl ? 'Change Image' : 'Upload Image'}
                            </button>
                        </div>

                        {/* Text Section */}
                        <div className="flex flex-col gap-3">
                            <label htmlFor="aboutText" className="block text-sm font-medium text-slate-700">
                                About Text (Markdown / Paragraphs)
                            </label>
                            <textarea
                                id="aboutText"
                                value={aboutText}
                                onChange={(e) => setAboutText(e.target.value)}
                                className="w-full flex-1 min-h-[300px] px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all resize-none text-sm leading-relaxed"
                                placeholder="Enter your about text here..."
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 border border-transparent rounded-lg transition-colors"
                        disabled={saving || uploading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading}
                        className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
