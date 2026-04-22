import React, { useEffect, useState } from 'react';
import { Plus, Eye, EyeOff, Image as ImageIcon, Loader2, Trash2, Heart, Bell, Clock } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Gallery, ActivityLog } from '../types';
import { useNavigate } from 'react-router-dom';
import { getOptimizedImageUrl, formatDate } from '../utils/formatters';

// Extended interface for dashboard display
interface DashboardGallery extends Gallery {
  coverUrl: string | null;
  itemCount: number;
}

interface EnrichedActivityLog extends ActivityLog {
  gallery?: {
    client_name: string;
  };
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState<DashboardGallery[]>([]);
  const [activities, setActivities] = useState<EnrichedActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const initDashboard = async () => {
        try {
            await supabase.rpc('delete_expired_files');
        } catch (e) {
            // Ignore error if function doesn't exist or permission denied
        }
        fetchData();
    };
    initDashboard();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Galleries
      const { data: galleriesData, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('photographer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Fetch details for each gallery (Cover Image & Count)
      const enrichedGalleries = await Promise.all(
        (galleriesData || []).map(async (gallery) => {
          // Get item count
          const { count } = await supabase
            .from('files')
            .select('*', { count: 'exact', head: true })
            .eq('gallery_id', gallery.id);

          // Get latest image for cover
          const { data: files } = await supabase
            .from('files')
            .select('file_url')
            .eq('gallery_id', gallery.id)
            .eq('file_type', 'image')
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...gallery,
            itemCount: count || 0,
            coverUrl: files && files.length > 0 ? files[0].file_url : null,
          };
        })
      );
      
      // Sort galleries
      const sortedGalleries = enrichedGalleries.sort((a, b) => {
          if (a.selection_status === 'submitted' && b.selection_status !== 'submitted') return -1;
          if (a.selection_status !== 'submitted' && b.selection_status === 'submitted') return 1;
          return 0;
      });

      setGalleries(sortedGalleries);

      // 3. Fetch Recent Activity
      const { data: activityData } = await supabase
        .from('activity_logs')
        .select('*, gallery:galleries(client_name)')
        .order('timestamp', { ascending: false })
        .limit(10);
        
      if (activityData) {
          // Filter out logs where gallery might have been deleted (if cascade didn't work or for safety)
          // @ts-ignore
          setActivities(activityData.filter(log => log.gallery));
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (galleries.length >= 3) {
      alert("You have reached the maximum limit of 3 galleries. Please delete an existing gallery to create a new one.");
      return;
    }
    setNewClientName('');
    setIsCreateModalOpen(true);
  };

  const createGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    
    setIsCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('galleries')
        .insert([{
          photographer_id: user.id,
          client_name: newClientName,
          title: `${newClientName}'s Gallery`,
          agreed_balance: 0,
          amount_paid: 0,
          link_enabled: true
        }])
        .select()
        .single();

      if (error) throw error;
      setIsCreateModalOpen(false);
      navigate(`/gallery/${data.id}`);
    } catch (error) {
      alert('Error creating gallery');
      console.error(error);
    } finally {
        setIsCreating(false);
    }
  };

  const deleteGallery = async (e: React.MouseEvent, galleryId: string, clientName: string) => {
    e.stopPropagation(); // Prevent navigation
    
    if (!window.confirm(`Are you sure you want to delete the gallery for "${clientName}"?\nThis action cannot be undone and will delete all associated files.`)) {
        return;
    }

    try {
        const { data: filesData } = await supabase
            .from('files')
            .select('file_path')
            .eq('gallery_id', galleryId);
            
        if (filesData && filesData.length > 0) {
            const paths = filesData.map(f => f.file_path);
            await fetch('/api/delete-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePaths: paths })
            });
        }

        const { error } = await supabase
            .from('galleries')
            .delete()
            .eq('id', galleryId);

        if (error) throw error;

        setGalleries(prev => prev.filter(g => g.id !== galleryId));
        // Refresh activities as some might be related to deleted gallery
        fetchData();

    } catch (err) {
        console.error("Error deleting gallery:", err);
        alert("Failed to delete gallery. Check console for details.");
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full text-slate-400"><Loader2 className="animate-spin mr-2" /> Loading dashboard...</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Main Content */}
      <div className="flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
            <div>
               <h1 className="text-2xl font-bold text-slate-900">Galleries</h1>
               <p className="text-slate-500 text-sm">Manage your client galleries</p>
            </div>
            {galleries.length < 3 && (
            <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-95"
            >
            <Plus className="w-5 h-5" />
            <span>New Gallery</span>
            </button>
            )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleries.map((gallery) => (
            <div 
                key={gallery.id} 
                onClick={() => navigate(`/gallery/${gallery.id}`)}
                className="group cursor-pointer flex flex-col"
            >
                {/* Image Container */}
                <div className="relative aspect-[3/2] bg-slate-100 rounded-xl overflow-hidden mb-3 shadow-sm transition-all duration-300 group-hover:shadow-md border border-slate-100">
                {gallery.coverUrl ? (
                    <img 
                    src={getOptimizedImageUrl(gallery.coverUrl, 600, 400)} 
                    alt={gallery.client_name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src !== gallery.coverUrl) target.src = gallery.coverUrl!;
                    }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                    <ImageIcon className="w-10 h-10" />
                    </div>
                )}
                
                {/* Status Badges Overlay */}
                <div className="absolute top-2 left-2 flex gap-1 z-10">
                    {gallery.selection_status === 'submitted' && (
                        <div className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1 animate-bounce">
                            <Heart className="w-3 h-3 fill-current" />
                            SUBMITTED
                        </div>
                    )}
                </div>
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                
                {/* Delete Button */}
                <button
                    onClick={(e) => deleteGallery(e, gallery.id, gallery.client_name)}
                    className="absolute top-2 right-2 p-3 md:p-2 bg-white/90 rounded-full text-slate-400 hover:text-red-600 hover:bg-white shadow-sm opacity-100 md:opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-100 md:scale-90 group-hover:scale-100 z-10"
                    title="Delete Gallery"
                >
                    <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                </button>
                </div>

                {/* Info Container */}
                <div className="space-y-1 px-1">
                {/* Title Row */}
                <div className="flex items-center gap-2">
                    {gallery.link_enabled ? (
                    <Eye className="w-4 h-4 text-slate-400" />
                    ) : (
                    <EyeOff className="w-4 h-4 text-slate-400" />
                    )}
                    <h3 className="font-semibold text-slate-800 truncate group-hover:text-slate-600 transition-colors">
                    {gallery.client_name}
                    </h3>
                </div>

                {/* Status Row */}
                <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${gallery.link_enabled && gallery.itemCount > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-slate-500">
                    {gallery.itemCount} {gallery.itemCount === 1 ? 'item' : 'items'}
                    </span>
                </div>
                </div>
            </div>
            ))}

            {/* Create New Gallery Card */}
            {galleries.length < 3 && (
            <div 
                onClick={handleOpenCreateModal}
                className="group cursor-pointer flex flex-col h-full"
            >
                <div className="relative aspect-[3/2] flex flex-col items-center justify-center bg-slate-50 rounded-xl overflow-hidden mb-3 border-2 border-dashed border-slate-200 transition-all duration-300 group-hover:border-slate-400 group-hover:bg-slate-100">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors mb-3 group-hover:scale-110">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-slate-500 group-hover:text-slate-700">Add New Gallery</span>
                </div>
            </div>
            )}

            {/* Empty State */}
            {galleries.length === 0 && (
            <div 
                onClick={createGallery}
                className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
            >
                <ImageIcon className="w-12 h-12 mb-4 text-slate-300" />
                <p className="font-medium">No galleries found</p>
                <p className="text-sm mt-1">Create your first gallery to get started</p>
            </div>
            )}
        </div>
      </div>

      {/* Sidebar: Recent Activity */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky top-24">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-slate-500" />
                Recent Activity
            </h2>
            
            {activities.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activities.map((log) => (
                        <div key={log.id} className="flex gap-3 text-sm border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                                log.action.includes('submitted') ? 'bg-rose-500' : 
                                log.action.includes('Payment') ? 'bg-emerald-500' : 'bg-slate-300'
                            }`} />
                            <div>
                                <p className="text-slate-900 font-medium leading-tight mb-0.5">
                                    {log.gallery?.client_name || 'Unknown Gallery'}
                                </p>
                                <p className="text-slate-600 leading-snug mb-1">
                                    {log.action.replace(/Client submitted selection of (\d+) photos/, 'Selected $1 photos')}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {formatDate(log.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Create Gallery Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">New Gallery</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isCreating}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createGallery} className="p-6">
              <div className="mb-6">
                <label htmlFor="clientName" className="block text-sm font-medium text-slate-700 mb-2">
                  Client Name
                </label>
                <input
                  id="clientName"
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. John & Jane Wedding"
                  autoFocus
                  required
                  disabled={isCreating}
                />
              </div>
              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newClientName.trim() || isCreating}
                  className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};