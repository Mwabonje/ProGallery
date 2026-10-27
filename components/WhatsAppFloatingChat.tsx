import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { X, Send, Sparkles, Clock } from 'lucide-react';

const DEFAULT_WHATSAPP_PHONE = '254705268604';
const DEFAULT_WHATSAPP_URL = `https://wa.me/${DEFAULT_WHATSAPP_PHONE}`;

export const formatWhatsappUrl = (rawLink?: string, defaultUrl = DEFAULT_WHATSAPP_URL): string => {
  if (!rawLink || !rawLink.trim()) return defaultUrl;
  const clean = rawLink.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  const digits = clean.replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    return `https://wa.me/254${digits.slice(1)}`;
  }
  if (digits.startsWith('254')) {
    return `https://wa.me/${digits}`;
  }
  return `https://wa.me/${digits || DEFAULT_WHATSAPP_PHONE}`;
};

interface QuickInquiryOption {
  label: string;
  icon: string;
  message: string;
}

const QUICK_INQUIRIES: QuickInquiryOption[] = [
  {
    label: 'Wedding Photography',
    icon: '💍',
    message: 'Hi Mwabonje! I would love to check your availability and package details for our upcoming wedding.'
  },
  {
    label: 'Hospitality & Resort Shoot',
    icon: '🏨',
    message: 'Hello Mwabonje, I would like to inquire about photography and film for a luxury villa/hospitality property.'
  },
  {
    label: 'Portraits & Lifestyle',
    icon: '📸',
    message: 'Hi Mwabonje! I am interested in booking a portrait / lifestyle photography session with you.'
  },
  {
    label: 'General Inquiry',
    icon: '✨',
    message: 'Hello Mwabonje! I came across your portfolio and wanted to ask a few questions about your services.'
  }
];

export const WhatsAppFloatingChat: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [whatsappBaseUrl, setWhatsappBaseUrl] = useState(DEFAULT_WHATSAPP_URL);
  const [brandName, setBrandName] = useState('Mwabonje');
  const chatRef = useRef<HTMLDivElement>(null);

  // Hide on admin and management screens
  const isExcludedRoute = 
    location.pathname.startsWith('/dashboard') ||
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/gallery/');

  // Fetch studio settings for dynamic WhatsApp link and studio name
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from('galleries')
          .select('title')
          .eq('category', 'SETTINGS')
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0 && data[0].title) {
          try {
            const parsed = JSON.parse(data[0].title);
            if (parsed.whatsappLink) {
              setWhatsappBaseUrl(formatWhatsappUrl(parsed.whatsappLink));
            }
            if (parsed.brandName) {
              setBrandName(parsed.brandName);
            }
          } catch (e) {
            // fallback gracefully
          }
        }
      } catch (err) {
        // use default
      }
    };

    fetchSettings();
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (isExcludedRoute) {
    return null;
  }

  const handleStartChat = (prefilledMessage?: string) => {
    const textToSend = prefilledMessage || customMessage.trim() || 'Hello Mwabonje! I would like to inquire about your photography services.';
    
    // Construct WhatsApp URL with encoded message
    const baseUrlWithoutQuery = whatsappBaseUrl.split('?')[0];
    const targetUrl = `${baseUrlWithoutQuery}?text=${encodeURIComponent(textToSend)}`;
    
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    setCustomMessage('');
    setIsOpen(false);
  };

  return (
    <div 
      ref={chatRef}
      className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-50 flex flex-col items-end pointer-events-auto"
    >
      {/* Floating Popover Card */}
      {isOpen && (
        <div 
          className="mb-3 w-[calc(100vw-2.5rem)] max-w-[360px] rounded-2xl shadow-2xl bg-white dark:bg-[#111722] border border-slate-200/90 dark:border-slate-800 overflow-hidden transform transition-all duration-200 animate-in fade-in zoom-in-95 slide-in-from-bottom-3"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {/* Header */}
          <div className="bg-[#0b141a] dark:bg-[#0b141a] text-white p-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-emerald-700/80 border border-emerald-400/40 flex items-center justify-center text-white font-bold text-sm tracking-wider">
                    M
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25D366] border-2 border-[#0b141a]" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-white tracking-wide flex items-center gap-1.5">
                    {brandName} Studio
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/50">
                      Official
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
                    Direct Studio Chat · Malindi, Kenya
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                aria-label="Close chat window"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="p-4 bg-slate-50 dark:bg-[#0e141e] space-y-3.5 max-h-[420px] overflow-y-auto">
            {/* Studio Greeting Bubble */}
            <div className="flex gap-2.5 items-start">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex-shrink-0 flex items-center justify-center text-xs font-semibold">
                M
              </div>
              <div className="bg-white dark:bg-[#1a2332] p-3 rounded-2xl rounded-tl-none border border-slate-200/80 dark:border-slate-700/60 shadow-xs text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                <p className="font-medium text-slate-900 dark:text-white mb-1">
                  Hello &amp; Karibu! 👋
                </p>
                <p>
                  Planning a wedding, luxury villa shoot, or lifestyle portraits across Malindi, Watamu, or Lamu?
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Tap a quick inquiry below or type a message to chat directly on WhatsApp:
                </p>
                <div className="mt-1.5 flex items-center justify-end text-[10px] text-slate-400">
                  <Clock className="w-3 h-3 mr-1 inline" /> Typically replies within an hour
                </div>
              </div>
            </div>

            {/* Quick Starters */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-1">
                Quick Inquiries
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {QUICK_INQUIRIES.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleStartChat(opt.message)}
                    className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-[#17202e] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{opt.icon}</span>
                      <span className="font-medium group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Send →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom Message Input Footer */}
          <div className="p-3 bg-white dark:bg-[#111722] border-t border-slate-200/90 dark:border-slate-800">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleStartChat();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Type your message..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-100 dark:bg-[#1a2332] text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white transition-colors flex items-center justify-center font-medium shadow-sm hover:shadow cursor-pointer flex-shrink-0"
                title="Send message to WhatsApp"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <div className="mt-2 text-center">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Opens directly in WhatsApp · No app install required
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <div className="flex items-center gap-3">
        {/* Subtle Greeting Pill (shows on hover or when closed) */}
        {!isOpen && !hasInteracted && (
          <div 
            onClick={() => {
              setIsOpen(true);
              setHasInteracted(true);
            }}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-[#111722] border border-slate-200 dark:border-slate-700/80 shadow-lg text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#161f2e] transition-all hover:scale-[1.02] group"
          >
            <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
            <span>Chat with Mwabonje</span>
            <span className="text-slate-400 group-hover:text-emerald-600 transition-colors">👋</span>
          </div>
        )}

        {/* WhatsApp Icon Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setHasInteracted(true);
          }}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 cursor-pointer relative group ${
            isOpen 
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 rotate-90 scale-95' 
              : 'bg-[#25D366] hover:bg-[#20bd5a] text-white hover:scale-110 active:scale-95 shadow-[#25D366]/30'
          }`}
          aria-label={isOpen ? "Close WhatsApp chat" : "Open WhatsApp quick-chat"}
          title={isOpen ? "Close chat" : "Chat with Mwabonje on WhatsApp"}
        >
          {isOpen ? (
            <X className="w-6 h-6 transform -rotate-90" />
          ) : (
            <>
              {/* Pulsing subtle beacon */}
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400 border-2 border-white dark:border-[#0b0f17]" />
              </span>

              {/* Official WhatsApp SVG Logo */}
              <svg 
                viewBox="0 0 24 24" 
                className="w-7 h-7 fill-current drop-shadow-xs"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12.004 2C6.479 2 2 6.48 2 12.006c0 1.91.536 3.738 1.554 5.32L2.09 22.09l4.908-1.42a9.96 9.96 0 0 0 5.006 1.34h.004c5.524 0 10.003-4.48 10.003-10.005 0-2.67-1.04-5.18-2.93-7.07A9.94 9.94 0 0 0 12.004 2zm5.834 14.195c-.244.686-1.417 1.31-1.954 1.393-.505.077-1.157.11-1.874-.12-.435-.14-1-.326-1.72-.638-3.04-1.315-5.02-4.385-5.17-4.587-.15-.202-1.233-1.64-1.233-3.13 0-1.49.78-2.222 1.057-2.525.277-.302.604-.378.805-.378.2 0 .403.002.58.01.187.01.436-.07.68.518.252.605.856 2.094.932 2.245.076.15.126.328.025.53-.1.201-.151.327-.302.503-.15.177-.318.394-.453.529-.151.15-.31.313-.134.614.177.302.784 1.293 1.68 2.092 1.152 1.026 2.122 1.344 2.424 1.494.302.152.479.127.655-.075.177-.202.756-.88 1.008-1.182.251-.303.503-.252.855-.126.353.126 2.238 1.057 2.62 1.25.38.192.633.287.726.448.093.161.093.931-.151 1.617z"/>
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WhatsAppFloatingChat;
