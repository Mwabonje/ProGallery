import React, { useState } from 'react';
import { X, LayoutGrid, Check, Sparkles, Image as ImageIcon, Eye } from 'lucide-react';
import { EditorialGridData, EditorialGridImage, EditorialGridLayout, EDITORIAL_LAYOUT_CONFIGS } from '../utils/editorialGrid';

interface EditorialGridModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (data: EditorialGridData) => void;
}

const SAMPLE_COASTAL_IMAGES = [
  {
    url: 'https://images.pexels.com/photos/17311090/pexels-photo-17311090.jpeg',
    caption: 'Lamu Old Town sunset glow',
    alt: 'Coastal sunset portrait in Lamu'
  },
  {
    url: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg',
    caption: 'Fine art wedding florals & stationery',
    alt: 'Wedding rings and coastal details'
  },
  {
    url: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg',
    caption: 'Beachside retreat pavilion',
    alt: 'Luxury resort architecture in Watamu'
  }
];

export const EditorialGridModal: React.FC<EditorialGridModalProps> = ({
  isOpen,
  onClose,
  onInsert,
}) => {
  const [selectedLayout, setSelectedLayout] = useState<EditorialGridLayout>('2-col');
  const [images, setImages] = useState<EditorialGridImage[]>([
    { url: '', caption: '', alt: '' },
    { url: '', caption: '', alt: '' },
    { url: '', caption: '', alt: '' },
  ]);
  const [mainCaption, setMainCaption] = useState('');

  if (!isOpen) return null;

  const currentConfig = EDITORIAL_LAYOUT_CONFIGS[selectedLayout];
  const countNeeded = currentConfig.recommendedCount;

  const handleUpdateImage = (index: number, field: keyof EditorialGridImage, value: string) => {
    setImages(prev => {
      const copy = [...prev];
      if (!copy[index]) {
        copy[index] = { url: '', caption: '', alt: '' };
      }
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleQuickFillSample = () => {
    setImages([
      SAMPLE_COASTAL_IMAGES[0],
      SAMPLE_COASTAL_IMAGES[1],
      SAMPLE_COASTAL_IMAGES[2],
    ]);
    setMainCaption('Coastal Editorial Series · Malindi & Watamu');
  };

  const handleInsert = (e: React.FormEvent) => {
    e.preventDefault();
    const activeImages = images.slice(0, countNeeded).filter(img => Boolean(img.url.trim()));
    if (activeImages.length === 0) {
      alert('Please add at least one valid image URL for this grid layout.');
      return;
    }

    onInsert({
      layout: selectedLayout,
      images: activeImages,
      caption: mainCaption.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#111722] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#0c1017]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Editorial Photo Grid Block
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60">
                  Magazine Spread
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Insert side-by-side portrait pairings, 3-photo story strips, or asymmetric mosaics.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleInsert} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Step 1: Layout Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Select Editorial Layout
              </label>
              <button
                type="button"
                onClick={handleQuickFillSample}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Quick-fill demo images
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(Object.keys(EDITORIAL_LAYOUT_CONFIGS) as EditorialGridLayout[]).map((key) => {
                const conf = EDITORIAL_LAYOUT_CONFIGS[key];
                const isSelected = selectedLayout === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedLayout(key)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-500 dark:bg-emerald-950/30 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-[#161f2e] border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-white flex items-center justify-between">
                        <span>{conf.name.split(' ')[0]}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {conf.description}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-2 block">
                      {conf.iconLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Image Slots */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              2. Add Photos ({countNeeded} {countNeeded === 1 ? 'Photo' : 'Photos'} for this layout)
            </label>

            <div className="space-y-3">
              {Array.from({ length: countNeeded }).map((_, idx) => {
                const img = images[idx] || { url: '', caption: '', alt: '' };
                return (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#161f2e] border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row gap-3 items-start"
                  >
                    {/* Thumbnail preview */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center border border-slate-300 dark:border-slate-600">
                      {img.url ? (
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Photo #{idx + 1}
                        </span>
                        {img.url && (
                          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Preview Ready
                          </span>
                        )}
                      </div>

                      <input
                        type="url"
                        placeholder="Image URL (Pexels, Cloudflare R2, or web link)..."
                        value={img.url}
                        onChange={e => handleUpdateImage(idx, 'url', e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-[#0f1520] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        required
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Optional photo caption..."
                          value={img.caption || ''}
                          onChange={e => handleUpdateImage(idx, 'caption', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-white dark:bg-[#0f1520] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Alt description for SEO / Pinterest..."
                          value={img.alt || ''}
                          onChange={e => handleUpdateImage(idx, 'alt', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-white dark:bg-[#0f1520] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Overall Grid Story Caption */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
              3. Overall Story Caption (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Watamu Beach Ceremony & Detail Styling · Photography by Mwabonje"
              value={mainCaption}
              onChange={e => setMainCaption(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#161f2e] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Insert Editorial Grid</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
