import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { BlogPost } from '../types';
import { RichTextEditor } from "../components/RichTextEditor";
import { Edit2, Trash2, Plus, Loader2, Save, X, Search, FileText, Eye, MousePointerClick, RefreshCw, Upload, Image as ImageIcon, Sparkles, CheckCircle2, Link2, Check } from 'lucide-react';
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
    setIsEditing(true);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost || !editingPost.title || !editingPost.slug) {
      toast.error('Title and slug are required');
      return;
    }

    setIsSaving(true);
    try {
      const postData = sanitizePostForSave(editingPost);

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

      toast.success(editingPost.id ? 'Post updated' : 'Post created');
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
      .replace(/[^a-z0-9]+/g, '-')
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
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">{editingPost.id ? 'Edit Post' : 'Create New Post'}</h2>
          <button 
            onClick={() => setIsEditing(false)}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={editingPost.title || ''} 
                  onChange={e => {
                    setEditingPost({ 
                      ...editingPost, 
                      title: e.target.value,
                      // Auto-generate slug only if it's a new post and slug hasn't been manually edited heavily
                      slug: !editingPost.id && (!editingPost.slug || editingPost.slug === generateSlug(editingPost.title || '')) 
                        ? generateSlug(e.target.value) 
                        : editingPost.slug
                    });
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL Slug</label>
                <input 
                  type="text" 
                  value={editingPost.slug || ''} 
                  onChange={e => setEditingPost({ ...editingPost, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Categories <span className="text-xs font-normal text-slate-500">(choose one or more)</span>
                  </label>
                  {selectedCategories.length > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {selectedCategories.length} selected
                    </span>
                  )}
                </div>

                {/* Selected categories badges */}
                {selectedCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2 mb-2 bg-emerald-50/60 border border-emerald-200/80 rounded-lg">
                    {selectedCategories.map(cat => (
                      <span 
                        key={cat}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md text-xs font-medium bg-emerald-600 text-white shadow-xs"
                      >
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(cat)}
                          className="hover:bg-emerald-700 rounded p-0.5 transition-colors cursor-pointer"
                          title={`Remove ${cat}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200/70 rounded-lg p-2.5 mb-2">
                    Click the category pills below to select which categories this article belongs to.
                  </div>
                )}

                {/* Available category pills to click & toggle */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Click categories to toggle:
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {allAvailableCategories.map(cat => {
                      const isSelected = selectedCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleCategory(cat)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white font-semibold shadow-xs ring-1 ring-emerald-600'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3 h-3 text-white stroke-[2.5]" />
                          ) : (
                            <Plus className="w-3 h-3 text-slate-400" />
                          )}
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add custom category */}
                  <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add custom category..."
                      value={customCategoryInput}
                      onChange={e => setCustomCategoryInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomCategory();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomCategory}
                      disabled={!customCategoryInput.trim()}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 disabled:opacity-40 disabled:hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma separated)</label>
                <input 
                  type="text" 
                  value={editingPost.tags?.join(', ') || ''} 
                  onChange={e => setEditingPost({ ...editingPost, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Author</label>
                <input 
                  type="text" 
                  value={editingPost.author || ''} 
                  onChange={e => setEditingPost({ ...editingPost, author: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editingPost.status || 'published'} 
                  onChange={e => setEditingPost({ ...editingPost, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Publish Date</label>
                <input 
                  type="date" 
                  value={editingPost.date || ''} 
                  onChange={e => setEditingPost({ ...editingPost, date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Cover Image</label>
                  {coverSourceTab === 'upload' && (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Auto-compressed if &gt; 300 KB
                    </span>
                  )}
                </div>

                {/* Dual Mode Switcher Tabs - Both options clearly visible */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg mb-3 border border-slate-200 w-full sm:w-fit">
                  <button
                    type="button"
                    onClick={() => setCoverSourceTab('upload')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      coverSourceTab === 'upload'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload from computer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoverSourceTab('url')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      coverSourceTab === 'url'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Paste image URL (Pexels / Unsplash)
                  </button>
                </div>

                {/* Option 1: Upload from local machine */}
                {coverSourceTab === 'upload' && (
                  <div>
                    {/* Hidden File Input for Local Machine Upload */}
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
                      onClick={() => {
                        if (!isUploadingCover) coverFileInputRef.current?.click();
                      }}
                      className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                        isDraggingCover
                          ? 'border-emerald-500 bg-emerald-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      {isUploadingCover ? (
                        <div className="space-y-3 py-1">
                          <Loader2 className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
                          <div>
                            <p className="text-xs font-semibold text-slate-700">Compressing &amp; Uploading...</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Images &gt; 300KB are automatically resized &amp; compressed</p>
                          </div>
                          <div className="w-48 mx-auto bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${coverUploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 py-0.5">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-600">
                            <Upload className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              Click to choose an image from your computer <span className="text-slate-400 font-normal">or drag &amp; drop</span>
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              JPEG, PNG, WebP · Auto-compressed if over 300 KB
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Option 2: Paste Image URL (Original option for Pexels, Unsplash, external web links) */}
                {coverSourceTab === 'url' && (
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      value={editingPost.cover_image || ''}
                      onChange={e => {
                        setEditingPost({ ...editingPost, cover_image: e.target.value });
                        setCoverCompressionInfo(null);
                      }}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-mono"
                      placeholder="https://images.pexels.com/photos/... or https://images.unsplash.com/..."
                    />
                    <p className="text-[11px] text-slate-400">
                      Paste a direct image link from Pexels, Unsplash, or any image URL.
                    </p>
                  </div>
                )}

                {/* Live Cover Image Preview (Works for both upload and pasted URL) */}
                {editingPost.cover_image && (
                  <div className="mt-3 space-y-1.5">
                    <div className="relative aspect-[16/9] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-900 group shadow-sm max-h-56">
                      <img
                        src={editingPost.cover_image}
                        alt="Blog Cover Preview"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.opacity = '0.4';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                        {coverSourceTab === 'upload' ? (
                          <button
                            type="button"
                            onClick={() => coverFileInputRef.current?.click()}
                            disabled={isUploadingCover}
                            className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 rounded text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" /> Upload different
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPost({ ...editingPost, cover_image: '' });
                            setCoverCompressionInfo(null);
                          }}
                          disabled={isUploadingCover}
                          className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Clear Image
                        </button>
                      </div>

                      {/* Compression indicator badge if uploaded & auto-compressed */}
                      {coverCompressionInfo && (
                        <div className="absolute bottom-2 left-2 bg-emerald-600/95 backdrop-blur-sm text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3" />
                          {coverCompressionInfo.wasCompressed ? (
                            <span>Compressed: {formatFileSize(coverCompressionInfo.originalSize)} → {formatFileSize(coverCompressionInfo.compressedSize)}</span>
                          ) : (
                            <span>Size: {formatFileSize(coverCompressionInfo.compressedSize)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span className="truncate max-w-md">Preview: {editingPost.cover_image}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPost({ ...editingPost, cover_image: '' });
                          setCoverCompressionInfo(null);
                        }}
                        className="text-rose-500 hover:text-rose-600 hover:underline cursor-pointer shrink-0 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">SEO Settings</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SEO Title <span className="text-slate-400 font-normal">(Optional, overrides post title for search engines)</span></label>
                <input 
                  type="text" 
                  value={editingPost.seo_title || ''} 
                  onChange={e => setEditingPost({ ...editingPost, seo_title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Excerpt / SEO Description</label>
                <textarea 
                  value={editingPost.excerpt || ''} 
                  onChange={e => setEditingPost({ ...editingPost, excerpt: e.target.value, seo_description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[80px]"
                  placeholder="A brief summary of the post..."
                  maxLength={160}
                />
                <p className="text-xs text-slate-500 mt-1 text-right">
                  {(editingPost.excerpt || '').length} / 160 characters recommended for SEO
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
              <label className="block text-sm font-medium text-slate-700">Content</label>
              <div className="flex bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
                <button 
                  type="button"
                  onClick={() => setPreviewMode('editor')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors uppercase tracking-wider ${previewMode === 'editor' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Editor
                </button>
                <button 
                  type="button"
                  onClick={() => setPreviewMode('split')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors uppercase tracking-wider ${previewMode === 'split' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'} hidden md:block`}
                >
                  Split View
                </button>
                <button 
                  type="button"
                  onClick={() => setPreviewMode('preview')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors uppercase tracking-wider ${previewMode === 'preview' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Preview
                </button>
              </div>
            </div>
            
            <div className={`grid gap-6 ${previewMode === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
              {(previewMode === 'editor' || previewMode === 'split') && (
                <div className="w-full">
                  <RichTextEditor 
                    content={editingPost.content || ''} 
                    onChange={content => setEditingPost({ ...editingPost, content })}
                  />
                </div>
              )}
              
              {(previewMode === 'preview' || previewMode === 'split') && (
                <div className="w-full border border-slate-200 rounded-lg bg-white overflow-y-auto max-h-[600px] min-h-[300px] p-6 md:p-8">
                  <div 
                    className="prose prose-slate prose-lg md:prose-xl mx-auto prose-headings:font-serif prose-headings:font-bold prose-a:text-slate-900 hover:prose-a:text-slate-600 prose-img:rounded-sm w-full max-w-full"
                    dangerouslySetInnerHTML={{ __html: editingPost.content || '<p class="text-slate-400 italic font-sans text-base">Start typing to see preview...</p>' }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save Post'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Blog Manager</h1>
          <p className="text-sm text-slate-500">Manage your journal entries and stories</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={fetchPosts}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="sm:hidden">Refresh</span>
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>New Post</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-shadow text-sm"
            />
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {searchQuery ? 'No posts found matching your search.' : 'No blog posts yet. Create your first one!'}
          </div>
        ) : (
          <div className="overflow-x-auto overscroll-x-contain touch-pan-y">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="p-4">Post</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Views</th>
                  <th className="p-4">Clicks</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPosts.map((post) => (
                  <tr 
                    key={post.id} 
                    className="hover:bg-slate-50/70 border-b border-slate-100 last:border-b-0"
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '0 72px' }}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200/50">
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
                            <FileText className="w-6 h-6 m-auto text-slate-300 mt-3" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {post.title}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">/{post.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {parseCategories(post.category).length > 0 ? (
                          parseCategories(post.category).map(cat => (
                            <span 
                              key={cat} 
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                            Uncategorized
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                        <Eye className="w-4 h-4 text-slate-400" />
                        {post.views || 0}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                        <MousePointerClick className="w-4 h-4 text-slate-400" />
                        {post.clicks || 0}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        post.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                        post.status === 'scheduled' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {(post.status || 'published').charAt(0).toUpperCase() + (post.status || 'published').slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {new Date(post.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(post)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit post"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id!)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete post"
                        >
                          <Trash2 className="w-4 h-4" />
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
