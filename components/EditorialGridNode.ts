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
              return JSON.parse(raw);
            } catch (e) {
              // fallback to querying img tags
            }
          }
          const imgs = element.querySelectorAll('img');
          return Array.from(imgs).map(img => ({
            url: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '',
            caption: img.closest('figure')?.querySelector('figcaption')?.textContent || '',
          }));
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

    const figures = images.map(img => [
      'figure',
      { class: 'group/pin relative overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-sm m-0 flex flex-col' },
      [
        'div',
        { class: 'relative w-full aspect-[3/4] sm:aspect-[4/5] overflow-hidden' },
        ['img', { src: img.url, alt: img.alt || '', class: 'w-full h-full object-cover', loading: 'lazy' }]
      ],
      img.caption ? ['figcaption', { class: 'mt-2 text-xs text-slate-500 italic text-center font-serif' }, img.caption] : ''
    ].filter(Boolean));

    const gridClass = layout === '3-col' 
      ? 'grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch'
      : layout === 'mosaic'
      ? 'grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-stretch'
      : layout === 'full-width'
      ? 'w-full'
      : 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-stretch';

    return [
      'div',
      {
        class: 'editorial-photo-grid not-prose my-10',
        'data-editorial-grid': 'true',
        'data-layout': layout,
        'data-images': JSON.stringify(images),
        'data-caption': caption,
      },
      ['div', { class: gridClass }, ...figures],
      caption ? ['p', { class: 'mt-3 text-center text-xs tracking-widest uppercase text-slate-400 font-sans' }, caption] : ''
    ].filter(Boolean) as any;
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorialGridNodeView);
  },
});
