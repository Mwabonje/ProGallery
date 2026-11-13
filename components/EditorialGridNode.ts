import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { EditorialGridNodeView } from './EditorialGridNodeView';
import { EditorialGridImage, EditorialGridLayout, generateEditorialGridHtml } from '../utils/editorialGrid';

export const EditorialGridNode = Node.create({
  name: 'editorialPhotoGrid',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      layout: {
        default: '2-col',
        parseHTML: element => (element.getAttribute('data-layout') as EditorialGridLayout) || '2-col',
        renderHTML: attributes => ({
          'data-layout': attributes.layout || '2-col',
        }),
      },
      images: {
        default: [],
        parseHTML: element => {
          const raw = element.getAttribute('data-images');
          if (raw) {
            try {
              const decoded = raw.replace(/&quot;/g, '"');
              const parsed = JSON.parse(decoded);
              if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
              }
            } catch (e) {
              // fallback to querying img tags
            }
          }
          const imgs = element.querySelectorAll('img');
          if (imgs.length > 0) {
            return Array.from(imgs).map(img => ({
              url: img.getAttribute('src') || '',
              alt: img.getAttribute('alt') || '',
              caption: img.closest('figure')?.querySelector('figcaption')?.textContent || '',
            }));
          }
          return [];
        },
        renderHTML: attributes => ({
          'data-images': JSON.stringify(attributes.images || []),
        }),
      },
      caption: {
        default: '',
        parseHTML: element => element.getAttribute('data-caption') || '',
        renderHTML: attributes => ({
          'data-caption': attributes.caption || '',
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div.editorial-photo-grid',
      },
      {
        tag: 'div[data-editorial-grid]',
      },
    ];
  },

  renderHTML({ node }) {
    const layout = (node.attrs.layout || '2-col') as EditorialGridLayout;
    const images: EditorialGridImage[] = node.attrs.images || [];
    const caption: string = node.attrs.caption || '';

    const buildFigure = (img: EditorialGridImage, aspectClass = 'aspect-[3/4] sm:aspect-[4/5]', extraFigureClass = '') =>
      [
        'figure',
        { class: `group/pin relative overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-sm m-0 flex flex-col ${extraFigureClass}`.trim() },
        [
          'div',
          { class: `relative w-full ${aspectClass} overflow-hidden` },
          ['img', { src: img.url, alt: img.alt || '', class: 'w-full h-full object-cover', loading: 'lazy' }]
        ],
        img.caption ? ['figcaption', { class: 'mt-2 text-xs text-slate-500 italic text-center font-serif' }, img.caption] : ''
      ].filter(Boolean);

    let gridContent: any;

    if (layout === 'mosaic') {
      const heroImg = images[0] || { url: '', caption: '', alt: '' };
      const stackImgs = images.slice(1, 3);
      gridContent = [
        'div',
        { class: 'grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-stretch' },
        [
          'div',
          { class: 'md:col-span-7 flex flex-col' },
          buildFigure(heroImg, 'h-full min-h-[300px] md:min-h-[440px]', 'h-full')
        ],
        [
          'div',
          { class: 'md:col-span-5 flex flex-col gap-4 sm:gap-5 justify-between' },
          ...stackImgs.map(img => buildFigure(img, 'aspect-[4/3]', 'flex-1'))
        ]
      ];
    } else if (layout === 'full-width') {
      const fullImg = images[0] || { url: '', caption: '', alt: '' };
      gridContent = [
        'div',
        { class: 'w-full' },
        buildFigure(fullImg, 'aspect-[16/9] sm:aspect-[21/9]')
      ];
    } else {
      const gridClass = layout === '3-col'
        ? 'grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch'
        : 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-stretch';
      const aspectClass = layout === '3-col' ? 'aspect-[4/5] sm:aspect-[3/4]' : 'aspect-[3/4] sm:aspect-[4/5]';
      gridContent = ['div', { class: gridClass }, ...images.map(img => buildFigure(img, aspectClass))];
    }

    return [
      'div',
      {
        class: 'editorial-photo-grid not-prose my-10',
        'data-editorial-grid': 'true',
        'data-layout': layout,
        'data-images': JSON.stringify(images),
        'data-caption': caption,
      },
      gridContent,
      caption ? ['p', { class: 'mt-3 text-center text-xs tracking-widest uppercase text-slate-400 font-sans' }, caption] : ''
    ].filter(Boolean) as any;
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorialGridNodeView);
  },
});
