import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { BlogPost } from '../types';
import { Edit2, Trash2, Plus, Loader2, Save, X, Search, FileText } from 'lucide-react';
import { toast } from 'sonner';

export const BlogAdmin: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPost, setEditingPost] = useState<Partial<BlogPost> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

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
      seo_description: ''
    });
    setIsEditing(true);
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
      const postData = {
        ...editingPost,
        // Remove id if it's a new post so Supabase generates one (if using uuid default)
        ...(editingPost.id ? { id: editingPost.id } : {})
      };

      const { error } = await supabase
        .from('blogs')
        .upsert(postData)
        .select();

      if (error) throw error;

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

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    post.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON blogs FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON blogs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON blogs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON blogs FOR DELETE TO authenticated USING (true);
);`}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <input 
                  type="text" 
                  value={editingPost.category || ''} 
                  onChange={e => setEditingPost({ ...editingPost, category: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Publish Date</label>
                <input 
                  type="date" 
                  value={editingPost.date || ''} 
                  onChange={e => setEditingPost({ ...editingPost, date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cover Image URL</label>
                <input 
                  type="text" 
                  value={editingPost.cover_image || ''} 
                  onChange={e => setEditingPost({ ...editingPost, cover_image: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="https://images.unsplash.com/..."
                />
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Content (HTML)</label>
            <textarea 
              value={editingPost.content || ''} 
              onChange={e => setEditingPost({ ...editingPost, content: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[400px] font-mono text-sm bg-slate-50"
            />
            <p className="text-xs text-slate-500 mt-2">
              Note: You can use HTML tags like &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, etc.
            </p>
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
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>New Post</span>
        </button>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="p-4">Post</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                          {post.cover_image ? (
                            <img src={post.cover_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-6 h-6 m-auto text-slate-300 mt-3" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                            {post.title}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">/{post.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {post.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {new Date(post.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(post)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit post"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id!)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
