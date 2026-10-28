import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, LayoutGrid, Check, Sparkles, Image as ImageIcon, Eye, 
  AlertCircle, Upload, Link as LinkIcon, Loader2, Trash2 
} from 'lucide-react';
import { toast } from 'sonner';
import { EditorialGridData, EditorialGridImage, EditorialGridLayout, EDITORIAL_LAYOUT_CONFIGS } from '../utils/editorialGrid';
import { uploadBlogCoverImage, formatFileSize } from '../utils/imageCompressor';

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
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [inputTab, setInputTab] = useState<Record<number, 'upload' | 'url'>>({
    0: 'upload',
    1: 'upload',
    2: 'upload',
  });

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (!isOpen) return null;

  const currentConfig = EDITORIAL_LAYOUT_CONFIGS[selectedLayout];
  const countNeeded = currentConfig.recommendedCount;

  const handleUpdateImage = (index: number, field: keyof EditorialGridImage, value: string) => {
    setErrorMessage('');
    setImages(prev => {
      const copy = [...prev];
      if (!copy[index]) {
        copy[index] = { url: '', caption: '', alt: '' };
      }
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP)');
      return;
    }

    setUploadingSlot(index);
    setUploadProgress(0);
    setErrorMessage('');

    try {
      if (file.size > 300 * 1024) {
        toast.info(`Compressing ${formatFileSize(file.size)} photo under 300 KB...`);
      }

      const result = await uploadBlogCoverImage(file, (percent) => {
        setUploadProgress(percent);
      });

      handleUpdateImage(index, 'url', result.url);
      if (!images[index]?.alt) {
        handleUpdateImage(index, 'alt', file.name.replace(/\.[^/.]+$/, ''));
      }

      toast.success(`Photo #${index + 1} uploaded successfully!`);
    } catch (err: any) {
      console.error('Failed to upload grid image:', err);
      toast.error(err.message || 'Upload failed. You can also paste an image URL directly.');
    } finally {
      setUploadingSlot(null);
      setUploadProgress(0);
    }
  };

  const handleQuickFillSample = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMessage('');
    setImages([
      SAMPLE_COASTAL_IMAGES[0],
      SAMPLE_COASTAL_IMAGES[1],
      SAMPLE_COASTAL_IMAGES[2],
    ]);
    setMainCaption('Coastal Editorial Series · Malindi & Watamu');
  };

  const handleClearSlot = (index: number) => {
    setImages(prev => {
      const copy = [...prev];
      copy[index] = { url: '', caption: '', alt: '' };
      return copy;
    });
  };

  const handleInsertClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setErrorMessage('');

    const activeImages = images.slice(0, countNeeded).filter(img => Boolean(img.url.trim()));
    if (activeImages.length === 0) {
      const msg = `Please upload or paste at least one image URL for Photo #1, or click "Quick-fill demo images" above.`;
      setErrorMessage(msg);
      toast.error('Please add at least one image');
      return;
    }

    onInsert({
      layout: selectedLayout,
      images: activeImages,
      caption: mainCaption.trim(),
    });
    onClose();
  };

  const activeImages = images.slice(0, countNeeded);
  const hasAnyImages = activeImages.some(img => Boolean(img.url.trim()));

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-[#111722] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-[#0c1017]">
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
                Upload photos from your computer or paste links for Kinfolk &amp; Vogue style pairings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Step 1: Layout Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Select Editorial Layout
              </label>
              <button
                type="button"
                onClick={handleQuickFillSample}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/60 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Quick-fill demo images
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
                    onClick={() => {
                      setSelectedLayout(key);
                      setErrorMessage('');
                    }}
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

          {/* Step 2: Add Photos Slots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Add Photos ({countNeeded} {countNeeded === 1 ? 'Photo' : 'Photos'} for this layout)
              </label>
              <span className="text-[11px] text-slate-400">
                Auto-compressed under 300 KB for rapid coastal loading
              </span>
            </div>

            <div className="space-y-3.5">
              {Array.from({ length: countNeeded }).map((_, idx) => {
                const img = images[idx] || { url: '', caption: '', alt: '' };
                const isUploading = uploadingSlot === idx;
                const tab = inputTab[idx] || 'upload';

                return (
                  <div 
                    key={idx}
                    className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-[#161f2e] border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row gap-4 items-start relative transition-all"
                  >
                    {/* Hidden file input */}
                    <input 
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      ref={el => fileInputRefs.current[idx] = el}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(idx, e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    {/* Interactive Thumbnail Box */}
                    <div 
                      onClick={() => {
                        if (!img.url) {
                          fileInputRefs.current[idx]?.click();
                        }
                      }}
                      className={`w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed relative group transition-all ${
                        img.url 
                          ? 'border-emerald-500/50 cursor-default' 
                          : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500 cursor-pointer hover:bg-emerald-50/20'
                      }`}
                      title={img.url ? 'Photo loaded' : 'Click to browse image from device'}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center justify-center p-2 text-center">
                          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mb-1" />
                          <span className="text-[10px] font-semibold text-emerald-700">{uploadProgress}%</span>
                        </div>
                      ) : img.url ? (
                        <>
                          <img 
                            src={img.url} 
                            alt={img.alt || ''} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // If image fails to load, show subtle broken indicator
                              e.currentTarget.style.opacity = '0.3';
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClearSlot(idx);
                            }}
                            className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 hover:bg-red-600 text-white transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400 group-hover:text-emerald-600 transition-colors">
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-medium leading-tight">Click to Upload</span>
                        </div>
                      )}
                    </div>

                    {/* Content & Inputs */}
                    <div className="flex-1 w-full space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          Photo #{idx + 1}
                          {img.url ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200">
                              <Eye className="w-3 h-3" /> Preview Ready
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              (Upload file or paste link below)
                            </span>
                          )}
                        </span>

                        {img.url && (
                          <button
                            type="button"
                            onClick={() => handleClearSlot(idx)}
                            className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                            title="Clear this photo"
                          >
                            <Trash2 className="w-3 h-3" /> Clear
                          </button>
                        )}
                      </div>

                      {/* Dual Source Options: Always visible */}
                      <div className="space-y-2">
                        {/* Option 1: Upload from Device */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[idx]?.click()}
                            disabled={isUploading}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{img.url ? 'Change Photo from Device' : 'Upload from Device'}</span>
                          </button>
                          <span className="text-[11px] text-slate-400 font-medium">— or use image URL: —</span>
                        </div>

                        {/* Option 2: Image URL Input */}
                        <div className="relative flex items-center">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                          <input
                            type="url"
                            placeholder="Paste image URL (e.g. https://images.pexels.com/... or web link)"
                            value={img.url}
                            onChange={e => handleUpdateImage(idx, 'url', e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#0f1520] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      {/* Captions & Alt description */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        <input
                          type="text"
                          placeholder="Photo caption (e.g. Sunset vows at Hemingway Watamu)..."
                          value={img.caption || ''}
                          onChange={e => handleUpdateImage(idx, 'caption', e.target.value)}
                          className="w-full px-2.5 py-1 text-xs bg-white dark:bg-[#0f1520] border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Alt description for Pinterest & SEO..."
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

          {/* LIVE MAGAZINE SPREAD PREVIEW (Shows user exactly what will be displayed) */}
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#0d131c] border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                Live Magazine Spread Preview
              </span>
              <span className="text-[10px] text-slate-400">
                {hasAnyImages ? 'Previewing layout' : 'Add photos above to see live preview'}
              </span>
            </div>

            {hasAnyImages ? (
              <div className="p-3 bg-white dark:bg-[#151c28] rounded-lg border border-slate-200 dark:border-slate-700/80 shadow-xs">
                {selectedLayout === '2-col' && (
                  <div className="grid grid-cols-2 gap-3 items-stretch">
                    {activeImages.map((im, i) => (
                      <div key={i} className="flex flex-col">
                        <div className="aspect-[3/4] bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
                          {im.url ? (
                            <img src={im.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                              Empty Slot #{i + 1}
                            </div>
                          )}
                        </div>
                        {im.caption && (
                          <span className="mt-1.5 text-center text-[11px] text-slate-500 italic font-serif">
                            {im.caption}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedLayout === '3-col' && (
                  <div className="grid grid-cols-3 gap-2 items-stretch">
                    {activeImages.map((im, i) => (
                      <div key={i} className="flex flex-col">
                        <div className="aspect-[4/5] bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
                          {im.url ? (
                            <img src={im.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                              Slot #{i + 1}
                            </div>
                          )}
                        </div>
                        {im.caption && (
                          <span className="mt-1 text-center text-[10px] text-slate-500 italic font-serif">
                            {im.caption}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedLayout === 'mosaic' && (
                  <div className="grid grid-cols-12 gap-2.5 items-stretch">
                    <div className="col-span-7 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden min-h-[140px]">
                      {activeImages[0]?.url ? (
                        <img src={activeImages[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                          Hero Slot
                        </div>
                      )}
                    </div>
                    <div className="col-span-5 flex flex-col gap-2">
                      {activeImages.slice(1, 3).map((im, i) => (
                        <div key={i} className="aspect-[4/3] bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
                          {im.url ? (
                            <img src={im.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                              Detail #{i + 1}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLayout === 'full-width' && (
                  <div className="aspect-[21/9] bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
                    {activeImages[0]?.url ? (
                      <img src={activeImages[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                        Full-Width View
                      </div>
                    )}
                  </div>
                )}

                {mainCaption && (
                  <p className="mt-2.5 text-center text-[11px] tracking-widest uppercase text-slate-400 font-sans">
                    {mainCaption}
                  </p>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Click <span className="font-semibold text-emerald-600">"Choose Photo from Device"</span> or <span className="font-semibold text-emerald-600">"Quick-fill demo images"</span> above to see your side-by-side spread.
              </div>
            )}
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

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
              type="button"
              onClick={handleInsertClick}
              className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer hover:shadow"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Insert Editorial Grid</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
