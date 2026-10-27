import React, { useState } from 'react';
import { toast } from 'sonner';
import { Share2, Check, Copy } from 'lucide-react';

interface BlogSocialShareProps {
  title: string;
  url: string;
  coverImage?: string;
  variant?: 'compact' | 'card';
}

export const BlogSocialShare: React.FC<BlogSocialShareProps> = ({
  title,
  url,
  coverImage,
  variant = 'compact'
}) => {
  const [copied, setCopied] = useState(false);

  const cleanUrl = url || window.location.href;
  const encodedUrl = encodeURIComponent(cleanUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedCover = encodeURIComponent(coverImage || '');

  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} — Read on Mwabonje: ${cleanUrl}`)}`,
    pinterest: `https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedCover}&description=${encodedTitle}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&via=mwabonje_`,
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(cleanUrl).then(() => {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const openShare = (e: React.MouseEvent, targetUrl: string) => {
    e.preventDefault();
    window.open(targetUrl, '_blank', 'width=600,height=550,noopener,noreferrer');
  };

  if (variant === 'card') {
    return (
      <div className="my-12 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/30 dark:from-[#111722] dark:to-[#0f1d1d] border border-slate-200/90 dark:border-slate-800 text-center space-y-4 shadow-sm not-prose">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <Share2 className="w-5 h-5" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-serif">
            Found inspiration in this story?
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Save these visual details to your wedding Pinterest board, or share directly with your partner &amp; wedding planner.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {/* Pinterest Save Button */}
          <button
            type="button"
            onClick={(e) => openShare(e, shareLinks.pinterest)}
            className="px-4 py-2 rounded-full bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            {/* Pinterest SVG */}
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.057.24-.19.291-.44.175-1.644-.766-2.671-3.169-2.671-5.102 0-4.156 3.019-7.973 8.709-7.973 4.572 0 8.125 3.259 8.125 7.614 0 4.544-2.864 8.2-6.84 8.2-1.336 0-2.591-.695-3.021-1.514l-.823 3.138c-.298 1.146-1.104 2.583-1.644 3.456C9.882 23.834 10.926 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
            </svg>
            <span>Save to Pinterest</span>
          </button>

          {/* WhatsApp Share Button */}
          <button
            type="button"
            onClick={(e) => openShare(e, shareLinks.whatsapp)}
            className="px-4 py-2 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            {/* WhatsApp SVG */}
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12.004 2C6.479 2 2 6.48 2 12.006c0 1.91.536 3.738 1.554 5.32L2.09 22.09l4.908-1.42a9.96 9.96 0 0 0 5.006 1.34h.004c5.524 0 10.003-4.48 10.003-10.005 0-2.67-1.04-5.18-2.93-7.07A9.94 9.94 0 0 0 12.004 2zm5.834 14.195c-.244.686-1.417 1.31-1.954 1.393-.505.077-1.157.11-1.874-.12-.435-.14-1-.326-1.72-.638-3.04-1.315-5.02-4.385-5.17-4.587-.15-.202-1.233-1.64-1.233-3.13 0-1.49.78-2.222 1.057-2.525.277-.302.604-.378.805-.378.2 0 .403.002.58.01.187.01.436-.07.68.518.252.605.856 2.094.932 2.245.076.15.126.328.025.53-.1.201-.151.327-.302.503-.15.177-.318.394-.453.529-.151.15-.31.313-.134.614.177.302.784 1.293 1.68 2.092 1.152 1.026 2.122 1.344 2.424 1.494.302.152.479.127.655-.075.177-.202.756-.88 1.008-1.182.251-.303.503-.252.855-.126.353.126 2.238 1.057 2.62 1.25.38.192.633.287.726.448.093.161.093.931-.151 1.617z"/>
            </svg>
            <span>Share via WhatsApp</span>
          </button>

          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3.5 py-2 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Compact bar for header/top of post
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 not-prose my-6">
      <div className="flex items-center gap-1.5 uppercase tracking-widest text-[10px] font-bold text-slate-400 dark:text-slate-500">
        <Share2 className="w-3.5 h-3.5" />
        <span>Share Story</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Pinterest Pin */}
        <button
          type="button"
          onClick={(e) => openShare(e, shareLinks.pinterest)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E60023]/10 hover:bg-[#E60023] text-[#E60023] hover:text-white transition-all text-xs font-semibold cursor-pointer group"
          title="Save this story to Pinterest"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.057.24-.19.291-.44.175-1.644-.766-2.671-3.169-2.671-5.102 0-4.156 3.019-7.973 8.709-7.973 4.572 0 8.125 3.259 8.125 7.614 0 4.544-2.864 8.2-6.84 8.2-1.336 0-2.591-.695-3.021-1.514l-.823 3.138c-.298 1.146-1.104 2.583-1.644 3.456C9.882 23.834 10.926 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
          </svg>
          <span>Pin</span>
        </button>

        {/* WhatsApp Share */}
        <button
          type="button"
          onClick={(e) => openShare(e, shareLinks.whatsapp)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366]/10 hover:bg-[#25D366] text-[#128C7E] dark:text-[#25D366] hover:text-white transition-all text-xs font-semibold cursor-pointer"
          title="Share on WhatsApp"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12.004 2C6.479 2 2 6.48 2 12.006c0 1.91.536 3.738 1.554 5.32L2.09 22.09l4.908-1.42a9.96 9.96 0 0 0 5.006 1.34h.004c5.524 0 10.003-4.48 10.003-10.005 0-2.67-1.04-5.18-2.93-7.07A9.94 9.94 0 0 0 12.004 2zm5.834 14.195c-.244.686-1.417 1.31-1.954 1.393-.505.077-1.157.11-1.874-.12-.435-.14-1-.326-1.72-.638-3.04-1.315-5.02-4.385-5.17-4.587-.15-.202-1.233-1.64-1.233-3.13 0-1.49.78-2.222 1.057-2.525.277-.302.604-.378.805-.378.2 0 .403.002.58.01.187.01.436-.07.68.518.252.605.856 2.094.932 2.245.076.15.126.328.025.53-.1.201-.151.327-.302.503-.15.177-.318.394-.453.529-.151.15-.31.313-.134.614.177.302.784 1.293 1.68 2.092 1.152 1.026 2.122 1.344 2.424 1.494.302.152.479.127.655-.075.177-.202.756-.88 1.008-1.182.251-.303.503-.252.855-.126.353.126 2.238 1.057 2.62 1.25.38.192.633.287.726.448.093.161.093.931-.151 1.617z"/>
          </svg>
          <span>WhatsApp</span>
        </button>

        {/* Copy Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          title="Copy article link"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
