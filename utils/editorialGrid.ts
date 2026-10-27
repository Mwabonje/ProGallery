export type EditorialGridLayout = '2-col' | '3-col' | 'mosaic' | 'full-width';

export interface EditorialGridImage {
  url: string;
  caption?: string;
  alt?: string;
}

export interface EditorialGridData {
  layout: EditorialGridLayout;
  images: EditorialGridImage[];
  caption?: string;
}

export const EDITORIAL_LAYOUT_CONFIGS: Record<
  EditorialGridLayout,
  {
    name: string;
    description: string;
    recommendedCount: number;
    iconLabel: string;
  }
> = {
  '2-col': {
    name: 'Diptych (2-Column)',
    description: 'Two portraits or landscapes side-by-side (Vogue/Kinfolk editorial style).',
    recommendedCount: 2,
    iconLabel: '◫ 2-Col',
  },
  '3-col': {
    name: 'Triptych (3-Column)',
    description: 'Three detail shots in a horizontal story strip (rings, flowers, venue).',
    recommendedCount: 3,
    iconLabel: '◫ 3-Col',
  },
  'mosaic': {
    name: 'Asymmetric Mosaic',
    description: 'One prominent hero portrait paired with two stacked detail photos.',
    recommendedCount: 3,
    iconLabel: '▤ Mosaic',
  },
  'full-width': {
    name: 'Full-Width Bleed',
    description: 'Expansive cinematic landscape with an editorial caption below.',
    recommendedCount: 1,
    iconLabel: '▬ Full',
  },
};

/**
 * Generates pristine, self-contained HTML for an editorial photo grid.
 * Styled with Tailwind classes and protected with not-prose.
 */
export function generateEditorialGridHtml(data: EditorialGridData): string {
  const { layout, images, caption } = data;
  const jsonImages = JSON.stringify(images).replace(/"/g, '&quot;');
  const safeCaption = (caption || '').replace(/"/g, '&quot;');

  if (layout === '2-col') {
    const img1 = images[0] || { url: '', caption: '', alt: '' };
    const img2 = images[1] || { url: '', caption: '', alt: '' };

    return `
<div class="editorial-photo-grid not-prose my-10" data-editorial-grid="true" data-layout="2-col" data-images="${jsonImages}" data-caption="${safeCaption}">
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-stretch">
    <figure class="group/pin relative overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-sm m-0 flex flex-col">
      <div class="relative w-full aspect-[3/4] sm:aspect-[4/5] overflow-hidden">
        <img src="${img1.url}" alt="${img1.alt || 'Editorial portrait'}" class="w-full h-full object-cover transition-transform duration-700 group-hover/pin:scale-[1.02]" loading="lazy" />
      </div>
      ${img1.caption ? `<figcaption class="mt-2 text-xs text-slate-500 dark:text-slate-400 italic text-center font-serif">${img1.caption}</figcaption>` : ''}
    </figure>
    <figure class="group/pin relative overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-sm m-0 flex flex-col">
      <div class="relative w-full aspect-[3/4] sm:aspect-[4/5] overflow-hidden">
        <img src="${img2.url}" alt="${img2.alt || 'Editorial portrait'}" class="w-full h-full object-cover transition-transform duration-700 group-hover/pin:scale-[1.02]" loading="lazy" />
      </div>
      ${img2.caption ? `<figcaption class="mt-2 text-xs text-slate-500 dark:text-slate-400 italic text-center font-serif">${img2.caption}</figcaption>` : ''}
    </figure>
  </div>
  ${caption ? `<p class="mt-3 text-center text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-sans">${caption}</p>` : ''}
</div>`.trim();
  }

  if (layout === '3-col') {
    const itemsHtml = images.slice(0, 3).map(img => `
    <figure class="group/pin relative overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-sm m-0 flex flex-col">
      <div class="relative w-full aspect-[4/5] sm:aspect-[3/4] overflow-hidden">
        <img src="${img.url}" alt="${img.alt || 'Detail photo'}" class="w-full h-full object-cover transition-transform duration-700 group-hover/pin:scale-[1.02]" loading="lazy" />
      </div>
      ${img.caption ? `<figcaption class="mt-2 text-xs text-slate-500 dark:text-slate-400 italic text-center font-serif">${img.caption}</figcaption>` : ''}
    </figure>`).join('');

    return `
<div class="editorial-photo-grid not-prose my-10" data-editorial-grid="true" data-layout="3-col" data-images="${jsonImages}" data-caption="${safeCaption}">
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-stretch">
    ${itemsHtml}
  </div>
  ${caption ? `<p class="mt-3 text-center text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-sans">${caption}</p>` : ''}
</div>`.trim();
  }

  if (layout === 'mosaic') {
    const heroImg = images[0] || { url: '', caption: '', alt: '' };
    const stack1 = images[1] || { url: '', caption: '', alt: '' };
    const stack2 = images[2] || { url: '', caption: '', alt: '' };

    return `
<div class="editorial-photo-grid not-prose my-12" data-editorial-grid="true" data-layout="mosaic" data-images="${jsonImages}" data-caption="${safeCaption}">
  <div class="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 items-stretch">
    <div class="md:col-span-7 flex flex-col">
      <figure class="group/pin relative overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-sm h-full m-0 flex flex-col">
        <div class="relative w-full h-full min-h-[300px] md:min-h-[440px] overflow-hidden">
          <img src="${heroImg.url}" alt="${heroImg.alt || 'Featured editorial shot'}" class="w-full h-full object-cover transition-transform duration-700 group-hover/pin:scale-[1.02]" loading="lazy" />
        </div>
        ${heroImg.caption ? `<figcaption class="mt-2 text-xs text-slate-500 dark:text-slate-400 italic text-center font-serif">${heroImg.caption}</figcaption>` : ''}
      </figure>
    </div>
    <div class="md:col-span-5 flex flex-col gap-4 sm:gap-5 justify-between">
      <figure class="group/pin relative overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-sm flex-1 m-0 flex flex-col">
        <div class="relative w-full aspect-[4/3] overflow-hidden">
          <img src="${stack1.url}" alt="${stack1.alt || 'Detail shot'}" class="w-full h-full object-cover transition-transform duration-700 group-hover/pin:scale-[1.02]" loading="lazy" />
        </div>
        ${stack1.caption ? `<figcaption class="mt-1.5 text-xs text-slate-500 dark:text-slate-400 italic text-center font-serif">${stack1.caption}</figcaption>` : ''}
      </figure>
      <figure class="group/pin relative overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-sm flex-1 m-0 flex flex-col">
        <div class="relative w-full aspect-[4/3] overflow-hidden">
          <img src="${stack2.url}" alt="${stack2.alt || 'Detail shot'}" class="w-full h-full object-cover transition-transform duration-700 group-hover/pin:scale-[1.02]" loading="lazy" />
        </div>
        ${stack2.caption ? `<figcaption class="mt-1.5 text-xs text-slate-500 dark:text-slate-400 italic text-center font-serif">${stack2.caption}</figcaption>` : ''}
      </figure>
    </div>
  </div>
  ${caption ? `<p class="mt-3 text-center text-xs tracking-widest uppercase text-slate-400 dark:text-slate-500 font-sans">${caption}</p>` : ''}
</div>`.trim();
  }

  // Full-width panoramic bleed
  const fullImg = images[0] || { url: '', caption: '', alt: '' };
  return `
<div class="editorial-photo-grid not-prose my-12" data-editorial-grid="true" data-layout="full-width" data-images="${jsonImages}" data-caption="${safeCaption}">
  <figure class="group/pin relative overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-sm m-0 w-full">
    <div class="relative w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden">
      <img src="${fullImg.url}" alt="${fullImg.alt || 'Full-width cinematic view'}" class="w-full h-full object-cover transition-transform duration-700 group-hover/pin:scale-[1.01]" loading="lazy" />
    </div>
    ${(fullImg.caption || caption) ? `<figcaption class="mt-2.5 text-center text-xs tracking-widest uppercase text-slate-500 dark:text-slate-400 font-sans">${fullImg.caption || caption}</figcaption>` : ''}
  </figure>
</div>`.trim();
}
