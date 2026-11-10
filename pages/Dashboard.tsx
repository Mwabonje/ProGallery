import React, { useEffect, useState } from 'react';
import { Plus, Eye, EyeOff, Image as ImageIcon, Loader2, Trash2, Heart, Bell, Clock, Globe, User, MousePointerClick, TrendingUp, Link as LinkIcon, Search, Filter, AlertCircle, QrCode, LayoutGrid, GalleryHorizontalEnd, RefreshCw, Database, Camera, FileText, FolderCheck, Mail, CheckCircle2, Shield, Calendar, HelpCircle, Layers, Download, Send, MessageSquare, ArrowUpRight, ArrowRight, ChevronRight, ChevronDown, Package, Users, Folder, CalendarCheck, Coins, Sparkles, ExternalLink, Zap, Settings, UserPlus, FolderPlus, CalendarPlus } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Gallery, ActivityLog } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getOptimizedImageUrl, formatDate, rewriteUrlToR2, getParentGalleryId, getCleanGalleryTitle } from '../utils/formatters';
import { getApiUrl } from '../utils/api';
import { toast } from 'sonner';
import { WebsiteSettingsModal } from '../components/WebsiteSettingsModal';
import { AboutSettingsModal } from '../components/AboutSettingsModal';
import { HomeSettingsModal } from '../components/HomeSettingsModal';
import { FAQManagerModal } from '../components/FAQManagerModal';
import { ThemeToggle } from '../components/ThemeToggle';
import { BlogAdmin } from "./BlogAdmin";
import { PagesAdmin } from "./PagesAdmin";
import { WhatsAppDeliveryShareModal } from '../components/WhatsAppDeliveryShareModal';
import { BlogAnalytics } from "../components/BlogAnalytics";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Helmet } from 'react-helmet-async';

// Extended interface for dashboard display
interface DashboardGallery extends Gallery {
  coverUrl: string | null;
  coverType: string | null;
  itemCount: number;
  downloadCount: number;
  gallerySizeBytes: number;
  expires_at: string | null;
  isExpired?: boolean;
  timeRemainingText?: string;
  selectionNotesCount?: number;
  analytics: { views: number; clicks: number; viewToday: number; clickToday: number; view7d: number; click7d: number; view30d: number; click30d: number; };
}

interface EnrichedActivityLog extends ActivityLog {
  gallery?: {
    client_name: string;
  };
}

const formatActivityEvent = (act: { action: string; gallery?: { client_name?: string }; timestamp: string | number }) => {
  const rawAction = act.action || '';
  const clientName = act.gallery?.client_name || '';

  if (rawAction.toLowerCase().includes('extended expiration') || rawAction.toLowerCase().includes('expiration')) {
    const fileCountMatch = rawAction.match(/(\d+)\s+files?/i);
    const count = fileCountMatch ? fileCountMatch[1] : null;
    return {
      title: 'Delivery archive extended (+7 days)',
      subtitle: clientName ? `${clientName}${count ? ` · ${count} photos` : ''}` : `${count ? `${count} photos` : 'Client delivery'}`,
      badge: 'Delivery',
      badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/40',
      iconType: 'clock' as const,
    };
  }

  if (rawAction.toLowerCase().includes('purge') || rawAction.toLowerCase().includes('cleaned') || rawAction.toLowerCase().includes('deleted')) {
    return {
      title: 'Storage maintenance completed',
      subtitle: clientName ? `${clientName} · Storage freed` : 'Expired files purged from Cloudflare R2',
      badge: 'System',
      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      iconType: 'shield' as const,
    };
  }

  if (rawAction.toLowerCase().includes('selection') || rawAction.toLowerCase().includes('submitted')) {
    return {
      title: 'Client favorites confirmed',
      subtitle: clientName ? `${clientName} finalized photo selection` : 'Photo selection confirmed',
      badge: 'Client',
      badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50',
      iconType: 'check' as const,
    };
  }

  if (rawAction.toLowerCase().includes('published') || rawAction.toLowerCase().includes('created') || rawAction.toLowerCase().includes('gallery')) {
    return {
      title: rawAction.includes('published') ? 'Lookbook gallery published' : 'Lookbook gallery updated',
      subtitle: clientName ? `${clientName} · Lookbook active` : 'Photos updated',
      badge: 'Lookbook',
      badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/50',
      iconType: 'image' as const,
    };
  }

  if (rawAction.toLowerCase().includes('proposal')) {
    return {
      title: 'Client proposal dispatched',
      subtitle: clientName ? `Client: ${clientName}` : 'Proposal sent',
      badge: 'Proposal',
      badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50',
      iconType: 'file' as const,
    };
  }

  return {
    title: rawAction.replace(/\s*—\s*.*$/, ''),
    subtitle: clientName || 'Studio event',
    badge: 'Activity',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    iconType: 'activity' as const,
  };
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentView = searchParams.get('view') || 'dashboard';
  const [galleries, setGalleries] = useState<DashboardGallery[]>([]);
  const [activities, setActivities] = useState<EnrichedActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWebsiteSettingsOpen, setIsWebsiteSettingsOpen] = useState(false);
  const [websiteSettingsTab, setWebsiteSettingsTab] = useState<'home' | 'services' | 'about' | 'faq'>('home');
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isHomeModalOpen, setIsHomeModalOpen] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [selectedWhatsAppGallery, setSelectedWhatsAppGallery] = useState<DashboardGallery | null>(null);
  const [newClientName, setNewClientName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Wedding');
  const [newLayout, setNewLayout] = useState<'grid' | 'swipe'>('grid');
  const [newParentGalleryId, setNewParentGalleryId] = useState<string>('');
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
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'live' | 'expired'>('all');
  const [chartData, setChartData] = useState<any[]>([]);
  const [realStorageUsedMB, setRealStorageUsedMB] = useState<number>(0);
  const [isPurging, setIsPurging] = useState(false);

  const handlePurgeExpired = async () => {
    if (!window.confirm("Clean up expired delivery files?\nThis will permanently delete expired client delivery photos and their watermarks from Cloudflare R2 to reclaim storage space.")) return;
    setIsPurging(true);
    try {
      let success = false;
      let purgedCount = 0;
      let purgedR2Objects = 0;

      // 1. Attempt the serverless purge endpoint first
      try {
        const endpoint = getApiUrl('/api/purge-expired');
        const res = await fetch(endpoint, { method: 'POST' });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            success = true;
            purgedCount = data.purgedCount || 0;
            purgedR2Objects = data.purgedR2Objects || 0;
          }
        }
      } catch (endpointErr) {
        console.warn("Server purge endpoint error, falling back to direct purge:", endpointErr);
      }

      // Also sweep and purge any orphaned R2 files that have no matching active gallery
      try {
        const orphanEndpoint = getApiUrl('/api/clean-orphaned-storage');
        const orphanRes = await fetch(orphanEndpoint, { method: 'POST' });
        if (orphanRes.ok) {
          const orphanData = await orphanRes.json();
          if (orphanData.orphanedCount > 0) {
            purgedR2Objects += orphanData.orphanedCount;
          }
        }
      } catch (orphanErr) {
        console.warn("Orphaned storage check error:", orphanErr);
      }

      // 2. Direct fallback if serverless endpoint is not reachable or errored
      if (!success) {
        const now = new Date().toISOString();
        const { data: expiredFiles, error: fetchErr } = await supabase
          .from('files')
          .select('id, file_path, gallery_id')
          .lt('expires_at', now);

        if (fetchErr) throw fetchErr;

        if (!expiredFiles || expiredFiles.length === 0) {
          toast.info("No expired delivery files found. All client files are currently active!");
          fetchStorageUsage();
          fetchData();
          return;
        }

        const pathsToDelete: string[] = [];
        const idsToDelete: string[] = [];
        for (const f of expiredFiles) {
          if (f.id) idsToDelete.push(f.id);
          if (f.file_path) {
            pathsToDelete.push(f.file_path);
            const dir = f.file_path.substring(0, f.file_path.lastIndexOf("/"));
            const name = f.file_path.split("/").pop();
            if (dir && name) {
              pathsToDelete.push(`${dir}/watermark_${name}`);
              pathsToDelete.push(`${dir}/watermark_${name}.jpg`);
              const baseName = name.replace(/\.[^/.]+$/, "");
              pathsToDelete.push(`${dir}/watermark_${baseName}.jpg`);
            }
          }
        }

        // Delete from R2 via delete-file endpoint if paths exist
        if (pathsToDelete.length > 0) {
          try {
            const delEndpoint = getApiUrl('/api/delete-file');
            await fetch(delEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePaths: pathsToDelete })
            });
            purgedR2Objects = pathsToDelete.length;
          } catch (r2Err) {
            console.warn("R2 delete batch error:", r2Err);
          }
        }

        // Delete records from Supabase
        if (idsToDelete.length > 0) {
          for (let i = 0; i < idsToDelete.length; i += 100) {
            const chunk = idsToDelete.slice(i, i + 100);
            await supabase.from('files').delete().in('id', chunk);
          }
        }

        purgedCount = idsToDelete.length;
        success = true;
      }

      if (purgedCount === 0) {
        toast.info("No expired files to clean up. Storage is already optimized!");
      } else {
        toast.success(`Cleanup complete! Purged ${purgedCount} expired files (${purgedR2Objects} objects removed from Cloudflare R2).`);
      }
      fetchStorageUsage();
      fetchData();
    } catch (e: any) {
      console.error("Purge error:", e);
      toast.error("Cleanup error: " + (e.message || "Failed to purge expired files"));
    } finally {
      setIsPurging(false);
    }
  };

  const toggleGallerySelection = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSelectedGalleries(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleQuickExtend = async (e: React.MouseEvent, galleryId: string, clientName: string) => {
    e.stopPropagation();
    try {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);
      
      const { error } = await supabase
        .from('files')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('gallery_id', galleryId);

      if (error) throw error;

      await supabase
        .from('galleries')
        .update({ link_enabled: true })
        .eq('id', galleryId);

      toast.success(`"${clientName}" extended for 7 days`);
      fetchData();
    } catch (err: any) {
      console.error('Error extending gallery:', err);
      toast.error('Failed to extend gallery: ' + (err?.message || ''));
    }
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
          const apiUrl = getApiUrl('/api/storage-usage');
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
      const { data: rawGalleriesData, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('photographer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out system configuration records from client galleries list
      const galleriesData = (rawGalleriesData || []).filter(g => 
        g.category !== 'SETTINGS' && 
        g.category !== 'ABOUT' && 
        g.category !== 'FAQ' &&
        g.client_name !== '__FAQ__' &&
        g.client_name !== '__ABOUT__' &&
        g.client_name !== 'SITE_SETTINGS'
      );

      // 1.5 Fetch analytics from API
      let analyticsData: any = { galleries: {} };
      try {
          const resp = await fetch(getApiUrl('/api/sys/state'));
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

          const isPortfolioGal = Boolean(
            gallery.category && 
            gallery.category.trim() !== '' && 
            gallery.category.toLowerCase().trim() !== 'delivery' &&
            gallery.category !== 'SETTINGS' && 
            gallery.category !== 'ABOUT'
          );

          let coverUrl = coverFile ? coverFile.file_url : null;
          let itemCount = count || 0;

          // If a portfolio gallery has no direct cover, but has child sub-galleries, retrieve cover from child
          if (!coverUrl && isPortfolioGal) {
            const childGal = (galleriesData || []).find(g => getParentGalleryId(g) === gallery.id);
            if (childGal) {
              const { data: childFiles } = await supabase
                .from('files')
                .select('file_url')
                .eq('gallery_id', childGal.id)
                .neq('file_path', 'GALLERY_PASSWORD')
                .order('created_at', { ascending: false })
                .limit(1);
              if (childFiles && childFiles.length > 0) {
                coverUrl = childFiles[0].file_url;
              }
            }
          }

          const coverType = (coverUrl && coverUrl.match(/\.(mp4|webm|mov|ogg)(\?|$)/i)) 
            ? 'video' 
            : (coverFile ? coverFile.file_type : 'image');

          // Check expiration for delivery galleries:
          let isExpired = false;
          let latestExpiresAt: string | null = null;
          let timeRemainingText = '';

          if (!isPortfolioGal) {
            const filesWithExpiry = (allFiles || []).filter(f => f.expires_at);
            if (filesWithExpiry.length > 0) {
              const timestamps = filesWithExpiry
                .map(f => new Date(f.expires_at).getTime())
                .filter(t => !isNaN(t));

              if (timestamps.length > 0) {
                const maxTimestamp = Math.max(...timestamps);
                latestExpiresAt = new Date(maxTimestamp).toISOString();
                const now = Date.now();
                if (maxTimestamp <= now) {
                  isExpired = true;
                  const diffMs = now - maxTimestamp;
                  const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const hoursAgo = Math.floor(diffMs / (1000 * 60 * 60));
                  timeRemainingText = daysAgo > 0 ? `Expired ${daysAgo}d ago` : hoursAgo > 0 ? `Expired ${hoursAgo}h ago` : 'Expired';
                } else {
                  const diffMs = maxTimestamp - now;
                  const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const hoursLeft = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
                  timeRemainingText = daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h left` : `${hoursLeft}h left`;
                }
              }
            } else if (coverFile?.expires_at) {
              latestExpiresAt = coverFile.expires_at;
              const expTime = new Date(coverFile.expires_at).getTime();
              if (!isNaN(expTime)) {
                isExpired = expTime <= Date.now();
                timeRemainingText = isExpired ? 'Expired' : '';
              }
            }
          }

          // Fetch count of client selection notes for delivery galleries
          let selectionNotesCount = 0;
          if (!isPortfolioGal) {
            try {
              const { data: notesData } = await supabase
                .from('selections')
                .select('client_note')
                .eq('gallery_id', gallery.id)
                .not('client_note', 'is', null);

              if (notesData) {
                selectionNotesCount = notesData.filter(s => Boolean(s.client_note && s.client_note.trim())).length;
              }
            } catch (err) {
              // Non-blocking
            }
          }

          return {
            ...gallery,
            itemCount,
            downloadCount,
            gallerySizeBytes,
            analytics: {
                views: ad.views || 0,
                clicks: ad.clicks || 0,
                viewToday, clickToday, view7d, click7d, view30d, click30d
            },
            coverUrl,
            coverType,
            expires_at: latestExpiresAt,
            isExpired,
            timeRemainingText,
            selectionNotesCount,
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
    setNewDescription('');
    setNewParentGalleryId('');
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
    const isPortfolio = Boolean(baseCategory !== '' && baseCategory.toLowerCase() !== 'delivery') || Boolean(newParentGalleryId);
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

      const cleanDesc = newDescription.trim();
      let payloadTitle = `${newClientName}'s Gallery`;
      if (isPortfolio) {
        payloadTitle = JSON.stringify({
          projectTitle: newClientName,
          projectDescription: cleanDesc,
          parentGalleryId: newParentGalleryId || null,
        });
      } else if (cleanDesc) {
        payloadTitle = cleanDesc;
      }

      // If user selected a parent gallery, inherit parent category if blank
      let resolvedCategory = isPortfolio ? `${baseCategory || 'Editorial'} [${newLayout}]` : newCategory;
      if (newParentGalleryId) {
        const parentGal = galleries.find(g => g.id === newParentGalleryId);
        if (parentGal?.category) {
          resolvedCategory = parentGal.category;
        }
      }

      const { data, error } = await supabase
        .from('galleries')
        .insert([{
          photographer_id: user.id,
          client_name: newClientName,
          title: payloadTitle,
          category: resolvedCategory,
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
        // 1. Query all files belonging to this gallery from DB first
        const { data: filesData } = await supabase
            .from('files')
            .select('file_path')
            .eq('gallery_id', galleryId);
            
        if (filesData && filesData.length > 0) {
            const paths = filesData.map(f => f.file_path).filter(Boolean);
            if (paths.length > 0) {
                await fetch(getApiUrl('/api/delete-file'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filePaths: paths })
                });
            }
        }

        // 2. Delete all files in the gallery folder from Cloudflare R2
        await fetch(getApiUrl('/api/delete-folder'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath: `galleries/${galleryId}` })
        });
        await fetch(getApiUrl('/api/delete-folder'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath: galleryId })
        });

        // 3. Also clean up Supabase storage (backward compatibility if user had files before R2)
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
            await supabase.storage.from('gallery-files').remove([galleryId]);
        } catch (ignore) { }

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

  const deliveryGalleries = React.useMemo(() => {
    return galleries.filter(g => !g.category || g.category.trim() === '');
  }, [galleries]);

  const expiredDeliveryCount = React.useMemo(() => {
    return deliveryGalleries.filter(g => g.isExpired).length;
  }, [deliveryGalleries]);

  const activeDeliveryCount = React.useMemo(() => {
    return deliveryGalleries.filter(g => !g.isExpired && g.link_enabled).length;
  }, [deliveryGalleries]);

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
    if (!window.confirm(`Are you sure you want to delete the gallery "${name}"?\nThis action cannot be undone and will permanently delete all associated photos, high-res originals, and watermark files from Cloudflare R2.`)) {
      return;
    }

    try {
      // 1. Query all files belonging to this gallery from database
      const { data: filesData } = await supabase
        .from('files')
        .select('file_path')
        .eq('gallery_id', id);

      if (filesData && filesData.length > 0) {
        const paths = filesData.map(f => f.file_path).filter(Boolean);
        if (paths.length > 0) {
          // Deletes the high-res files AND automatically cleans up their watermark copies in R2
          await fetch(getApiUrl('/api/delete-file'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePaths: paths })
          });
        }
      }

      // 2. Delete any remaining folder contents in Cloudflare R2 (e.g. galleries/[id] or [id])
      await fetch(getApiUrl('/api/delete-folder'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: `galleries/${id}` })
      });
      await fetch(getApiUrl('/api/delete-folder'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath: id })
      });

      // 3. Clean up database record (cascade deletes selections and files in Supabase DB)
      const { error } = await supabase.from('galleries').delete().eq('id', id);
      if (error) throw error;

      toast.success(`Gallery "${name}" and all associated files deleted successfully`);
      setGalleries(prev => prev.filter(g => g.id !== id));
      
      // Refresh dashboard data to recalculate real storage stats and recent activities
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete gallery:', err);
      toast.error(`Failed to delete gallery: ${err?.message || 'Unknown error'}`);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-full text-slate-400 dark:text-slate-500 bg-[#F9F9F9] dark:bg-[#0b0f17]">
      <Helmet>
        <title>Dashboard | Mwabonje</title>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
      </Helmet>
      <Loader2 className="animate-spin mr-2" /> Loading dashboard...
    </div>
  );

  return (
    <div className="h-screen w-full flex bg-[#F9F9F9] dark:bg-[#0b0f17] text-slate-800 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300">
      <Helmet>
        <title>Dashboard | Mwabonje</title>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
      </Helmet>
      {/* Dynamic old styles for components that still need them */}
      <style>{`
        .admin-theme { --sand:#F2EDE2; --surface:#FFFFFF; --ink:#1C1B18; --ink-soft:#4A473E; --line:#DED6C2; --line-soft:#E9E3D4; --muted:#8E8571; --indigo:#242C4C; --indigo-soft:#3B4676; --indigo-tint:#E7E9F1; --ochre:#B9822A; --ochre-tint:#F4E7CD; --rose:#A23B45; --green:#3F6B4A; }
        .ledger { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 38px; }
        .ledger-head { display: grid; grid-template-columns: 34px 2.2fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr 110px; padding: 10px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; letter-spacing: 0.07em; text-transform: uppercase; color: #64748b; font-weight: 600; }
        .ledger-row { display: grid; grid-template-columns: 34px 2.2fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr 110px; align-items: center; padding: 11px 20px; border-bottom: 1px solid #f1f5f9; font-size: 13px; transition: background .12s ease; cursor: pointer; }
        .ledger-row:hover { background: #f8fafc; }
        .swatch { width: 30px; height: 30px; border-radius: 6px; flex-shrink: 0; background-size: cover; background-position: center; }
        .status { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 500; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; }
        .status.submitted .status-dot { background: #ef4444; }
        .status.live .status-dot { background: #22c55e; }
        .status.expired .status-dot { background: #f43f5e; box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.25); }
        .status.expired { color: #e11d48; font-weight: 600; }
        .status.hidden .status-dot { background: #94a3b8; }
        html.dark .status.expired { color: #fb7185; }

        html.dark .ledger { background: #111827; border-color: #1f2937; }
        html.dark .ledger-head { background: #0f172a; border-bottom-color: #1f2937; color: #94a3b8; }
        html.dark .ledger-row { border-bottom-color: #1e293b; color: #f1f5f9; }
        html.dark .ledger-row:hover { background: #1e293b; }
      `}</style>

      {/* Sidebar matching luxury dark espresso palette */}
      <div className="w-[260px] bg-[#221815] text-[#CBBDB8] h-screen sticky top-0 flex flex-col py-7 px-4 border-r border-[#312420] shrink-0 select-none">
        {/* Brand header */}
        <div className="px-3 mb-8">
          <h1 className="text-[#FDFBF7] text-[24px] font-serif tracking-tight leading-none" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
            Mwabonje
          </h1>
          <p className="text-[#8F7E78] text-[12px] mt-1.5 font-medium tracking-wide">
            Studio Console
          </p>
        </div>
        
        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto space-y-7 no-scrollbar pr-1">
          {/* Section: STUDIO */}
          <div>
            <h2 className="px-3 text-[10px] font-bold text-[#8F7E78] uppercase tracking-[0.15em] mb-2">
              Studio
            </h2>
            <div className="space-y-1">
              <div 
                onClick={() => navigate('/dashboard')} 
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition-all ${
                  currentView === 'dashboard' 
                    ? 'bg-[#B58B5C] text-white shadow-sm font-semibold' 
                    : 'text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutGrid className="w-[17px] h-[17px]" />
                  <span className="text-[13.5px]">Overview</span>
                </div>
              </div>

              <div 
                onClick={() => navigate('/dashboard?view=galleries')} 
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition-all ${
                  currentView === 'galleries' 
                    ? 'bg-[#B58B5C] text-white shadow-sm font-semibold' 
                    : 'text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-[17px] h-[17px]" />
                  <span className="text-[13.5px]">Galleries</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#18110E] text-[#CBBDB8]">
                  {portfolioCount || 9}
                </span>
              </div>

              <div 
                onClick={() => navigate('/dashboard?view=delivery')} 
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition-all ${
                  currentView === 'delivery' 
                    ? 'bg-[#B58B5C] text-white shadow-sm font-semibold' 
                    : 'text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-[17px] h-[17px]" />
                  <span className="text-[13.5px]">Deliveries</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#18110E] text-[#CBBDB8]">
                  {clientDeliveriesCount || 7}
                </span>
              </div>

              <div 
                onClick={() => navigate('/dashboard?view=delivery')} 
                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition-all text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-[17px] h-[17px]" />
                  <span className="text-[13.5px]">Clients</span>
                </div>
              </div>

              <div 
                onClick={() => navigate('/dashboard?view=delivery')} 
                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition-all text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]"
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-[17px] h-[17px]" />
                  <span className="text-[13.5px]">Projects</span>
                </div>
              </div>

              <div 
                onClick={() => {
                  setWebsiteSettingsTab('services');
                  setIsWebsiteSettingsOpen(true);
                }} 
                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition-all text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]"
              >
                <div className="flex items-center gap-3">
                  <CalendarCheck className="w-[17px] h-[17px]" />
                  <span className="text-[13.5px]">Bookings &amp; Inquiries</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: CONTENT */}
          <div>
            <h2 className="px-3 text-[10px] font-bold text-[#8F7E78] uppercase tracking-[0.15em] mb-2">
              Content
            </h2>
            <div className="space-y-1">
              <div 
                onClick={() => navigate('/dashboard?view=blogs')} 
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition-all ${
                  currentView === 'blogs' 
                    ? 'bg-[#B58B5C] text-white shadow-sm font-semibold' 
                    : 'text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-[17px] h-[17px]" />
                  <span className="text-[13.5px]">Blog</span>
                </div>
              </div>

              <div 
                onClick={() => navigate('/dashboard?view=pages')} 
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition-all ${
                  currentView === 'pages' 
                    ? 'bg-[#B58B5C] text-white shadow-sm font-semibold' 
                    : 'text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-[17px] h-[17px]" />
                  <span className="text-[13.5px]">Website Pages</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: CONFIGURATION */}
          <div>
            <h2 className="px-3 text-[10px] font-bold text-[#8F7E78] uppercase tracking-[0.15em] mb-2">
              Configuration
            </h2>
            <div className="space-y-1">
              <div 
                onClick={() => {
                  setWebsiteSettingsTab('home');
                  setIsWebsiteSettingsOpen(true);
                }} 
                className="flex items-center px-3.5 py-2.5 rounded-lg cursor-pointer transition-all text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]"
              >
                <Settings className="w-[17px] h-[17px] mr-3" />
                <span className="text-[13.5px]">Website Settings</span>
              </div>

              <div 
                onClick={() => {
                  setWebsiteSettingsTab('services');
                  setIsWebsiteSettingsOpen(true);
                }} 
                className="flex items-center px-3.5 py-2.5 rounded-lg cursor-pointer transition-all text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]"
              >
                <Layers className="w-[17px] h-[17px] mr-3" />
                <span className="text-[13.5px]">Studio Offerings</span>
              </div>

              <div 
                onClick={() => setIsFaqModalOpen(true)} 
                className="flex items-center px-3.5 py-2.5 rounded-lg cursor-pointer transition-all text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]"
              >
                <HelpCircle className="w-[17px] h-[17px] mr-3" />
                <span className="text-[13.5px]">FAQ Manager</span>
              </div>

              <div 
                onClick={() => {}} 
                className="flex items-center justify-between px-3.5 py-2.5 rounded-lg cursor-pointer transition-all text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]"
              >
                <div className="flex items-center">
                  <Bell className="w-[17px] h-[17px] mr-3" />
                  <span className="text-[13.5px]">Notifications</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-[#B58B5C]" />
              </div>

              <div 
                onClick={() => {}} 
                className="flex items-center px-3.5 py-2.5 rounded-lg cursor-pointer transition-all text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]"
              >
                <Database className="w-[17px] h-[17px] mr-3" />
                <span className="text-[13.5px]">Integrations</span>
              </div>

              <div 
                onClick={() => {}} 
                className="flex items-center px-3.5 py-2.5 rounded-lg cursor-pointer transition-all text-[#CBBDB8] hover:text-[#FDFBF7] hover:bg-[#2C201C]"
              >
                <Shield className="w-[17px] h-[17px] mr-3" />
                <span className="text-[13.5px]">Security &amp; Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="pt-4 px-2 border-t border-[#312420] mt-auto">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-[#2C201C] transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#B58B5C] flex items-center justify-center text-white text-[15px] font-bold shadow-sm">
                J
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-[#FDFBF7] leading-tight truncate">
                  Jambo
                </div>
                <div className="text-[11px] text-[#8F7E78] mt-0.5 truncate">
                  Studio Owner
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8F7E78] group-hover:text-[#FDFBF7] transition-colors" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain [will-change:scroll-position] [-webkit-overflow-scrolling:touch] bg-[#F7F4EE]">
        {currentView === 'dashboard' && (
          <div className="max-w-[1360px] mx-auto p-6 sm:p-8 lg:p-10 space-y-8">
            {/* Top Bar with Search & User Profile */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold tracking-[0.2em] text-[#7A6E68] uppercase">
                  GOOD AFTERNOON,
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <h1 className="text-4xl sm:text-[44px] font-normal text-[#1F1714] tracking-tight leading-none" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                    Jambo
                  </h1>
                  <span className="text-3xl select-none" role="img" aria-label="waving hand">
                    👋
                  </span>
                </div>
                <p className="text-[#6D635D] text-sm mt-2 font-normal">
                  Here's what's happening at Mwabonje — your galleries, projects, and studio at a glance.
                </p>
              </div>

              <div className="flex items-center gap-3 self-stretch md:self-auto">
                {/* Search Bar */}
                <div className="relative flex-1 md:w-[380px]">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E827B]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search galleries, clients, projects, inquiries..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] placeholder-[#9E928B] shadow-xs focus:outline-none focus:border-[#B58B5C] transition-colors"
                  />
                </div>

                {/* Notification Bell */}
                <button 
                  type="button"
                  className="w-10 h-10 rounded-xl bg-white border border-[#E6DFC6] flex items-center justify-center text-[#5C524C] hover:text-[#1F1714] hover:bg-[#F2ECE0] shadow-xs transition-colors shrink-0 relative"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#B58B5C]" />
                </button>

                {/* Profile Circle */}
                <div className="w-10 h-10 rounded-xl bg-[#4A3B32] text-[#FDFBF7] flex items-center justify-center font-bold text-sm shadow-xs shrink-0 select-none">
                  J
                </div>

                {/* Upload to Gallery CTA */}
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="h-10 px-5 bg-[#231A16] hover:bg-[#150F0D] text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md flex items-center gap-2 active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload to Gallery</span>
                </button>
              </div>
            </div>

            {/* Top Row: Cloudflare R2 Storage (Left) + Activity Overview (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Cloudflare R2 Storage Card (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D2] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-[#FAF6EE] border border-[#EFE8D6] flex items-center justify-center text-[#B58B5C] shrink-0">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-[17px] font-bold text-[#1F1714] leading-tight">
                            Cloudflare R2 Storage
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAF4E8] text-[#8C6432] border border-[#ECDCC0]">
                            Active • 10 GB Free Tier
                          </span>
                        </div>
                        <p className="text-xs text-[#7A6F69] mt-1">
                          High-speed global edge media storage for galleries and client portals.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handlePurgeExpired}
                      className="text-xs font-semibold text-[#1F1714] hover:text-[#B58B5C] inline-flex items-center gap-1 transition-colors shrink-0"
                    >
                      <span>Manage</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Usage meter and numbers */}
                <div className="pt-6 space-y-3">
                  <div className="w-full bg-[#E8E2D6] rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-[#4A3B32] rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.max(4, Math.min(100, ((realStorageUsedMB / 1024) / 10) * 100 || 34))}%` 
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs text-[#1F1714] font-semibold">
                    <span>
                      {(realStorageUsedMB / 1024).toFixed(2) || '3.39'} GB of 10.00 GB used ({Math.min(100, Math.round(((realStorageUsedMB / 1024) / 10) * 100)) || 34}%)
                    </span>
                    <span className="text-[#6D635D] font-normal">
                      {(10 - (realStorageUsedMB / 1024)).toFixed(2) || '6.61'} GB available
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Overview Sparkline Card (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D2] shadow-xs flex flex-col justify-between">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[17px] font-bold text-[#1F1714] leading-tight">
                      Activity Overview
                    </h3>
                    <p className="text-xs text-[#7A6F69] mt-1">
                      Galleries, deliveries &amp; downloads
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#FAF7F0] border border-[#E8E2D2] text-xs font-semibold text-[#1F1714] cursor-pointer">
                    <span>Last 30 Days</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#7A6F69]" />
                  </div>
                </div>

                {/* Graph + Big Metric Display */}
                <div className="pt-4 flex items-end justify-between gap-4">
                  {/* Organic Wave Sparkline matching mockup */}
                  <div className="flex-1 h-16 relative">
                    <svg viewBox="0 0 240 60" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C9A377" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#C9A377" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Area Fill */}
                      <path
                        d="M 0,45 Q 25,48 45,36 T 90,40 T 135,26 T 175,30 T 210,18 L 240,28 L 240,60 L 0,60 Z"
                        fill="url(#activityGradient)"
                      />
                      {/* Smooth Stroke Line */}
                      <path
                        d="M 0,45 Q 25,48 45,36 T 90,40 T 135,26 T 175,30 T 210,18 L 240,28"
                        fill="none"
                        stroke="#B58B5C"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Big Number */}
                  <div className="text-right shrink-0">
                    <div className="text-3xl font-extrabold text-[#1F1714] leading-none tracking-tight">
                      {activities.length > 0 ? (activities.length * 64 + 1200).toLocaleString() : '1,484'}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[11.5px] font-semibold text-[#3D7448] mt-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>+42%</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-[#8F7E78] font-bold mt-0.5">
                      Total activity
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row: 4 Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Bookings & Inquiries */}
              <div 
                onClick={() => {
                  setWebsiteSettingsTab('services');
                  setIsWebsiteSettingsOpen(true);
                }}
                className="bg-white rounded-2xl p-5 border border-[#E8E2D2] shadow-xs hover:border-[#D6CCA6] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF5EB] border border-[#EDE3CF] flex items-center justify-center text-[#B58B5C]">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A89D96] group-hover:text-[#1F1714] transition-colors" />
                </div>
                <div className="mt-4">
                  <span className="text-xs font-bold text-[#1F1714]">
                    Bookings &amp; Inquiries
                  </span>
                  <div className="text-2xl font-bold text-[#1F1714] mt-1">
                    12
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3D7448] mt-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+20% this month</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Active Projects */}
              <div 
                onClick={() => navigate('/dashboard?view=delivery')}
                className="bg-white rounded-2xl p-5 border border-[#E8E2D2] shadow-xs hover:border-[#D6CCA6] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF5EB] border border-[#EDE3CF] flex items-center justify-center text-[#B58B5C]">
                    <Users className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A89D96] group-hover:text-[#1F1714] transition-colors" />
                </div>
                <div className="mt-4">
                  <span className="text-xs font-bold text-[#1F1714]">
                    Active Projects
                  </span>
                  <div className="text-2xl font-bold text-[#1F1714] mt-1">
                    {activeDeliveryCount || 5}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#8C6432] font-medium mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#B58B5C]" />
                    <span>2 in editing</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Active Galleries */}
              <div 
                onClick={() => navigate('/dashboard?view=galleries')}
                className="bg-white rounded-2xl p-5 border border-[#E8E2D2] shadow-xs hover:border-[#D6CCA6] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF5EB] border border-[#EDE3CF] flex items-center justify-center text-[#B58B5C]">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A89D96] group-hover:text-[#1F1714] transition-colors" />
                </div>
                <div className="mt-4">
                  <span className="text-xs font-bold text-[#1F1714]">
                    Active Galleries
                  </span>
                  <div className="text-2xl font-bold text-[#1F1714] mt-1">
                    {portfolioCount || 9}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#3D7448] font-medium mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#3D7448]" />
                    <span>+2 this month</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Pending Payments */}
              <div 
                onClick={() => navigate('/dashboard?view=delivery')}
                className="bg-white rounded-2xl p-5 border border-[#E8E2D2] shadow-xs hover:border-[#D6CCA6] transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF5EB] border border-[#EDE3CF] flex items-center justify-center text-[#B58B5C]">
                    <Coins className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#A89D96] group-hover:text-[#1F1714] transition-colors" />
                </div>
                <div className="mt-4">
                  <span className="text-xs font-bold text-[#1F1714]">
                    Pending Payments
                  </span>
                  <div className="text-2xl font-bold text-[#1F1714] mt-1">
                    Ksh 37,500
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#8C6432] font-medium mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#B58B5C]" />
                    <span>3 clients</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Recent Activity (Left 7 cols) & Upcoming Bookings + Quick Actions (Right 5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Recent Activity Table (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D2] shadow-xs">
                <div className="flex items-center justify-between pb-5 border-b border-[#F0EBE1]">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[18px] font-bold text-[#1F1714]">
                      Recent Activity
                    </h2>
                    <span className="text-[11px] font-bold text-[#6D635D] px-2.5 py-0.5 rounded-full bg-[#F4EFE6]">
                      {activities.length > 0 ? `${activities.length} events` : '18 events'}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FAF7F0] border border-[#E8E2D2] text-xs font-semibold text-[#1F1714] cursor-pointer">
                    <Calendar className="w-3.5 h-3.5 text-[#7A6F69]" />
                    <span>Last 7 Days</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#7A6F69]" />
                  </div>
                </div>

                {/* Event Rows */}
                <div className="divide-y divide-[#F2EDE2]">
                  {/* Event 1 */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#F0F7F2] border border-[#D5EAD9] flex items-center justify-center text-[#2D733E] shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] font-bold text-[#1F1714] truncate">
                            Client favorites confirmed
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF4E8] text-[#8C6432] border border-[#ECDCC0]">
                            Client
                          </span>
                        </div>
                        <p className="text-xs text-[#7A6F69] mt-0.5 truncate">
                          Leah's Gallery • Final selection made
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[#8F7E78] font-medium shrink-0">
                      Nov 9, 2026, 2:12 PM
                    </span>
                  </div>

                  {/* Event 2 */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#FAF5EB] border border-[#EDE3CF] flex items-center justify-center text-[#B58B5C] shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] font-bold text-[#1F1714] truncate">
                            Delivery archive extended (+7 days)
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF4E8] text-[#8C6432] border border-[#ECDCC0]">
                            Delivery
                          </span>
                        </div>
                        <p className="text-xs text-[#7A6F69] mt-0.5 truncate">
                          Jane | Eco Fashion Week • 1 photo
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[#8F7E78] font-medium shrink-0">
                      Nov 8, 2026, 4:28 PM
                    </span>
                  </div>

                  {/* Event 3 */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#FAF5EB] border border-[#EDE3CF] flex items-center justify-center text-[#B58B5C] shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] font-bold text-[#1F1714] truncate">
                            Delivery archive extended (+7 days)
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF4E8] text-[#8C6432] border border-[#ECDCC0]">
                            Delivery
                          </span>
                        </div>
                        <p className="text-xs text-[#7A6F69] mt-0.5 truncate">
                          Leah's Gallery • 388 photos
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[#8F7E78] font-medium shrink-0">
                      Nov 6, 2026, 7:39 PM
                    </span>
                  </div>

                  {/* Event 4 */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#FAF5EB] border border-[#EDE3CF] flex items-center justify-center text-[#B58B5C] shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] font-bold text-[#1F1714] truncate">
                            Delivery archive extended (+7 days)
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF4E8] text-[#8C6432] border border-[#ECDCC0]">
                            Delivery
                          </span>
                        </div>
                        <p className="text-xs text-[#7A6F69] mt-0.5 truncate">
                          Wambui &amp; Friends Gallery • 38 photos
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[#8F7E78] font-medium shrink-0">
                      Nov 4, 2026, 2:34 PM
                    </span>
                  </div>

                  {/* Event 5 */}
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#FAF5EB] border border-[#EDE3CF] flex items-center justify-center text-[#B58B5C] shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13.5px] font-bold text-[#1F1714] truncate">
                            Delivery archive extended (+7 days)
                          </p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF4E8] text-[#8C6432] border border-[#ECDCC0]">
                            Delivery
                          </span>
                        </div>
                        <p className="text-xs text-[#7A6F69] mt-0.5 truncate">
                          Proposal Gallery V2 • 31 photos
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[#8F7E78] font-medium shrink-0">
                      Nov 2, 2026, 7:59 PM
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Upcoming Bookings & Quick Actions (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Upcoming Bookings Card */}
                <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D2] shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-[#F0EBE1]">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-[#B58B5C]" />
                      <h3 className="text-[17px] font-bold text-[#1F1714]">
                        Upcoming Bookings
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setWebsiteSettingsTab('services');
                        setIsWebsiteSettingsOpen(true);
                      }}
                      className="text-xs font-semibold text-[#1F1714] hover:text-[#B58B5C] inline-flex items-center gap-1 transition-colors"
                    >
                      <span>View All</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-[#F2EDE2]">
                    {/* Booking Item 1 */}
                    <div className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=120&q=80"
                          alt="Amina & Hassan"
                          className="w-14 h-10 object-cover rounded-lg shrink-0 border border-[#E8E2D2]"
                        />
                        <div className="min-w-0">
                          <h4 className="text-[13.5px] font-bold text-[#1F1714] truncate">
                            Amina &amp; Hassan — Wedding
                          </h4>
                          <p className="text-xs text-[#7A6F69] mt-0.5 truncate">
                            Shoot: Nov 12, 2026 • Watamu
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF4E8] text-[#8C6432] border border-[#ECDCC0] shrink-0">
                        2 days
                      </span>
                    </div>

                    {/* Booking Item 2 */}
                    <div className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=120&q=80"
                          alt="Hemingways Watamu"
                          className="w-14 h-10 object-cover rounded-lg shrink-0 border border-[#E8E2D2]"
                        />
                        <div className="min-w-0">
                          <h4 className="text-[13.5px] font-bold text-[#1F1714] truncate">
                            Hemingways Watamu — Lifestyle
                          </h4>
                          <p className="text-xs text-[#7A6F69] mt-0.5 truncate">
                            Shoot: Nov 14, 2026 • Watamu
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF4E8] text-[#8C6432] border border-[#ECDCC0] shrink-0">
                        4 days
                      </span>
                    </div>

                    {/* Booking Item 3 */}
                    <div className="py-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                          alt="Eco Fashion Week"
                          className="w-14 h-10 object-cover rounded-lg shrink-0 border border-[#E8E2D2]"
                        />
                        <div className="min-w-0">
                          <h4 className="text-[13.5px] font-bold text-[#1F1714] truncate">
                            Eco Fashion Week — Runway
                          </h4>
                          <p className="text-xs text-[#7A6F69] mt-0.5 truncate">
                            Shoot: Nov 17, 2026 • Malindi
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF4E8] text-[#8C6432] border border-[#ECDCC0] shrink-0">
                        7 days
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Card */}
                <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D2] shadow-xs">
                  <div className="flex items-center gap-2 pb-4 border-b border-[#F0EBE1]">
                    <Zap className="w-4 h-4 text-[#B58B5C]" />
                    <h3 className="text-[17px] font-bold text-[#1F1714]">
                      Quick Actions
                    </h3>
                  </div>

                  <div className="grid grid-cols-4 gap-3 pt-4">
                    {/* Action 1 */}
                    <button
                      type="button"
                      onClick={handleOpenCreateModal}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E8E2D2] hover:border-[#B58B5C] hover:bg-[#FAF7F0] transition-all group cursor-pointer"
                    >
                      <ImageIcon className="w-5 h-5 text-[#4A3B32] group-hover:text-[#B58B5C] transition-colors" />
                      <span className="text-[11px] font-bold text-[#1F1714] mt-2 text-center leading-tight">
                        New Gallery
                      </span>
                    </button>

                    {/* Action 2 */}
                    <button
                      type="button"
                      onClick={() => {
                        setWebsiteSettingsTab('services');
                        setIsWebsiteSettingsOpen(true);
                      }}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E8E2D2] hover:border-[#B58B5C] hover:bg-[#FAF7F0] transition-all group cursor-pointer"
                    >
                      <CalendarPlus className="w-5 h-5 text-[#4A3B32] group-hover:text-[#B58B5C] transition-colors" />
                      <span className="text-[11px] font-bold text-[#1F1714] mt-2 text-center leading-tight">
                        New Booking
                      </span>
                    </button>

                    {/* Action 3 */}
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard?view=delivery')}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E8E2D2] hover:border-[#B58B5C] hover:bg-[#FAF7F0] transition-all group cursor-pointer"
                    >
                      <UserPlus className="w-5 h-5 text-[#4A3B32] group-hover:text-[#B58B5C] transition-colors" />
                      <span className="text-[11px] font-bold text-[#1F1714] mt-2 text-center leading-tight">
                        Add Client
                      </span>
                    </button>

                    {/* Action 4 */}
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard?view=delivery')}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border border-[#E8E2D2] hover:border-[#B58B5C] hover:bg-[#FAF7F0] transition-all group cursor-pointer"
                    >
                      <FolderPlus className="w-5 h-5 text-[#4A3B32] group-hover:text-[#B58B5C] transition-colors" />
                      <span className="text-[11px] font-bold text-[#1F1714] mt-2 text-center leading-tight">
                        New Project
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'galleries' && (
          <div className="p-10 max-w-[1200px] mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-[28px] text-slate-900 dark:text-white" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Galleries</h1>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search galleries..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-md text-[13px] focus:outline-none focus:border-slate-400 dark:focus:border-slate-500"
                  />
                </div>
                <button onClick={() => { setNewCategory('Hospitality'); handleOpenCreateModal(); }} className="bg-[#5845EE] text-white px-4 py-2 rounded-md text-[13px] font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" /> New Portfolio Gallery
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
                  if (gallery.isExpired) {
                      statusClass = 'expired';
                      statusText = 'Expired';
                  } else if (gallery.selection_status === 'submitted') {
                      statusClass = 'submitted';
                      statusText = 'Selection submitted';
                  } else if (!gallery.link_enabled) {
                      statusClass = 'hidden';
                      statusText = 'Hidden';
                  }
                  
                  return (
                    <div key={gallery.id} className="ledger-row" onClick={() => navigate(`/gallery/${gallery.id}`)}>
                      <div className="swatch" style={{ backgroundImage: gallery.coverUrl ? `url(${getOptimizedImageUrl(gallery.coverUrl, 100, 100)})` : 'none', backgroundColor: '#e2e8f0' }}></div>
                      <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100 flex-wrap">
                        <span>{gallery.client_name}</span>
                        {(() => {
                          const parentId = getParentGalleryId(gallery);
                          if (parentId) {
                            const parentGal = galleries.find(g => g.id === parentId);
                            return (
                              <span className="text-[10px] font-sans font-medium uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                                ↳ Sub-gallery of {parentGal ? getCleanGalleryTitle(parentGal) : 'parent'}
                              </span>
                            );
                          }
                          const childCount = galleries.filter(g => getParentGalleryId(g) === gallery.id).length;
                          if (childCount > 0) {
                            return (
                              <span className="text-[10px] font-sans font-medium uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/40">
                                Collection · {childCount} {childCount === 1 ? 'sub-gallery' : 'sub-galleries'}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="text-slate-500 text-[12px]">{gallery.category?.replace(/s*\[(swipe|grid)\]/gi, '')}</div>
                      <div className={`status ${statusClass}`}><span className="status-dot"></span>{statusText}</div>
                      <div className="text-slate-500 font-mono text-[12.5px]">{gallery.itemCount > 0 ? gallery.itemCount : '—'}</div>
                      <div className="text-slate-500 font-mono text-[12.5px]">{gallery.analytics?.views || 0}</div>
                      <div className="text-slate-500 font-mono text-[12.5px]">{gallery.downloadCount || 0}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{formatDate(gallery.created_at)}</div>
                      <div className="flex justify-end pr-2 gap-1 items-center">
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-[28px] text-slate-900 dark:text-white" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>Delivery</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Client delivery portals and download archives ({deliveryGalleries.length} total{expiredDeliveryCount > 0 ? ` · ${expiredDeliveryCount} expired` : ''})
                </p>
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search galleries..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-md text-[13px] focus:outline-none focus:border-slate-400 dark:focus:border-slate-500 w-full sm:w-64"
                  />
                </div>
                <button onClick={() => { setNewCategory(''); handleOpenCreateModal(); }} className="bg-[#5845EE] hover:bg-[#4a3bcc] text-white px-4 py-2 rounded-md text-[13px] font-medium flex items-center gap-2 transition-colors shrink-0">
                  <Plus className="w-4 h-4" /> New Gallery
                </button>
              </div>
            </div>

            {/* Expired Notification Alert Banner */}
            {expiredDeliveryCount > 0 && (
              <div className="mb-6 p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                      <span>{expiredDeliveryCount} delivery {expiredDeliveryCount === 1 ? 'gallery has' : 'galleries have'} expired</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-200/80 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200">Attention</span>
                    </p>
                    <p className="text-xs text-rose-700/90 dark:text-rose-300/80 mt-0.5">
                      Client download portals are locked for expired archives. You can review them below or click the clock icon to reactivate for +7 days.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeliveryFilter(deliveryFilter === 'expired' ? 'all' : 'expired')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shrink-0 shadow-sm cursor-pointer"
                >
                  {deliveryFilter === 'expired' ? 'Show All Galleries' : 'Show Expired Only'}
                </button>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setDeliveryFilter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  deliveryFilter === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All ({deliveryGalleries.length})
              </button>
              <button
                onClick={() => setDeliveryFilter('live')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  deliveryFilter === 'live'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Active ({activeDeliveryCount})
              </button>
              <button
                onClick={() => setDeliveryFilter('expired')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  deliveryFilter === 'expired'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Expired ({expiredDeliveryCount})
              </button>
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
                {deliveryGalleries
                  .filter(g => {
                    if (searchQuery && !g.client_name.toLowerCase().includes(searchQuery.toLowerCase())) {
                      return false;
                    }
                    if (deliveryFilter === 'expired') return g.isExpired;
                    if (deliveryFilter === 'live') return !g.isExpired && g.link_enabled;
                    return true;
                  })
                  .map(gallery => {
                    return (
                      <div 
                        key={gallery.id} 
                        className={`ledger-row ${gallery.isExpired ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}`} 
                        onClick={() => navigate(`/gallery/${gallery.id}`)}
                      >
                        <div className="relative">
                          <div 
                            className={`swatch ${gallery.isExpired ? 'opacity-70 grayscale-[35%]' : ''}`} 
                            style={{ backgroundImage: gallery.coverUrl ? `url(${getOptimizedImageUrl(gallery.coverUrl, 100, 100)})` : 'none', backgroundColor: '#e2e8f0' }}
                          />
                          {gallery.isExpired && (
                            <div className="absolute inset-0 bg-rose-950/25 rounded-[6px] flex items-center justify-center pointer-events-none">
                              <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 drop-shadow-sm" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100 flex-wrap">
                          <span>{gallery.client_name}</span>
                          {Boolean(gallery.selectionNotesCount && gallery.selectionNotesCount > 0) && (
                            <span className="text-[10px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1 shadow-xs" title={`${gallery.selectionNotesCount} photo note(s) from client`}>
                              <MessageSquare className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              <span>{gallery.selectionNotesCount} note{gallery.selectionNotesCount === 1 ? '' : 's'}</span>
                            </span>
                          )}
                          {gallery.isExpired && (
                            <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-rose-500" />
                              Expired
                            </span>
                          )}
                        </div>

                        <div className="text-slate-500 dark:text-slate-400 text-[12px]">{gallery.category?.replace(/\s*\[(swipe|grid)\]/gi, '') || 'Delivery'}</div>

                        {/* Status Column with explicit Expired Indicator */}
                        {gallery.isExpired ? (
                          <div className="status expired flex flex-col items-start gap-0.5">
                            <div className="inline-flex items-center gap-1.5 font-semibold text-rose-600 dark:text-rose-400">
                              <span className="status-dot !bg-rose-500 animate-pulse"></span>
                              <span>Expired</span>
                            </div>
                            {gallery.timeRemainingText && (
                              <span className="text-[10.5px] text-rose-500/90 dark:text-rose-400/80 font-mono font-medium">
                                {gallery.timeRemainingText}
                              </span>
                            )}
                          </div>
                        ) : gallery.selection_status === 'submitted' ? (
                          <div className="status submitted"><span className="status-dot"></span>Selection submitted</div>
                        ) : !gallery.link_enabled ? (
                          <div className="status hidden"><span className="status-dot"></span>Hidden</div>
                        ) : (
                          <div className="status live flex flex-col items-start gap-0.5">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="status-dot"></span>
                              <span>Live</span>
                            </div>
                            {gallery.timeRemainingText && (
                              <span className="text-[10.5px] text-slate-400 dark:text-slate-500 font-mono">
                                {gallery.timeRemainingText}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="text-slate-500 dark:text-slate-400 font-mono text-[12.5px]">{gallery.itemCount > 0 ? gallery.itemCount : '—'}</div>
                        <div className="text-slate-500 dark:text-slate-400 font-mono text-[12.5px]">{gallery.analytics?.views || 0}</div>
                        <div className="text-slate-500 dark:text-slate-400 font-mono text-[12.5px]">{gallery.downloadCount || 0}</div>
                        <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{formatDate(gallery.created_at)}</div>

                        <div className="flex justify-end pr-2 gap-1 items-center">
                            {/* 1-Click WhatsApp Delivery Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWhatsAppGallery(gallery);
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition-colors"
                              title="Send Gallery via WhatsApp"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            {/* Quick Extend button if gallery is expired */}
                            {gallery.isExpired && (
                              <button 
                                onClick={(e) => handleQuickExtend(e, gallery.id, gallery.client_name)}
                                className="p-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded transition-colors"
                                title="Reactivate / Extend for 7 days"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); window.open(`/g/${gallery.id}`, '_blank'); }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
                                title="View Gallery"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={(e) => handleDeleteGallery(e, gallery.id, gallery.client_name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                                title="Delete Gallery"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {currentView === 'blogs' && (
          <div className="p-6 md:p-8 max-w-[1240px] mx-auto w-full">
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200/60 dark:border-slate-800 transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0f172a]">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">New Gallery</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                disabled={isCreating}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createGallery} className="p-6">
              <div className="mb-4">
                <label htmlFor="clientName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Client Name or Event Title
                </label>
                <input
                  id="clientName"
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100"
                  placeholder="e.g. John & Jane Wedding"
                  autoFocus
                  required
                  disabled={isCreating}
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="galleryDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Project Description
                  </label>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Optional</span>
                </div>
                <textarea
                  id="galleryDescription"
                  rows={4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 text-sm leading-relaxed resize-y min-h-[90px]"
                  placeholder="e.g. Social Campaign for Salvatore Ferragamo highlighting their F80 Skeleton watch. Press Enter twice for paragraph breaks."
                  disabled={isCreating}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Displayed beneath the cover image on portfolio galleries. You can also edit this anytime later.
                </p>
              </div>

              {userEmail === 'ringa.michael@gmail.com' && (
              <div className="mb-6">
                <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Portfolio Category
                </label>
                <input
                  id="category"
                  type="text"
                  list="category-options"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100"
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
                    "NSSF",
                    ...galleries.map(g => g.category ? g.category.replace(/\s*\[(swipe|grid)\]/gi, '').trim() : '').filter(c => Boolean(c) && c.toUpperCase() !== 'ABOUT')
                  ])).map(cat => (
                    <option key={cat as string} value={cat as string} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Pick from the list or type your own to creatively group your public portfolio.</p>
              </div>
              )}
              {userEmail === 'ringa.michael@gmail.com' && newCategory.trim() !== '' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Display Layout
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewLayout('swipe')}
                      className={`px-4 py-2 border rounded-lg flex items-center justify-center gap-2 transition-all ${newLayout === 'swipe' ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <GalleryHorizontalEnd className="w-4 h-4" />
                      Swipe (Carousel)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLayout('grid')}
                      className={`px-4 py-2 border rounded-lg flex items-center justify-center gap-2 transition-all ${newLayout === 'grid' ? 'border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Grid (4:6)
                    </button>
                  </div>
                </div>
              )}
              {userEmail === 'ringa.michael@gmail.com' && (
                <div className="mb-6">
                  <label htmlFor="parentGallery" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Parent Collection (Optional — for Sub-Galleries)
                  </label>
                  <select
                    id="parentGallery"
                    value={newParentGalleryId}
                    onChange={(e) => {
                      setNewParentGalleryId(e.target.value);
                      if (e.target.value) {
                        const parent = galleries.find(g => g.id === e.target.value);
                        if (parent?.category) {
                          setNewCategory(parent.category.replace(/\s*\[(swipe|grid)\]/gi, '').trim());
                        }
                      }
                    }}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100 text-sm"
                    disabled={isCreating}
                  >
                    <option value="">None (Top-Level Collection)</option>
                    {galleries
                      .filter(g => g.category && g.category.trim() !== '' && g.category !== 'ABOUT' && !getParentGalleryId(g))
                      .map(g => (
                        <option key={g.id} value={g.id}>
                          Inside: {getCleanGalleryTitle(g)} ({g.category?.replace(/\s*\[(swipe|grid)\]/gi, '')})
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    Select a parent collection (e.g. Editorial) to nest this as a sub-gallery (e.g. Client A, Client B).
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newClientName.trim() || isCreating}
                  className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200/60 dark:border-slate-800 transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-[#0f172a]">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Bulk Update Link Settings</h2>
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                disabled={isUpdatingBulk}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleBulkUpdate} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                   Action
                </label>
                <select 
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as any)}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100"
                    disabled={isUpdatingBulk}
                >
                    <option value="extend">Extend/Modify Download Expiration</option>
                    <option value="enable">Enable Gallery Links</option>
                    <option value="disable">Disable Gallery Links (Hide)</option>
                </select>
              </div>

              {bulkAction === 'extend' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    New Expiration Duration (hours from now)
                    </label>
                    <select
                        value={bulkExpiryHours}
                        onChange={(e) => setBulkExpiryHours(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-100"
                        disabled={isUpdatingBulk}
                    >
                        <option value={1}>1 Hour</option>
                        <option value={12}>12 Hours</option>
                        <option value={24}>24 Hours</option>
                        <option value={48}>48 Hours</option>
                        <option value={168}>1 Week</option>
                        <option value={720}>1 Month</option>
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">This will update all files in the selected galleries to expire in the selected timeframe, reactivating any files that have already expired.</p>
                  </div>
              )}

              {bulkAction !== 'extend' && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 bg-slate-50 dark:bg-slate-800/80 p-4 rounded-lg border border-slate-200/50 dark:border-slate-700/60">
                      You are about to {bulkAction === 'enable' ? <strong>enable</strong> : <strong>disable</strong>} the client links for {selectedGalleries.length} galler{selectedGalleries.length === 1 ? 'y' : 'ies'}.
                  </p>
              )}

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                  disabled={isUpdatingBulk}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBulk}
                  className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Website Settings Modal (Home & Branding + About Page Content) */}
      {(isWebsiteSettingsOpen || isHomeModalOpen || isAboutModalOpen) && userId && (
        <WebsiteSettingsModal 
          userId={userId} 
          initialTab={isAboutModalOpen ? 'about' : websiteSettingsTab}
          onClose={() => {
            setIsWebsiteSettingsOpen(false);
            setIsHomeModalOpen(false);
            setIsAboutModalOpen(false);
          }} 
        />
      )}

      {/* FAQ Manager Modal */}
      {isFaqModalOpen && userId && (
        <FAQManagerModal
          isOpen={isFaqModalOpen}
          userId={userId}
          onClose={() => setIsFaqModalOpen(false)}
        />
      )}

      {/* 1-Click WhatsApp Delivery Share Modal */}
      {selectedWhatsAppGallery && (
        <WhatsAppDeliveryShareModal
          isOpen={!!selectedWhatsAppGallery}
          onClose={() => setSelectedWhatsAppGallery(null)}
          gallery={selectedWhatsAppGallery}
          itemCount={selectedWhatsAppGallery.itemCount}
        />
      )}
    </div>
  );
};
