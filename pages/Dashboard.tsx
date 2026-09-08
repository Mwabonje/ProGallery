import React, { useEffect, useState } from 'react';
import { Plus, Eye, EyeOff, Image as ImageIcon, Loader2, Trash2, Heart, Bell, Clock, Globe, User, MousePointerClick, TrendingUp, Link as LinkIcon, Search, Filter, AlertCircle, QrCode, LayoutGrid, GalleryHorizontalEnd } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Gallery, ActivityLog } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getOptimizedImageUrl, formatDate, rewriteUrlToR2 } from '../utils/formatters';
import { toast } from 'sonner';
import { AboutSettingsModal } from '../components/AboutSettingsModal';
import { BlogAdmin } from "./BlogAdmin";
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
  const [searchParams, setSearchParams] = useSearchParams();
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
    const isPortfolio = baseCategory !== '';
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

  if (loading) return <div className="flex justify-center items-center h-full text-slate-400"><Loader2 className="animate-spin mr-2" /> Loading dashboard...</div>;

  return (
    <>
    <div className="app admin-theme-v2">
      <style>{`
  .admin-theme-v2 {
    --sidebar:#0E1310;
    --sidebar-line: rgba(243,238,228,.12);
    --sidebar-text: rgba(243,238,228,.62);
    --bg:#F6F6F4;
    --card:#FFFFFF;
    --border:#E7E5E0;
    --text:#181A17;
    --muted:#6B6E68;
    --indigo:#4F46E5;
    --indigo-tint:#EEECFD;
    --green:#15803D;
    --green-tint:#E3F5E8;
    --red:#B42318;
    --red-tint:#FCEAE8;
    --amber:#A15C07;
    --amber-tint:#FBF0DD;
    background:var(--bg);
    color:var(--text);
    font-family:'Inter', sans-serif;
    font-size:14px;
    min-height:100vh;
  }
  .admin-theme-v2 * { box-sizing:border-box; margin:0; padding:0; }
  .admin-theme-v2 .serif { font-family:'Fraunces', serif; font-optical-sizing:auto; }
  .admin-theme-v2 a { color:inherit; text-decoration:none; }
  .admin-theme-v2 button { font-family:inherit; font-size:inherit; cursor:pointer; border:none; background:none; color:inherit; }

  .admin-theme-v2.app {
    display:grid;
    grid-template-columns:248px 1fr;
    min-height:100vh;
  }

  .admin-theme-v2 .sidebar {
    background:var(--sidebar);
    color:var(--sidebar-text);
    padding:1.75rem 1.25rem;
    display:flex;
    flex-direction:column;
    position:sticky;
    top:0;
    height:100vh;
  }

  .admin-theme-v2 .brand {
    display:flex;
    flex-direction:column;
    gap:.15rem;
    margin-bottom:2.25rem;
    padding:0 .5rem;
  }
  .admin-theme-v2 .brand .word { color:#F3EEE4; font-size:1.15rem; }
  .admin-theme-v2 .brand .sub { font-size:.72rem; letter-spacing:.02em; color:rgba(243,238,228,.4); }

  .admin-theme-v2 .nav-group { margin-bottom:1.75rem; }
  .admin-theme-v2 .nav-label { font-size:.68rem; color:rgba(243,238,228,.32); padding:0 .5rem; margin-bottom:.5rem; }
  .admin-theme-v2 .nav-item {
    width:100%; display:flex; align-items:center; gap:.7rem; padding:.55rem .5rem;
    border-radius:6px; font-size:.87rem; text-align:left; color:var(--sidebar-text);
    border-left:2px solid transparent; transition:background .15s ease, color .15s ease;
  }
  .admin-theme-v2 .nav-item svg { width:16px; height:16px; opacity:.75; flex-shrink:0; }
  .admin-theme-v2 .nav-item:hover { background:rgba(243,238,228,.06); color:#F3EEE4; }
  .admin-theme-v2 .nav-item.active { background:rgba(243,238,228,.08); color:#F3EEE4; border-left-color:#8B85F0; }
  .admin-theme-v2 .nav-item .count { margin-left:auto; font-size:.72rem; color:rgba(243,238,228,.35); }

  .admin-theme-v2 .sidebar-foot { margin-top:auto; padding-top:1rem; border-top:1px solid var(--sidebar-line); display:flex; align-items:center; gap:.65rem; }
  .admin-theme-v2 .avatar { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#B9922F,#6E5417); flex-shrink:0; }
  .admin-theme-v2 .sidebar-foot .who { font-size:.82rem; color:#F3EEE4; }
  .admin-theme-v2 .sidebar-foot .role { font-size:.72rem; color:rgba(243,238,228,.4); }

  .admin-theme-v2 main { padding:2rem 2.5rem 4rem; max-width:1180px; }
  .admin-theme-v2 .topbar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:2rem; gap:2rem; flex-wrap:wrap; }
  .admin-theme-v2 .topbar h1 { font-size:1.9rem; font-weight:500; }
  .admin-theme-v2 .topbar p.desc { color:var(--muted); margin-top:.35rem; font-size:.9rem; max-width:46ch; }

  .admin-theme-v2 .primary-btn { background:var(--indigo); color:#fff; padding:.65rem 1.2rem; border-radius:7px; font-size:.87rem; font-weight:500; white-space:nowrap; }
  .admin-theme-v2 .primary-btn:hover { background:#4038CC; }
  .admin-theme-v2 .ghost-btn { border:1px solid var(--border); padding:.6rem 1.1rem; border-radius:7px; font-size:.85rem; color:var(--text); background:#fff; }
  .admin-theme-v2 .ghost-btn:hover { border-color:#C9C6BE; }

  .admin-theme-v2 .stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:1.1rem; margin-bottom:2.25rem; }
  .admin-theme-v2 .stat { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:1.25rem 1.35rem; }
  .admin-theme-v2 .stat .label { font-size:.78rem; color:var(--muted); margin-bottom:.6rem; }
  .admin-theme-v2 .stat .value { font-size:1.7rem; font-weight:500; font-family:'Fraunces', serif; }
  .admin-theme-v2 .stat .delta { font-size:.76rem; margin-top:.4rem; }
  .admin-theme-v2 .stat .delta.up { color:var(--green); }
  .admin-theme-v2 .stat .delta.down { color:var(--red); }

  .admin-theme-v2 .panel { background:var(--card); border:1px solid var(--border); border-radius:10px; margin-bottom:1.75rem; overflow:hidden; }
  .admin-theme-v2 .panel-head { display:flex; justify-content:space-between; align-items:center; padding:1.25rem 1.4rem; border-bottom:1px solid var(--border); }
  .admin-theme-v2 .panel-head h2 { font-size:1.05rem; font-weight:500; font-family:'Fraunces', serif; }
  .admin-theme-v2 .panel-head .meta { font-size:.8rem; color:var(--muted); }

  .admin-theme-v2 table { width:100%; border-collapse:collapse; text-align: left; }
  .admin-theme-v2 thead th { text-align:left; font-size:.72rem; letter-spacing:.02em; color:var(--muted); font-weight:500; padding:.7rem 1.4rem; border-bottom:1px solid var(--border); }
  .admin-theme-v2 tbody td { padding:.9rem 1.4rem; border-bottom:1px solid var(--border); font-size:.87rem; vertical-align:middle; }
  .admin-theme-v2 tbody tr:last-child td { border-bottom:none; }
  .admin-theme-v2 tbody tr:hover { background:#FBFBFA; }
  .admin-theme-v2 .cell-primary { font-weight:500; }
  .admin-theme-v2 .cell-sub { color:var(--muted); font-size:.8rem; margin-top:.15rem; }

  .admin-theme-v2 .badge { display:inline-flex; align-items:center; gap:.4rem; padding:.28rem .65rem; border-radius:999px; font-size:.76rem; font-weight:500; }
  .admin-theme-v2 .badge.green { background:var(--green-tint); color:var(--green); }
  .admin-theme-v2 .badge.red { background:var(--red-tint); color:var(--red); }
  .admin-theme-v2 .badge.amber { background:var(--amber-tint); color:var(--amber); }
  .admin-theme-v2 .badge .dot { width:6px; height:6px; border-radius:50%; background:currentColor; }

  .admin-theme-v2 .row-actions { display:flex; gap:.5rem; justify-content:flex-end; }
  .admin-theme-v2 .icon-btn { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:6px; color:var(--muted); }
  .admin-theme-v2 .icon-btn:hover { background:var(--bg); color:var(--text); }
  .admin-theme-v2 .icon-btn svg { width:15px; height:15px; }

  .admin-theme-v2 .view { display:none; }
  .admin-theme-v2 .view.active { display:block; }

  @media (max-width: 980px){
    .admin-theme-v2.app { grid-template-columns:1fr; }
    .admin-theme-v2 .sidebar { display:none; }
    .admin-theme-v2 .stats { grid-template-columns:repeat(2,1fr); }
    .admin-theme-v2 .cat-grid { grid-template-columns:repeat(2,1fr); }
    .admin-theme-v2 .form-grid { grid-template-columns:1fr; }
  }
  `}</style>

      <aside className="sidebar">
        <div className="brand">
          <span className="word serif">Mwabonje</span>
          <span className="sub">Studio Console</span>
        </div>

        <div className="nav-group">
          <div className="nav-label">General</div>
          <button className={`nav-item ${currentView === 'overview' || currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setSearchParams({view: 'overview'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
            Overview
          </button>
        </div>

        <div className="nav-group">
          <div className="nav-label">Content</div>
          <button className={`nav-item ${currentView === 'galleries' ? 'active' : ''}`} onClick={() => setSearchParams({view: 'galleries'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 14l4.5-4.5a2 2 0 0 1 2.8 0L14 13"/><circle cx="16.5" cy="7.5" r="1.5"/></svg>
            Galleries <span className="count">{galleries.length}</span>
          </button>
          <button className={`nav-item ${currentView === 'proposals' ? 'active' : ''}`} onClick={() => setSearchParams({view: 'proposals'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 4h16v13H8l-4 4V4z"/></svg>
            Proposals <span className="count">6</span>
          </button>
          <button className={`nav-item ${currentView === 'delivery' ? 'active' : ''}`} onClick={() => setSearchParams({view: 'delivery'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
            Delivery <span className="count">3</span>
          </button>
          <button className={`nav-item ${currentView === 'blog' ? 'active' : ''}`} onClick={() => setSearchParams({view: 'blog'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h4"/></svg>
            Blog
          </button>
          <button className={`nav-item ${currentView === 'pages' ? 'active' : ''}`} onClick={() => setSearchParams({view: 'pages'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 3h8l5 5v13H7z"/><path d="M15 3v5h5"/></svg>
            Pages
          </button>
        </div>

        <div className="nav-group">
          <div className="nav-label">Business</div>
          <button className={`nav-item ${currentView === 'orders' ? 'active' : ''}`} onClick={() => setSearchParams({view: 'orders'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M3 12h18M3 18h12"/></svg>
            Print orders <span className="count">3</span>
          </button>
          <button className={`nav-item ${currentView === 'messages' ? 'active' : ''}`} onClick={() => setSearchParams({view: 'messages'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 5h16v14H4z"/><path d="M4 6l8 7 8-7"/></svg>
            Messages <span className="count">4</span>
          </button>
        </div>

        <div className="nav-group">
          <div className="nav-label">System</div>
          <button className={`nav-item ${currentView === 'settings' ? 'active' : ''}`} onClick={() => setSearchParams({view: 'settings'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
            Settings
          </button>
        </div>

        <div className="sidebar-foot">
          <div className="avatar"></div>
          <div>
            <div className="who">JAMBO</div>
            <div className="role">Studio owner</div>
          </div>
        </div>
      </aside>

      <main>
        
        {/* OVERVIEW */}
        <section className={`view ${(currentView === 'overview' || currentView === 'dashboard') ? 'active' : ''}`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Overview</h1>
              <p className="desc">A working summary of galleries, client proposals, and orders across the site.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsCreateModalOpen(true)}>Upload to gallery</button>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="label">Published photos</div>
              <div className="value serif">1,284</div>
              <div className="delta up">+42 this month</div>
            </div>
            <div className="stat">
              <div className="label">Active proposals</div>
              <div className="value serif">6</div>
              <div className="delta">2 awaiting client review</div>
            </div>
            <div className="stat">
              <div className="label">Print orders</div>
              <div className="value serif">3</div>
              <div className="delta down">1 unfulfilled</div>
            </div>
            <div className="stat">
              <div className="label">New messages</div>
              <div className="value serif">4</div>
              <div className="delta">since last visit</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Recent activity</h2>
              <span className="meta">Last 7 days</span>
            </div>
            <table>
              <tbody>
                {activities.slice(0, 5).map(act => (
                    <tr key={act.id}>
                        <td className="cell-primary">
                            {act.action === 'gallery_created' && `Gallery created`}
                            {act.action === 'files_uploaded' && `Files uploaded`}
                            {act.action === 'gallery_password_updated' && `Password updated`}
                            <div className="cell-sub">{act.gallery?.client_name || 'System'}</div>
                        </td>
                        <td style={{textAlign: 'right', color: 'var(--muted)'}}>
                            {new Date(act.timestamp).toLocaleDateString()}
                        </td>
                    </tr>
                ))}
                {activities.length === 0 && (
                    <tr>
                        <td className="cell-primary">Rafiki Hotel gallery published<div className="cell-sub">42 photos · Hospitality</div></td>
                        <td style={{textAlign: 'right', color: 'var(--muted)'}}>2 hours ago</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* GALLERIES */}
        <section className={`view ${currentView === 'galleries' ? 'active' : ''}`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Galleries</h1>
              <p className="desc">Manage the categories visible on the site and what's published in each.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsCreateModalOpen(true)}>New gallery</button>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>All Galleries</h2>
              <span className="meta">{galleries.length} total</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Gallery</th>
                  <th>Category</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {galleries.map(gallery => {
                    const isExpired = gallery.expires_at && new Date(gallery.expires_at) < new Date();
                    const statusClass = isExpired ? 'red' : 'green';
                    const statusText = isExpired ? 'Archived' : 'Live';
                    return (
                        <tr key={gallery.id} style={{cursor: 'pointer'}} onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.row-actions')) return;
                            navigate(`/gallery/${gallery.id}`);
                        }}>
                        <td className="cell-primary">
                            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                <div className="swatch" style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundImage: gallery.coverUrl ? `url(${getOptimizedImageUrl(gallery.coverUrl, 100, 100)})` : 'none', backgroundColor: '#d1d5db', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                                <div>
                                    {gallery.client_name}
                                    <div className="cell-sub">{gallery.itemCount || 0} photos</div>
                                </div>
                            </div>
                        </td>
                        <td>{gallery.category?.replace(/\s*\[(swipe|grid)\]/gi, '') || 'Uncategorized'}</td>
                        <td>{gallery.analytics?.views || 0}</td>
                        <td><span className={`badge ${statusClass}`}><span className="dot"></span>{statusText}</span></td>
                        <td>
                            <div className="row-actions">
                                <button className="icon-btn" title="Edit" onClick={() => navigate(`/gallery/${gallery.id}`)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                                </button>
                            </div>
                        </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* PROPOSALS */}
        <section className={`view ${currentView === 'proposals' ? 'active' : ''}`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Proposal galleries</h1>
              <p className="desc">Private galleries sent to clients for review before final delivery.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsCreateModalOpen(true)}>New proposal</button>
          </div>

          <div className="panel">
            <table>
              <thead><tr><th>Client</th><th>Shoot</th><th>Photos</th><th>Status</th><th>Sent</th><th></th></tr></thead>
              <tbody>
                <tr>
                  <td className="cell-primary">Amara &amp; Kito<div className="cell-sub">Wedding</div></td>
                  <td>Shela Beach</td>
                  <td>84</td>
                  <td><span className="badge amber"><span className="dot"></span>Awaiting review</span></td>
                  <td style={{color: 'var(--muted)'}}>Yesterday</td>
                  <td><div className="row-actions"><button className="icon-btn">↗</button></div></td>
                </tr>
                <tr>
                  <td className="cell-primary">Rafiki Hotel<div className="cell-sub">Hospitality</div></td>
                  <td>Full property</td>
                  <td>142</td>
                  <td><span className="badge green"><span className="dot"></span>Approved</span></td>
                  <td style={{color: 'var(--muted)'}}>4 days ago</td>
                  <td><div className="row-actions"><button className="icon-btn">↗</button></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* DELIVERY */}
        <section className={`view ${currentView === 'delivery' ? 'active' : ''}`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Delivery &amp; selects</h1>
              <p className="desc">Send clients their full shoot to pick favorites from, then track which images move to editing.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsCreateModalOpen(true)}>New delivery batch</button>
          </div>

          <div className="panel">
            <div className="panel-head"><h2>Delivery Galleries</h2><span className="meta">{galleries.filter(g => g.category?.toUpperCase() === 'DELIVERY').length} total</span></div>
            <table>
              <thead><tr><th>Client</th><th>Photos</th><th>Selected</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {galleries.filter(g => g.category?.toUpperCase() === 'DELIVERY').length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">No delivery galleries found. Create a gallery and set its category to "Delivery".</td></tr>
                )}
                {galleries.filter(g => g.category?.toUpperCase() === 'DELIVERY').map(gallery => {
                    const isExpired = gallery.expires_at && new Date(gallery.expires_at) < new Date();
                    const statusClass = isExpired ? 'red' : (gallery.selection_status === 'completed' ? 'green' : 'amber');
                    const statusText = isExpired ? 'Archived' : (gallery.selection_status === 'completed' ? 'Selections Complete' : 'Client selecting');
                    return (
                        <tr key={gallery.id} style={{cursor: 'pointer'}} onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.row-actions')) return;
                            navigate(`/gallery/${gallery.id}`);
                        }}>
                        <td className="cell-primary">
                            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                <div className="swatch" style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundImage: gallery.coverUrl ? `url(${getOptimizedImageUrl(gallery.coverUrl, 100, 100)})` : 'none', backgroundColor: '#d1d5db', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                                <div>
                                    {gallery.client_name}
                                </div>
                            </div>
                        </td>
                        <td>{gallery.itemCount || 0}</td>
                        <td>{gallery.selection_enabled ? 'Enabled' : 'Disabled'}</td>
                        <td><span className={`badge ${statusClass}`}><span className="dot"></span>{statusText}</span></td>
                        <td>
                            <div className="row-actions">
                                <button className="icon-btn" title="Edit" onClick={(e) => { e.stopPropagation(); navigate(`/gallery/${gallery.id}`); }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                                </button>
                            </div>
                        </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* BLOG */}
        <section className={`view ${currentView === 'blog' ? 'active' : ''}`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Blog</h1>
              <p className="desc">Journal posts published on the site.</p>
            </div>
          </div>
          <div className="panel">
            <div style={{padding: '1.4rem'}}>
                <BlogAdmin />
            </div>
          </div>
        </section>

        {/* PAGES */}
        <section className={`view ${currentView === 'pages' ? 'active' : ''}`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Pages</h1>
              <p className="desc">Edit the fixed content on the site — the homepage hero and the About page.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsAboutModalOpen(true)}>Edit Settings</button>
          </div>

          <div className="panel">
              <div className="panel-head"><h2>Settings</h2><span className="meta">Click to edit global details</span></div>
              <div style={{padding: '1.4rem'}}>
                <button onClick={() => setIsAboutModalOpen(true)} className="ghost-btn">Open Settings Modal</button>
              </div>
          </div>
        </section>

        {/* ORDERS */}
        <section className={`view ${currentView === 'orders' ? 'active' : ''}`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Print orders</h1>
              <p className="desc">Orders placed through the Prints page.</p>
            </div>
          </div>

          <div className="panel">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Status</th><th style={{textAlign: 'right'}}>Amount</th></tr></thead>
              <tbody>
                <tr>
                  <td className="cell-primary">#1042</td>
                  <td>Naomi W.</td>
                  <td>3 canvas prints — Lamu series</td>
                  <td><span className="badge amber"><span className="dot"></span>Processing</span></td>
                  <td style={{textAlign: 'right'}}>KES 24,000</td>
                </tr>
                <tr>
                  <td className="cell-primary">#1041</td>
                  <td>David K.</td>
                  <td>1 framed print — Kilele House</td>
                  <td><span className="badge green"><span className="dot"></span>Fulfilled</span></td>
                  <td style={{textAlign: 'right'}}>KES 9,500</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* MESSAGES */}
        <section className={`view ${currentView === 'messages' ? 'active' : ''}`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Messages</h1>
              <p className="desc">Submissions from the site's contact form.</p>
            </div>
          </div>

          <div className="panel">
            <table>
              <thead><tr><th>From</th><th>Message</th><th>Received</th><th></th></tr></thead>
              <tbody>
                <tr>
                  <td className="cell-primary">Naomi W.<div className="cell-sub">naomi.w@email.com</div></td>
                  <td>Asking about availability for a couples shoot in November...</td>
                  <td style={{color: 'var(--muted)'}}>5 days ago</td>
                  <td><div className="row-actions"><button className="icon-btn">↗</button></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SETTINGS */}
        <section className={`view ${currentView === 'settings' ? 'active' : ''}`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Settings</h1>
              <p className="desc">Site information and the navigation shown to visitors.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsAboutModalOpen(true)}>Edit Global Config</button>
          </div>
          
          <div className="panel">
              <div className="panel-head"><h2>Settings</h2><span className="meta">Click to edit global details</span></div>
              <div style={{padding: '1.4rem'}}>
                <button onClick={() => setIsAboutModalOpen(true)} className="ghost-btn">Open Settings Modal</button>
              </div>
          </div>
        </section>

      </main>
    </div>

      {/* Create Gallery Modal */}
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
    </>
  );
};
