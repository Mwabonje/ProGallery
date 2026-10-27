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

    // Create a temporary element to return the rendered HTML string as DOMSpec
    // ProseMirror accepts string or DOM elements. We create a container div:
    const htmlString = generateEditorialGridHtml({ layout, images, caption });
    
    // We parse the generated HTML into a DOM node so TipTap outputs the exact structure
    const temp = document.createElement('div');
    temp.innerHTML = htmlString;
    const gridEl = temp.firstElementChild;

    if (gridEl) {
      // Return ProseMirror DOMSpec format
      const dom = gridEl as HTMLElement;
      return {
        dom,
      };
    }

    return ['div', { class: 'editorial-photo-grid' }, ''];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EditorialGridNodeView);
  },
});
