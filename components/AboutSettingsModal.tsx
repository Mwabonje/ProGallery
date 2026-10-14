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
  Check,
  User,
  Compass,
  MessageCircle,
  Sun,
  Layers,
  Camera,
  Eye,
  EyeOff,
  Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { isRealPortfolioUrl, REAL_ABOUT_IMAGE_URL } from '../utils/portfolioImages';

export interface DisciplineItem {
  id: string;
  number: string;
  title: string;
  description: string;
}

export interface EthosPillar {
  id: string;
  icon: 'sun' | 'sparkles' | 'layers' | 'camera' | 'compass';
  title: string;
  description: string;
}

export interface CustomAboutSection {
  id: string;
  eyebrow: string;
  title: string;
  content: string;
  cardBg: boolean;
  cardBgColor: string;
}

export const DEFAULT_PAGE_HEADER_TITLE = 'Michael Mwabonje Ringa';
export const DEFAULT_PAGE_HEADER_SUBTITLE = 'Visual storyteller and lifestyle photographer capturing the authentic warmth, architectural quiet, and coastal narratives of East Africa.';

export const DEFAULT_BIO_QUOTE = 'Photography is more than clicking a button; it is about preserving fleeting moments and crafting narratives that transcend time.';

export const DEFAULT_PLACARD_NAME = 'Michael Mwabonje Ringa';
export const DEFAULT_PLACARD_ROLE = 'Photographer & Filmmaker';
export const DEFAULT_PLACARD_BASE = 'Malindi & Coast, Kenya';
export const DEFAULT_PLACARD_AVAILABILITY = 'Kenya & Worldwide Travel';
export const DEFAULT_PLACARD_FOCUS = 'Hospitality, Lifestyle, Portraits';
export const DEFAULT_PLACARD_BUTTON_TEXT = 'Inquire for Commissions';

export const DEFAULT_DISCIPLINES_EYEBROW = 'AREAS OF PRACTICE';
export const DEFAULT_DISCIPLINES_TITLE = 'Creative Disciplines';
export const DEFAULT_DISCIPLINES_SUBTITLE = 'Intentional visual storytelling tailored to editorial publications, private commissions, and luxury hospitality.';

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

export const DEFAULT_ETHOS_EYEBROW = 'Ethos & Approach';
export const DEFAULT_ETHOS_TITLE = 'How I See Through the Lens';
export const DEFAULT_ETHOS_PILLARS: EthosPillar[] = [
  {
    id: '1',
    icon: 'sun',
    title: 'The Coastal Light',
    description: 'Guided by the dawn hues of the Indian Ocean, equatorial golden hours, and the organic textures of coastal architecture.',
  },
  {
    id: '2',
    icon: 'sparkles',
    title: 'Quiet Observation',
    description: 'Prioritizing unobtrusive storytelling and genuine connection, allowing moments to unfold naturally without rigid posing.',
  },
  {
    id: '3',
    icon: 'layers',
    title: 'Archival Craft',
    description: 'Curated tone grading and museum-grade cotton rag paper selections that preserve memories for generations to come.',
  },
];

export const DEFAULT_INQUIRIES_EYEBROW = 'Inquiries & Commissions';
export const DEFAULT_INQUIRIES_TITLE = 'Ready to create something timeless together?';
export const DEFAULT_INQUIRIES_SUBTITLE = 'Available for commercial hospitality briefs, editorial assignments, destination weddings, and private portraiture throughout Kenya and worldwide.';
export const DEFAULT_INQUIRIES_WHATSAPP_LABEL = 'Chat on WhatsApp';
export const DEFAULT_INQUIRIES_EMAIL_LABEL = 'Send an Email';

export const CARD_BG_PRESETS = [
  { name: 'Warm Cream / Linen', hex: '#FAF8F5', textDark: true },
  { name: 'Pure White', hex: '#FFFFFF', textDark: true },
  { name: 'Sand Warm', hex: '#F4F0EA', textDark: true },
  { name: 'Studio Off-White', hex: '#F8F9FA', textDark: true },
  { name: 'Slate Tint', hex: '#F1F5F9', textDark: true },
  { name: 'Muted Taupe', hex: '#EAE5DC', textDark: true },
  { name: 'Deep Navy Slate', hex: '#1E293B', textDark: false },
  { name: 'Onyx Dark', hex: '#121212', textDark: false },
];

export const isColorDark = (hexColor: string): boolean => {
  if (!hexColor || !hexColor.startsWith('#')) return false;
  const hex = hexColor.replace('#', '');
  if (hex.length !== 3 && hex.length !== 6) return false;
  const fullHex = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
};

// Reusable component for card background controls with color selection
function CardBackgroundControls({
  sectionName,
  hasBackground,
  onToggleBackground,
  bgColor,
  onBgColorChange,
  previewTitle,
  previewDescription,
}: {
  sectionName: string;
  hasBackground: boolean;
  onToggleBackground: (enabled: boolean) => void;
  bgColor: string;
  onBgColorChange: (color: string) => void;
  previewTitle?: string;
  previewDescription?: string;
}) {
  const isDark = isColorDark(bgColor);

  return (
    <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
      {/* Top Toggle: With Background vs No Background */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {sectionName} Cards Background
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose whether cards appear with an enclosed background color or a clean transparent style.
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={() => {
              onToggleBackground(false);
              toast.info(`${sectionName} cards set to transparent (no background).`);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !hasBackground 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            No Background (Clean)
          </button>
          <button
            type="button"
            onClick={() => {
              onToggleBackground(true);
              toast.info(`${sectionName} cards set to background card.`);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              hasBackground 
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            With Background Color
          </button>
        </div>
      </div>

      {/* When Background Color is Active: Show Color Picker, Hex Input & Presets */}
      {hasBackground && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Choose Card Background Color
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Select a preset swatch or enter any custom hex color (e.g. #faf8f5).
              </span>
            </div>

            {/* Custom Color Input & Picker */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="color"
                  value={bgColor && bgColor.startsWith('#') && bgColor.length === 7 ? bgColor : '#FAF8F5'}
                  onChange={(e) => onBgColorChange(e.target.value.toUpperCase())}
                  className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-800 shrink-0"
                  title="Open Color Picker"
                />
              </div>

              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                <span className="text-xs font-mono text-slate-400">HEX</span>
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => onBgColorChange(e.target.value)}
                  placeholder="#FAF8F5"
                  maxLength={9}
                  className="w-20 text-xs font-mono font-bold text-slate-900 dark:text-white bg-transparent outline-none uppercase"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  onBgColorChange('#FAF8F5');
                  toast.info('Reset card color to #FAF8F5');
                }}
                className="px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors font-mono"
                title="Reset to #FAF8F5"
              >
                #FAF8F5
              </button>
            </div>
          </div>

          {/* Quick Presets Swatches */}
          <div>
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Recommended Palette Presets
            </span>
            <div className="flex flex-wrap gap-2">
              {CARD_BG_PRESETS.map((preset) => {
                const isSelected = bgColor.toUpperCase() === preset.hex.toUpperCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => {
                      onBgColorChange(preset.hex);
                      toast.success(`Selected ${preset.name} (${preset.hex})`);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      isSelected 
                        ? 'ring-2 ring-slate-900 dark:ring-white border-transparent font-bold shadow-sm scale-105' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isSelected && (
                        <Check className={`w-2.5 h-2.5 ${preset.textDark ? 'text-slate-900' : 'text-white'}`} />
                      )}
                    </span>
                    <span className={preset.textDark ? 'text-slate-900' : 'text-white'}>
                      {preset.name} <span className="font-mono text-[10px] opacity-80">({preset.hex})</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview of the Card */}
          <div className="pt-2">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Live Card Preview
            </span>
            <div 
              style={{ backgroundColor: bgColor }}
              className={`p-4 rounded-xl border transition-all ${
                isDark 
                  ? 'border-white/15 text-white' 
                  : 'border-slate-200/80 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                  CARD PREVIEW · {bgColor.toUpperCase()}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-white' : 'bg-black/5 text-slate-800'}`}>
                  {isDark ? 'Dark Theme Contrast' : 'Light Theme Contrast'}
                </span>
              </div>
              <h5 className={`font-serif text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {previewTitle || 'Sample Card Heading'}
              </h5>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {previewDescription || 'This is how your cards will look on the live website with this background color applied.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const AboutSettingsModal = ({ 
  onClose,
  userId,
  embedded = false,
}: { 
  onClose: () => void;
  userId: string;
  embedded?: boolean;
}) => {
  const { uploadFiles, uploading, cancelUpload } = useUpload();
  const [activeTab, setActiveTab] = useState<'ethos' | 'disciplines' | 'custom' | 'bio' | 'placard' | 'inquiries'>('ethos');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Top page header
  const [pageHeaderTitle, setPageHeaderTitle] = useState(DEFAULT_PAGE_HEADER_TITLE);
  const [pageHeaderSubtitle, setPageHeaderSubtitle] = useState(DEFAULT_PAGE_HEADER_SUBTITLE);

  // Bio & Quote
  const [bioQuote, setBioQuote] = useState(DEFAULT_BIO_QUOTE);
  const [aboutText, setAboutText] = useState('');

  // Placard details
  const [placardName, setPlacardName] = useState(DEFAULT_PLACARD_NAME);
  const [placardRole, setPlacardRole] = useState(DEFAULT_PLACARD_ROLE);
  const [placardBase, setPlacardBase] = useState(DEFAULT_PLACARD_BASE);
  const [placardAvailability, setPlacardAvailability] = useState(DEFAULT_PLACARD_AVAILABILITY);
  const [placardFocus, setPlacardFocus] = useState(DEFAULT_PLACARD_FOCUS);
  const [placardButtonText, setPlacardButtonText] = useState(DEFAULT_PLACARD_BUTTON_TEXT);

  // Section visibility states
  const [showDisciplinesSection, setShowDisciplinesSection] = useState(true);
  const [showEthosSection, setShowEthosSection] = useState(true);
  const [showInquiriesSection, setShowInquiriesSection] = useState(true);

  // Card background styling options with color choice
  const [disciplinesCardBg, setDisciplinesCardBg] = useState(true);
  const [disciplinesCardBgColor, setDisciplinesCardBgColor] = useState('#FAF8F5');
  const [ethosCardBg, setEthosCardBg] = useState(false);
  const [ethosCardBgColor, setEthosCardBgColor] = useState('#FAF8F5');

  // Disciplines state
  const [disciplinesEyebrow, setDisciplinesEyebrow] = useState(DEFAULT_DISCIPLINES_EYEBROW);
  const [disciplinesTitle, setDisciplinesTitle] = useState(DEFAULT_DISCIPLINES_TITLE);
  const [disciplinesSubtitle, setDisciplinesSubtitle] = useState(DEFAULT_DISCIPLINES_SUBTITLE);
  const [disciplines, setDisciplines] = useState<DisciplineItem[]>(DEFAULT_DISCIPLINES);

  // Ethos & Approach state
  const [ethosEyebrow, setEthosEyebrow] = useState(DEFAULT_ETHOS_EYEBROW);
  const [ethosTitle, setEthosTitle] = useState(DEFAULT_ETHOS_TITLE);
  const [ethosPillars, setEthosPillars] = useState<EthosPillar[]>(DEFAULT_ETHOS_PILLARS);

  // Custom user sections state (allows deleting and adding brand new sections)
  const [customSections, setCustomSections] = useState<CustomAboutSection[]>([]);

  // Inquiries CTA banner state
  const [inquiriesEyebrow, setInquiriesEyebrow] = useState(DEFAULT_INQUIRIES_EYEBROW);
  const [inquiriesTitle, setInquiriesTitle] = useState(DEFAULT_INQUIRIES_TITLE);
  const [inquiriesSubtitle, setInquiriesSubtitle] = useState(DEFAULT_INQUIRIES_SUBTITLE);
  const [inquiriesWhatsappLabel, setInquiriesWhatsappLabel] = useState(DEFAULT_INQUIRIES_WHATSAPP_LABEL);
  const [inquiriesEmailLabel, setInquiriesEmailLabel] = useState(DEFAULT_INQUIRIES_EMAIL_LABEL);

  // Auto-save setup
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSavedPayloadRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
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

          if (gal.title) {
            try {
              const parsed = JSON.parse(gal.title);
              if (parsed && typeof parsed === 'object') {
                if (parsed.pageHeaderTitle) setPageHeaderTitle(parsed.pageHeaderTitle);
                if (parsed.pageHeaderSubtitle) setPageHeaderSubtitle(parsed.pageHeaderSubtitle);

                if (parsed.bioQuote) setBioQuote(parsed.bioQuote);
                if (parsed.bioText) setAboutText(parsed.bioText);

                if (parsed.placardName) setPlacardName(parsed.placardName);
                if (parsed.placardRole) setPlacardRole(parsed.placardRole);
                if (parsed.placardBase) setPlacardBase(parsed.placardBase);
                if (parsed.placardAvailability) setPlacardAvailability(parsed.placardAvailability);
                if (parsed.placardFocus) setPlacardFocus(parsed.placardFocus);
                if (parsed.placardButtonText) setPlacardButtonText(parsed.placardButtonText);

                if (parsed.showDisciplinesSection !== undefined) setShowDisciplinesSection(parsed.showDisciplinesSection);
                if (parsed.showEthosSection !== undefined) setShowEthosSection(parsed.showEthosSection);
                if (parsed.showInquiriesSection !== undefined) setShowInquiriesSection(parsed.showInquiriesSection);

                if (parsed.disciplinesCardBg !== undefined) setDisciplinesCardBg(parsed.disciplinesCardBg);
                if (parsed.disciplinesCardBgColor) setDisciplinesCardBgColor(parsed.disciplinesCardBgColor);
                if (parsed.ethosCardBg !== undefined) setEthosCardBg(parsed.ethosCardBg);
                if (parsed.ethosCardBgColor) setEthosCardBgColor(parsed.ethosCardBgColor);

                if (parsed.disciplinesEyebrow) setDisciplinesEyebrow(parsed.disciplinesEyebrow);
                if (parsed.disciplinesTitle) setDisciplinesTitle(parsed.disciplinesTitle);
                if (parsed.disciplinesSubtitle !== undefined) setDisciplinesSubtitle(parsed.disciplinesSubtitle);
                if (Array.isArray(parsed.disciplines)) {
                  setDisciplines(parsed.disciplines);
                }

                if (parsed.ethosEyebrow) setEthosEyebrow(parsed.ethosEyebrow);
                if (parsed.ethosTitle) setEthosTitle(parsed.ethosTitle);
                if (Array.isArray(parsed.ethosPillars)) {
                  setEthosPillars(parsed.ethosPillars);
                }

                if (Array.isArray(parsed.customSections)) {
                  setCustomSections(parsed.customSections);
                }

                if (parsed.inquiriesEyebrow) setInquiriesEyebrow(parsed.inquiriesEyebrow);
                if (parsed.inquiriesTitle) setInquiriesTitle(parsed.inquiriesTitle);
                if (parsed.inquiriesSubtitle) setInquiriesSubtitle(parsed.inquiriesSubtitle);
                if (parsed.inquiriesWhatsappLabel) setInquiriesWhatsappLabel(parsed.inquiriesWhatsappLabel);
                if (parsed.inquiriesEmailLabel) setInquiriesEmailLabel(parsed.inquiriesEmailLabel);
              } else {
                setAboutText(gal.title);
              }
            } catch {
              setAboutText(gal.title);
            }
          }

          const { data: files } = await supabase
            .from('files')
            .select('file_url')
            .eq('gallery_id', gal.id)
            .neq('file_path', 'GALLERY_PASSWORD')
            .order('created_at', { ascending: false })
            .limit(1);

          if (files && files.length > 0 && files[0].file_url) {
            setCoverUrl(files[0].file_url);
            try {
              localStorage.setItem('mwabonje_about_image', files[0].file_url);
            } catch {}
          }
        } else {
          // Initialize default ABOUT row in Supabase
          const defaultPayload = JSON.stringify({
            pageHeaderTitle: DEFAULT_PAGE_HEADER_TITLE,
            pageHeaderSubtitle: DEFAULT_PAGE_HEADER_SUBTITLE,
            bioQuote: DEFAULT_BIO_QUOTE,
            bioText: "Hey there! I am Michael Mwabonje Ringa, an East African photographer based in Malindi specialising in hospitality, Wedding, portraits, and documentary visual storytelling. My work is heavily inspired by the coastal beauty of Kenya and the intimate stories of the people who inhabit it.\n\nFor me, photography is more than just clicking a button; it is about preserving fleeting moments, translating emotions into visuals, and crafting narratives that transcend time.\n\nWhether I'm shooting an elegant property or directing a visual project, my focus remains on authenticity, natural light, and elegant composition.\n\nAvailable for travel. Let's create something beautiful together.",
            placardName: DEFAULT_PLACARD_NAME,
            placardRole: DEFAULT_PLACARD_ROLE,
            placardBase: DEFAULT_PLACARD_BASE,
            placardAvailability: DEFAULT_PLACARD_AVAILABILITY,
            placardFocus: DEFAULT_PLACARD_FOCUS,
            placardButtonText: DEFAULT_PLACARD_BUTTON_TEXT,
            showDisciplinesSection: true,
            showEthosSection: true,
            showInquiriesSection: true,
            disciplinesCardBg: true,
            disciplinesCardBgColor: '#FAF8F5',
            ethosCardBg: false,
            ethosCardBgColor: '#FAF8F5',
            disciplinesEyebrow: DEFAULT_DISCIPLINES_EYEBROW,
            disciplinesTitle: DEFAULT_DISCIPLINES_TITLE,
            disciplinesSubtitle: DEFAULT_DISCIPLINES_SUBTITLE,
            disciplines: DEFAULT_DISCIPLINES,
            ethosEyebrow: DEFAULT_ETHOS_EYEBROW,
            ethosTitle: DEFAULT_ETHOS_TITLE,
            ethosPillars: DEFAULT_ETHOS_PILLARS,
            customSections: [],
            inquiriesEyebrow: DEFAULT_INQUIRIES_EYEBROW,
            inquiriesTitle: DEFAULT_INQUIRIES_TITLE,
            inquiriesSubtitle: DEFAULT_INQUIRIES_SUBTITLE,
            inquiriesWhatsappLabel: DEFAULT_INQUIRIES_WHATSAPP_LABEL,
            inquiriesEmailLabel: DEFAULT_INQUIRIES_EMAIL_LABEL,
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
    pageHeaderTitle,
    pageHeaderSubtitle,
    bioQuote,
    bioText: aboutText,
    placardName,
    placardRole,
    placardBase,
    placardAvailability,
    placardFocus,
    placardButtonText,
    showDisciplinesSection,
    showEthosSection,
    showInquiriesSection,
    disciplinesCardBg,
    disciplinesCardBgColor,
    ethosCardBg,
    ethosCardBgColor,
    disciplinesEyebrow,
    disciplinesTitle,
    disciplinesSubtitle,
    disciplines,
    ethosEyebrow,
    ethosTitle,
    ethosPillars,
    customSections,
    inquiriesEyebrow,
    inquiriesTitle,
    inquiriesSubtitle,
    inquiriesWhatsappLabel,
    inquiriesEmailLabel,
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
      toast.success('About page changes saved successfully!');
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
    setShowDisciplinesSection(true);
    toast.success('Added new discipline section.');
  };

  const handleRemoveDiscipline = (index: number) => {
    setDisciplines(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((item, i) => ({
        ...item,
        number: String(i + 1).padStart(2, '0'),
      }));
    });
    toast.info('Deleted discipline section.');
  };

  const handleAddPillar = () => {
    const nextNum = ethosPillars.length + 1;
    const newPillar: EthosPillar = {
      id: Date.now().toString(),
      icon: nextNum === 1 ? 'sun' : nextNum === 2 ? 'sparkles' : nextNum === 3 ? 'layers' : 'camera',
      title: `Pillar 0${nextNum} Title`,
      description: 'Describe this core philosophy, working methodology, or artistic observation.',
    };
    setEthosPillars(prev => [...prev, newPillar]);
    setShowEthosSection(true);
    toast.success(`Added Pillar 0${nextNum} section.`);
  };

  const handleRemovePillar = (index: number) => {
    setEthosPillars(prev => prev.filter((_, i) => i !== index));
    toast.info('Deleted pillar section.');
  };

  const handlePillarChange = (index: number, field: keyof EthosPillar, value: any) => {
    setEthosPillars(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Custom sections handlers
  const handleAddCustomSection = () => {
    const nextIndex = customSections.length + 1;
    const newSection: CustomAboutSection = {
      id: Date.now().toString(),
      eyebrow: 'SPECIAL FEATURE',
      title: `Section 0${nextIndex} Title`,
      content: 'Write your custom section narrative, accolades, or details here...',
      cardBg: true,
      cardBgColor: '#FAF8F5',
    };
    setCustomSections(prev => [...prev, newSection]);
    toast.success('Added new custom section.');
  };

  const handleRemoveCustomSection = (index: number) => {
    setCustomSections(prev => prev.filter((_, i) => i !== index));
    toast.info('Deleted section.');
  };

  const handleCustomSectionChange = (index: number, field: keyof CustomAboutSection, value: any) => {
    setCustomSections(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !galleryId) return;
    const file = e.target.files[0];

    try {
      const result = await uploadFiles([file], galleryId);
      if (result && result.length > 0) {
        const newUrl = result[0].file_url;
        setCoverUrl(newUrl);
        try {
          localStorage.setItem('mwabonje_about_image', newUrl);
        } catch {}
        toast.success('Portrait image uploaded successfully!');
      }
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    }
  };

  if (loading) {
    if (embedded) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3 flex-1">
          <Loader2 className="w-8 h-8 text-slate-800 dark:text-slate-200 animate-spin" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Loading About page content...
          </span>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 flex flex-col items-center gap-3 shadow-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-slate-800 dark:text-slate-200 animate-spin" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Loading About page content...
          </span>
        </div>
      </div>
    );
  }

  const innerContent = (
    <div className={`flex flex-col ${embedded ? 'flex-1 overflow-hidden min-h-0' : 'bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[92vh] border border-slate-200/80 dark:border-slate-800 transition-colors'}`}>
      {!embedded && (
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-[#0f172a] shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Edit About Page Content</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Add or delete sections, choose card background colors (e.g. #FAF8F5), and edit all copy.
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
      )}

      {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-6 gap-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ethos')}
            className={`py-3 px-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'ethos'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Ethos &amp; Approach ({ethosPillars.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('disciplines')}
            className={`py-3 px-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'disciplines'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Disciplines ({disciplines.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('custom')}
            className={`py-3 px-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'custom'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Custom Sections ({customSections.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bio')}
            className={`py-3 px-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'bio'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Bio &amp; Quote</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('placard')}
            className={`py-3 px-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'placard'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Header &amp; Placard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inquiries')}
            className={`py-3 px-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'inquiries'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Inquiries Banner</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB: ETHOS & APPROACH */}
          {activeTab === 'ethos' && (
            <div className="space-y-6">
              {/* Entire Section Master Control: Delete Section or Add Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${showEthosSection ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Ethos &amp; Approach Section
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {showEthosSection 
                        ? 'This section is currently visible on the live About page.' 
                        : 'This section is currently deleted / hidden from the About page.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !showEthosSection;
                      setShowEthosSection(next);
                      toast.info(next ? 'Added Ethos & Approach section to page.' : 'Deleted / hidden Ethos & Approach section from page.');
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
                      showEthosSection 
                        ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    }`}
                  >
                    {showEthosSection ? (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Section from Page</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Section to Page</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Section Header Controls */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Section Header Titles
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setEthosEyebrow(DEFAULT_ETHOS_EYEBROW);
                      setEthosTitle(DEFAULT_ETHOS_TITLE);
                      setEthosPillars(DEFAULT_ETHOS_PILLARS);
                      setEthosCardBg(false);
                      setEthosCardBgColor('#FAF8F5');
                      setShowEthosSection(true);
                      toast.info('Restored default ethos section and pillars.');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 transition-colors inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Eyebrow Tag
                    </label>
                    <input
                      type="text"
                      value={ethosEyebrow}
                      onChange={(e) => setEthosEyebrow(e.target.value)}
                      placeholder="Ethos & Approach"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Section Title
                    </label>
                    <input
                      type="text"
                      value={ethosTitle}
                      onChange={(e) => setEthosTitle(e.target.value)}
                      placeholder="How I See Through the Lens"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                    />
                  </div>
                </div>
              </div>

              {/* Card Background Color Option with Hex Picker and Presets */}
              <CardBackgroundControls
                sectionName="Ethos Pillar"
                hasBackground={ethosCardBg}
                onToggleBackground={(enabled) => setEthosCardBg(enabled)}
                bgColor={ethosCardBgColor}
                onBgColorChange={(color) => setEthosCardBgColor(color)}
                previewTitle="The Coastal Light"
                previewDescription="Guided by the dawn hues of the Indian Ocean, equatorial golden hours, and the organic textures of coastal architecture."
              />

              {/* Pillars Header with Add Section button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Philosophy &amp; Ethos Pillars</span>
                    <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {ethosPillars.length} {ethosPillars.length === 1 ? 'pillar' : 'pillars'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add new philosophy sections or delete existing ones. Each column dynamically scales on the About page.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddPillar}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Pillar Section</span>
                </button>
              </div>

              {/* Pillars Cards List */}
              {ethosPillars.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <Sun className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Pillar Sections</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      You have deleted all pillar sections. Add one using the button below or restore defaults.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleAddPillar}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-lg shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Pillar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEthosPillars(DEFAULT_ETHOS_PILLARS);
                        setShowEthosSection(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Default 3 Pillars</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {ethosPillars.map((pillar, idx) => (
                    <div 
                      key={pillar.id || idx}
                      className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3 relative group hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
                    >
                      {/* Pillar Header with Delete Action */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Pillar 0{idx + 1}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                            ({pillar.title || 'Untitled'})
                          </span>
                        </div>

                        {/* DELETE BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleRemovePillar(idx)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-lg transition-colors font-medium border border-rose-200/60 dark:border-rose-900/40"
                          title="Delete this pillar section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Section</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Icon Symbol
                          </label>
                          <select
                            value={pillar.icon}
                            onChange={(e) => handlePillarChange(idx, 'icon', e.target.value as any)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                          >
                            <option value="sun">Sun (Light &amp; Coast)</option>
                            <option value="sparkles">Sparkles (Quiet Observation)</option>
                            <option value="layers">Layers (Archival Craft)</option>
                            <option value="camera">Camera (Visuals &amp; Film)</option>
                            <option value="compass">Compass (East Africa &amp; Travel)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Pillar Title / Heading
                          </label>
                          <input
                            type="text"
                            value={pillar.title}
                            onChange={(e) => handlePillarChange(idx, 'title', e.target.value)}
                            placeholder="e.g. The Coastal Light"
                            className="w-full px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Pillar Description
                        </label>
                        <textarea
                          value={pillar.description}
                          onChange={(e) => handlePillarChange(idx, 'description', e.target.value)}
                          rows={2}
                          placeholder="Explain this artistic philosophy or methodology..."
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none resize-none leading-relaxed focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: CREATIVE DISCIPLINES */}
          {activeTab === 'disciplines' && (
            <div className="space-y-6">
              {/* Disciplines Section Visibility Control: Delete or Add Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${showDisciplinesSection ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Creative Disciplines Section
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {showDisciplinesSection 
                        ? 'Disciplines grid is visible on the About page.' 
                        : 'Disciplines grid is deleted / hidden from the About page.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !showDisciplinesSection;
                    setShowDisciplinesSection(next);
                    toast.info(next ? 'Added Disciplines section to page.' : 'Deleted / hidden Disciplines section from page.');
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
                    showDisciplinesSection 
                      ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                  }`}
                >
                  {showDisciplinesSection ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Section from Page</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Section to Page</span>
                    </>
                  )}
                </button>
              </div>

              {/* Section Header Controls */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Disciplines Section Heading
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setDisciplinesEyebrow(DEFAULT_DISCIPLINES_EYEBROW);
                      setDisciplinesTitle(DEFAULT_DISCIPLINES_TITLE);
                      setDisciplinesSubtitle(DEFAULT_DISCIPLINES_SUBTITLE);
                      setDisciplines(DEFAULT_DISCIPLINES);
                      setDisciplinesCardBg(true);
                      setDisciplinesCardBgColor('#FAF8F5');
                      setShowDisciplinesSection(true);
                      toast.info('Restored default creative disciplines.');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 transition-colors inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Defaults</span>
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
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
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
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
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
                    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
              </div>

              {/* Card Background Color Option with Hex Picker and Presets */}
              <CardBackgroundControls
                sectionName="Discipline"
                hasBackground={disciplinesCardBg}
                onToggleBackground={(enabled) => setDisciplinesCardBg(enabled)}
                bgColor={disciplinesCardBgColor}
                onBgColorChange={(color) => setDisciplinesCardBgColor(color)}
                previewTitle="Hospitality & Architecture"
                previewDescription="Capturing boutique hotels, coastal private villas, safari camps, and interior architecture with natural ambient light."
              />

              {/* Cards List Header with Add Section button */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Discipline Sections</span>
                    <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {disciplines.length} {disciplines.length === 1 ? 'discipline' : 'disciplines'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Add new disciplines or delete sections. You can edit numbers, titles, and descriptions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddDiscipline}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Discipline Section</span>
                </button>
              </div>

              {/* Disciplines Cards List */}
              {disciplines.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Discipline Sections</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      You have deleted all discipline sections. Add one using the button below or restore defaults.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleAddDiscipline}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-lg shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Discipline</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDisciplines(DEFAULT_DISCIPLINES);
                        setShowDisciplinesSection(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Default Disciplines</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {disciplines.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3 group hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Discipline Section {item.number}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                            ({item.title || 'Untitled'})
                          </span>
                        </div>

                        {/* Prominent DELETE SECTION button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveDiscipline(index)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-lg transition-colors font-medium border border-rose-200/60 dark:border-rose-900/40 shrink-0"
                          title="Delete this discipline section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Section</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                            Number
                          </label>
                          <input
                            type="text"
                            value={item.number}
                            onChange={(e) => handleDisciplineChange(index, 'number', e.target.value)}
                            placeholder="01"
                            maxLength={4}
                            className="w-full px-2 py-1.5 text-xs font-mono font-bold text-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 outline-none"
                          />
                        </div>

                        <div className="sm:col-span-10">
                          <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                            Discipline Title
                          </label>
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => handleDisciplineChange(index, 'title', e.target.value)}
                            placeholder="Discipline Title (e.g. Hospitality & Architecture)"
                            className="w-full px-3 py-1.5 text-sm font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">
                          Description
                        </label>
                        <textarea
                          value={item.description}
                          onChange={(e) => handleDisciplineChange(index, 'description', e.target.value)}
                          placeholder="Description of deliverables, scope, and visual storytelling ethos..."
                          rows={2}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: CUSTOM SECTIONS (Add new sections and delete sections freely) */}
          {activeTab === 'custom' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Custom Editorial Sections
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Add new sections to the About page (e.g., Exhibitions, Accolades, Publications, or Press). You can delete or add sections whenever you want.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomSection}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Section</span>
                </button>
              </div>

              {customSections.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Custom Sections Yet</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Click the button below to add a new custom section. You can choose card background colors like #faf8f5 and edit all contents.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleAddCustomSection}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-lg shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Custom Section</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {customSections.map((sec, idx) => (
                    <div 
                      key={sec.id || idx}
                      className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Custom Section 0{idx + 1}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                            ({sec.title || 'Untitled'})
                          </span>
                        </div>

                        {/* DELETE SECTION BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomSection(idx)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-lg transition-colors font-medium border border-rose-200/60 dark:border-rose-900/40 shrink-0"
                          title="Delete this custom section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Section</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Eyebrow Tag
                          </label>
                          <input
                            type="text"
                            value={sec.eyebrow}
                            onChange={(e) => handleCustomSectionChange(idx, 'eyebrow', e.target.value)}
                            placeholder="e.g. SELECTED EXHIBITIONS"
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Section Title
                          </label>
                          <input
                            type="text"
                            value={sec.title}
                            onChange={(e) => handleCustomSectionChange(idx, 'title', e.target.value)}
                            placeholder="e.g. Solo & Group Exhibitions"
                            className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-slate-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Section Content / Narrative
                        </label>
                        <textarea
                          value={sec.content}
                          onChange={(e) => handleCustomSectionChange(idx, 'content', e.target.value)}
                          rows={3}
                          placeholder="Enter details, exhibition dates, client list, or biography points..."
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 outline-none leading-relaxed focus:ring-1 focus:ring-slate-900 resize-y"
                        />
                      </div>

                      {/* Card Background Controls for Custom Section */}
                      <CardBackgroundControls
                        sectionName={`Custom Section 0${idx + 1}`}
                        hasBackground={sec.cardBg}
                        onToggleBackground={(enabled) => handleCustomSectionChange(idx, 'cardBg', enabled)}
                        bgColor={sec.cardBgColor || '#FAF8F5'}
                        onBgColorChange={(color) => handleCustomSectionChange(idx, 'cardBgColor', color)}
                        previewTitle={sec.title || 'Custom Section Card'}
                        previewDescription={sec.content || 'Sample preview of your custom section card content.'}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: BIOGRAPHY & QUOTE */}
          {activeTab === 'bio' && (
            <div className="space-y-6">
              {/* Featured Quote Section */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="bioQuote" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Featured Artist Quote / Opening Philosophy
                  </label>
                  <button
                    type="button"
                    onClick={() => setBioQuote(DEFAULT_BIO_QUOTE)}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 transition-colors inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
                <textarea
                  id="bioQuote"
                  value={bioQuote}
                  onChange={(e) => setBioQuote(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 text-sm font-editorial italic bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white leading-relaxed resize-none"
                  placeholder="Enter the italic opening quote for the About page..."
                />
              </div>

              {/* Biography Text & Portrait Photo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Photo Column */}
                <div className="flex flex-col gap-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
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
                    className="w-full py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Upload New Portrait</span>
                  </button>
                </div>

                {/* Narrative Text Column */}
                <div className="md:col-span-2 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Narrative Biography Paragraphs
                    </label>
                    <button
                      type="button"
                      onClick={() => setAboutText("Hey there! I am Michael Mwabonje Ringa, an East African photographer based in Malindi specialising in hospitality, Wedding, portraits, and documentary visual storytelling. My work is heavily inspired by the coastal beauty of Kenya and the intimate stories of the people who inhabit it.\n\nFor me, photography is more than just clicking a button; it is about preserving fleeting moments, translating emotions into visuals, and crafting narratives that transcend time.\n\nWhether I'm shooting an elegant property or directing a visual project, my focus remains on authenticity, natural light, and elegant composition.\n\nAvailable for travel. Let's create something beautiful together.")}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 transition-colors inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                  <textarea
                    rows={12}
                    value={aboutText}
                    onChange={(e) => setAboutText(e.target.value)}
                    className="w-full flex-1 min-h-[300px] px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none transition-all resize-y text-sm leading-relaxed text-slate-900 dark:text-slate-100"
                    placeholder="Enter your biography text here (separate paragraphs with empty lines)..."
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    The portrait photo card on the About page will automatically match the height of these narrative paragraphs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HEADER & PLACARD */}
          {activeTab === 'placard' && (
            <div className="space-y-6">
              {/* Page Top Header */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Page Main Title &amp; Tagline
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Main Header Name / Title
                    </label>
                    <input
                      type="text"
                      value={pageHeaderTitle}
                      onChange={(e) => setPageHeaderTitle(e.target.value)}
                      placeholder="Michael Mwabonje Ringa"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Header Subtitle / Tagline
                    </label>
                    <input
                      type="text"
                      value={pageHeaderSubtitle}
                      onChange={(e) => setPageHeaderSubtitle(e.target.value)}
                      placeholder="Visual storyteller and lifestyle photographer capturing the authentic warmth, architectural quiet, and coastal narratives of East Africa."
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Portrait Placard Specifications */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Left Card Spec Placard
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setPlacardName(DEFAULT_PLACARD_NAME);
                      setPlacardRole(DEFAULT_PLACARD_ROLE);
                      setPlacardBase(DEFAULT_PLACARD_BASE);
                      setPlacardAvailability(DEFAULT_PLACARD_AVAILABILITY);
                      setPlacardFocus(DEFAULT_PLACARD_FOCUS);
                      setPlacardButtonText(DEFAULT_PLACARD_BUTTON_TEXT);
                      toast.info('Restored default placard specs.');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 transition-colors inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Placard Name
                    </label>
                    <input
                      type="text"
                      value={placardName}
                      onChange={(e) => setPlacardName(e.target.value)}
                      placeholder="Michael Mwabonje Ringa"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Role / Sub-title
                    </label>
                    <input
                      type="text"
                      value={placardRole}
                      onChange={(e) => setPlacardRole(e.target.value)}
                      placeholder="Photographer & Filmmaker"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Base Location
                    </label>
                    <input
                      type="text"
                      value={placardBase}
                      onChange={(e) => setPlacardBase(e.target.value)}
                      placeholder="Malindi & Coast, Kenya"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Travel Availability
                    </label>
                    <input
                      type="text"
                      value={placardAvailability}
                      onChange={(e) => setPlacardAvailability(e.target.value)}
                      placeholder="Kenya & Worldwide Travel"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Focus Areas
                    </label>
                    <input
                      type="text"
                      value={placardFocus}
                      onChange={(e) => setPlacardFocus(e.target.value)}
                      placeholder="Hospitality, Lifestyle, Portraits"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Action Button Text
                    </label>
                    <input
                      type="text"
                      value={placardButtonText}
                      onChange={(e) => setPlacardButtonText(e.target.value)}
                      placeholder="Inquire for Commissions"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: INQUIRIES BANNER */}
          {activeTab === 'inquiries' && (
            <div className="space-y-6">
              {/* Inquiries Banner Visibility Control: Delete or Add Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${showInquiriesSection ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Inquiries Banner Section
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {showInquiriesSection 
                        ? 'Closing banner with contact buttons is visible on the About page.' 
                        : 'Closing banner is deleted / hidden from the About page.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !showInquiriesSection;
                    setShowInquiriesSection(next);
                    toast.info(next ? 'Added Inquiries banner section to page.' : 'Deleted / hidden Inquiries banner from page.');
                  }}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-colors flex items-center gap-1.5 ${
                    showInquiriesSection 
                      ? 'bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                  }`}
                >
                  {showInquiriesSection ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Section from Page</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Section to Page</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Closing Inquiries Banner
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setInquiriesEyebrow(DEFAULT_INQUIRIES_EYEBROW);
                      setInquiriesTitle(DEFAULT_INQUIRIES_TITLE);
                      setInquiriesSubtitle(DEFAULT_INQUIRIES_SUBTITLE);
                      setInquiriesWhatsappLabel(DEFAULT_INQUIRIES_WHATSAPP_LABEL);
                      setInquiriesEmailLabel(DEFAULT_INQUIRIES_EMAIL_LABEL);
                      setShowInquiriesSection(true);
                      toast.info('Restored default inquiries banner.');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 transition-colors inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Banner Eyebrow Tag
                    </label>
                    <input
                      type="text"
                      value={inquiriesEyebrow}
                      onChange={(e) => setInquiriesEyebrow(e.target.value)}
                      placeholder="Inquiries & Commissions"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Main Banner Heading
                    </label>
                    <input
                      type="text"
                      value={inquiriesTitle}
                      onChange={(e) => setInquiriesTitle(e.target.value)}
                      placeholder="Ready to create something timeless together?"
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Banner Subtitle / Description
                    </label>
                    <textarea
                      value={inquiriesSubtitle}
                      onChange={(e) => setInquiriesSubtitle(e.target.value)}
                      rows={2}
                      placeholder="Available for commercial hospitality briefs, editorial assignments, destination weddings..."
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none resize-none leading-relaxed focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        WhatsApp Button Label
                      </label>
                      <input
                        type="text"
                        value={inquiriesWhatsappLabel}
                        onChange={(e) => setInquiriesWhatsappLabel(e.target.value)}
                        placeholder="Chat on WhatsApp"
                        className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Email Button Label
                      </label>
                      <input
                        type="text"
                        value={inquiriesEmailLabel}
                        onChange={(e) => setInquiriesEmailLabel(e.target.value)}
                        placeholder="Send an Email"
                        className="w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                      />
                    </div>
                  </div>
                </div>
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
    );

  if (embedded) {
    return innerContent;
  }

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[100] animate-in fade-in duration-200">
      {innerContent}
    </div>
  );
};
