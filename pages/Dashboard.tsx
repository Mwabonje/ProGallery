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

  useEffect(() => {
    fetchData();
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

  const createGallery = async () => {
    const clientName = prompt("Enter Client Name:");
    if (!clientName) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('galleries')
        .insert([{
          photographer_id: user.id,
          client_name: clientName,
          title: `${clientName}'s Gallery`,
          agreed_balance: 0,
          amount_paid: 0,
          link_enabled: true
        }])
        .select()
        .single();

      if (error) throw error;
      navigate(`/gallery/${data.id}`);
    } catch (error) {
      alert('Error creating gallery');
      console.error(error);
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
            await supabase.storage.from('gallery-files').remove(paths);
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
        <div className="flex justify-between items-end mb-8">
            <div>
               <h1 className="text-2xl font-bold text-slate-900">Galleries</h1>
               <p className="text-slate-500 text-sm">Manage your client galleries</p>
            </div>
            <button
            onClick={createGallery}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-full flex items-center space-x-2 transition-all shadow-lg active:scale-95"
            >
            <Plus className="w-5 h-5" />
            <span>New Gallery</span>
            </button>
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
                    className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-slate-400 hover:text-red-600 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-90 group-hover:scale-100 z-10"
                    title="Delete Gallery"
                >
                    <Trash2 className="w-4 h-4" />
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
    </div>
  );
};