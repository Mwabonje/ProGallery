import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { BlogPost } from '../types';
import { RichTextEditor } from "../components/RichTextEditor";
import { 
  Edit2, Trash2, Plus, Loader2, Save, X, Search, FileText, Eye, 
  MousePointerClick, RefreshCw, Upload, Image as ImageIcon, Sparkles, 
  CheckCircle2, Link2, Check, Bell, ExternalLink, ChevronDown, 
  PenLine, Share2, Sliders, ShieldCheck, Key, Calendar, Star, 
  Layers, Crop, ChevronRight, CheckCircle, HelpCircle, ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadBlogCoverImage, formatFileSize } from '../utils/imageCompressor';
import { getOptimizedImageUrl } from '../utils/formatters';
import { DEFAULT_BLOG_CATEGORIES, parseCategories, formatCategories } from '../utils/blogData';

export const BlogAdmin: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableMissing, setTableMissing] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [previewMode, setPreviewMode] = useState<'editor' | 'split' | 'preview'>('editor');

  // UI state for the luxury editor
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'social' | 'advanced'>('content');
  const [focusKeyword, setFocusKeyword] = useState('family photoshoot in Watamu');
  const [relatedKeywords, setRelatedKeywords] = useState<string[]>([
    'Watamu family photographer',
    'beach family photoshoot Kenya',
    'family photography Watamu'
  ]);
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [updateLastModified, setUpdateLastModified] = useState(true);
  const [isFeatured, setIsFeatured] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [showAuthor, setShowAuthor] = useState(true);
  const [showReadingTime, setShowReadingTime] = useState(true);
  const [showTableOfContents, setShowTableOfContents] = useState(true);
  const [lastSavedText, setLastSavedText] = useState('2 minutes ago');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  // Cover image upload & compression state
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [coverCompressionInfo, setCoverCompressionInfo] = useState<{
    originalSize: number;
    compressedSize: number;
    wasCompressed: boolean;
  } | null>(null);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [coverSourceTab, setCoverSourceTab] = useState<'upload' | 'url'>('upload');
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  // Collect all known categories from preset list + any categories already used across all posts
  const allAvailableCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_BLOG_CATEGORIES);
    posts.forEach(p => {
      parseCategories(p.category).forEach(c => set.add(c));
    });
    return Array.from(set);
  }, [posts]);

  // Selected categories for the currently edited post
  const selectedCategories = useMemo(() => {
    return parseCategories(editingPost?.category);
  }, [editingPost?.category]);

  const handleToggleCategory = (categoryName: string) => {
    const current = parseCategories(editingPost?.category);
    const exists = current.includes(categoryName);
    const next = exists
      ? current.filter(c => c !== categoryName)
      : [...current, categoryName];
    
    setEditingPost(prev => prev ? {
      ...prev,
      category: formatCategories(next)
    } : null);
  };

  const handleAddCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    const current = parseCategories(editingPost?.category);
    if (!current.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      const next = [...current, trimmed];
      setEditingPost(prev => prev ? {
        ...prev,
        category: formatCategories(next)
      } : null);
    }
    setCustomCategoryInput('');
  };

  const sanitizePostForSave = (post: Partial<BlogPost>) => {
    // Exclude virtual/helper client properties such as 'categories' so Supabase PostgREST doesn't error
    const { categories, ...rest } = post as any;
    return {
      ...rest,
      category: rest.category ? formatCategories(parseCategories(rest.category)) : '',
      ...(rest.id ? { id: rest.id } : {})
    };
  };

  const editingPostRef = useRef(editingPost);
  useEffect(() => {
    editingPostRef.current = editingPost;
  }, [editingPost]);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!isEditing) return;

    const intervalId = setInterval(async () => {
      const postToSave = editingPostRef.current;
      if (!postToSave || !postToSave.title || !postToSave.slug) {
        return;
      }

      try {
        const postData = sanitizePostForSave(postToSave);

        const { data, error } = await supabase
          .from('blogs')
          .upsert(postData)
          .select();

        if (error) {
          console.error('Autosave error:', error);
          return;
        }

        if (data && data[0]) {
          if (!postToSave.id) {
            setEditingPost(prev => prev ? { ...prev, id: data[0].id } : null);
          }
          toast.success('Draft auto-saved', { id: 'autosave' });
        }
      } catch (err) {
        console.error('Autosave error:', err);
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isEditing]);

  const fetchPosts = async () => {
    setLoading(true);
    setTableMissing(false);
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          // relation does not exist
          setTableMissing(true);
        } else {
          throw error;
        }
      } else {
        // Also check if status, views, or clicks are present in returned data
        if (data && data.length > 0) {
           const first = data[0];
           if (!('status' in first) || !('views' in first) || !('clicks' in first)) {
             setSchemaMissing(true);
           }
        }
        
        // Check if the new ad-blocker-safe RPC functions exist
        const { error: rpcErr } = await supabase.rpc('update_blog_v', { blog_slug: 'test' });
        if (rpcErr && rpcErr.code === 'PGRST202') {
           setSchemaMissing(true);
        }

        setPosts(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setCoverCompressionInfo(null);
    setCustomCategoryInput('');
    const isPexelsOrExternal = Boolean(post.cover_image && !post.cover_image.includes('r2.dev') && !post.cover_image.includes('supabase'));
    setCoverSourceTab(isPexelsOrExternal ? 'url' : 'upload');
    setCanonicalUrl(post.slug ? `https://mwabonje.co.ke/blog/${post.slug}` : '');
    if (post.tags && post.tags.length > 0) {
      setFocusKeyword(post.tags[0]);
      setRelatedKeywords(post.tags.slice(1));
    } else if (post.title?.toLowerCase().includes('watamu')) {
      setFocusKeyword('family photoshoot in Watamu');
      setRelatedKeywords([
        'Watamu family photographer',
        'beach family photoshoot Kenya',
        'family photography Watamu'
      ]);
    } else {
      setFocusKeyword(post.title?.slice(0, 30) || '');
      setRelatedKeywords([]);
    }
    setLastSavedText('2 minutes ago');
    setActiveTab('content');
    setIsEditing(true);
  };

  const handleCreate = () => {
    setEditingPost({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      author: 'Mwabonje',
      cover_image: '',
      category: '',
      tags: [],
      seo_title: '',
      seo_description: '',
      status: 'draft'
    });
    setCoverCompressionInfo(null);
    setCoverSourceTab('upload');
    setCustomCategoryInput('');
    setCanonicalUrl('');
    setFocusKeyword('');
    setRelatedKeywords([]);
    setLastSavedText('Draft not yet saved');
    setActiveTab('content');
    setIsEditing(true);
  };

  const handleRemoveKeyword = (kw: string) => {
    setRelatedKeywords(prev => prev.filter(k => k !== kw));
    setEditingPost(prev => {
      if (!prev) return null;
      const currentTags = prev.tags || [];
      return { ...prev, tags: currentTags.filter(t => t !== kw) };
    });
  };

  const handleAddKeyword = () => {
    const trimmed = newKeywordInput.trim();
    if (!trimmed) return;
    if (!relatedKeywords.includes(trimmed)) {
      setRelatedKeywords(prev => [...prev, trimmed]);
      setEditingPost(prev => {
        if (!prev) return null;
        const currentTags = prev.tags || [];
        return { ...prev, tags: [...currentTags, trimmed] };
      });
    }
    setNewKeywordInput('');
    setIsAddingKeyword(false);
  };

  const handleCoverUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setIsUploadingCover(true);
    setCoverUploadProgress(0);
    setCoverCompressionInfo(null);

    try {
      if (file.size > 300 * 1024) {
        toast.info(`Image is ${formatFileSize(file.size)}. Auto-compressing under 300 KB...`);
      }

      const result = await uploadBlogCoverImage(file, (percent) => {
        setCoverUploadProgress(percent);
      });

      setEditingPost(prev => prev ? { ...prev, cover_image: result.url } : prev);
      setCoverCompressionInfo({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        wasCompressed: result.wasCompressed
      });

      if (result.wasCompressed) {
        toast.success(
          `Cover compressed from ${formatFileSize(result.originalSize)} to ${formatFileSize(result.compressedSize)} (< 300 KB) and uploaded!`
        );
      } else {
        toast.success(`Cover image uploaded (${formatFileSize(result.compressedSize)})!`);
      }
    } catch (err: any) {
      console.error('Failed to upload cover image:', err);
      toast.error(err.message || 'Failed to upload cover image');
    } finally {
      setIsUploadingCover(false);
      setCoverUploadProgress(0);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      const { error } = await supabase
        .from('blogs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Post deleted successfully');
      fetchPosts();
    } catch (err: any) {
      console.error('Error deleting post:', err);
      toast.error('Failed to delete post');
    }
  };

  const doSave = async (postToSave: Partial<BlogPost>, targetStatus?: 'draft' | 'published' | 'scheduled') => {
    if (!postToSave || !postToSave.title || !postToSave.slug) {
      toast.error('Title and slug are required');
      return;
    }

    setIsSaving(true);
    try {
      const mergedTags = [focusKeyword, ...relatedKeywords].filter(Boolean);
      const postData = sanitizePostForSave({
        ...postToSave,
        status: targetStatus || postToSave.status || 'published',
        tags: mergedTags,
        date: updateLastModified ? new Date().toISOString().split('T')[0] : postToSave.date
      });

      const { error } = await supabase
        .from('blogs')
        .upsert(postData)
        .select();

      if (error) {
        if (error.code === 'PGRST204' && error.message.includes('status')) {
          setSchemaMissing(true);
          return;
        }
        throw error;
      }

      setLastSavedText('Just now');
      toast.success(postToSave.id ? 'Post updated successfully' : 'Post created successfully');
      setIsEditing(false);
      setEditingPost(null);
      fetchPosts();
    } catch (err: any) {
      console.error('Error saving post:', err);
      toast.error(`Failed to save post: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;
    await doSave(editingPost, editingPost.status || 'published');
  };

  const filteredPosts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return posts;
    return posts.filter(post => 
      post.title.toLowerCase().includes(q) || 
      post.category?.toLowerCase().includes(q) ||
      post.slug?.toLowerCase().includes(q) ||
      parseCategories(post.category).some(c => c.toLowerCase().includes(q))
    );
  }, [posts, searchQuery]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-_]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (tableMissing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center max-w-2xl mx-auto mt-12">
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Database Table Missing</h2>
        <p className="text-slate-600 mb-6">
          To use the Blog Manager, you need to create a table named <code className="bg-slate-100 px-2 py-1 rounded text-sm text-emerald-600">blogs</code> in your Supabase database.
        </p>
        <div className="text-left bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm overflow-x-auto">
          <p className="font-mono text-slate-800 font-semibold mb-2">Run this SQL in your Supabase SQL Editor:</p>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap">
{`CREATE TABLE blogs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  date DATE,
  author TEXT,
  cover_image TEXT,
  category TEXT,
  tags TEXT[],
  seo_title TEXT,
  seo_description TEXT,
  status TEXT DEFAULT 'published',
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON blogs;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON blogs;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON blogs;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON blogs;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON blogs;

-- Create simple, permissive policies
CREATE POLICY "Enable read access for all users" ON blogs FOR SELECT USING (true);
CREATE POLICY "Enable all access for authenticated users" ON blogs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create RPC function to increment views
CREATE OR REPLACE FUNCTION increment_blog_view(blog_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE blogs
  SET views = COALESCE(views, 0) + 1
  WHERE slug = blog_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RPC function to increment clicks
CREATE OR REPLACE FUNCTION increment_blog_click(blog_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE blogs
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE slug = blog_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
          </pre>
        </div>
        <button 
          onClick={fetchPosts}
          className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
        >
          I've created the table, refresh
        </button>
      </div>
    );
  }

  if (schemaMissing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center max-w-2xl mx-auto mt-12">
        <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Schema Update Required</h2>
        <p className="text-slate-600 mb-6">
          The <code className="bg-slate-100 px-2 py-1 rounded text-sm text-emerald-600">blogs</code> table needs new columns.
        </p>
        <div className="text-left bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm overflow-x-auto">
          <p className="font-mono text-slate-800 font-semibold mb-2">Run this SQL in your Supabase SQL Editor:</p>
          <pre className="text-xs text-slate-600 whitespace-pre-wrap">
{`ALTER TABLE blogs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;

-- Create RPC functions with names that bypass ad-blockers
CREATE OR REPLACE FUNCTION update_blog_v(blog_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE blogs
  SET views = COALESCE(views, 0) + 1
  WHERE slug = blog_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_blog_c(blog_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE blogs
  SET clicks = COALESCE(clicks, 0) + 1
  WHERE slug = blog_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`}
          </pre>
        </div>
        <button 
          onClick={() => {
            setSchemaMissing(false);
            fetchPosts();
          }}
          className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
        >
          I've added the column, refresh
        </button>
      </div>
    );
  }

  if (isEditing && editingPost) {
    const titleChars = (editingPost.title || '').length;
    const excerptChars = (editingPost.excerpt || '').length;
    const plainText = (editingPost.content || '').replace(/<[^>]+>/g, ' ').trim();
    const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    const isSlugValid = Boolean(editingPost.slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(editingPost.slug));
    const hasHeadings = Boolean(editingPost.content && (/<h[23]/i.test(editingPost.content)));
    const hasInternalLink = Boolean(editingPost.content && (/<a\s+(?:[^>]*?\s+)?href=/i.test(editingPost.content)));
    const hasFocusKeyword = Boolean(focusKeyword || (relatedKeywords.length > 0));
    const isTitleLengthOk = titleChars >= 50 && titleChars <= 75;
    const isDescLengthOk = excerptChars >= 80 && excerptChars <= 165;
    const hasCover = Boolean(editingPost.cover_image);
    const isWordCountOk = wordCount >= 300;

    const seoChecklist = [
      { id: 'focus_kw', label: 'Focus keyword added', passed: hasFocusKeyword },
      { id: 'title_len', label: 'SEO title within recommended length', passed: isTitleLengthOk },
      { id: 'desc_len', label: 'Meta description within 155 characters', passed: isDescLengthOk },
      { id: 'slug_seo', label: 'Slug is SEO friendly', passed: isSlugValid },
      { id: 'img_alt', label: 'Image has alt text', passed: hasCover },
      { id: 'headings', label: 'Headings (H2/H3) are well structured', passed: hasHeadings },
      { id: 'internal_link', label: 'Internal link added', passed: hasInternalLink },
      { id: 'word_count', label: `Word count (${wordCount}) is good`, passed: isWordCountOk },
    ];

    const seoPassedCount = seoChecklist.filter(c => c.passed).length;
    const seoScore = seoPassedCount === 8 ? 96 : seoPassedCount >= 6 ? 92 : seoPassedCount >= 4 ? 78 : Math.max(45, Math.round((seoPassedCount / 8) * 100));

    return (
      <div className="space-y-6 max-w-[1360px] mx-auto pb-16 font-sans">
        {/* Hidden File Input for cover image */}
        <input
          type="file"
          ref={coverFileInputRef}
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleCoverUpload(file);
          }}
        />

        {/* Top Header Row with Breadcrumbs & Top-right controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-[#7A6E68]">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="hover:text-[#231A16] hover:underline transition-colors cursor-pointer"
            >
              Blog
            </button>
            <span className="text-[#A89F91] text-[11px]">&gt;</span>
            <span className="font-semibold text-[#231A16]">Edit Post</span>
          </div>

          {/* Right Top Bar Controls: Search, Bell, Avatar */}
          <div className="flex items-center gap-3">
            <div className="relative w-64 sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E827B]" />
              <input
                type="text"
                placeholder="Search galleries, clients, projects, inquiries..."
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] placeholder-[#9E928B] shadow-xs focus:outline-none focus:border-[#B58B5C]"
              />
            </div>
            <div className="relative">
              <button
                type="button"
                className="w-9 h-9 rounded-xl bg-white border border-[#E6DFC6] flex items-center justify-center text-[#5C524C] hover:text-[#1F1714] shadow-xs transition-colors shrink-0 relative"
                title="Notifications"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#B58B5C] ring-1 ring-white" />
              </button>
            </div>
            <div className="w-9 h-9 rounded-xl bg-[#231A16] flex items-center justify-center text-[#FDFBF7] text-xs font-bold shadow-xs">
              J
            </div>
          </div>
        </div>

        {/* Headline Row with Title and Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif font-normal text-[#1F1714] tracking-tight leading-tight">
              Edit Blog Post
            </h1>
            <p className="text-xs sm:text-sm text-[#6D635D] mt-1 font-normal">
              Create and optimize a blog article for search engines and your audience.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={() => doSave(editingPost, 'draft')}
              disabled={isSaving}
              className="px-4 py-2 bg-white border border-[#DCD5C9] hover:bg-[#F2ECE0] text-[#231A16] font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="px-4 py-2 bg-white border border-[#DCD5C9] hover:bg-[#F2ECE0] text-[#231A16] font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-[#5C524C]" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={() => doSave(editingPost, 'published')}
              disabled={isSaving}
              className="px-4 py-2 bg-[#231A16] hover:bg-[#382B24] text-[#FDFBF7] font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
              )}
              <span>Update Post</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>
          </div>
        </div>

        {/* Two-Column Editor Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Main Column (approx 68% / 8 columns) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Navigation Tab Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'content'
                    ? 'bg-[#3B2E28] text-white shadow-xs'
                    : 'text-[#6D635D] hover:text-[#1F1714] hover:bg-[#EFEAE1]'
                }`}
              >
                <PenLine className="w-3.5 h-3.5" />
                <span>Content</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('seo')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'seo'
                    ? 'bg-[#3B2E28] text-white shadow-xs'
                    : 'text-[#6D635D] hover:text-[#1F1714] hover:bg-[#EFEAE1]'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>SEO &amp; Metadata</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('social')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'social'
                    ? 'bg-[#3B2E28] text-white shadow-xs'
                    : 'text-[#6D635D] hover:text-[#1F1714] hover:bg-[#EFEAE1]'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Social Sharing</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('advanced')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === 'advanced'
                    ? 'bg-[#3B2E28] text-white shadow-xs'
                    : 'text-[#6D635D] hover:text-[#1F1714] hover:bg-[#EFEAE1]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Advanced</span>
              </button>
            </div>

            {/* Post Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[#1F1714]">Post Title *</label>
                <span className={`font-medium ${isTitleLengthOk ? 'text-[#16A34A]' : 'text-[#8E827B]'}`}>
                  {titleChars}/60–70 characters
                </span>
              </div>
              <input
                type="text"
                value={editingPost.title || ''}
                onChange={e => {
                  const val = e.target.value;
                  setEditingPost({
                    ...editingPost,
                    title: val,
                    slug: !editingPost.id && (!editingPost.slug || editingPost.slug === generateSlug(editingPost.title || ''))
                      ? generateSlug(val)
                      : editingPost.slug
                  });
                }}
                placeholder="Family Photoshoot in Watamu: A Coastal Experience for Lasting Memories"
                className="w-full px-4 py-2.5 bg-white border border-[#E6DFC6] rounded-xl text-sm text-[#1F1714] placeholder-[#9E928B] shadow-xs focus:outline-none focus:border-[#B58B5C]"
                required
              />
            </div>

            {/* Slug (URL) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[#1F1714]">Slug (URL) *</label>
                {editingPost.title && (
                  <button
                    type="button"
                    onClick={() => setEditingPost(prev => prev ? { ...prev, slug: generateSlug(prev.title || '') } : null)}
                    className="text-[11px] text-[#B58B5C] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-generate
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-[#8E827B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={editingPost.slug || ''}
                    onChange={e => {
                      const val = e.target.value
                        .toLowerCase()
                        .replace(/[\s_]+/g, '-')
                        .replace(/[^a-z0-9-_]/g, '')
                        .replace(/-+/g, '-');
                      setEditingPost(prev => prev ? { ...prev, slug: val } : null);
                      setCanonicalUrl(`https://mwabonje.co.ke/blog/${val}`);
                    }}
                    placeholder="family-photoshoot-in-watamu"
                    className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] shadow-xs focus:outline-none focus:border-[#B58B5C]"
                    required
                  />
                </div>
                <a
                  href={`https://mwabonje.co.ke/blog/${editingPost.slug || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#6D635D] hover:text-[#1F1714] font-mono shrink-0 px-2 py-1"
                >
                  <span className="truncate max-w-[280px]">https://mwabonje.co.ke/blog/{editingPost.slug || ''}</span>
                  <ExternalLink className="w-3 h-3 text-[#8E827B]" />
                </a>
              </div>
            </div>

            {/* Excerpt (Meta Description) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[#1F1714]">Excerpt (Meta Description)</label>
                <span className={`font-medium ${isDescLengthOk ? 'text-[#16A34A]' : 'text-[#8E827B]'}`}>
                  {excerptChars}/155 characters
                </span>
              </div>
              <textarea
                value={editingPost.excerpt || ''}
                onChange={e => setEditingPost({ ...editingPost, excerpt: e.target.value, seo_description: e.target.value })}
                placeholder="Planning a family photoshoot in Watamu? Discover the best locations, timing, and tips for natural, timeless family portraits on Kenya's stunning coast."
                rows={3}
                className="w-full p-3.5 bg-white border border-[#E6DFC6] rounded-xl text-xs sm:text-sm text-[#1F1714] placeholder-[#9E928B] leading-relaxed shadow-xs focus:outline-none focus:border-[#B58B5C] resize-y"
              />
            </div>

            {/* Featured Image */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-[#1F1714]">Featured Image *</label>
                {coverCompressionInfo && coverSourceTab === 'upload' && (
                  <span className="text-[11px] text-[#16A34A] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-compressed ({formatFileSize(coverCompressionInfo.compressedSize)})
                  </span>
                )}
              </div>

              {/* Dual Mode Switcher: Upload from computer vs Paste image URL (Pexels / Unsplash) */}
              <div className="flex items-center gap-1 p-1 bg-[#FAF8F5] rounded-xl border border-[#E6DFC6] w-full sm:w-fit">
                <button
                  type="button"
                  onClick={() => setCoverSourceTab('upload')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    coverSourceTab === 'upload'
                      ? 'bg-[#3B2E28] text-white shadow-xs'
                      : 'text-[#6D635D] hover:text-[#1F1714]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload from computer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCoverSourceTab('url')}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    coverSourceTab === 'url'
                      ? 'bg-[#3B2E28] text-white shadow-xs'
                      : 'text-[#6D635D] hover:text-[#1F1714]'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Paste image URL (Pexels / Unsplash)</span>
                </button>
              </div>

              {/* Option A: Upload Tab */}
              {coverSourceTab === 'upload' && (
                <div>
                  {isUploadingCover ? (
                    <div className="border border-[#E6DFC6] rounded-2xl bg-white p-8 text-center space-y-3">
                      <Loader2 className="w-7 h-7 text-[#B58B5C] animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-[#1F1714]">Compressing &amp; Uploading...</p>
                      <div className="w-48 mx-auto bg-[#E6DFC6] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#B58B5C] h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${coverUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : !editingPost.cover_image ? (
                    <div
                      onDragOver={e => {
                        e.preventDefault();
                        setIsDraggingCover(true);
                      }}
                      onDragLeave={() => setIsDraggingCover(false)}
                      onDrop={e => {
                        e.preventDefault();
                        setIsDraggingCover(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleCoverUpload(file);
                      }}
                      onClick={() => coverFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors shadow-xs ${
                        isDraggingCover
                          ? 'border-[#B58B5C] bg-[#FAF8F5]'
                          : 'border-[#E6DFC6] hover:border-[#B58B5C] bg-white'
                      }`}
                    >
                      <Upload className="w-8 h-8 text-[#8E827B] mx-auto mb-2" />
                      <p className="text-xs font-semibold text-[#1F1714]">Click to upload featured image <span className="text-[#8E827B] font-normal">or drag &amp; drop</span></p>
                      <p className="text-[11px] text-[#7A6E68] mt-1">JPEG, PNG, WebP · Auto-compressed under 300 KB</p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Option B: URL Tab for Pexels, Unsplash, or External CDN link */}
              {coverSourceTab === 'url' && (
                <div className="bg-white border border-[#E6DFC6] rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                  <div>
                    <label className="block text-xs font-medium text-[#1F1714] mb-1.5">
                      Direct Image URL (Pexels, Unsplash, or CDN)
                    </label>
                    <div className="relative">
                      <Link2 className="w-4 h-4 text-[#8E827B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={editingPost.cover_image || ''}
                        onChange={e => {
                          setEditingPost({ ...editingPost, cover_image: e.target.value.trim() });
                          setCoverCompressionInfo(null);
                        }}
                        placeholder="https://images.pexels.com/photos/... or https://images.unsplash.com/..."
                        className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF8F5] border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] placeholder-[#9E928B] shadow-xs focus:outline-none focus:border-[#B58B5C]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7A6E68]">
                    <span>Paste any image link from <strong>Pexels</strong>, <strong>Unsplash</strong>, or your preferred photo website.</span>
                    {editingPost.cover_image && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPost({ ...editingPost, cover_image: '' });
                          setCoverCompressionInfo(null);
                        }}
                        className="text-rose-600 hover:underline font-medium cursor-pointer"
                      >
                        Clear URL
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Live Preview Card (shown whenever cover_image is populated, regardless of source) */}
              {editingPost.cover_image && !isUploadingCover && (
                <div className="relative rounded-2xl overflow-hidden border border-[#E6DFC6] bg-stone-900 group shadow-xs">
                  <img
                    src={editingPost.cover_image}
                    alt={editingPost.title || 'Cover image'}
                    className="w-full h-[280px] sm:h-[340px] object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.opacity = '0.5';
                    }}
                  />
                  {/* Bottom-left Action Pills */}
                  <div className="absolute bottom-3.5 left-3.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCoverSourceTab('upload');
                        coverFileInputRef.current?.click();
                      }}
                      className="px-3 py-1.5 bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.info('Aspect ratio locked at 16:9 for optimal coastal display.')}
                      className="px-3 py-1.5 bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Crop className="w-3 h-3" />
                      <span>Crop</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverSourceTab('url');
                        setCustomUrlInput(editingPost.cover_image || '');
                        setIsUrlModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Link</span>
                    </button>
                  </div>
                  {/* Bottom-right Trash Pill */}
                  <div className="absolute bottom-3.5 right-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPost({ ...editingPost, cover_image: '' });
                        setCoverCompressionInfo(null);
                      }}
                      className="p-2 bg-black/60 hover:bg-rose-700/90 backdrop-blur-md text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                      title="Remove cover image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Content Editor */}
            <div className="space-y-1.5">
              <label className="font-semibold text-xs text-[#1F1714]">Content</label>
              <RichTextEditor
                content={editingPost.content || ''}
                onChange={content => setEditingPost(prev => prev ? { ...prev, content } : prev)}
                lastSavedText={lastSavedText}
              />
            </div>
          </div>

          {/* Right Sidebar Column (approx 32% / 4 columns) */}
          <div className="lg:col-span-4 space-y-4">
            {/* Card 1: SEO Analysis */}
            <div className="bg-white rounded-2xl border border-[#E6DFC6] p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-[#1F1714] font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#7A6E68]" />
                <span>SEO Analysis</span>
              </div>

              {/* Circular Radial Score */}
              <div className="flex items-center gap-4 py-1">
                <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                  <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="33"
                      stroke="#EAE4D9"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="33"
                      stroke="#16A34A"
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 33}
                      strokeDashoffset={2 * Math.PI * 33 * (1 - seoScore / 100)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-bold text-[#1F1714] leading-none">{seoScore}</span>
                    <span className="text-[10px] text-[#7A6E68] mt-0.5 font-medium">/100</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[#16A34A]">Excellent</div>
                  <p className="text-xs text-[#6D635D] leading-tight mt-1">
                    Your post is well optimized for search engines.
                  </p>
                </div>
              </div>

              {/* 8 Checklist Items */}
              <div className="space-y-2.5 pt-2 border-t border-[#F2ECE0]">
                {seoChecklist.map(item => (
                  <div key={item.id} className="flex items-center gap-2.5 text-xs text-[#231A16]">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${item.passed ? 'text-[#16A34A]' : 'text-[#C9C0B3]'}`} />
                    <span className={item.passed ? 'text-[#231A16]' : 'text-[#8E827B]'}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 2: Focus Keyword */}
            <div className="bg-white rounded-2xl border border-[#E6DFC6] p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-[#1F1714] font-semibold text-sm">
                <Key className="w-4 h-4 text-[#7A6E68]" />
                <span>Focus Keyword</span>
              </div>
              <div>
                <input
                  type="text"
                  value={focusKeyword}
                  onChange={e => setFocusKeyword(e.target.value)}
                  placeholder="family photoshoot in Watamu"
                  className="w-full px-3.5 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] focus:outline-none focus:border-[#B58B5C] shadow-xs"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs text-[#6D635D]">
                  <span className="font-medium text-[#231A16]">Related Keywords</span> <span className="text-[#8E827B]">(optional)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {relatedKeywords.map(kw => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-[#F7F4EE] border border-[#E6DFC6] text-[#231A16]"
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="hover:text-rose-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  {isAddingKeyword ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newKeywordInput}
                        onChange={e => setNewKeywordInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddKeyword();
                          }
                        }}
                        placeholder="Type keyword..."
                        autoFocus
                        className="px-2 py-0.5 text-xs border border-[#B58B5C] rounded-lg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddKeyword}
                        className="text-xs text-[#16A34A] font-semibold px-1"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingKeyword(false)}
                        className="text-xs text-[#8E827B]"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingKeyword(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border border-dashed border-[#C9C0B3] text-[#6D635D] hover:border-[#8F7E78] hover:text-[#1F1714] transition-colors cursor-pointer"
                    >
                      <span>+ Add keyword</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Publishing */}
            <div className="bg-white rounded-2xl border border-[#E6DFC6] p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-[#1F1714] font-semibold text-sm">
                <Calendar className="w-4 h-4 text-[#7A6E68]" />
                <span>Publishing</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6D635D] font-medium">Status</span>
                  <div className="relative">
                    <select
                      value={editingPost.status || 'published'}
                      onChange={e => setEditingPost({ ...editingPost, status: e.target.value as any })}
                      className="appearance-none bg-white border border-[#E6DFC6] rounded-xl pl-6 pr-7 py-1.5 text-xs font-medium text-[#1F1714] focus:outline-none focus:border-[#B58B5C] shadow-xs cursor-pointer"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                    <span className={`w-2 h-2 rounded-full absolute left-2.5 top-1/2 -translate-y-1/2 ${editingPost.status === 'draft' ? 'bg-amber-500' : editingPost.status === 'scheduled' ? 'bg-blue-500' : 'bg-[#16A34A]'}`} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#7A6E68] text-[10px]">⌄</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6D635D] font-medium">Publish Date</span>
                  <div className="flex items-center gap-1.5 bg-white border border-[#E6DFC6] rounded-xl px-2.5 py-1 text-xs text-[#1F1714] shadow-xs">
                    <Calendar className="w-3.5 h-3.5 text-[#7A6E68]" />
                    <input
                      type="date"
                      value={editingPost.date || ''}
                      onChange={e => setEditingPost({ ...editingPost, date: e.target.value })}
                      className="bg-transparent border-none text-xs text-[#1F1714] focus:outline-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#F2ECE0]">
                  <span className="text-xs text-[#6D635D]">Update last modified date</span>
                  <button
                    type="button"
                    onClick={() => setUpdateLastModified(!updateLastModified)}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${updateLastModified ? 'bg-[#3B2E28]' : 'bg-[#DCD5C9]'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${updateLastModified ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 4: Featured Settings */}
            <div className="bg-white rounded-2xl border border-[#E6DFC6] p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#1F1714] font-semibold text-sm">
                <Star className="w-4 h-4 text-[#7A6E68]" />
                <span>Featured Settings</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFeatured(!isFeatured)}
                  className={`w-9 h-5 flex items-center shrink-0 rounded-full p-0.5 transition-colors cursor-pointer ${isFeatured ? 'bg-[#3B2E28]' : 'bg-[#DCD5C9]'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isFeatured ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <div>
                  <div className="text-xs font-semibold text-[#1F1714]">Feature this post</div>
                  <div className="text-[11px] text-[#7A6E68]">Show on blog homepage and highlights.</div>
                </div>
              </div>
            </div>

            {/* Card 5: Post Options */}
            <div className="bg-white rounded-2xl border border-[#E6DFC6] p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#1F1714] font-semibold text-sm">
                <Layers className="w-4 h-4 text-[#7A6E68]" />
                <span>Post Options</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Allow comments', val: allowComments, set: setAllowComments },
                  { label: 'Show author', val: showAuthor, set: setShowAuthor },
                  { label: 'Show reading time', val: showReadingTime, set: setShowReadingTime },
                  { label: 'Show table of contents', val: showTableOfContents, set: setShowTableOfContents },
                ].map(opt => (
                  <div key={opt.label} className="flex items-center justify-between text-xs">
                    <span className="text-[#231A16]">{opt.label}</span>
                    <button
                      type="button"
                      onClick={() => opt.set(!opt.val)}
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${opt.val ? 'bg-[#3B2E28]' : 'bg-[#DCD5C9]'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${opt.val ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 6: Canonical URL (Advanced) */}
            <div className="bg-white rounded-2xl border border-[#E6DFC6] p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-[#1F1714] font-semibold text-sm">
                <Link2 className="w-4 h-4 text-[#7A6E68]" />
                <span>Canonical URL <span className="text-[#8E827B] font-normal">(Advanced)</span></span>
              </div>
              <div>
                <input
                  type="url"
                  value={canonicalUrl || (editingPost.slug ? `https://mwabonje.co.ke/blog/${editingPost.slug}` : '')}
                  onChange={e => setCanonicalUrl(e.target.value)}
                  placeholder="https://mwabonje.co.ke/blog/family-photoshoot-in-watamu"
                  className="w-full px-3 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#5C524C] focus:outline-none focus:border-[#B58B5C] shadow-xs"
                />
              </div>
            </div>

            {/* Card 7: Categories (Full Functionality Preserved) */}
            <div className="bg-white rounded-2xl border border-[#E6DFC6] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#1F1714] font-semibold text-sm">
                  <Sparkles className="w-4 h-4 text-[#7A6E68]" />
                  <span>Categories</span>
                </div>
                {selectedCategories.length > 0 && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EFEAE1] text-[#3B2E28]">
                    {selectedCategories.length} selected
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {allAvailableCategories.map(cat => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#3B2E28] text-white font-medium shadow-xs'
                          : 'bg-[#F7F4EE] text-[#5C524C] hover:bg-[#EFEAE1] border border-[#E6DFC6]'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3 text-[#8E827B]" />}
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Category */}
              <div className="pt-2 border-t border-[#F2ECE0] flex items-center gap-2">
                <input
                  type="text"
                  placeholder="New category..."
                  value={customCategoryInput}
                  onChange={e => setCustomCategoryInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomCategory();
                    }
                  }}
                  className="flex-1 px-2.5 py-1 text-xs bg-white border border-[#E6DFC6] rounded-lg focus:outline-none focus:border-[#B58B5C]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCategory}
                  disabled={!customCategoryInput.trim()}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#FAF8F5] hover:bg-[#EFEAE1] text-[#3B2E28] border border-[#E6DFC6] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal: Live Blog Article Preview */}
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#F7F4EE] w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-[#E6DFC6]">
              {/* Modal Header */}
              <div className="p-4 px-6 border-b border-[#E6DFC6] bg-white flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#1F1714]">Article Preview</h3>
                  <p className="text-xs text-[#7A6E68]">https://mwabonje.co.ke/blog/{editingPost.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/blog/${editingPost.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-[#FAF8F5] border border-[#E6DFC6] rounded-xl text-xs font-medium text-[#231A16] flex items-center gap-1.5 hover:bg-[#EFEAE1]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in new tab</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(false)}
                    className="p-1.5 text-[#7A6E68] hover:text-[#1F1714] hover:bg-[#FAF8F5] rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Article Content */}
              <div className="p-6 md:p-10 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6">
                {editingPost.cover_image && (
                  <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-md">
                    <img src={editingPost.cover_image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-[#7A6E68]">
                    <span>{editingPost.date}</span>
                    <span>•</span>
                    <span>{editingPost.author || 'Mwabonje'}</span>
                    <span>•</span>
                    <span>{readTime} min read</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1F1714] leading-tight">
                    {editingPost.title}
                  </h1>
                  {editingPost.excerpt && (
                    <p className="text-base text-[#6D635D] italic leading-relaxed">
                      {editingPost.excerpt}
                    </p>
                  )}
                </div>
                <div
                  className="prose prose-stone prose-lg max-w-none pt-4 border-t border-[#E6DFC6]"
                  dangerouslySetInnerHTML={{ __html: editingPost.content || '<p>No content yet.</p>' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal: Edit Image URL */}
        {isUrlModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#E6DFC6] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[#1F1714]">Image URL</h3>
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="text-[#7A6E68] hover:text-[#1F1714]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#6D635D]">
                Paste a direct image link (Pexels, Unsplash, or R2 storage URL).
              </p>
              <input
                type="url"
                value={customUrlInput}
                onChange={e => setCustomUrlInput(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-[#6D635D] hover:bg-[#FAF8F5] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPost({ ...editingPost, cover_image: customUrlInput.trim() });
                    setIsUrlModalOpen(false);
                  }}
                  className="px-3.5 py-1.5 text-xs font-medium bg-[#231A16] text-white rounded-lg hover:bg-[#382B24]"
                >
                  Save Image URL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1360px] mx-auto pb-16 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-normal text-[#1F1714] tracking-tight">Blog Manager</h1>
          <p className="text-xs sm:text-sm text-[#6D635D] mt-1">Manage your journal entries, stories, and SEO metadata</p>
        </div>
        <div className="flex gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchPosts}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-[#E6DFC6] text-[#5C524C] hover:text-[#1F1714] hover:bg-[#FAF8F5] rounded-xl shadow-xs transition-colors font-medium text-xs sm:text-sm cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#231A16] hover:bg-[#382B24] text-[#FDFBF7] px-4 py-2 rounded-xl transition-colors font-medium text-xs sm:text-sm shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Post</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-[#E6DFC6] overflow-hidden">
        <div className="p-4 border-b border-[#F2ECE0] flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#FAF8F5]/60">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-[#8E827B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] placeholder-[#9E928B] shadow-xs focus:outline-none focus:border-[#B58B5C] transition-colors"
            />
          </div>
          <div className="text-xs text-[#7A6E68]">
            <span>{filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'}</span>
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-[#7A6E68]">
            {searchQuery ? 'No posts found matching your search.' : 'No blog posts yet. Create your first one!'}
          </div>
        ) : (
          <div className="overflow-x-auto overscroll-x-contain touch-pan-y">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E6DFC6] text-[11px] uppercase tracking-wider text-[#7A6E68] font-semibold">
                  <th className="p-4">Post</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Views</th>
                  <th className="p-4">Clicks</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2ECE0]">
                {filteredPosts.map((post) => (
                  <tr 
                    key={post.id} 
                    className="hover:bg-[#FAF8F5]/80 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#FAF8F5] flex-shrink-0 border border-[#E6DFC6]">
                          {post.cover_image ? (
                            <img 
                              src={getOptimizedImageUrl(post.cover_image, 100, 100, 75)} 
                              alt="" 
                              loading="lazy"
                              decoding="async"
                              width={48}
                              height={48}
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <FileText className="w-5 h-5 m-auto text-[#C9C0B3] mt-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs sm:text-sm text-[#1F1714] truncate max-w-sm">
                            {post.title}
                          </div>
                          <div className="text-[11px] text-[#7A6E68] font-mono mt-0.5 truncate max-w-sm">
                            /{post.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {parseCategories(post.category).length > 0 ? (
                          parseCategories(post.category).map(cat => (
                            <span 
                              key={cat} 
                              className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-[#FAF8F5] text-[#3B2E28] border border-[#E6DFC6]"
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-[#FAF8F5] text-[#8E827B]">
                            Uncategorized
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#5C524C]">
                        <Eye className="w-3.5 h-3.5 text-[#8E827B]" />
                        {post.views || 0}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#5C524C]">
                        <MousePointerClick className="w-3.5 h-3.5 text-[#8E827B]" />
                        {post.clicks || 0}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        post.status === 'published' ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200/60' :
                        post.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border border-blue-200/60' :
                        'bg-amber-50 text-amber-700 border border-amber-200/60'
                      }`}>
                        {(post.status || 'published').charAt(0).toUpperCase() + (post.status || 'published').slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-[#6D635D]">
                      {new Date(post.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(post)}
                          className="p-1.5 text-[#7A6E68] hover:text-[#1F1714] hover:bg-[#FAF8F5] rounded-lg transition-colors cursor-pointer"
                          title="Edit post"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id!)}
                          className="p-1.5 text-[#7A6E68] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete post"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
