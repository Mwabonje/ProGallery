import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Trash2, LayoutGrid, Image as ImageIcon } from 'lucide-react';
import { EditorialGridImage, EditorialGridLayout, EDITORIAL_LAYOUT_CONFIGS } from '../utils/editorialGrid';

export const EditorialGridNodeView: React.FC<any> = ({ node, deleteNode }) => {
  const layout: EditorialGridLayout = node.attrs.layout || '2-col';
  const images: EditorialGridImage[] = node.attrs.images || [];
  const caption: string = node.attrs.caption || '';
  const config = EDITORIAL_LAYOUT_CONFIGS[layout] || EDITORIAL_LAYOUT_CONFIGS['2-col'];

  return (
    <NodeViewWrapper className="editorial-grid-wrapper my-6 not-prose select-none group/nodeview relative">
      {/* Editorial Node Header / Action Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
          <LayoutGrid className="w-3.5 h-3.5 text-emerald-600" />
          <span>{config.name}</span>
          <span className="text-[10px] text-slate-400">({images.length} photos)</span>
        </div>
        <button
          type="button"
          onClick={deleteNode}
          className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
          title="Delete this editorial grid"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid Layout Render */}
      {layout === '2-col' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex flex-col">
              <div className="aspect-[3/4] relative overflow-hidden bg-slate-200 dark:bg-slate-700">
                {img.url ? (
                  <img src={img.url} alt={img.alt || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
              {img.caption && (
                <div className="p-1.5 text-center text-xs text-slate-500 italic font-serif">
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {layout === '3-col' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {images.map((img, idx) => (
            <div key={idx} className="bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex flex-col">
              <div className="aspect-[4/5] relative overflow-hidden bg-slate-200 dark:bg-slate-700">
                {img.url ? (
                  <img src={img.url} alt={img.alt || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
              {img.caption && (
                <div className="p-1.5 text-center text-xs text-slate-500 italic font-serif">
                  {img.caption}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {layout === 'mosaic' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
          <div className="md:col-span-7 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex flex-col">
            <div className="h-full min-h-[260px] relative overflow-hidden bg-slate-200 dark:bg-slate-700">
              {images[0]?.url ? (
                <img src={images[0].url} alt={images[0].alt || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
              )}
            </div>
            {images[0]?.caption && (
              <div className="p-1.5 text-center text-xs text-slate-500 italic font-serif">
                {images[0].caption}
              </div>
            )}
          </div>
          <div className="md:col-span-5 flex flex-col gap-3 justify-between">
            {images.slice(1, 3).map((img, idx) => (
              <div key={idx} className="bg-slate-100 dark:bg-slate-800 rounded overflow-hidden flex-1 flex flex-col">
                <div className="aspect-[4/3] relative overflow-hidden bg-slate-200 dark:bg-slate-700">
                  {img.url ? (
                    <img src={img.url} alt={img.alt || ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>
                {img.caption && (
                  <div className="p-1 text-center text-xs text-slate-500 italic font-serif">
                    {img.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {layout === 'full-width' && (
        <div className="bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
          <div className="aspect-[21/9] relative overflow-hidden bg-slate-200 dark:bg-slate-700">
            {images[0]?.url ? (
              <img src={images[0].url} alt={images[0].alt || ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
          </div>
          {(images[0]?.caption || caption) && (
            <div className="p-2 text-center text-xs tracking-wider uppercase text-slate-500">
              {images[0]?.caption || caption}
            </div>
          )}
        </div>
      )}

      {caption && layout !== 'full-width' && (
        <p className="mt-2 text-center text-xs tracking-wider uppercase text-slate-400 font-sans">
          {caption}
        </p>
      )}
    </NodeViewWrapper>
  );
};
