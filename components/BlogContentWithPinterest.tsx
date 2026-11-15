import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';

interface BlogContentWithPinterestProps {
  content: string;
  postTitle: string;
  pageUrl: string;
}

interface HoveredImageState {
  src: string;
  alt: string;
  top: number;
  left: number;
  width: number;
  visible: boolean;
}

export const BlogContentWithPinterest: React.FC<BlogContentWithPinterestProps> = ({
  content,
  postTitle,
  pageUrl,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredImage, setHoveredImage] = useState<HoveredImageState>({
    src: '',
    alt: '',
    top: 0,
    left: 0,
    width: 0,
    visible: false,
  });
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnterImg = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'img') {
        const img = target as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current);
        }

        setHoveredImage({
          src: img.currentSrc || img.src,
          alt: img.alt || postTitle,
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
          width: rect.width,
          visible: true,
        });
      }
    };

    const handleMouseLeaveImg = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'img') {
        hideTimeoutRef.current = setTimeout(() => {
          setHoveredImage(prev => ({ ...prev, visible: false }));
        }, 300);
      }
    };

    container.addEventListener('mouseover', handleMouseEnterImg);
    container.addEventListener('mouseout', handleMouseLeaveImg);

    return () => {
      container.removeEventListener('mouseover', handleMouseEnterImg);
      container.removeEventListener('mouseout', handleMouseLeaveImg);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [content, postTitle]);

  const handleSaveToPinterest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const pinUrl = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}&media=${encodeURIComponent(hoveredImage.src)}&description=${encodeURIComponent(hoveredImage.alt || postTitle)}`;
    window.open(pinUrl, '_blank', 'width=650,height=550,noopener,noreferrer');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Article Content */}
      <div
        className="blog-article-prose prose prose-slate dark:prose-invert prose-base sm:prose-lg max-w-[72ch] mx-auto prose-p:my-5 prose-p:text-[15px] md:prose-p:text-[16px] prose-p:leading-[1.8] prose-p:text-[#050505] dark:prose-p:text-[#faf8f5]/85 prose-headings:font-['Playfair_Display'] prose-headings:font-semibold prose-headings:tracking-[-0.02em] prose-headings:text-[#050505] dark:prose-headings:text-[#faf8f5] prose-h2:mb-4 prose-h2:mt-12 prose-h2:text-[25px] md:prose-h2:text-[29px] prose-h2:leading-[1.2] prose-h3:mb-3 prose-h3:mt-8 prose-h3:text-[20px] prose-h3:leading-[1.3] prose-a:text-[#0f172b] dark:prose-a:text-[#faf8f5] hover:prose-a:text-[#050505] prose-img:my-8 prose-img:max-h-[520px] prose-img:w-full prose-img:rounded-xl prose-img:object-cover prose-blockquote:my-8 prose-blockquote:border-l-[3px] prose-blockquote:border-[#0f172b] prose-blockquote:bg-[#0f172b]/[0.04] dark:prose-blockquote:bg-[#faf8f5]/[0.06] prose-blockquote:pl-5 prose-blockquote:py-3 prose-blockquote:font-editorial prose-blockquote:text-[21px] prose-blockquote:italic prose-blockquote:leading-[1.4] prose-blockquote:text-[#050505] dark:prose-blockquote:text-[#faf8f5] prose-ul:my-5 prose-ol:my-5 prose-li:my-2 prose-hr:my-10 prose-hr:border-[#0f172b]/15 dark:prose-hr:border-[#faf8f5]/15 text-[#050505] dark:text-[#faf8f5]/85 transition-colors"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(content, {
            ADD_TAGS: ['figure', 'figcaption'],
            ADD_ATTR: [
              'loading',
              'data-editorial-grid',
              'data-layout',
              'data-images',
              'data-caption',
              'target',
              'rel',
            ],
          }),
        }}
      />

      {/* Floating Interactive Pinterest Button on Hovered Image */}
      {hoveredImage.visible && hoveredImage.src && (
        <div
          style={{
            position: 'absolute',
            top: `${hoveredImage.top + 12}px`,
            left: `${hoveredImage.left + hoveredImage.width - 92}px`,
          }}
          onMouseEnter={() => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            setHoveredImage(prev => ({ ...prev, visible: true }));
          }}
          onMouseLeave={() => {
            setHoveredImage(prev => ({ ...prev, visible: false }));
          }}
          className="z-30 hidden pointer-events-auto animate-in fade-in zoom-in-95 duration-150 sm:block"
        >
          <button
            type="button"
            onClick={handleSaveToPinterest}
            className="px-3 py-1.5 rounded-full bg-[#0f172b] hover:bg-[#050505] text-[#faf8f5] text-[11px] font-bold flex items-center gap-1.5 shadow-lg shadow-black/25 cursor-pointer transform hover:scale-105 active:scale-95 transition-all"
            title="Save this photo to Pinterest"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.057.24-.19.291-.44.175-1.644-.766-2.671-3.169-2.671-5.102 0-4.156 3.019-7.973 8.709-7.973 4.572 0 8.125 3.259 8.125 7.614 0 4.544-2.864 8.2-6.84 8.2-1.336 0-2.591-.695-3.021-1.514l-.823 3.138c-.298 1.146-1.104 2.583-1.644 3.456C9.882 23.834 10.926 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
            </svg>
            <span>Save</span>
          </button>
        </div>
      )}
    </div>
  );
};
