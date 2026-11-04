import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  Sparkles, 
  Lock, 
  KeyRound, 
  ExternalLink, 
  Clock, 
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { Gallery } from '../types';
import { getCleanGalleryTitle } from '../utils/formatters';
import { generateSlug } from '../utils/slug';

export interface WhatsAppDeliveryShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallery: Gallery;
  password?: string | null;
  itemCount?: number;
  recipientPhone?: string;
  clientType?: 'bride' | 'villa' | 'couple' | 'commercial';
}

export const WhatsAppDeliveryShareModal: React.FC<WhatsAppDeliveryShareModalProps> = ({
  isOpen,
  onClose,
  gallery,
  password: initialPassword,
  itemCount,
  recipientPhone: initialRecipientPhone = '',
  clientType: initialClientType = 'bride'
}) => {
  const [recipientPhone, setRecipientPhone] = useState(initialRecipientPhone);
  const [clientType, setClientType] = useState<'bride' | 'villa' | 'couple' | 'commercial'>(initialClientType);
  const [recipientName, setRecipientName] = useState('');
  const [includePin, setIncludePin] = useState(true);
  const [includePassword, setIncludePassword] = useState(true);
  const [includeExpirationNote, setIncludeExpirationNote] = useState(true);
  const [customNote, setCustomNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Derive gallery values
  const cleanTitle = getCleanGalleryTitle(gallery);
  const galleryUnlockPin = gallery.id ? gallery.id.split('-')[0].slice(0, 4).toUpperCase() : '';
  const effectivePassword = (initialPassword ?? gallery.password ?? '').trim();
  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const origin = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app')
    ? 'https://mwabonje.co.ke'
    : rawOrigin;
  const cleanSlug = gallery.client_name ? generateSlug(gallery.client_name) : '';
  const portalUrl = `${origin}/${cleanSlug || gallery.id}`;
  const rawIdUrl = `${origin}/${gallery.id}`;

  // Pre-fill recipient name if gallery client_name seems like a person or property
  useEffect(() => {
    if (gallery.client_name && !recipientName) {
      // If client name is like "Sarah & David" or "Medina Palms Villa"
      setRecipientName(gallery.client_name);
    }
  }, [gallery.client_name]);

  // Infer initial client type based on title/category
  useEffect(() => {
    const text = `${cleanTitle} ${gallery.category || ''} ${gallery.client_name || ''}`.toLowerCase();
    if (text.includes('villa') || text.includes('resort') || text.includes('hotel') || text.includes('hospitality')) {
      setClientType('villa');
    } else if (text.includes('&') || text.includes('wedding') || text.includes('vow') || text.includes('bride')) {
      setClientType('bride');
    } else if (text.includes('couple') || text.includes('engagement') || text.includes('honeymoon')) {
      setClientType('couple');
    } else {
      setClientType('commercial');
    }
  }, [gallery.id]);

  if (!isOpen) return null;

  // Build editorial message based on client archetype
  const generateMessage = (): string => {
    const nameGreeting = recipientName.trim() ? recipientName.trim() : 'there';
    const photosCountText = itemCount && itemCount > 0 ? ` (${itemCount} curated high-resolution photographs)` : '';

    let greetingLine = '';
    let introLine = '';
    let closingLine = '';

    switch (clientType) {
      case 'villa':
        greetingLine = `Dear ${nameGreeting},`;
        introLine = `I am delighted to deliver the architectural and hospitality visual archive for *${cleanTitle}*${photosCountText}. Every image has been meticulously color-graded to celebrate your property's coastal light and natural spaces.`;
        closingLine = `Please let me know once your team has reviewed the stills. It was an absolute honour capturing ${cleanTitle}.`;
        break;
      case 'couple':
        greetingLine = `Hi ${nameGreeting}! ✨`;
        introLine = `Your coastal portrait collection for *${cleanTitle}* is ready${photosCountText}! We had such a golden session capturing these intimate moments under the East African sun.`;
        closingLine = `Take your time revisiting every frame together. Excited to hear your absolute favourites!`;
        break;
      case 'commercial':
        greetingLine = `Hi ${nameGreeting},`;
        introLine = `Your finished deliverables for *${cleanTitle}* are now live in your private studio portal${photosCountText}.`;
        closingLine = `Thank you for the wonderful collaboration. Feel free to reach out if you need additional exports or crop ratios.`;
        break;
      case 'bride':
      default:
        greetingLine = `Dearest ${nameGreeting}, 🤍`;
        introLine = `Your wedding gallery for *${cleanTitle}* is ready${photosCountText}! Re-living these breathtaking coastal vows and joyful moments with you has been truly magical.`;
        closingLine = `Take your time to immerse yourself in these memories, favourite your cherished highlights, and download the full collection.`;
        break;
    }

    const lines: string[] = [
      greetingLine,
      '',
      introLine,
      '',
      `🔗 *Private Client Portal:*`,
      portalUrl,
    ];

    if (includePassword && effectivePassword) {
      lines.push(`🔒 *Access Password:* \`${effectivePassword}\``);
    }

    if (includePin && galleryUnlockPin) {
      lines.push(`🔑 *Client Unlock PIN:* \`${galleryUnlockPin}\` _(use this PIN in the portal to unlock or amend your submitted favourites)_`);
    }

    if (gallery.selection_enabled) {
      const limitText = gallery.selection_limit && gallery.selection_limit > 0
        ? `You can select up to ${gallery.selection_limit} favourite photographs for final retouching.`
        : `You can tap the heart icon on any photo to select and curate your album favourites.`;
      lines.push('');
      lines.push(`✨ *Selection Mode Active:* ${limitText}`);
    }

    if (includeExpirationNote) {
      lines.push('');
      lines.push(`⏳ *Archive Access:* For optimal storage security, this download portal is active for your convenience. We recommend saving and backing up your high-res files soon.`);
    }

    if (customNote.trim()) {
      lines.push('');
      lines.push(`📝 *Note from Michael:* ${customNote.trim()}`);
    }

    lines.push('');
    lines.push(closingLine);
    lines.push('');
    lines.push(`Warm regards,`);
    lines.push(`*Michael Mwabonje Ringa*`);
    lines.push(`Mwabonje Studio · Malindi & Kenya Coast`);

    return lines.join('\n');
  };

  const messageText = generateMessage();

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      toast.success('WhatsApp delivery message copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Could not copy message automatically.');
    }
  };

  const handleCopyLinkOnly = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopiedLink(true);
      toast.success('Gallery link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleSendWhatsApp = () => {
    // Format digits
    const cleanDigits = recipientPhone.replace(/[^0-9]/g, '');
    let targetPhone = '';
    if (cleanDigits) {
      if (cleanDigits.startsWith('0') && cleanDigits.length === 10) {
        targetPhone = `254${cleanDigits.slice(1)}`;
      } else if (cleanDigits.startsWith('254')) {
        targetPhone = cleanDigits;
      } else {
        targetPhone = cleanDigits;
      }
    }

    const encodedMessage = encodeURIComponent(messageText);
    const whatsappUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encodedMessage}`
      : `https://api.whatsapp.com/send?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    toast.success('Opening WhatsApp with pre-filled delivery message!');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Send className="w-5 h-5 ml-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Send Gallery via WhatsApp
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  1-Click Delivery
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Editorial, pre-filled delivery message with client link, password, and unlock PIN.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-5 text-sm">
          {/* Target Gallery Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Target Delivery Gallery
              </div>
              <div className="font-semibold text-slate-900 dark:text-white truncate text-base mt-0.5">
                {cleanTitle}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                <span>Link: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{portalUrl.replace(/^https?:\/\//, '')}</strong></span>
                <span>•</span>
                <span>PIN: <strong className="font-mono text-slate-800 dark:text-slate-200">{galleryUnlockPin || 'None'}</strong></span>
                <span>•</span>
                <span>Password: <strong className="font-mono text-slate-800 dark:text-slate-200">{effectivePassword || 'Public'}</strong></span>
                {itemCount !== undefined && (
                  <>
                    <span>•</span>
                    <span>{itemCount} files</span>
                  </>
                )}
              </div>
            </div>
            <button 
              onClick={handleCopyLinkOnly}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 shrink-0 transition-colors"
              title="Copy link only"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedLink ? 'Copied' : 'Copy link'}</span>
            </button>
          </div>

          {/* Client archetype & customization controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Client Archetype / Tone
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['bride', 'villa', 'couple', 'commercial'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setClientType(type)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left capitalize transition-all ${
                      clientType === type 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-500 dark:text-emerald-300 font-semibold shadow-xs' 
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {type === 'bride' && '👰 Wedding / Bride'}
                    {type === 'villa' && '🏨 Villa & Hospitality'}
                    {type === 'couple' && '✨ Couple Portrait'}
                    {type === 'commercial' && '💼 Commercial / Brand'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Client / Recipient Name
                </label>
                <input 
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Sarah & David, Elena, Villa Manager"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Recipient Phone (Optional)
                </label>
                <div className="relative">
                  <input 
                    type="tel"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="e.g. 0712345678 or +254..."
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                    Leave blank to choose any contact directly inside WhatsApp.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inclusions Checkboxes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Include in Delivery Message
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              {galleryUnlockPin && (
                <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-colors ${
                  includePin 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-medium' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  <input 
                    type="checkbox" 
                    checked={includePin} 
                    onChange={(e) => setIncludePin(e.target.checked)} 
                    className="hidden" 
                  />
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Unlock PIN ({galleryUnlockPin})</span>
                </label>
              )}

              {effectivePassword && (
                <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-colors ${
                  includePassword 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-medium' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  <input 
                    type="checkbox" 
                    checked={includePassword} 
                    onChange={(e) => setIncludePassword(e.target.checked)} 
                    className="hidden" 
                  />
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password ({effectivePassword})</span>
                </label>
              )}

              <label className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer select-none transition-colors ${
                includeExpirationNote 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white font-medium' 
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                <input 
                  type="checkbox" 
                  checked={includeExpirationNote} 
                  onChange={(e) => setIncludeExpirationNote(e.target.checked)} 
                  className="hidden" 
                />
                <Clock className="w-3.5 h-3.5" />
                <span>Archive Security Reminder</span>
              </label>
            </div>
          </div>

          {/* Custom Note add-on */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Personalized Note / Add-on Message (Optional)
            </label>
            <input 
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Can't wait for your print album selection! or Drone footage was added in high-res."
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Live Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                Editorial WhatsApp Message Preview
              </label>
              <button 
                onClick={handleCopyMessage}
                className="text-xs text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
              </button>
            </div>
            
            <div className="relative rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-[#EFEAE2]/30 dark:bg-slate-950 p-4 font-sans text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200 max-h-56 overflow-y-auto font-mono">
              {messageText}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Ready to send directly in WhatsApp Desktop, Web, or Mobile</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Message'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm inline-flex items-center justify-center gap-2 transition-all hover:shadow-md cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
