import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  HelpCircle, 
  Save, 
  ExternalLink, 
  RotateCcw, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ArrowUp, 
  ArrowDown, 
  Loader2,
  Type,
  List,
  Sparkles,
  Eye,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../services/supabase';
import { FAQItem } from '../types';
import { 
  DEFAULT_FAQ_DATA, 
  FAQ_CATEGORY_OPTIONS,
  DEFAULT_FAQ_HEADER_EYEBROW,
  DEFAULT_FAQ_HEADER_TITLE,
  DEFAULT_FAQ_HEADER_SUBTITLE,
  DEFAULT_FAQ_CTA_EYEBROW,
  DEFAULT_FAQ_CTA_TITLE,
  DEFAULT_FAQ_CTA_SUBTITLE,
  FAQPayload
} from '../utils/defaultFaqs';

export interface FAQManagerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  userId: string;
  embedded?: boolean;
}

export const FAQManagerModal: React.FC<FAQManagerModalProps> = ({
  isOpen = true,
  onClose,
  userId,
  embedded = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'questions' | 'header'>('questions');
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [galleryId, setGalleryId] = useState<string | null>(null);

  // Header & Hero fields
  const [headerEyebrow, setHeaderEyebrow] = useState(DEFAULT_FAQ_HEADER_EYEBROW);
  const [headerTitle, setHeaderTitle] = useState(DEFAULT_FAQ_HEADER_TITLE);
  const [headerSubtitle, setHeaderSubtitle] = useState(DEFAULT_FAQ_HEADER_SUBTITLE);

  // CTA fields
  const [ctaEyebrow, setCtaEyebrow] = useState(DEFAULT_FAQ_CTA_EYEBROW);
  const [ctaTitle, setCtaTitle] = useState(DEFAULT_FAQ_CTA_TITLE);
  const [ctaSubtitle, setCtaSubtitle] = useState(DEFAULT_FAQ_CTA_SUBTITLE);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Editing state for individual questions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editCategory, setEditCategory] = useState('general');

  // New question form state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  // Expanded cards for previewing answer
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // 1. Fetch FAQ settings & items on mount
  useEffect(() => {
    if (!embedded && !isOpen) return;

    let isMounted = true;
    const fetchFaqs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('galleries')
          .select('*')
          .eq('photographer_id', userId)
          .eq('category', 'FAQ')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (!isMounted) return;

        if (data && data.length > 0) {
          const rec = data[0];
          setGalleryId(rec.id);
          if (rec.title) {
            try {
              const parsed = JSON.parse(rec.title);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setFaqs(parsed);
              } else if (parsed && typeof parsed === 'object') {
                if (Array.isArray(parsed.items)) {
                  setFaqs(parsed.items);
                } else {
                  setFaqs(DEFAULT_FAQ_DATA);
                }
                if (parsed.headerEyebrow) setHeaderEyebrow(parsed.headerEyebrow);
                if (parsed.headerTitle) setHeaderTitle(parsed.headerTitle);
                if (parsed.headerSubtitle) setHeaderSubtitle(parsed.headerSubtitle);
                if (parsed.ctaEyebrow) setCtaEyebrow(parsed.ctaEyebrow);
                if (parsed.ctaTitle) setCtaTitle(parsed.ctaTitle);
                if (parsed.ctaSubtitle) setCtaSubtitle(parsed.ctaSubtitle);
              } else {
                setFaqs(DEFAULT_FAQ_DATA);
              }
            } catch (e) {
              setFaqs(DEFAULT_FAQ_DATA);
            }
          } else {
            setFaqs(DEFAULT_FAQ_DATA);
          }
        } else {
          // Initialize with default FAQ dataset and header
          const initialPayload: FAQPayload = {
            headerEyebrow: DEFAULT_FAQ_HEADER_EYEBROW,
            headerTitle: DEFAULT_FAQ_HEADER_TITLE,
            headerSubtitle: DEFAULT_FAQ_HEADER_SUBTITLE,
            ctaEyebrow: DEFAULT_FAQ_CTA_EYEBROW,
            ctaTitle: DEFAULT_FAQ_CTA_TITLE,
            ctaSubtitle: DEFAULT_FAQ_CTA_SUBTITLE,
            items: DEFAULT_FAQ_DATA
          };

          const { data: newGal, error: insertErr } = await supabase
            .from('galleries')
            .insert([{
              photographer_id: userId,
              client_name: '__FAQ__',
              category: 'FAQ',
              title: JSON.stringify(initialPayload),
              link_enabled: true
            }])
            .select()
            .single();

          if (insertErr) {
            console.warn("Could not insert default FAQ record:", insertErr.message);
            setFaqs(DEFAULT_FAQ_DATA);
          } else if (newGal) {
            setGalleryId(newGal.id);
            setFaqs(DEFAULT_FAQ_DATA);
          }
        }
      } catch (err: any) {
        console.error("Error loading FAQs:", err);
        toast.error("Failed to load FAQs: " + err.message);
        setFaqs(DEFAULT_FAQ_DATA);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFaqs();
    return () => { isMounted = false; };
  }, [isOpen, userId, embedded]);

  // Save changes to Supabase
  const persistFaqData = async (
    itemsToSave: FAQItem[] = faqs,
    headerUpdates?: {
      headerEyebrow?: string;
      headerTitle?: string;
      headerSubtitle?: string;
      ctaEyebrow?: string;
      ctaTitle?: string;
      ctaSubtitle?: string;
    }
  ) => {
    setSaving(true);
    try {
      const payloadObj: FAQPayload = {
        headerEyebrow: headerUpdates?.headerEyebrow ?? headerEyebrow,
        headerTitle: headerUpdates?.headerTitle ?? headerTitle,
        headerSubtitle: headerUpdates?.headerSubtitle ?? headerSubtitle,
        ctaEyebrow: headerUpdates?.ctaEyebrow ?? ctaEyebrow,
        ctaTitle: headerUpdates?.ctaTitle ?? ctaTitle,
        ctaSubtitle: headerUpdates?.ctaSubtitle ?? ctaSubtitle,
        items: itemsToSave
      };

      const payloadString = JSON.stringify(payloadObj);

      if (galleryId) {
        const { error } = await supabase
          .from('galleries')
          .update({ title: payloadString, link_enabled: true })
          .eq('id', galleryId);

        if (error) throw error;
      } else {
        const { data: newGal, error: insertErr } = await supabase
          .from('galleries')
          .insert([{
            photographer_id: userId,
            client_name: '__FAQ__',
            category: 'FAQ',
            title: payloadString,
            link_enabled: true
          }])
          .select()
          .single();

        if (insertErr) throw insertErr;
        if (newGal) setGalleryId(newGal.id);
      }

      setFaqs(itemsToSave);
      if (headerUpdates) {
        if (headerUpdates.headerEyebrow !== undefined) setHeaderEyebrow(headerUpdates.headerEyebrow);
        if (headerUpdates.headerTitle !== undefined) setHeaderTitle(headerUpdates.headerTitle);
        if (headerUpdates.headerSubtitle !== undefined) setHeaderSubtitle(headerUpdates.headerSubtitle);
        if (headerUpdates.ctaEyebrow !== undefined) setCtaEyebrow(headerUpdates.ctaEyebrow);
        if (headerUpdates.ctaTitle !== undefined) setCtaTitle(headerUpdates.ctaTitle);
        if (headerUpdates.ctaSubtitle !== undefined) setCtaSubtitle(headerUpdates.ctaSubtitle);
      }
      return true;
    } catch (err: any) {
      toast.error('Failed to save changes: ' + err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Save Header & Hero fields
  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerTitle.trim()) {
      toast.error('Please enter a heading title for your FAQ page.');
      return;
    }

    const success = await persistFaqData(faqs, {
      headerEyebrow: headerEyebrow.trim(),
      headerTitle: headerTitle.trim(),
      headerSubtitle: headerSubtitle.trim(),
      ctaEyebrow: ctaEyebrow.trim(),
      ctaTitle: ctaTitle.trim(),
      ctaSubtitle: ctaSubtitle.trim()
    });

    if (success) {
      toast.success('FAQ page header & intro banner saved!');
    }
  };

  // Reset Header to Defaults
  const handleResetHeader = () => {
    setHeaderEyebrow(DEFAULT_FAQ_HEADER_EYEBROW);
    setHeaderTitle(DEFAULT_FAQ_HEADER_TITLE);
    setHeaderSubtitle(DEFAULT_FAQ_HEADER_SUBTITLE);
    setCtaEyebrow(DEFAULT_FAQ_CTA_EYEBROW);
    setCtaTitle(DEFAULT_FAQ_CTA_TITLE);
    setCtaSubtitle(DEFAULT_FAQ_CTA_SUBTITLE);
    toast.info('Header fields reset to default. Click Save to publish.');
  };

  // Add new FAQ item
  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast.error('Please enter both a question and answer.');
      return;
    }

    const catOption = FAQ_CATEGORY_OPTIONS.find(c => c.id === newCategory) || FAQ_CATEGORY_OPTIONS[0];
    const newFaq: FAQItem = {
      id: 'faq-' + Date.now(),
      category: newCategory,
      categoryLabel: catOption.label,
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
    };

    const updated = [newFaq, ...faqs];
    const success = await persistFaqData(updated);
    if (success) {
      toast.success('New question added to FAQ!');
      setNewQuestion('');
      setNewAnswer('');
      setIsAddingNew(false);
    }
  };

  // Start editing an FAQ
  const startEditing = (faq: FAQItem) => {
    setEditingId(faq.id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
    setEditCategory(faq.category);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditQuestion('');
    setEditAnswer('');
  };

  // Save edited FAQ
  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editQuestion.trim() || !editAnswer.trim()) {
      toast.error('Please provide both question and answer.');
      return;
    }

    const catOption = FAQ_CATEGORY_OPTIONS.find(c => c.id === editCategory) || FAQ_CATEGORY_OPTIONS[0];
    const updated = faqs.map(f => {
      if (f.id === editingId) {
        return {
          ...f,
          question: editQuestion.trim(),
          answer: editAnswer.trim(),
          category: editCategory,
          categoryLabel: catOption.label,
        };
      }
      return f;
    });

    const success = await persistFaqData(updated);
    if (success) {
      toast.success('Question updated successfully!');
      setEditingId(null);
    }
  };

  // Delete FAQ
  const handleDeleteFaq = async (id: string, question: string) => {
    if (!window.confirm(`Delete this FAQ question?\n\n"${question}"`)) return;

    const updated = faqs.filter(f => f.id !== id);
    const success = await persistFaqData(updated);
    if (success) {
      toast.success('Question deleted from FAQ.');
    }
  };

  // Move FAQ item up/down
  const handleMoveFaq = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= faqs.length) return;

    const newArr = [...faqs];
    const [moved] = newArr.splice(index, 1);
    newArr.splice(targetIndex, 0, moved);

    const success = await persistFaqData(newArr);
    if (success) {
      toast.success('Question reordered');
    }
  };

  // Reset all questions to default dataset
  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all questions back to the default studio FAQ? Any custom questions will be replaced.')) return;

    const success = await persistFaqData(DEFAULT_FAQ_DATA);
    if (success) {
      toast.success('Reset questions to defaults successfully!');
    }
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return faqs.filter(f => {
      const matchesCat = categoryFilter === 'all' || f.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        f.question.toLowerCase().includes(q) || 
        f.answer.toLowerCase().includes(q) ||
        f.categoryLabel.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [faqs, categoryFilter, searchQuery]);

  if (!embedded && !isOpen) return null;

  const content = (
    <div className={`flex flex-col flex-1 overflow-hidden min-h-0 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 ${embedded ? '' : 'rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800'}`}>
      
      {/* Top Header (shown in standalone modal) */}
      {!embedded && (
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-[#0f172a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                  FAQ Manager
                </h2>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {faqs.length} questions
                </span>
                {saving && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Customize your page header, intro text, and all questions displayed on /faq.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/faq"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
              title="Preview Public FAQ Page"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Preview /faq</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tabs Switcher: Page Header vs Questions List */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-6 gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveSubTab('questions')}
          className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'questions'
              ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>Questions &amp; Answers ({faqs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('header')}
          className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'header'
              ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>Hero Header &amp; Intro</span>
        </button>
      </div>

      {/* VIEW 1: HERO HEADER & INTRO EDITOR */}
      {activeSubTab === 'header' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Visual Live Preview of the FAQ Hero */}
          <div className="bg-[#FAF8F5] dark:bg-[#0b0f17] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center relative shadow-inner">
            <span className="absolute top-3 left-4 text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1">
              <Eye className="w-3 h-3" /> Live Preview of /faq Hero
            </span>

            <div className="pt-4 max-w-2xl mx-auto space-y-3">
              <span className="text-[11px] sm:text-xs uppercase tracking-[0.28em] font-semibold text-slate-500 dark:text-slate-400 block">
                {headerEyebrow || 'FREQUENTLY ASKED QUESTIONS'}
              </span>
              <h1 className="font-editorial text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal leading-tight text-slate-900 dark:text-white">
                {headerTitle || 'Everything You Need to Know'}
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-300 font-light leading-relaxed">
                {headerSubtitle || 'From destination wedding timelines and lodge commissions to client delivery galleries and travel across East Africa, here are answers to our most common questions.'}
              </p>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSaveHeader} className="space-y-5 bg-white dark:bg-[#151c28] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Hero Header Content
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update the top eyebrow tag, primary heading, and introduction text for the FAQ page.
                </p>
              </div>

              <button
                type="button"
                onClick={handleResetHeader}
                className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                title="Reset to original default copy"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Defaults</span>
              </button>
            </div>

            {/* 1. Header Eyebrow */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Eyebrow Kicker Text
              </label>
              <input
                type="text"
                value={headerEyebrow}
                onChange={(e) => setHeaderEyebrow(e.target.value)}
                placeholder="e.g. FREQUENTLY ASKED QUESTIONS"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                The subtle uppercase badge displayed above the main heading.
              </span>
            </div>

            {/* 2. Header Main Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Main Page Heading (Title)
              </label>
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder="e.g. Everything You Need to Know"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Rendered with the editorial serif font on the public page.
              </span>
            </div>

            {/* 3. Header Subtitle */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Introductory Subtitle / Description
              </label>
              <textarea
                value={headerSubtitle}
                onChange={(e) => setHeaderSubtitle(e.target.value)}
                placeholder="e.g. From destination wedding timelines and lodge commissions..."
                rows={3}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all leading-relaxed"
              />
            </div>

            {/* Optional CTA Box Configuration */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                  <span>Bottom "Still Have Questions?" CTA Banner</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Customize the closing invitation banner with WhatsApp and Email buttons.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    CTA Eyebrow
                  </label>
                  <input
                    type="text"
                    value={ctaEyebrow}
                    onChange={(e) => setCtaEyebrow(e.target.value)}
                    placeholder="Have a Custom Brief or Date?"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    CTA Heading Title
                  </label>
                  <input
                    type="text"
                    value={ctaTitle}
                    onChange={(e) => setCtaTitle(e.target.value)}
                    placeholder="Let's Discuss Your Story"
                    className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  CTA Description
                </label>
                <textarea
                  value={ctaSubtitle}
                  onChange={(e) => setCtaSubtitle(e.target.value)}
                  placeholder="Every celebration, lodge commission, and visual narrative is unique..."
                  rows={2}
                  className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-xs font-semibold tracking-wider uppercase text-white bg-slate-900 dark:bg-white dark:text-slate-950 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Save Header &amp; Banner</span>
              </button>
            </div>
          </form>

        </div>
      )}

      {/* VIEW 2: QUESTIONS & ANSWERS LIST */}
      {activeSubTab === 'questions' && (
        <>
          {/* Toolbar & Filter Bar */}
          <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter questions by keyword..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-white dark:text-slate-950 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Reset questions to defaults"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden md:inline">Reset Questions</span>
              </button>

              {embedded && (
                <a
                  href="/faq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Preview /faq</span>
                </a>
              )}
            </div>
          </div>

          {/* Category Pills */}
          <div className="px-6 py-2.5 bg-slate-50/50 dark:bg-[#0f172a]/50 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              All ({faqs.length})
            </button>
            {FAQ_CATEGORY_OPTIONS.map((cat) => {
              const count = faqs.filter(f => f.category === cat.id).length;
              if (count === 0 && cat.id === 'other') return null;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-semibold'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            
            {/* Add New Question Form */}
            {isAddingNew && (
              <form onSubmit={handleAddFaq} className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-amber-500" />
                    <span>Create New FAQ Question</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                  >
                    {FAQ_CATEGORY_OPTIONS.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Question
                  </label>
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="e.g. Do you travel outside Kenya for destination weddings?"
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Answer
                  </label>
                  <textarea
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="Write a clear, helpful answer for your clients..."
                    rows={4}
                    className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-950 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Question</span>
                  </button>
                </div>
              </form>
            )}

            {/* Loading state */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-slate-400" />
                <p className="text-xs">Loading studio FAQ items...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-12 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 p-8">
                <HelpCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No questions found
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {searchQuery ? `No results for "${searchQuery}"` : 'Your FAQ list is currently empty.'}
                </p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
                  className="mt-3 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredList.map((faq) => {
                  const isEditingThis = editingId === faq.id;
                  const isExpanded = !!expandedCards[faq.id];
                  const realIndex = faqs.findIndex(f => f.id === faq.id);

                  if (isEditingThis) {
                    return (
                      <div key={faq.id} className="border-2 border-slate-900 dark:border-white rounded-xl p-5 bg-white dark:bg-slate-900 shadow-md space-y-3 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                            <span>Editing Question #{realIndex + 1}</span>
                          </span>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Category
                          </label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                          >
                            {FAQ_CATEGORY_OPTIONS.map(c => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Question
                          </label>
                          <input
                            type="text"
                            value={editQuestion}
                            onChange={(e) => setEditQuestion(e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            Answer
                          </label>
                          <textarea
                            value={editAnswer}
                            onChange={(e) => setEditAnswer(e.target.value)}
                            rows={4}
                            className="w-full text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-950 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>Update Question</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={faq.id}
                      className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-[#151c28] hover:border-slate-300 dark:hover:border-slate-700 transition-all p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {faq.categoryLabel}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              #{realIndex + 1}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                            {faq.question}
                          </h4>
                        </div>

                        {/* Item Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Reorder Buttons */}
                          <button
                            type="button"
                            onClick={() => handleMoveFaq(realIndex, 'up')}
                            disabled={realIndex === 0 || saving}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveFaq(realIndex, 'down')}
                            disabled={realIndex === faqs.length - 1 || saving}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => startEditing(faq)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Edit question"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteFaq(faq.id, faq.question)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                            title="Delete question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Answer Preview / Toggle */}
                      <div className="pt-1 text-xs text-slate-600 dark:text-slate-300 font-light leading-relaxed">
                        {isExpanded ? (
                          <p className="whitespace-pre-line">{faq.answer}</p>
                        ) : (
                          <p className="line-clamp-2">{faq.answer}</p>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1">
                        <button
                          type="button"
                          onClick={() => setExpandedCards(prev => ({ ...prev, [faq.id]: !prev[faq.id] }))}
                          className="text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <span>Show less</span>
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <span>View full answer</span>
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditing(faq)}
                          className="text-[11px] font-semibold text-slate-900 dark:text-white hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </>
      )}

      {/* Footer */}
      <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0f172a] flex items-center justify-between shrink-0 text-xs text-slate-500 dark:text-slate-400">
        <span>Edits instantly sync to <code className="text-slate-800 dark:text-slate-200 font-mono">/faq</code></span>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-950 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
        >
          Done
        </button>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-[100] animate-in fade-in duration-200">
      <div className="w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {content}
      </div>
    </div>
  );
};
export default FAQManagerModal;
