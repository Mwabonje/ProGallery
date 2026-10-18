import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { X, Loader2, Image as ImageIcon, Globe, User, Sparkles, Check, ExternalLink, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useUpload } from '../contexts/UploadContext';
import { AboutSettingsModal } from './AboutSettingsModal';
import { FAQManagerModal } from './FAQManagerModal';

export interface WebsiteSettingsModalProps {
  onClose: () => void;
  userId: string;
  initialTab?: 'home' | 'about' | 'faq';
}

export const WebsiteSettingsModal: React.FC<WebsiteSettingsModalProps> = ({
  onClose,
  userId,
  initialTab = 'home',
}) => {
  const [mainTab, setMainTab] = useState<'home' | 'about' | 'faq'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const { uploadFiles, uploading, cancelUpload } = useUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    brandName: 'MWABONJE',
    heroLocation: 'Malindi · Watamu · Lamu',
    heroTitle: 'Visual Storyteller\n& *Lifestyle* Photographer',
    heroSubtitle: 'Photography and film on the Kenyan coast — capturing authentic lifestyle moments, hospitality, weddings, and the quiet architecture of the places in between.',
    contactLink: 'https://mwabonjebooking.netlify.app/',
    whatsappLink: 'https://wa.me/254705268604',
    footerEmail: 'hello@mwabonje.studio',
    instagramLink: 'https://www.instagram.com/mwabonje_/',
    tiktokLink: 'https://www.tiktok.com/@mwabonje_',
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
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const gal = data[0];
          galId = gal.id;
          setGalleryId(gal.id);
          if (gal.title) {
            try {
              const parsed = JSON.parse(gal.title);
              if (
                !parsed.heroTitle ||
                parsed.heroTitle.includes('Salt, light') ||
                parsed.heroTitle.includes('*slow*') ||
                parsed.heroTitle === 'Hospitality, Portraits & Documentary Photography'
              ) {
                parsed.heroTitle = 'Visual Storyteller\n& *Lifestyle* Photographer';
                parsed.heroSubtitle =
                  'Photography and film on the Kenyan coast — capturing authentic lifestyle moments, hospitality, weddings, and the quiet architecture of the places in between.';
                supabase
                  .from('galleries')
                  .update({ title: JSON.stringify(parsed), link_enabled: true })
                  .eq('id', gal.id)
                  .then(() => {});
              }
              setSettings((prev) => ({ ...prev, ...parsed }));
              if (parsed.heroImageUrl) {
                setCoverUrl(parsed.heroImageUrl);
              }
            } catch (e) {}
          }

          if (gal.link_enabled !== true) {
            await supabase
              .from('galleries')
              .update({ link_enabled: true })
              .eq('id', gal.id);
          }
        } else {
          const { data: newGal, error: insertError } = await supabase
            .from('galleries')
            .insert([
              {
                photographer_id: userId,
                client_name: 'SITE_SETTINGS',
                title: JSON.stringify(settings),
                category: 'SETTINGS',
                agreed_balance: 0,
                amount_paid: 0,
                link_enabled: true,
                selection_enabled: false,
                selection_status: 'pending',
              },
            ])
            .select()
            .single();

          if (insertError) throw insertError;
          if (newGal) {
            galId = newGal.id;
            setGalleryId(newGal.id);
          }
        }

        if (galId) {
          const { data: files } = await supabase
            .from('files')
            .select('file_url')
            .eq('gallery_id', galId)
            .neq('file_path', 'GALLERY_PASSWORD')
            .order('created_at', { ascending: false })
            .limit(1);

          if (files && files.length > 0 && files[0].file_url) {
            setCoverUrl(files[0].file_url);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load website settings');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        heroImageUrl: coverUrl || (settings as any).heroImageUrl || undefined,
      };
      const settingsJson = JSON.stringify(updatedSettings);

      if (galleryId) {
        const { error } = await supabase
          .from('galleries')
          .update({
            title: settingsJson,
            link_enabled: true,
          })
          .eq('id', galleryId);
        if (error) throw error;
      }
      try {
        if (updatedSettings.heroImageUrl) {
          localStorage.setItem('mwabonje_hero_image', updatedSettings.heroImageUrl);
        }
      } catch (e) {}
      toast.success('Website settings saved successfully!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !galleryId) return;
    const file = e.target.files[0];

    try {
      await supabase
        .from('galleries')
        .update({ link_enabled: true })
        .eq('id', galleryId);

      await uploadFiles(galleryId, [file], 87600);

      const fetchAndPersistCover = async () => {
        const { data: files } = await supabase
          .from('files')
          .select('file_url')
          .eq('gallery_id', galleryId)
          .neq('file_path', 'GALLERY_PASSWORD')
          .order('created_at', { ascending: false })
          .limit(1);

        if (files && files.length > 0 && files[0].file_url) {
          const newUrl = files[0].file_url;
          setCoverUrl(newUrl);
          const updated = { ...settings, heroImageUrl: newUrl };
          setSettings(updated);
          try {
            localStorage.setItem('mwabonje_hero_image', newUrl);
          } catch (e) {}
          await supabase
            .from('galleries')
            .update({
              title: JSON.stringify(updated),
              link_enabled: true,
            })
            .eq('id', galleryId);
          toast.success('Hero image updated successfully!');
          return true;
        }
        return false;
      };

      let success = await fetchAndPersistCover();
      if (!success) {
        setTimeout(async () => {
          success = await fetchAndPersistCover();
          if (!success) {
            setTimeout(fetchAndPersistCover, 2500);
          }
        }, 1500);
      }
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[100] animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200/80 dark:border-slate-800 transition-colors">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-[#0f172a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center shadow-sm">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Website Settings</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure your homepage hero, branding, social links, and about page content.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            disabled={saving || uploading}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unified Tab Switcher: Home & Branding vs About Page */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-6 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setMainTab('home')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              mainTab === 'home'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Home &amp; Hero Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('about')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              mainTab === 'about'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>About Page Content</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('faq')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              mainTab === 'faq'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQ Page Content</span>
          </button>
        </div>

        {/* Tab 1: Home & Branding */}
        {mainTab === 'home' && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Hero Image Section */}
                  <div className="flex flex-col gap-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                      Hero Image Background
                    </label>
                    <div className="aspect-video relative bg-slate-100 dark:bg-slate-800/60 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                      {coverUrl ? (
                        <img src={coverUrl} alt="Hero" className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                          <ImageIcon className="w-8 h-8" />
                          <span className="text-xs">No hero image uploaded</span>
                        </div>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
                          <Loader2 className="w-6 h-6 text-slate-600 dark:text-slate-300 animate-spin mb-2" />
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">
                            Uploading...
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              cancelUpload();
                            }}
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
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

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
                      >
                        {coverUrl ? 'Change Hero Image' : 'Upload Hero Image'}
                      </button>
                      {coverUrl && (
                        <button
                          type="button"
                          onClick={async () => {
                            setCoverUrl(null);
                            const updated = { ...settings, heroImageUrl: null };
                            setSettings(updated as any);
                            if (galleryId) {
                              await supabase.from('files').delete().eq('gallery_id', galleryId);
                              await supabase
                                .from('galleries')
                                .update({
                                  title: JSON.stringify(updated),
                                  link_enabled: true,
                                })
                                .eq('id', galleryId);
                            }
                            try {
                              localStorage.removeItem('mwabonje_hero_image');
                            } catch (e) {}
                            toast.success('Hero image removed. Portfolio cover will be used as fallback.');
                          }}
                          disabled={uploading}
                          className="px-3 py-2 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors text-xs font-semibold uppercase tracking-wider disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      If no image is uploaded, the site will automatically use the cover image from your most recent portfolio gallery.
                    </p>
                  </div>

                  {/* Text & Social Details */}
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Brand Name (Logo Text)
                      </label>
                      <input
                        type="text"
                        value={settings.brandName}
                        onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-sm focus:outline-none focus:border-slate-400 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Hero Location / Eyebrow
                      </label>
                      <input
                        type="text"
                        value={settings.heroLocation}
                        onChange={(e) => setSettings({ ...settings, heroLocation: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-sm focus:outline-none focus:border-slate-400 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Hero Main Title (Use *text* for italics)
                      </label>
                      <textarea
                        value={settings.heroTitle}
                        onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-sm focus:outline-none focus:border-slate-400 dark:text-white font-serif"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Hero Subtitle
                      </label>
                      <textarea
                        value={settings.heroSubtitle}
                        onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-sm focus:outline-none focus:border-slate-400 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Enquire / Booking Button Link
                      </label>
                      <input
                        type="url"
                        value={settings.contactLink}
                        onChange={(e) => setSettings({ ...settings, contactLink: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-sm focus:outline-none focus:border-slate-400 dark:text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        WhatsApp Link or Number
                      </label>
                      <input
                        type="text"
                        value={settings.whatsappLink || ''}
                        placeholder="https://wa.me/254705268604 or +254 705 268 604"
                        onChange={(e) => setSettings({ ...settings, whatsappLink: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-sm focus:outline-none focus:border-slate-400 dark:text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Footer Email
                      </label>
                      <input
                        type="email"
                        value={settings.footerEmail || ''}
                        onChange={(e) => setSettings({ ...settings, footerEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-sm focus:outline-none focus:border-slate-400 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                          Instagram Link
                        </label>
                        <input
                          type="url"
                          value={settings.instagramLink || ''}
                          onChange={(e) => setSettings({ ...settings, instagramLink: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-sm focus:outline-none focus:border-slate-400 dark:text-white font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                          TikTok Link
                        </label>
                        <input
                          type="url"
                          value={settings.tiktokLink || ''}
                          onChange={(e) => setSettings({ ...settings, tiktokLink: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-sm focus:outline-none focus:border-slate-400 dark:text-white font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer for Home Tab */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                disabled={saving || uploading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || uploading}
                className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold tracking-wider uppercase rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: About Page Content */}
        {mainTab === 'about' && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <AboutSettingsModal
              onClose={onClose}
              userId={userId}
              embedded={true}
            />
          </div>
        )}

        {/* Tab 3: FAQ Page Content */}
        {mainTab === 'faq' && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <FAQManagerModal
              onClose={onClose}
              userId={userId}
              embedded={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};
