import React, { useEffect, useRef, useState } from 'react';

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
        className="prose prose-slate dark:prose-invert prose-base sm:prose-lg md:prose-xl mx-auto prose-headings:font-['Playfair_Display'] prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-a:text-slate-900 dark:prose-a:text-amber-400 hover:prose-a:text-slate-600 dark:hover:prose-a:text-amber-300 prose-img:rounded-sm text-slate-700 dark:text-slate-300 transition-colors"
        dangerouslySetInnerHTML={{ __html: content }}
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
          className="z-30 pointer-events-auto animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            type="button"
            onClick={handleSaveToPinterest}
            className="px-3 py-1.5 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-[11px] font-bold flex items-center gap-1.5 shadow-lg shadow-black/25 cursor-pointer transform hover:scale-105 active:scale-95 transition-all"
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
