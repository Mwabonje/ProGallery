import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useUpload } from '../contexts/UploadContext';
import { 
  X, 
  Image as ImageIcon, 
  Loader2, 
  Plus, 
  Trash2, 
  Sparkles, 
  BookOpen, 
  RotateCcw,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { isRealPortfolioUrl, REAL_ABOUT_IMAGE_URL } from '../utils/portfolioImages';

export interface DisciplineItem {
  id: string;
  number: string;
  title: string;
  description: string;
}

export const DEFAULT_DISCIPLINES: DisciplineItem[] = [
  {
    id: '1',
    number: '01',
    title: 'Hospitality & Architecture',
    description: 'Capturing boutique hotels, coastal private villas, safari camps, and interior architecture with natural ambient light.',
  },
  {
    id: '2',
    number: '02',
    title: 'Lifestyle & Portraits',
    description: 'Natural-light portraiture, commercial brand storytelling, and emotive human narratives that celebrate genuine coastal culture.',
  },
  {
    id: '3',
    number: '03',
    title: 'Weddings & Intimacy',
    description: 'Documentary, unscripted coverage of destination unions along the Kenyan coast, preserving raw emotions and joyful celebrations.',
  },
  {
    id: '4',
    number: '04',
    title: 'Cinematic Film & Visual Reels',
    description: 'Short-form cinematic film reels, brand mini-documentaries, and motion visual narratives documenting coastal heritage.',
  },
];

export const DEFAULT_DISCIPLINES_EYEBROW = 'AREAS OF PRACTICE';
export const DEFAULT_DISCIPLINES_TITLE = 'Creative Disciplines';
export const DEFAULT_DISCIPLINES_SUBTITLE = 'Intentional visual storytelling tailored to editorial publications, private commissions, and luxury hospitality.';

export const AboutSettingsModal = ({ 
  onClose,
  userId
}: { 
  onClose: () => void;
  userId: string;
}) => {
  const { uploadFiles, uploading, cancelUpload } = useUpload();
  const [activeTab, setActiveTab] = useState<'disciplines' | 'bio'>('disciplines');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Bio state
  const [aboutText, setAboutText] = useState('');

  // Disciplines state (highlighted in request)
  const [disciplinesEyebrow, setDisciplinesEyebrow] = useState(DEFAULT_DISCIPLINES_EYEBROW);
  const [disciplinesTitle, setDisciplinesTitle] = useState(DEFAULT_DISCIPLINES_TITLE);
  const [disciplinesSubtitle, setDisciplinesSubtitle] = useState(DEFAULT_DISCIPLINES_SUBTITLE);
  const [disciplines, setDisciplines] = useState<DisciplineItem[]>(DEFAULT_DISCIPLINES);

  // Auto-save setup
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSavedPayloadRef = useRef<string>('');

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
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const gal = data[0];
          setGalleryId(gal.id);

          // Parse title (can be JSON or plain bio string)
          if (gal.title) {
            try {
              const parsed = JSON.parse(gal.title);
              if (parsed && typeof parsed === 'object') {
                setAboutText(parsed.bioText || '');
                setDisciplinesEyebrow(parsed.disciplinesEyebrow || DEFAULT_DISCIPLINES_EYEBROW);
                setDisciplinesTitle(parsed.disciplinesTitle || DEFAULT_DISCIPLINES_TITLE);
                setDisciplinesSubtitle(parsed.disciplinesSubtitle ?? DEFAULT_DISCIPLINES_SUBTITLE);
                if (Array.isArray(parsed.disciplines) && parsed.disciplines.length > 0) {
                  setDisciplines(parsed.disciplines);
                }
              } else {
                setAboutText(gal.title);
              }
            } catch {
              // Legacy plain text bio
              setAboutText(gal.title);
            }
          }

          // Fetch cover photo
          const { data: files } = await supabase
            .from('files')
            .select('file_url')
            .eq('gallery_id', gal.id)
            .neq('file_path', 'GALLERY_PASSWORD')
            .order('created_at', { ascending: false })
            .limit(1);

          if (files && files.length > 0 && files[0].file_url) {
            setCoverUrl(files[0].file_url);
          }

          if (gal.link_enabled === false) {
            await supabase
              .from('galleries')
              .update({ link_enabled: true })
              .eq('id', gal.id);
          }
        } else {
          // Create gallery if it doesn't exist
          const defaultPayload = JSON.stringify({
            bioText: "Hey there! I am Michael Mwabonje Ringa, an East African photographer based in Malindi specialising in hospitality, Wedding, portraits, and documentary visual storytelling. My work is heavily inspired by the coastal beauty of Kenya and the intimate stories of the people who inhabit it.\n\nFor me, photography is more than just clicking a button; it is about preserving fleeting moments, translating emotions into visuals, and crafting narratives that transcend time.\n\nWhether I'm shooting an elegant property or directing a visual project, my focus remains on authenticity, natural light, and elegant composition.\n\nAvailable for travel. Let's create something beautiful together.",
            disciplinesEyebrow: DEFAULT_DISCIPLINES_EYEBROW,
            disciplinesTitle: DEFAULT_DISCIPLINES_TITLE,
            disciplinesSubtitle: DEFAULT_DISCIPLINES_SUBTITLE,
            disciplines: DEFAULT_DISCIPLINES,
          });

          const { data: newGal, error: insertErr } = await supabase
            .from('galleries')
            .insert([{
              photographer_id: userId,
              client_name: '__ABOUT__',
              category: 'ABOUT',
              title: defaultPayload,
              link_enabled: true
            }])
            .select()
            .single();

          if (insertErr) throw insertErr;
          setGalleryId(newGal.id);
          lastSavedPayloadRef.current = defaultPayload;
        }
      } catch (err: any) {
        toast.error('Failed to load About settings: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [userId]);

  // Serialized payload for change comparison and auto-save
  const currentPayload = JSON.stringify({
    bioText: aboutText,
    disciplinesEyebrow,
    disciplinesTitle,
    disciplinesSubtitle,
    disciplines,
  });

  useEffect(() => {
    if (!galleryId || loading || !currentPayload) return;
    if (lastSavedPayloadRef.current === '' && !loading) {
      lastSavedPayloadRef.current = currentPayload;
      return;
    }
    if (currentPayload === lastSavedPayloadRef.current) return;

    setAutoSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('galleries')
          .update({ title: currentPayload, link_enabled: true })
          .eq('id', galleryId);

        if (error) throw error;
        lastSavedPayloadRef.current = currentPayload;
        setAutoSaveStatus('saved');
        try {
          localStorage.setItem('mwabonje_about_payload', currentPayload);
        } catch {}
        setTimeout(() => setAutoSaveStatus('idle'), 2500);
      } catch (err: any) {
        console.error('Auto-save failed:', err.message);
        setAutoSaveStatus('error');
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [currentPayload, galleryId, loading]);

  const handleManualSave = async () => {
    if (!galleryId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('galleries')
        .update({ title: currentPayload, link_enabled: true })
        .eq('id', galleryId);

      if (error) throw error;
      lastSavedPayloadRef.current = currentPayload;
      try {
        localStorage.setItem('mwabonje_about_payload', currentPayload);
      } catch {}
      toast.success('Changes saved successfully!');
      onClose();
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisciplineChange = (index: number, field: keyof DisciplineItem, value: string) => {
    setDisciplines(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddDiscipline = () => {
    const nextNum = String(disciplines.length + 1).padStart(2, '0');
    const newItem: DisciplineItem = {
      id: Date.now().toString(),
      number: nextNum,
      title: 'New Discipline',
      description: 'Describe the scope, deliverables, and aesthetic focus for this discipline.',
    };
    setDisciplines(prev => [...prev, newItem]);
  };

  const handleRemoveDiscipline = (index: number) => {
    if (disciplines.length <= 1) {
      toast.error('You must keep at least one discipline.');
      return;
    }
    setDisciplines(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      // Re-number items cleanly
      return filtered.map((item, i) => ({
        ...item,
        number: String(i + 1).padStart(2, '0'),
      }));
    });
  };

  const handleResetDisciplines = () => {
    if (window.confirm('Reset Creative Disciplines to defaults?')) {
      setDisciplinesEyebrow(DEFAULT_DISCIPLINES_EYEBROW);
      setDisciplinesTitle(DEFAULT_DISCIPLINES_TITLE);
      setDisciplinesSubtitle(DEFAULT_DISCIPLINES_SUBTITLE);
      setDisciplines(DEFAULT_DISCIPLINES);
      toast.info('Restored default creative disciplines.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !galleryId) return;
    const file = e.target.files[0];

    try {
      await uploadFiles(galleryId, [file], 87600); // 10 years expiry
      setTimeout(async () => {
        const { data: files } = await supabase
          .from('files')
          .select('file_url')
          .eq('gallery_id', galleryId)
          .neq('file_path', 'GALLERY_PASSWORD')
          .order('created_at', { ascending: false })
          .limit(1);

        if (files && files.length > 0 && files[0].file_url) {
          setCoverUrl(files[0].file_url);
          try {
            localStorage.setItem('mwabonje_about_image', files[0].file_url);
          } catch {}
          toast.success('Portrait image updated successfully!');
        }
      }, 3000);
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-8 flex items-center gap-3 border border-slate-200 dark:border-slate-800">
          <Loader2 className="animate-spin text-slate-500 w-5 h-5" />
          <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Loading About settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[100] animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200/80 dark:border-slate-800 transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-[#0f172a] shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Edit About Page</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize your Creative Disciplines, biography text, and portrait photo.
            </p>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-6 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('disciplines')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'disciplines'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Creative Disciplines ({disciplines.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bio')}
            className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'bio'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Biography &amp; Photo</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: CREATIVE DISCIPLINES */}
          {activeTab === 'disciplines' && (
            <div className="space-y-6">
              {/* Section Header Controls */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Section Header Titles
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetDisciplines}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset to Defaults</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Eyebrow / Category Tag
                    </label>
                    <input
                      type="text"
                      value={disciplinesEyebrow}
                      onChange={(e) => setDisciplinesEyebrow(e.target.value)}
                      placeholder="AREAS OF PRACTICE"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Main Heading Title
                    </label>
                    <input
                      type="text"
                      value={disciplinesTitle}
                      onChange={(e) => setDisciplinesTitle(e.target.value)}
                      placeholder="Creative Disciplines"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Section Subtitle / Description
                  </label>
                  <input
                    type="text"
                    value={disciplinesSubtitle}
                    onChange={(e) => setDisciplinesSubtitle(e.target.value)}
                    placeholder="Intentional visual storytelling tailored to editorial publications, private commissions, and luxury hospitality."
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none"
                  />
                </div>
              </div>

              {/* Cards List Header */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Discipline Cards ({disciplines.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Edit titles, descriptions, and numbers for each discipline displayed on the About page.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddDiscipline}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Discipline</span>
                </button>
              </div>

              {/* Editable Cards Grid */}
              <div className="space-y-4">
                {disciplines.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold flex items-center justify-center">
                          {item.number || `0${index + 1}`}
                        </span>
                        <input
                          type="text"
                          value={item.number}
                          onChange={(e) => handleDisciplineChange(index, 'number', e.target.value)}
                          placeholder={`0${index + 1}`}
                          className="w-16 px-2 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 outline-none"
                          title="Card Number"
                        />
                      </div>

                      {disciplines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDiscipline(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Delete discipline"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Discipline Title
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleDisciplineChange(index, 'title', e.target.value)}
                        placeholder="e.g. Hospitality & Architecture"
                        className="w-full px-3 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Discipline Description
                      </label>
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => handleDisciplineChange(index, 'description', e.target.value)}
                        placeholder="Describe the scope, client type, and visual approach..."
                        className="w-full px-3 py-2 text-xs sm:text-sm leading-relaxed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddDiscipline}
                className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Discipline Card</span>
              </button>
            </div>
          )}

          {/* TAB 2: BIOGRAPHY & PHOTO */}
          {activeTab === 'bio' && (
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Image Section */}
              <div className="flex flex-col gap-3">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Profile Portrait Photo
                </label>
                
                <div className="aspect-[4/5] relative bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                  {(() => {
                    const displaySrc = (coverUrl && isRealPortfolioUrl(coverUrl)) ? coverUrl : REAL_ABOUT_IMAGE_URL;
                    return displaySrc ? (
                      <img src={displaySrc} alt="About Portrait" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-xs">No image uploaded</span>
                      </div>
                    );
                  })()}
                  
                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto">
                      <Loader2 className="w-6 h-6 text-slate-600 dark:text-slate-300 animate-spin mb-2" />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Uploading photo...</span>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          cancelUpload();
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
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
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {coverUrl ? 'Change Portrait Photo' : 'Upload Portrait Photo'}
                </button>
              </div>

              {/* Text Section */}
              <div className="flex flex-col gap-3">
                <label htmlFor="aboutText" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Biography Paragraphs
                </label>
                <textarea
                  id="aboutText"
                  value={aboutText}
                  onChange={(e) => setAboutText(e.target.value)}
                  className="w-full flex-1 min-h-[320px] px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all resize-y text-sm leading-relaxed text-slate-900 dark:text-slate-100"
                  placeholder="Enter your biography text here (separate paragraphs with empty lines)..."
                />
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Tip: Separate paragraphs by pressing enter twice. The portrait card on the About page will automatically adapt to match this text length.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Auto-Save Status & Save Button */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f172a] flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Auto-saving...
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" /> Saved to database
              </span>
            )}
            {autoSaveStatus === 'error' && (
              <span className="text-rose-500 dark:text-rose-400 font-medium">
                Auto-save failed
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              disabled={saving || uploading}
            >
              Done
            </button>
            <button
              onClick={handleManualSave}
              disabled={saving || uploading}
              className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold tracking-wider uppercase rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
