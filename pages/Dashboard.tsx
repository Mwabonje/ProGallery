import React, { useEffect, useState } from 'react';
import { Plus, Eye, EyeOff, Image as ImageIcon, Loader2, Trash2, Heart, Bell, Clock, Globe, User, MousePointerClick, TrendingUp, Link as LinkIcon, Search, Filter, AlertCircle, QrCode, LayoutGrid, GalleryHorizontalEnd } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Gallery, ActivityLog } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getOptimizedImageUrl, formatDate, rewriteUrlToR2 } from '../utils/formatters';
import { toast } from 'sonner';
import { AboutSettingsModal } from '../components/AboutSettingsModal';
import { BlogAdmin } from "./BlogAdmin";
import { PagesAdmin } from "./PagesAdmin";
import { BlogAnalytics } from "../components/BlogAnalytics";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Extended interface for dashboard display
interface DashboardGallery extends Gallery {
  coverUrl: string | null;
  coverType: string | null;
  itemCount: number;
  downloadCount: number;
  gallerySizeBytes: number;
  expires_at: string | null;
  analytics: { views: number; clicks: number; viewToday: number; clickToday: number; view7d: number; click7d: number; view30d: number; click30d: number; };
}

interface EnrichedActivityLog extends ActivityLog {
  gallery?: {
    client_name: string;
  };
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'dashboard';
  const [galleries, setGalleries] = useState<DashboardGallery[]>([]);
  const [activities, setActivities] = useState<EnrichedActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newCategory, setNewCategory] = useState('Wedding');
  const [newLayout, setNewLayout] = useState<'grid' | 'swipe'>('grid');
  const [isCreating, setIsCreating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [selectedGalleries, setSelectedGalleries] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'extend' | 'enable' | 'disable'>('extend');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'viewed'>('recent');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [bulkExpiryHours, setBulkExpiryHours] = useState<number>(24);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [realStorageUsedMB, setRealStorageUsedMB] = useState<number>(0);

  const toggleGallerySelection = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSelectedGalleries(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleBulkUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedGalleries.length === 0) return;
      setIsUpdatingBulk(true);
      try {
          if (bulkAction === 'enable' || bulkAction === 'disable') {
              const linkEnabled = bulkAction === 'enable';
              const { error } = await supabase
                  .from('galleries')
                  .update({ link_enabled: linkEnabled })
                  .in('id', selectedGalleries);
              
              if (error) throw error;
              toast.success(`Access ${linkEnabled ? 'enabled' : 'disabled'} for ${selectedGalleries.length} galleries`);
          } else if (bulkAction === 'extend') {
              const newExpiry = new Date();
              newExpiry.setTime(newExpiry.getTime() + bulkExpiryHours * 60 * 60 * 1000);
              
              const { error } = await supabase
                  .from('files')
                  .update({ expires_at: newExpiry.toISOString() })
                  .in('gallery_id', selectedGalleries);
                  
              if (error) throw error;
              toast.success(`Updated expiration for files in ${selectedGalleries.length} galleries`);
          }
          
          setSelectedGalleries([]);
          setIsBulkModalOpen(false);
          fetchData();
      } catch (err: any) {
          console.error('Bulk update error:', err);
          toast.error(`Failed to update galleries: ${err.message}`);
      } finally {
          setIsUpdatingBulk(false);
      }
  };

  const fetchStorageUsage = async () => {
      try {
          const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
          const apiUrl = isNetlify ? '/.netlify/functions/storage-usage' : '/api/storage-usage';
          const res = await fetch(apiUrl);
          if (res.ok) {
              const data = await res.json();
              if (data.totalStorageUsedMB !== undefined) {
                  setRealStorageUsedMB(data.totalStorageUsedMB);
              }
          }
      } catch (e) {
          console.error("Failed to fetch storage usage", e);
      }
  };

  useEffect(() => {
    fetchData();
    fetchStorageUsage();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setUserEmail(user.email ?? null);

      // 1. Fetch Galleries
      const { data: galleriesData, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('photographer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 1.5 Fetch analytics from API
      let analyticsData: any = { galleries: {} };
      try {
          const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
          const resp = await fetch(isNetlify ? '/.netlify/functions/sys-state' : '/api/sys/state');
          if (resp.ok) {
              analyticsData = await resp.json();
          }
      } catch (err) {
          console.warn("Failed to fetch analytics from API", err);
      }

      const aggregatedDaily: Record<string, { views: number, clicks: number }> = {};
      Object.keys(analyticsData.galleries || {}).forEach(galId => {
          const daily = analyticsData.galleries[galId]?.daily || {};
          Object.keys(daily).forEach(dateStr => {
              if (!aggregatedDaily[dateStr]) aggregatedDaily[dateStr] = { views: 0, clicks: 0 };
              aggregatedDaily[dateStr].views += daily[dateStr].views || 0;
              aggregatedDaily[dateStr].clicks += daily[dateStr].clicks || 0;
          });
      });

      const sortedDates = Object.keys(aggregatedDaily).sort();
      const chartArr = sortedDates.map(date => {
          const d = new Date(date);
          const formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
          return {
              date: formattedDate,
              views: aggregatedDaily[date].views,
              clicks: aggregatedDaily[date].clicks,
          };
      });

      if (chartArr.length === 0) {
          const today = new Date();
          const p = new Date(today); p.setDate(today.getDate() - 1);
          chartArr.push({ date: p.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), views: 0, clicks: 0 });
          chartArr.push({ date: today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }), views: 0, clicks: 0 });
      }
      setChartData(chartArr);

      // 2. Fetch details for each gallery (Cover Image & Count)
      const enrichedGalleries = await Promise.all(
        (galleriesData || []).map(async (gallery) => {
          // Get item count
          const { count } = await supabase
            .from('files')
            .select('*', { count: 'exact', head: true })
            .eq('gallery_id', gallery.id)
            .neq('file_path', 'GALLERY_PASSWORD');

          // Get view metrics from API
          const ad = analyticsData.galleries[gallery.id] || { views: 0, clicks: 0, daily: {} };
          
          let viewToday = 0, clickToday = 0, view7d = 0, click7d = 0, view30d = 0, click30d = 0;
          const todayStr = new Date().toISOString().split('T')[0];
          
          Object.keys(ad.daily || {}).forEach(dateStr => {
              const daysDiff = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 3600 * 24);
              if (dateStr === todayStr) {
                  viewToday += ad.daily[dateStr].views || 0;
                  clickToday += ad.daily[dateStr].clicks || 0;
              }
              if (daysDiff <= 7) {
                  view7d += ad.daily[dateStr].views || 0;
                  click7d += ad.daily[dateStr].clicks || 0;
              }
              if (daysDiff <= 30) {
                  view30d += ad.daily[dateStr].views || 0;
                  click30d += ad.daily[dateStr].clicks || 0;
              }
          });

          // Get latest file for cover and calculate downloads
          const { data: allFiles, error: filesError } = await supabase
            .from('files')
            .select('file_url, file_type, download_count, created_at, expires_at')
            .eq('gallery_id', gallery.id)
            .neq('file_path', 'GALLERY_PASSWORD')
            .order('created_at', { ascending: false });

          if (filesError) console.error("Files query error for gallery", gallery.id, filesError);

          const coverFile = allFiles && allFiles.length > 0 ? allFiles[0] : null;
          const downloadCount = (allFiles || []).reduce((acc, f) => acc + (f.download_count || 0), 0);
          const gallerySizeBytes = (allFiles || []).reduce((acc, f) => acc + (0 || 0), 0);

          return {
            ...gallery,
            itemCount: count || 0,
            downloadCount,
            gallerySizeBytes,
            analytics: {
                views: ad.views || 0,
                clicks: ad.clicks || 0,
                viewToday, clickToday, view7d, click7d, view30d, click30d
            },
            coverUrl: coverFile ? coverFile.file_url : null,
            coverType: coverFile ? coverFile.file_type : null,
            expires_at: coverFile ? coverFile.expires_at : null,
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
    setNewClientName('');
    if (userEmail !== 'ringa.michael@gmail.com') {
      setNewCategory(''); // Force empty so they can only create client deliveries
    }
    setIsCreateModalOpen(true);
  };

  const createGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    let matchedCategory = newCategory;
    const existingMatch = galleries.find(g => g.category && g.category.replace(/\s*\[(swipe|grid)\]/gi, '').trim().toLowerCase() === newCategory.replace(/\s*\[(swipe|grid)\]/gi, '').trim().toLowerCase());
    if (existingMatch && existingMatch.category) {
        matchedCategory = existingMatch.category.replace(/\s*\[(swipe|grid)\]/gi, '').trim();
    }
    const baseCategory = matchedCategory.replace(/\s*\[(swipe|grid)\]/gi, '').trim();
    const isPortfolio = baseCategory !== '' && baseCategory.toLowerCase() !== 'delivery';
    const deliveriesCount = galleries.filter(g => !g.category || g.category.trim() === '').length;
    const portfolioCount = galleries.filter(g => g.category && g.category.trim() !== '' && g.category !== 'ABOUT').length;

    if (!isPortfolio && deliveriesCount >= 50) {
        alert("You have reached the maximum limit of 50 Client Deliveries. Please delete an existing delivery to create a new one.");
        return;
    }
    if (isPortfolio && portfolioCount >= 50) {
        alert("You have reached the maximum limit of 50 Portfolio Collections. Please delete an existing collection to create a new one.");
        return;
    }
    
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
          category: isPortfolio ? `${baseCategory} [${newLayout}]` : newCategory,
          agreed_balance: 0,
          amount_paid: 0,
          link_enabled: true
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success(`Gallery "${newClientName}" created successfully!`);
      setIsCreateModalOpen(false);
      navigate(`/gallery/${data.id}`);
    } catch (error: any) {
      alert(`Database Error: ${error.message || 'Error creating gallery'}. Did you add the 'category' column?`);
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
        // Delete all files in the gallery prefix from Cloudflare R2
        const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
        await fetch(isNetlify ? '/.netlify/functions/delete-folder' : '/api/delete-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath: galleryId })
        });

        // Also clean up Supabase storage (backward compatibility if user had files before R2)
        try {
            const deleteFolderContents = async (folder: string) => {
                let hasMore = true;
                let offset = 0;
                while (hasMore) {
                    const { data: folderFiles } = await supabase.storage.from('gallery-files').list(folder, { limit: 100, offset });
                    if (folderFiles && folderFiles.length > 0) {
                        for (const f of folderFiles) {
                            if (f.id === null) {
                                await deleteFolderContents(`${folder}/${f.name}`);
                                await supabase.storage.from('gallery-files').remove([`${folder}/${f.name}`]);
                            } else {
                                await supabase.storage.from('gallery-files').remove([`${folder}/${f.name}`]);
                            }
                        }
                        if (folderFiles.length < 100) hasMore = false;
                        else offset += 100;
                    } else {
                        hasMore = false;
                    }
                }
            };
            
            await deleteFolderContents(galleryId);
            // And try to delete the folder itself
            await supabase.storage.from('gallery-files').remove([galleryId]);
        } catch (ignore) { }

        // Also delete specifically referenced files if not in a prefix somehow
        const { data: filesData } = await supabase
            .from('files')
            .select('file_path')
            .eq('gallery_id', galleryId);
            
        if (filesData && filesData.length > 0) {
            const paths = filesData.map(f => f.file_path);
            const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
            await fetch(isNetlify ? '/.netlify/functions/delete-file' : '/api/delete-file', {
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

  const getCardMetrics = (g: DashboardGallery) => {
      if (timeFilter === 'today') return { v: g.analytics.viewToday || 0, c: g.analytics.clickToday || 0 };
      if (timeFilter === '7d') return { v: g.analytics.view7d || 0, c: g.analytics.click7d || 0 };
      if (timeFilter === '30d') return { v: g.analytics.view30d || 0, c: g.analytics.click30d || 0 };
      return { v: g.analytics.views || 0, c: g.analytics.clicks || 0 };
  };

  let globalViews = 0;
  let globalClicks = 0;
  let aboutViews = 0;
  galleries.forEach(g => {
      const { v, c } = getCardMetrics(g);
      globalViews += v;
      globalClicks += c;
      if (g.category?.toUpperCase() === 'ABOUT') {
          aboutViews += v;
      }
  });
  const globalCtr = globalViews > 0 ? ((globalClicks / globalViews) * 100).toFixed(1) : '0.0';

  const clientDeliveriesCount = galleries.filter(g => !g.category || g.category.trim() === '').length;
  const portfolioCount = galleries.filter(g => g.category && g.category.trim() !== '' && g.category !== 'ABOUT').length;

  const availableCategories = React.useMemo(() => {
      const cats = new Set<string>();
      galleries.forEach(g => {
          if (g.category && g.category.trim() !== '' && g.category !== 'ABOUT') {
              cats.add(g.category);
          }
      });
      return Array.from(cats).sort();
  }, [galleries]);

  const processedGalleries = React.useMemo(() => {
      let filtered = galleries;
      
      if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(g => 
              g.client_name.toLowerCase().includes(q) || 
              (g.title && g.title.toLowerCase().includes(q)) ||
              (g.category && g.category.toLowerCase().includes(q))
          );
      }

      if (filterCategory !== 'all') {
          if (filterCategory === 'Client Deliveries') {
              filtered = filtered.filter(g => !g.category || g.category.trim() === '');
          } else {
              filtered = filtered.filter(g => g.category === filterCategory);
          }
      }

      let sorted = [...filtered];
      if (sortBy === 'recent') {
          // preserve selection_status sort
          sorted = sorted.sort((a, b) => {
              if (a.selection_status === 'submitted' && b.selection_status !== 'submitted') return -1;
              if (a.selection_status !== 'submitted' && b.selection_status === 'submitted') return 1;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
      } else if (sortBy === 'viewed') {
          sorted = sorted.sort((a, b) => (b.analytics?.views || 0) - (a.analytics?.views || 0));
      }
      
      return sorted;
  }, [galleries, searchQuery, sortBy, filterCategory]);

  // Storage calculations using real usage
  const totalStorageUsedBytes = galleries.reduce((acc, g) => acc + (g.gallerySizeBytes || 0), 0);
  const totalStorageUsedMB = totalStorageUsedBytes / (1024 * 1024);
  const storageLimitMB = 5000;
  const storageUsagePercent = (totalStorageUsedMB / storageLimitMB) * 100;

  
  const handleDeleteGallery = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        try {
            const { error } = await supabase.from('galleries').delete().eq('id', id);
            if (error) throw error;
            toast.success('Gallery deleted successfully');
            setGalleries(galleries.filter(g => g.id !== id));
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete gallery');
        }
    }
  };

  if (loading) return <div className="flex justify-center items-center h-full text-slate-400"><Loader2 className="animate-spin mr-2" /> Loading dashboard...</div>;

  return (
    <div className="h-screen w-full flex bg-[#F9F9F9] text-slate-800 font-sans overflow-hidden">
      {/* Dynamic old styles for components that still need them */}
      <style>{`
        .admin-theme { --sand:#F2EDE2; --surface:#FFFFFF; --ink:#1C1B18; --ink-soft:#4A473E; --line:#DED6C2; --line-soft:#E9E3D4; --muted:#8E8571; --indigo:#242C4C; --indigo-soft:#3B4676; --indigo-tint:#E7E9F1; --ochre:#B9822A; --ochre-tint:#F4E7CD; --rose:#A23B45; --green:#3F6B4A; }
        .ledger { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 38px; }
        .ledger-head { display: grid; grid-template-columns: 34px 2.2fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr 80px; padding: 10px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; letter-spacing: 0.07em; text-transform: uppercase; color: #64748b; font-weight: 600; }
        .ledger-row { display: grid; grid-template-columns: 34px 2.2fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr 80px; align-items: center; padding: 11px 20px; border-bottom: 1px solid #f1f5f9; font-size: 13px; transition: background .12s ease; cursor: pointer; }
        .ledger-row:hover { background: #f8fafc; }
        .swatch { width: 30px; height: 30px; border-radius: 6px; flex-shrink: 0; background-size: cover; background-position: center; }
        .status { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; }
        .status.submitted .status-dot { background: #ef4444; }
        .status.live .status-dot { background: #22c55e; }
        .status.expired .status-dot { background: #eab308; }
        .status.hidden .status-dot { background: #94a3b8; }
      `}</style>

      {/* Sidebar */}
      <div className="w-[240px] bg-[#111111] text-[#A1A1AA] h-screen sticky top-0 flex flex-col py-8 border-r border-[#222] shrink-0">
        <div className="px-6 mb-10">
          <h1 className="text-white text-[22px] font-serif tracking-wide" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Mwabonje</h1>
          <p className="text-slate-500 text-[11px] mt-1">Studio Console</p>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar">
          <div>
            <h2 className="px-6 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">General</h2>
            <div className="px-3">
              <div onClick={() => navigate('/dashboard')} className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors ${currentView === 'dashboard' ? 'bg-[#222222] text-white' : 'hover:text-white hover:bg-[#222]'}`}>
                <LayoutGrid className="w-[15px] h-[15px] mr-3" />
                <span className="text-[13px] font-medium">Overview</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="px-6 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Content</h2>
            <div className="px-3 space-y-0.5">
              <div onClick={() => navigate('/dashboard?view=galleries')} className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors group ${currentView === 'galleries' ? 'bg-[#222222] text-white' : 'hover:text-white hover:bg-[#222]'}`}>
                <div className="flex items-center">
                  <ImageIcon className="w-[15px] h-[15px] mr-3" />
                  <span className="text-[13px] font-medium">Galleries</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">{portfolioCount}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors group hover:text-white hover:bg-[#222]">
                <div className="flex items-center">
                  <div className="w-[15px] h-[15px] mr-3" />
                  <span className="text-[13px] font-medium">Proposals</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">6</span>
              </div>
              <div onClick={() => navigate('/dashboard?view=delivery')} className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors group ${currentView === 'delivery' ? 'bg-[#222222] text-white' : 'hover:text-white hover:bg-[#222]'}`}>
                <div className="flex items-center">
                  <div className="w-[15px] h-[15px] mr-3" />
                  <span className="text-[13px] font-medium">Delivery</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">{clientDeliveriesCount}</span>
              </div>
              <div onClick={() => navigate('/dashboard?view=blogs')} className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors ${currentView === 'blogs' ? 'bg-[#222222] text-white' : 'hover:text-white hover:bg-[#222]'}`}>
                <div className="w-[15px] h-[15px] mr-3" />
                <span className="text-[13px] font-medium">Blog</span>
              </div>
              <div onClick={() => navigate('/dashboard?view=pages')} className={`flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors ${currentView === 'pages' ? 'bg-[#222222] text-white' : 'hover:text-white hover:bg-[#222]'}`}>
                <div className="w-[15px] h-[15px] mr-3" />
                <span className="text-[13px] font-medium">Pages</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="px-6 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Business</h2>
            <div className="px-3 space-y-0.5">
              <div className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors group hover:text-white hover:bg-[#222]">
                <div className="flex items-center">
                  <div className="w-[15px] h-[15px] mr-3 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                  </div>
                  <span className="text-[13px] font-medium">Print orders</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">3</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors group hover:text-white hover:bg-[#222]">
                <div className="flex items-center">
                  <div className="w-[15px] h-[15px] mr-3 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  </div>
                  <span className="text-[13px] font-medium">Messages</span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 group-hover:text-slate-400">4</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="px-6 text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">System</h2>
            <div className="px-3">
              <div onClick={() => setIsAboutModalOpen(true)} className="flex items-center px-3 py-2 rounded-md cursor-pointer transition-colors hover:text-white hover:bg-[#222]">
                <div className="w-[15px] h-[15px] mr-3 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </div>
                <span className="text-[13px] font-medium">Settings</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 px-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#B9822A] flex items-center justify-center text-white text-[11px] font-bold">
            J
          </div>
          <div>
            <div className="text-[13px] font-bold text-white leading-none">JAMBO</div>
            <div className="text-[10px] text-slate-500 mt-1">Studio owner</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {currentView === 'dashboard' && (
          <div className="max-w-5xl px-12 py-10">
            {/* Header */}
            <div className="flex justify-between items-start mb-10">
              <div>
                <h1 className="text-[34px] text-slate-900 mb-2" style={{ fontFamily: 'Playfair Display, Georgia, serif', letterSpacing: '-0.02em' }}>Overview</h1>
                <p className="text-slate-500 text-[14px]">A working summary of galleries, client proposals, and orders across the site.</p>
              </div>
              <button onClick={handleOpenCreateModal} className="bg-[#5845EE] hover:bg-[#4a3bcc] text-white px-5 py-2.5 rounded-[6px] font-medium transition-colors text-[13.5px] shadow-sm">
                Upload to gallery
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-[10px] border border-slate-200 p-5 shadow-sm">
                <p className="text-[12px] text-slate-500 mb-2 font-medium">Published photos</p>
                <h3 className="text-[28px] text-slate-900 mb-1" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                  {galleries.reduce((acc, g) => acc + (g.itemCount || 0), 0).toLocaleString()}
                </h3>
                <p className="text-[11px] text-emerald-600">+42 this month</p>
              </div>
              <div className="bg-white rounded-[10px] border border-slate-200 p-5 shadow-sm">
                <p className="text-[12px] text-slate-500 mb-2 font-medium">Active proposals</p>
                <h3 className="text-[28px] text-slate-900 mb-1" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>6</h3>
                <p className="text-[11px] text-slate-500">2 awaiting client review</p>
              </div>
              <div className="bg-white rounded-[10px] border border-slate-200 p-5 shadow-sm">
                <p className="text-[12px] text-slate-500 mb-2 font-medium">Print orders</p>
                <h3 className="text-[28px] text-slate-900 mb-1" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>3</h3>
                <p className="text-[11px] text-red-500">1 unfulfilled</p>
              </div>
              <div className="bg-white rounded-[10px] border border-slate-200 p-5 shadow-sm">
                <p className="text-[12px] text-slate-500 mb-2 font-medium">New messages</p>
                <h3 className="text-[28px] text-slate-900 mb-1" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>4</h3>
                <p className="text-[11px] text-slate-500">since last visit</p>
              </div>
            </div>
            
            {/* Recent Activity List */}
            <div className="bg-white rounded-[10px] border border-slate-200 shadow-sm overflow-hidden mb-10">
              <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                <h2 className="text-[16px] text-slate-900" style={{ fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 600 }}>Recent activity</h2>
                <span className="text-[12px] text-slate-500 cursor-pointer hover:text-slate-700">Last 7 days</span>
              </div>
              <div className="divide-y divide-slate-100">
                {activities.length > 0 ? (
                  activities.map(act => (
                    <div key={act.id} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-[13px] text-slate-900 font-medium mb-0.5">{act.action} {act.gallery?.client_name ? `— ${act.gallery.client_name}` : ''}</p>
                        <p className="text-[12px] text-slate-500">System event</p>
                      </div>
                      <span className="text-[12px] text-slate-500">{formatDate(act.timestamp)}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-[13px] text-slate-900 font-medium mb-0.5">Rafiki Hotel gallery published</p>
                        <p className="text-[12px] text-slate-500">42 photos · Hospitality</p>
                      </div>
                      <span className="text-[12px] text-slate-500">2 hours ago</span>
                    </div>
                    <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-[13px] text-slate-900 font-medium mb-0.5">Proposal sent to Amara & Kito</p>
                        <p className="text-[12px] text-slate-500">Wedding · Shela</p>
                      </div>
                      <span className="text-[12px] text-slate-500">Yesterday</span>
                    </div>
                    <div className="px-6 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-[13px] text-slate-900 font-medium mb-0.5">New print order — 3 canvas prints</p>
                        <p className="text-[12px] text-slate-500">Order #1042</p>
                      </div>
                      <span className="text-[12px] text-slate-500">2 days ago</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {currentView === 'galleries' && (
          <div className="p-10 max-w-[1200px] mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-[28px] text-slate-900" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Galleries</h1>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search galleries..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-md text-[13px] focus:outline-none focus:border-slate-400"
                  />
                </div>
                <button onClick={() => { setNewCategory(''); handleOpenCreateModal(); }} className="bg-[#5845EE] text-white px-4 py-2 rounded-md text-[13px] font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" /> New Gallery
                </button>
              </div>
            </div>

            <div className="ledger">
              <div className="ledger-head">
                <div></div>
                <div>Gallery</div>
                <div>Category</div>
                <div>Status</div>
                <div>Items</div>
                <div>Views</div>
                <div>DLs</div>
                <div>Updated</div>
                <div></div>
              </div>
              <div>
                {galleries.filter(g => (g.category && g.category.trim() !== '' && g.category !== 'ABOUT') && (!searchQuery || g.client_name.toLowerCase().includes(searchQuery.toLowerCase()))).map(gallery => {
                  let statusClass = 'live';
                  let statusText = 'Live';
                  if (gallery.selection_status === 'submitted') {
                      statusClass = 'submitted';
                      statusText = 'Selection submitted';
                  } else if (!gallery.link_enabled) {
                      statusClass = 'hidden';
                      statusText = 'Hidden';
                  }
                  
                  return (
                    <div key={gallery.id} className="ledger-row" onClick={() => navigate(`/gallery/${gallery.id}`)}>
                      <div className="swatch" style={{ backgroundImage: gallery.coverUrl ? `url(${getOptimizedImageUrl(gallery.coverUrl, 100, 100)})` : 'none', backgroundColor: '#e2e8f0' }}></div>
                      <div className="flex items-center gap-3 font-medium text-slate-900">{gallery.client_name}</div>
                      <div className="text-slate-500 text-[12px]">{gallery.category?.replace(/s*\[(swipe|grid)\]/gi, '')}</div>
                      <div className={`status ${statusClass}`}><span className="status-dot"></span>{statusText}</div>
                      <div className="text-slate-500 font-mono text-[12.5px]">{gallery.itemCount > 0 ? gallery.itemCount : '—'}</div>
                      <div className="text-slate-500 font-mono text-[12.5px]">{gallery.analytics?.views || 0}</div>
                      <div className="text-slate-500 font-mono text-[12.5px]">{gallery.downloadCount || 0}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{formatDate(gallery.created_at)}</div>
                      <div className="flex justify-end pr-2 gap-1">
                          <button 
                              onClick={(e) => { e.stopPropagation(); window.open(`/g/${gallery.id}`, '_blank'); }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="View Gallery"
                          >
                              <Eye className="w-4 h-4" />
                          </button>
                          <button 
                              onClick={(e) => handleDeleteGallery(e, gallery.id, gallery.client_name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Gallery"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

{currentView === 'delivery' && (
          <div className="p-10 max-w-[1200px] mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-[28px] text-slate-900" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Delivery</h1>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search galleries..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-md text-[13px] focus:outline-none focus:border-slate-400"
                  />
                </div>
                <button onClick={() => { setNewCategory(''); handleOpenCreateModal(); }} className="bg-[#5845EE] text-white px-4 py-2 rounded-md text-[13px] font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" /> New Gallery
                </button>
              </div>
            </div>

            <div className="ledger">
              <div className="ledger-head">
                <div></div>
                <div>Gallery</div>
                <div>Category</div>
                <div>Status</div>
                <div>Items</div>
                <div>Views</div>
                <div>DLs</div>
                <div>Updated</div>
                <div></div>
              </div>
              <div>
                {galleries.filter(g => (!g.category || g.category.trim() === '') && (!searchQuery || g.client_name.toLowerCase().includes(searchQuery.toLowerCase()))).map(gallery => {
                  let statusClass = 'live';
                  let statusText = 'Live';
                  if (gallery.selection_status === 'submitted') {
                      statusClass = 'submitted';
                      statusText = 'Selection submitted';
                  } else if (!gallery.link_enabled) {
                      statusClass = 'hidden';
                      statusText = 'Hidden';
                  }
                  
                  return (
                    <div key={gallery.id} className="ledger-row" onClick={() => navigate(`/gallery/${gallery.id}`)}>
                      <div className="swatch" style={{ backgroundImage: gallery.coverUrl ? `url(${getOptimizedImageUrl(gallery.coverUrl, 100, 100)})` : 'none', backgroundColor: '#e2e8f0' }}></div>
                      <div className="flex items-center gap-3 font-medium text-slate-900">{gallery.client_name}</div>
                      <div className="text-slate-500 text-[12px]">{gallery.category?.replace(/s*\[(swipe|grid)\]/gi, '')}</div>
                      <div className={`status ${statusClass}`}><span className="status-dot"></span>{statusText}</div>
                      <div className="text-slate-500 font-mono text-[12.5px]">{gallery.itemCount > 0 ? gallery.itemCount : '—'}</div>
                      <div className="text-slate-500 font-mono text-[12.5px]">{gallery.analytics?.views || 0}</div>
                      <div className="text-slate-500 font-mono text-[12.5px]">{gallery.downloadCount || 0}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{formatDate(gallery.created_at)}</div>
                      <div className="flex justify-end pr-2 gap-1">
                          <button 
                              onClick={(e) => { e.stopPropagation(); window.open(`/g/${gallery.id}`, '_blank'); }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="View Gallery"
                          >
                              <Eye className="w-4 h-4" />
                          </button>
                          <button 
                              onClick={(e) => handleDeleteGallery(e, gallery.id, gallery.client_name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Gallery"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {currentView === 'blogs' && (
          <div className="p-8">
             <BlogAdmin />
          </div>
        )}
        {currentView === 'pages' && (
          <PagesAdmin />
        )}

        {currentView === 'blog-analytics' && (
          <div className="p-8">
             <BlogAnalytics />
          </div>
        )}

      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
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
              <div className="mb-4">
                <label htmlFor="clientName" className="block text-sm font-medium text-slate-700 mb-2">
                  Client Name or Event Title
                </label>
                <input
                  id="clientName"
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-800"
                  placeholder="e.g. John & Jane Wedding"
                  autoFocus
                  required
                  disabled={isCreating}
                />
              </div>

              {userEmail === 'ringa.michael@gmail.com' && (
              <div className="mb-6">
                <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-2">
                  Portfolio Category
                </label>
                <input
                  id="category"
                  type="text"
                  list="category-options"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-800"
                  placeholder="e.g. Wedding, Sports, Real Estate..."
                  disabled={isCreating}
                />
                <datalist id="category-options">
                  {Array.from(new Set([
                    "Wedding", 
                    "Portraits", 
                    "Couples",
                    "Commercial", 
                    "Events", 
                    "Maternity", 
                    "Boudoir", 
                    "Fine Art",
                    ...galleries.map(g => g.category ? g.category.replace(/\s*\[(swipe|grid)\]/gi, '').trim() : '').filter(c => Boolean(c) && c.toUpperCase() !== 'ABOUT')
                  ])).map(cat => (
                    <option key={cat as string} value={cat as string} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-500 mt-2">Pick from the list or type your own to creatively group your public portfolio.</p>
              </div>
              )}
              {userEmail === 'ringa.michael@gmail.com' && newCategory.trim() !== '' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Display Layout
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewLayout('swipe')}
                      className={`px-4 py-2 border rounded-lg flex items-center justify-center gap-2 transition-all ${newLayout === 'swipe' ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <GalleryHorizontalEnd className="w-4 h-4" />
                      Swipe (Carousel)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLayout('grid')}
                      className={`px-4 py-2 border rounded-lg flex items-center justify-center gap-2 transition-all ${newLayout === 'grid' ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Grid (4:6)
                    </button>
                  </div>
                </div>
              )}


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

            {/* Bulk Actions Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">Bulk Update Link Settings</h2>
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isUpdatingBulk}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleBulkUpdate} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                   Action
                </label>
                <select 
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as any)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-800"
                    disabled={isUpdatingBulk}
                >
                    <option value="extend">Extend/Modify Download Expiration</option>
                    <option value="enable">Enable Gallery Links</option>
                    <option value="disable">Disable Gallery Links (Hide)</option>
                </select>
              </div>

              {bulkAction === 'extend' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Expiration Duration (hours from now)
                    </label>
                    <select
                        value={bulkExpiryHours}
                        onChange={(e) => setBulkExpiryHours(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-800"
                        disabled={isUpdatingBulk}
                    >
                        <option value={1}>1 Hour</option>
                        <option value={12}>12 Hours</option>
                        <option value={24}>24 Hours</option>
                        <option value={48}>48 Hours</option>
                        <option value={168}>1 Week</option>
                        <option value={720}>1 Month</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">This will update all files in the selected galleries to expire in the selected timeframe, reactivating any files that have already expired.</p>
                  </div>
              )}

              {bulkAction !== 'extend' && (
                  <p className="text-sm text-slate-600 mb-6 bg-slate-50 p-4 rounded-lg">
                      You are about to {bulkAction === 'enable' ? <strong>enable</strong> : <strong>disable</strong>} the client links for {selectedGalleries.length} galler{selectedGalleries.length === 1 ? 'y' : 'ies'}.
                  </p>
              )}

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                  disabled={isUpdatingBulk}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBulk}
                  className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdatingBulk ? 'Updating...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* About Settings Modal */}
      {isAboutModalOpen && userId && (
         <div className="fixed inset-0 z-[100]">
         <AboutSettingsModal 
            userId={userId} 
            onClose={() => setIsAboutModalOpen(false)} 
         />
         </div>
      )}
    </div>
  );
};
