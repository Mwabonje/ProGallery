import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useUpload } from '../contexts/UploadContext';

export const HomeSettingsModal = ({ onClose, userId }: { onClose: () => void, userId: string }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [galleryId, setGalleryId] = useState<string | null>(null);
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const { uploadFiles, uploading, cancelUpload } = useUpload();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [settings, setSettings] = useState({
        brandName: "MWABONJE",
        heroLocation: "Lamu · Shela · Mombasa",
        heroTitle: "Salt, light\n& *slow* hours",
        heroSubtitle: "Photography and film on the Kenyan coast — hospitality, weddings, and the quiet architecture of the places in between.",
        contactLink: "https://mwabonjebooking.netlify.app/",
        footerEmail: "hello@mwabonje.studio",
        instagramLink: "https://www.instagram.com/mwabonje_/",
        tiktokLink: "https://www.tiktok.com/@mwabonje_"
    });

    useEffect(() => {
        const init = async () => {
            try {
                let galId = null;
                const { data, error } = await supabase
                    .from('galleries')
                    .select('*')
                    .eq('photographer_id', userId)
                    .eq('category', 'SETTINGS')
                    .limit(1);

                if (error) throw error;

                if (data && data.length > 0) {
                    const gal = data[0];
                    galId = gal.id;
                    setGalleryId(gal.id);
                    if (gal.title) {
                        try {
                            const parsed = JSON.parse(gal.title);
                            setSettings({ ...settings, ...parsed });
                        } catch(e) {}
                    }
                } else {
                    // Create the SETTINGS gallery if it doesn't exist so we can upload files
                    const { data: newGal, error: insertError } = await supabase
                        .from('galleries')
                        .insert([{
                            photographer_id: userId,
                            client_name: 'SITE_SETTINGS',
                            title: JSON.stringify(settings),
                            category: 'SETTINGS',
                            agreed_balance: 0,
                            amount_paid: 0,
                            link_enabled: false,
                            selection_enabled: false,
                            selection_status: 'pending'
                        }])
                        .select()
                        .single();
                        
                    if (insertError) throw insertError;
                    if (newGal) {
                        galId = newGal.id;
                        setGalleryId(newGal.id);
                    }
                }

                // Fetch cover image if gallery exists
                if (galId) {
                    const { data: files } = await supabase
                        .from('files')
                        .select('file_url')
                        .eq('gallery_id', galId)
                        .neq('file_path', 'GALLERY_PASSWORD')
                        .order('created_at', { ascending: false })
                        .limit(1);
                        
                    if (files && files.length > 0) {
                        setCoverUrl(files[0].file_url);
                    }
                }

            } catch (err) {
                console.error(err);
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [userId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const settingsJson = JSON.stringify(settings);
            
            if (galleryId) {
                const { error } = await supabase
                    .from('galleries')
                    .update({ title: settingsJson })
                    .eq('id', galleryId);
                if (error) throw error;
            }
            toast.success("Settings saved perfectly!");
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save settings");
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
                        .neq('file_path', 'GALLERY_PASSWORD')
                        .order('created_at', { ascending: false })
                        .limit(1);
                        
                if (files && files.length > 0) {
                    setCoverUrl(files[0].file_url);
                    toast.success("Hero image updated successfully!");
                }
            }, 3000);
            
        } catch (error: any) {
            toast.error(error.message || "Upload failed");
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h2 className="text-lg font-semibold text-slate-900">Edit Home Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" disabled={saving || uploading}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Image Section */}
                            <div className="flex flex-col gap-3">
                                <label className="block text-sm font-medium text-slate-700">Hero Image Background</label>
                                <div className="aspect-video relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                    {coverUrl ? (
                                        <img src={coverUrl} alt="Hero" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <ImageIcon className="w-8 h-8" />
                                            <span className="text-xs">No hero image uploaded</span>
                                        </div>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
                                            <Loader2 className="w-6 h-6 text-slate-600 animate-spin mb-2" />
                                            <span className="text-sm font-medium text-slate-600 mb-3">Uploading...</span>
                                            <button 
                                                type="button" 
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); cancelUpload(); }}
                                                className="px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                            >
                                                Cancel Upload
                                            </button>
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
                                    {coverUrl ? 'Change Hero Image' : 'Upload Hero Image'}
                                </button>
                                <p className="text-xs text-slate-500 mt-2">
                                    If no image is uploaded, the site will automatically use the cover image from your most recent portfolio gallery.
                                </p>
                            </div>
                            
                            {/* Text Section */}
                            <div className="flex flex-col gap-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Brand Name (Logo Text)</label>
                                    <input 
                                        type="text" 
                                        value={settings.brandName}
                                        onChange={e => setSettings({...settings, brandName: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hero Location / Eyebrow</label>
                                    <input 
                                        type="text" 
                                        value={settings.heroLocation}
                                        onChange={e => setSettings({...settings, heroLocation: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hero Main Title (Use *text* for italics)</label>
                                    <textarea 
                                        value={settings.heroTitle}
                                        onChange={e => setSettings({...settings, heroTitle: e.target.value})}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Hero Subtitle</label>
                                    <textarea 
                                        value={settings.heroSubtitle}
                                        onChange={e => setSettings({...settings, heroSubtitle: e.target.value})}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Enquire Button Link</label>
                                    <input 
                                        type="url" 
                                        value={settings.contactLink}
                                        onChange={e => setSettings({...settings, contactLink: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Footer Email</label>
                                    <input 
                                        type="email" 
                                        value={settings.footerEmail || ""}
                                        onChange={e => setSettings({...settings, footerEmail: e.target.value})}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Instagram Link</label>
                                        <input 
                                            type="url" 
                                            value={settings.instagramLink || ""}
                                            onChange={e => setSettings({...settings, instagramLink: e.target.value})}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">TikTok Link</label>
                                        <input 
                                            type="url" 
                                            value={settings.tiktokLink || ""}
                                            onChange={e => setSettings({...settings, tiktokLink: e.target.value})}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};
