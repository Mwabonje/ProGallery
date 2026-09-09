import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const HomeSettingsModal = ({ onClose, userId }: { onClose: () => void, userId: string }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [galleryId, setGalleryId] = useState<string | null>(null);
    
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
                const { data, error } = await supabase
                    .from('galleries')
                    .select('*')
                    .eq('photographer_id', userId)
                    .eq('category', 'SETTINGS')
                    .limit(1);

                if (error) throw error;

                if (data && data.length > 0) {
                    const gal = data[0];
                    setGalleryId(gal.id);
                    if (gal.title) {
                        try {
                            const parsed = JSON.parse(gal.title);
                            setSettings({ ...settings, ...parsed });
                        } catch(e) {}
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
            } else {
                const { error } = await supabase
                    .from('galleries')
                    .insert([{
                        photographer_id: userId,
                        client_name: 'SITE_SETTINGS',
                        title: settingsJson,
                        category: 'SETTINGS',
                        agreed_balance: 0,
                        amount_paid: 0,
                        link_enabled: false,
                        selection_enabled: false,
                        selection_status: 'pending'
                    }]);
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

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h2 className="text-lg font-semibold text-slate-900">Edit Home Settings</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors" disabled={saving}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">
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
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 border border-transparent rounded-lg transition-colors"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
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
