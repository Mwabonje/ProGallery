import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { 
  Sparkles, 
  Trash2, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Save, 
  Loader2, 
  Check, 
  ArrowUpRight, 
  AlertCircle,
  HelpCircle,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { ServiceOfferingItem, ServicesSectionConfig, DEFAULT_SERVICES_SECTION } from '../types';

interface ServicesSettingsManagerProps {
  userId: string;
  onClose?: () => void;
  embedded?: boolean;
}

export const ServicesSettingsManager: React.FC<ServicesSettingsManagerProps> = ({
  userId,
  onClose,
  embedded = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [galleryId, setGalleryId] = useState<string | null>(null);
  const [fullSettings, setFullSettings] = useState<any>({});
  const [config, setConfig] = useState<ServicesSectionConfig>(DEFAULT_SERVICES_SECTION);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
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
          setGalleryId(gal.id);
          if (gal.title) {
            try {
              const parsed = JSON.parse(gal.title);
              setFullSettings(parsed);
              if (parsed.servicesSection) {
                setConfig({
                  ...DEFAULT_SERVICES_SECTION,
                  ...parsed.servicesSection,
                  services: Array.isArray(parsed.servicesSection.services) && parsed.servicesSection.services.length > 0
                    ? parsed.servicesSection.services
                    : DEFAULT_SERVICES_SECTION.services
                });
              } else {
                setConfig(DEFAULT_SERVICES_SECTION);
              }
            } catch (e) {
              console.error('Failed to parse settings JSON:', e);
              setConfig(DEFAULT_SERVICES_SECTION);
            }
          }
        }
      } catch (err: any) {
        console.error('Error loading services settings:', err);
        toast.error('Failed to load services settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [userId]);

  const handleSave = async (customConfig?: ServicesSectionConfig) => {
    setSaving(true);
    const targetConfig = customConfig || config;
    try {
      const updatedSettings = {
        ...fullSettings,
        servicesSection: targetConfig
      };

      if (galleryId) {
        const { error } = await supabase
          .from('galleries')
          .update({
            title: JSON.stringify(updatedSettings),
            link_enabled: true
          })
          .eq('id', galleryId);

        if (error) throw error;
      } else {
        const { data: newGal, error } = await supabase
          .from('galleries')
          .insert([
            {
              photographer_id: userId,
              client_name: 'SITE_SETTINGS',
              title: JSON.stringify(updatedSettings),
              category: 'SETTINGS',
              agreed_balance: 0,
              amount_paid: 0,
              link_enabled: true
            }
          ])
          .select()
          .single();

        if (error) throw error;
        if (newGal) setGalleryId(newGal.id);
      }

      setFullSettings(updatedSettings);
      toast.success(
        targetConfig.showSection 
          ? 'Studio offerings updated successfully!' 
          : 'Services section hidden from homepage.'
      );
    } catch (err: any) {
      console.error('Error saving services section:', err);
      toast.error('Failed to save services settings: ' + (err.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSection = () => {
    const updated = { ...config, showSection: !config.showSection };
    setConfig(updated);
    handleSave(updated);
  };

  const handleDeleteSection = () => {
    const updated = { ...config, showSection: false };
    setConfig(updated);
    handleSave(updated);
  };

  const handleRestoreSection = () => {
    const updated = { ...config, showSection: true };
    setConfig(updated);
    handleSave(updated);
  };

  const handleAddService = () => {
    const nextNumber = String(config.services.length + 1).padStart(2, '0');
    const newService: ServiceOfferingItem = {
      id: `srv-${Date.now()}`,
      number: nextNumber,
      title: 'New Photography Service',
      description: 'Describe this service, location, and aesthetic approach for prospective clients.',
      linkText: 'Explore More',
      linkUrl: '/blog'
    };
    setConfig({
      ...config,
      services: [...config.services, newService]
    });
    toast.success('Added new service card.');
  };

  const handleUpdateService = (index: number, field: keyof ServiceOfferingItem, value: string) => {
    const updated = [...config.services];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({ ...config, services: updated });
  };

  const handleDeleteService = (index: number) => {
    if (config.services.length <= 1) {
      toast.error('You must keep at least one service card, or disable/delete the entire section above.');
      return;
    }
    const updated = config.services.filter((_, idx) => idx !== index);
    setConfig({ ...config, services: updated });
    toast.info('Service card removed.');
  };

  const handleMoveService = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === config.services.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...config.services];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setConfig({ ...config, services: updated });
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_SERVICES_SECTION);
    toast.info('Reset to default coastal offerings. Click "Save Offerings" to publish.');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 h-64 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-slate-500" />
        <p className="text-sm font-medium">Loading studio offerings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100">
      {/* Top Banner & Section Master Switch */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${config.showSection ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Studio Offerings &amp; Services Section
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                  config.showSection 
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}>
                  {config.showSection ? 'Active on Homepage' : 'Hidden / Deleted'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage the three-column photography offerings, headline, descriptions, and CTA banner on your homepage.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {config.showSection ? (
              <button
                type="button"
                onClick={handleDeleteSection}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Delete this entire section from the homepage"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Section</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRestoreSection}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Restore Section</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={handleResetDefaults}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Reset all fields to original defaults"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!config.showSection && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>This section is currently <strong>deleted/hidden</strong> from the live homepage. Visitors will not see it.</span>
            </div>
            <button
              type="button"
              onClick={handleRestoreSection}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] font-semibold tracking-wider uppercase transition-colors shrink-0 cursor-pointer shadow-sm"
            >
              Restore to Live
            </button>
          </div>
        )}
      </div>

      {/* Main Form Content */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-8 min-h-0">
        {/* Section 1: Header Copy */}
        <div className="bg-slate-50/70 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span>Section Header &amp; Subtitle</span>
            </h4>
            <span className="text-[11px] text-slate-400">Controls top title and introduction</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Eyebrow Text (Small Top Label)
              </label>
              <input
                type="text"
                value={config.eyebrow}
                onChange={(e) => setConfig({ ...config, eyebrow: e.target.value })}
                placeholder="STUDIO OFFERINGS · MALINDI, KILIFI COUNTY & KENYAN COAST"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Main Section Title (H2)
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig({ ...config, title: e.target.value })}
                placeholder="Photography Services & Visual Storytelling Across the Coast"
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-sm font-serif font-medium text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Section Introduction Subtitle
              </label>
              <textarea
                value={config.subtitle}
                onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                rows={3}
                placeholder="Based in Malindi, Mwabonje Photography documents intimate weddings..."
                className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Service Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                Service Cards ({config.services.length})
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Each card displays a service number, title, description, and link button.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddService}
              className="px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-lg text-xs font-semibold tracking-wider uppercase hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Card</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {config.services.map((item, index) => (
              <div 
                key={item.id || index}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-700 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.title || `Service ${index + 1}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveService(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Move card up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveService(index, 'down')}
                      disabled={index === config.services.length - 1}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Move card down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(index)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors ml-1"
                      title="Delete this service card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Number
                    </label>
                    <input
                      type="text"
                      value={item.number}
                      onChange={(e) => handleUpdateService(index, 'number', e.target.value)}
                      placeholder="01"
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-xs font-mono font-medium text-slate-900 dark:text-white text-center focus:outline-none focus:border-slate-400"
                    />
                  </div>

                  <div className="sm:col-span-10">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Service Title (H3)
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdateService(index, 'title', e.target.value)}
                      placeholder="Wedding Photographer in Malindi & Watamu"
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-sm font-serif text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Service Description
                  </label>
                  <textarea
                    value={item.description}
                    onChange={(e) => handleUpdateService(index, 'description', e.target.value)}
                    rows={2}
                    placeholder="Documenting barefoot beach ceremonies, sunset vows..."
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-xs leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Link Button Label
                    </label>
                    <input
                      type="text"
                      value={item.linkText}
                      onChange={(e) => handleUpdateService(index, 'linkText', e.target.value)}
                      placeholder="Wedding Guides"
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Link Target URL (Internal or External)
                    </label>
                    <input
                      type="text"
                      value={item.linkUrl}
                      onChange={(e) => handleUpdateService(index, 'linkUrl', e.target.value)}
                      placeholder="/blog or /about or /faq or https://..."
                      className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 dark:bg-slate-800/80 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Bottom Call to Action Banner */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span>Bottom Call-to-Action Banner</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                The dark banner displayed below the service cards.
              </p>
            </div>
            
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.showCta}
                onChange={(e) => setConfig({ ...config, showCta: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              <span className="ml-2 text-xs font-medium text-slate-300">
                {config.showCta ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          {config.showCta && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Banner Headline
                </label>
                <input
                  type="text"
                  value={config.ctaTitle}
                  onChange={(e) => setConfig({ ...config, ctaTitle: e.target.value })}
                  placeholder="Planning a shoot or celebrating on the coast?"
                  className="w-full px-3.5 py-2 border border-slate-700 bg-slate-800/90 rounded-lg text-sm text-white focus:outline-none focus:border-slate-500 font-serif"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Banner Description
                </label>
                <input
                  type="text"
                  value={config.ctaSubtitle}
                  onChange={(e) => setConfig({ ...config, ctaSubtitle: e.target.value })}
                  placeholder="Read our client FAQ, learn about our creative vision, or explore coastal guides in our Journal."
                  className="w-full px-3.5 py-2 border border-slate-700 bg-slate-800/90 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-slate-500 leading-relaxed"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={config.ctaButtonText}
                    onChange={(e) => setConfig({ ...config, ctaButtonText: e.target.value })}
                    placeholder="Enquire About a Session"
                    className="w-full px-3.5 py-2 border border-slate-700 bg-slate-800/90 rounded-lg text-xs text-white focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Custom Button Link (Leave empty to use main booking link)
                  </label>
                  <input
                    type="text"
                    value={config.ctaButtonLink || ''}
                    onChange={(e) => setConfig({ ...config, ctaButtonLink: e.target.value })}
                    placeholder="Defaults to Enquire link or WhatsApp"
                    className="w-full px-3.5 py-2 border border-slate-700 bg-slate-800/90 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between shrink-0">
        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
          {config.showSection ? 'Changes will immediately update the live homepage.' : 'Section is currently hidden from live view.'}
        </span>

        <div className="flex items-center gap-3 ml-auto">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-xs font-semibold tracking-wider uppercase rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Offerings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
