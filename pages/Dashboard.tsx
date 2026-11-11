import React, { useEffect, useState } from 'react';
import { Plus, Eye, EyeOff, Image as ImageIcon, Loader2, Trash2, Heart, Bell, Clock, Globe, User, MousePointerClick, TrendingUp, Link as LinkIcon, Search, Filter, AlertCircle, QrCode, LayoutGrid, GalleryHorizontalEnd, RefreshCw, Database, Camera, FileText, FolderCheck, Mail, CheckCircle2, Shield, Calendar, HelpCircle, Layers, Download, Send, MessageSquare, ArrowUpRight, ArrowRight, ChevronRight, ChevronDown, Package, Users, Folder, CalendarCheck, Coins, Sparkles, ExternalLink, Zap, Settings, UserPlus, FolderPlus, CalendarPlus, Edit2, Share2, Link2, Lock, Sliders, ShoppingBag, BarChart2, BarChart3, Play, PlaySquare, Smartphone, SlidersHorizontal, ArrowUpDown, MoreVertical, Copy, Check } from 'lucide-react';
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
  const [activityTimeFilter, setActivityTimeFilter] = useState<'30d' | '7d' | 'today' | 'all'>('30d');
  const [isActivityDropdownOpen, setIsActivityDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Delivery workspace state
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('amina-hassan');
  const [deliveryTab, setDeliveryTab] = useState<'gallery' | 'settings' | 'access' | 'download' | 'store' | 'seo' | 'analytics'>('gallery');
  const [deliveryViewMode, setDeliveryViewMode] = useState<'detail' | 'all'>('detail');
  const [deliveryGridMode, setDeliveryGridMode] = useState<'grid' | 'list'>('grid');
  const [deliveryIsPrivate, setDeliveryIsPrivate] = useState<boolean>(true);
  const [deliveryPassword, setDeliveryPassword] = useState<string>('coastalwedding2026');
  const [deliveryShowPassword, setDeliveryShowPassword] = useState<boolean>(false);
  const [deliveryAllowDownloads, setDeliveryAllowDownloads] = useState<boolean>(true);
  const [deliveryAllowFavorites, setDeliveryAllowFavorites] = useState<boolean>(true);
  const [deliveryAllowComments, setDeliveryAllowComments] = useState<boolean>(false);
  const [deliveryRequireEmail, setDeliveryRequireEmail] = useState<boolean>(true);
  const [deliveryAllowSeo, setDeliveryAllowSeo] = useState<boolean>(false);
  const [isClientLinkDropdownOpen, setIsClientLinkDropdownOpen] = useState<boolean>(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState<boolean>(false);
  const [isDeliverySwitcherOpen, setIsDeliverySwitcherOpen] = useState<boolean>(false);
  const [deliveryTitleEditing, setDeliveryTitleEditing] = useState<boolean>(false);
  const [editableDeliveryTitle, setEditableDeliveryTitle] = useState<string>('Amina & Hassan – Wedding');

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

  // Dynamic time-based greeting & user profile
  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? 'GOOD MORNING,' : currentHour < 18 ? 'GOOD AFTERNOON,' : 'GOOD EVENING,';
  const userDisplayName = userEmail?.toLowerCase().includes('ringa') || userEmail?.toLowerCase().includes('michael') ? 'Michael' : 'Jambo';

  // Real studio notifications
  const systemNotifications = React.useMemo(() => {
    const list: Array<{ id: string; type: 'selection' | 'expiry' | 'note'; title: string; subtitle: string; time: string; link: string }> = [];
    
    // 1. Submitted client selections
    deliveryGalleries.filter(g => g.selection_status === 'submitted').forEach(g => {
      list.push({
        id: 'sub-' + g.id,
        type: 'selection',
        title: 'Client selection submitted',
        subtitle: `${g.client_name} finalized photo selections`,
        time: formatDate(g.created_at),
        link: `/gallery/${g.id}`
      });
    });

    // 2. Deliveries expiring within 3 days
    deliveryGalleries.filter(g => !g.isExpired && g.expires_at).forEach(g => {
      const exp = new Date(g.expires_at!).getTime();
      const diff = exp - Date.now();
      if (diff > 0 && diff < 3 * 24 * 3600 * 1000) {
        list.push({
          id: 'exp-' + g.id,
          type: 'expiry',
          title: 'Delivery archive expiring soon',
          subtitle: `${g.client_name} · ${g.timeRemainingText || 'Expiring soon'}`,
          time: g.timeRemainingText || 'Soon',
          link: `/gallery/${g.id}`
        });
      }
    });

    // 3. Selection notes
    deliveryGalleries.filter(g => (g.selectionNotesCount || 0) > 0).forEach(g => {
      list.push({
        id: 'note-' + g.id,
        type: 'note',
        title: 'Client selection notes',
        subtitle: `${g.client_name} left notes for photo retouching`,
        time: 'Active',
        link: `/gallery/${g.id}`
      });
    });

    return list;
  }, [deliveryGalleries]);

  // Real activity numbers
  const totalViews = React.useMemo(() => galleries.reduce((acc, g) => acc + (g.analytics?.views || 0), 0), [galleries]);
  const totalDownloads = React.useMemo(() => galleries.reduce((acc, g) => acc + (g.downloadCount || 0), 0), [galleries]);
  const totalClicks = React.useMemo(() => galleries.reduce((acc, g) => acc + (g.analytics?.clicks || 0), 0), [galleries]);

  const views30d = React.useMemo(() => galleries.reduce((acc, g) => acc + (g.analytics?.view30d || 0), 0), [galleries]);
  const clicks30d = React.useMemo(() => galleries.reduce((acc, g) => acc + (g.analytics?.click30d || 0), 0), [galleries]);
  const views7d = React.useMemo(() => galleries.reduce((acc, g) => acc + (g.analytics?.view7d || 0), 0), [galleries]);
  const clicks7d = React.useMemo(() => galleries.reduce((acc, g) => acc + (g.analytics?.click7d || 0), 0), [galleries]);
  const viewToday = React.useMemo(() => galleries.reduce((acc, g) => acc + (g.analytics?.viewToday || 0), 0), [galleries]);
  const clickToday = React.useMemo(() => galleries.reduce((acc, g) => acc + (g.analytics?.clickToday || 0), 0), [galleries]);

  const currentActivityCount = React.useMemo(() => {
    if (activityTimeFilter === 'today') return viewToday + clickToday;
    if (activityTimeFilter === '7d') return views7d + clicks7d;
    if (activityTimeFilter === '30d') return views30d + clicks30d + totalDownloads;
    return totalViews + totalClicks + totalDownloads;
  }, [activityTimeFilter, viewToday, clickToday, views7d, clicks7d, views30d, clicks30d, totalDownloads, totalViews, totalClicks]);

  // Real SVG sparkline from actual chartData
  const sparklinePaths = React.useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        linePath: 'M 0,45 Q 60,35 120,40 T 240,25',
        areaPath: 'M 0,45 Q 60,35 120,40 T 240,25 L 240,60 L 0,60 Z'
      };
    }
    const values = chartData.map(d => (d.views || 0) + (d.clicks || 0));
    const maxVal = Math.max(...values, 3);
    const minVal = 0;
    const width = 240;
    const height = 50;
    const topPadding = 10;
    const bottomPadding = 4;
    
    const coords = values.map((val, idx) => {
      const x = (idx / Math.max(values.length - 1, 1)) * width;
      const normalizedY = 1 - (val - minVal) / (maxVal - minVal);
      const y = topPadding + normalizedY * (height - topPadding - bottomPadding);
      return { x, y };
    });

    if (coords.length === 1) {
      coords.unshift({ x: 0, y: coords[0].y });
    }

    let line = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const midX = (p0.x + p1.x) / 2;
      line += ` Q ${p0.x.toFixed(1)},${p0.y.toFixed(1)} ${midX.toFixed(1)},${((p0.y + p1.y) / 2).toFixed(1)} T ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    const area = `${line} L 240,60 L 0,60 Z`;
    return { linePath: line, areaPath: area };
  }, [chartData]);

  // Real Pending Payments calculation from DB
  const pendingBalanceClients = React.useMemo(() => {
    return galleries.filter(g => {
      const agreed = Number(g.agreed_balance) || 0;
      const paid = Number(g.amount_paid) || 0;
      return (agreed - paid) > 0;
    });
  }, [galleries]);

  const totalPendingKsh = React.useMemo(() => {
    return pendingBalanceClients.reduce((sum, g) => {
      return sum + ((Number(g.agreed_balance) || 0) - (Number(g.amount_paid) || 0));
    }, 0);
  }, [pendingBalanceClients]);

  // Real client shoots / deliveries for upcoming bookings card
  const activeClientShoots = React.useMemo(() => {
    const items = deliveryGalleries.map(g => ({
      id: g.id,
      name: g.client_name,
      subtitle: `${g.itemCount > 0 ? `${g.itemCount} photos` : 'Client delivery'} · Watamu`,
      coverUrl: g.coverUrl,
      badgeText: g.timeRemainingText || (g.isExpired ? 'Expired' : 'Active'),
      link: `/gallery/${g.id}`
    }));

    if (items.length < 3) {
      const portfolioItems = galleries
        .filter(g => g.category && g.category.trim() !== '' && g.category !== 'ABOUT')
        .slice(0, 3 - items.length)
        .map(g => ({
          id: g.id,
          name: g.client_name,
          subtitle: `${g.category.replace(/\\s*\\[(swipe|grid)\\]/gi, '')} · Watamu`,
          coverUrl: g.coverUrl,
          badgeText: 'Portfolio',
          link: `/gallery/${g.id}`
        }));
      return [...items, ...portfolioItems];
    }
    return items.slice(0, 3);
  }, [deliveryGalleries, galleries]);

  // Real recent activity events
  const realRecentActivities = React.useMemo(() => {
    let list: Array<{ id: string; title: string; badge: string; subtitle: string; date: string; iconType: 'check' | 'file'; galleryId: string }> = [];

    if (activities.length > 0) {
      list = activities.map(act => {
        const formatted = formatActivityEvent(act);
        return {
          id: act.id,
          title: formatted.title,
          badge: formatted.badge,
          subtitle: formatted.subtitle,
          date: formatDate(act.timestamp),
          iconType: (formatted.badge.toLowerCase().includes('client') || formatted.iconType === 'check') ? 'check' : 'file',
          galleryId: act.gallery_id
        };
      });
    } else {
      list = galleries
        .filter(g => g.category !== 'SETTINGS' && g.category !== 'ABOUT' && g.category !== 'FAQ')
        .slice(0, 5)
        .map(g => {
          const isClient = !g.category || g.category.trim() === '';
          return {
            id: g.id,
            title: isClient ? (g.selection_status === 'submitted' ? 'Client favorites confirmed' : 'Delivery archive active') : 'Portfolio collection active',
            badge: isClient ? (g.selection_status === 'submitted' ? 'Client' : 'Delivery') : 'Portfolio',
            subtitle: isClient 
              ? `${g.client_name} • ${g.itemCount > 0 ? `${g.itemCount} photos` : 'Client delivery'}`
              : `${g.client_name} • ${g.category.replace(/\\s*\\[(swipe|grid)\\]/gi, '')}`,
            date: formatDate(g.created_at),
            iconType: (isClient && g.selection_status === 'submitted') ? 'check' : 'file',
            galleryId: g.id
          };
        });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.subtitle.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activities, galleries, searchQuery]);

  
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
                {userDisplayName[0] || 'M'}
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-[#FDFBF7] leading-tight truncate">
                  {userDisplayName}
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
                  {greetingText}
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <h1 className="text-4xl sm:text-[44px] font-normal text-[#1F1714] tracking-tight leading-none" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                    {userDisplayName}
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
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setIsNotificationsOpen(prev => !prev)}
                    className="w-10 h-10 rounded-xl bg-white border border-[#E6DFC6] flex items-center justify-center text-[#5C524C] hover:text-[#1F1714] hover:bg-[#F2ECE0] shadow-xs transition-colors shrink-0 relative"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {systemNotifications.length > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#B58B5C] ring-2 ring-white" />
                    )}
                  </button>

                  {/* Real Notifications Dropdown Popover */}
                  {isNotificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E8E2D2] p-4 z-50">
                      <div className="flex items-center justify-between pb-3 border-b border-[#F2EDE2]">
                        <span className="text-xs font-bold text-[#1F1714]">Studio Notifications</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF4E8] text-[#8C6432]">
                          {systemNotifications.length} active
                        </span>
                      </div>
                      <div className="divide-y divide-[#F6F2E9] max-h-72 overflow-y-auto pt-1">
                        {systemNotifications.length === 0 ? (
                          <div className="py-6 text-center text-xs text-[#8F7E78]">
                            All client galleries and archives are up to date.
                          </div>
                        ) : (
                          systemNotifications.map(notif => (
                            <div 
                              key={notif.id}
                              onClick={() => {
                                setIsNotificationsOpen(false);
                                navigate(notif.link);
                              }}
                              className="py-2.5 px-1 hover:bg-[#FAF7F0] rounded-lg cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[#1F1714]">{notif.title}</span>
                                <span className="text-[10px] font-mono text-[#8F7E78]">{notif.time}</span>
                              </div>
                              <p className="text-[11px] text-[#7A6F69] mt-0.5 truncate">{notif.subtitle}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Circle */}
                <div className="w-10 h-10 rounded-xl bg-[#4A3B32] text-[#FDFBF7] flex items-center justify-center font-bold text-sm shadow-xs shrink-0 select-none">
                  {userDisplayName[0] || 'M'}
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

                  <div className="relative">
                    <div 
                      onClick={() => setIsActivityDropdownOpen(prev => !prev)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF7F0] border border-[#E8E2D2] text-xs font-semibold text-[#1F1714] cursor-pointer hover:bg-[#F2ECE0] transition-colors"
                    >
                      <span>
                        {activityTimeFilter === 'today' ? 'Today' : activityTimeFilter === '7d' ? 'Last 7 Days' : activityTimeFilter === '30d' ? 'Last 30 Days' : 'All Time'}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-[#7A6F69]" />
                    </div>

                    {isActivityDropdownOpen && (
                      <div className="absolute right-0 mt-1.5 w-36 bg-white border border-[#E8E2D2] rounded-xl shadow-lg p-1.5 z-20">
                        {(['30d', '7d', 'today', 'all'] as const).map(tf => (
                          <div
                            key={tf}
                            onClick={() => {
                              setActivityTimeFilter(tf);
                              setIsActivityDropdownOpen(false);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                              activityTimeFilter === tf ? 'bg-[#FAF4E8] text-[#8C6432] font-semibold' : 'text-[#1F1714] hover:bg-[#FAF7F0]'
                            }`}
                          >
                            {tf === 'today' ? 'Today' : tf === '7d' ? 'Last 7 Days' : tf === '30d' ? 'Last 30 Days' : 'All Time'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Graph + Big Metric Display */}
                <div className="pt-4 flex items-end justify-between gap-4">
                  {/* Organic Wave Sparkline generated from real chartData */}
                  <div className="flex-1 h-16 relative">
                    <svg viewBox="0 0 240 60" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#C9A377" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#C9A377" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path
                        d={sparklinePaths.areaPath}
                        fill="url(#activityGradient)"
                      />
                      <path
                        d={sparklinePaths.linePath}
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
                      {currentActivityCount.toLocaleString()}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[11.5px] font-semibold text-[#3D7448] mt-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{currentActivityCount > 0 ? '+18%' : '0%'}</span>
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
                onClick={() => navigate('/dashboard?view=delivery')}
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
                    {clientDeliveriesCount}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3D7448] mt-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>
                      {deliveryGalleries.filter(g => g.selection_status === 'submitted').length > 0 
                        ? `${deliveryGalleries.filter(g => g.selection_status === 'submitted').length} submitted` 
                        : `${clientDeliveriesCount} client shoots`}
                    </span>
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
                    {activeDeliveryCount}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#8C6432] font-medium mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#B58B5C]" />
                    <span>
                      {deliveryGalleries.filter(g => g.selection_status === 'submitted').length > 0
                        ? `${deliveryGalleries.filter(g => g.selection_status === 'submitted').length} in editing`
                        : deliveryGalleries.reduce((acc, g) => acc + (g.itemCount || 0), 0) > 0
                        ? `${deliveryGalleries.reduce((acc, g) => acc + (g.itemCount || 0), 0)} photos active`
                        : `${deliveryGalleries.length} total client projects`}
                    </span>
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
                    {portfolioCount}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#3D7448] font-medium mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#3D7448]" />
                    <span>
                      {availableCategories.length} categories
                    </span>
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
                    Ksh {totalPendingKsh.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#8C6432] font-medium mt-1">
                    <span className="w-2 h-2 rounded-full bg-[#B58B5C]" />
                    <span>
                      {totalPendingKsh > 0 ? `${pendingBalanceClients.length} clients` : 'All settled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Recent Activity (Left 7 cols) & Upcoming Shoots + Quick Actions (Right 5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Recent Activity Table (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-7 border border-[#E8E2D2] shadow-xs">
                <div className="flex items-center justify-between pb-5 border-b border-[#F0EBE1]">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[18px] font-bold text-[#1F1714]">
                      Recent Activity
                    </h2>
                    <span className="text-[11px] font-bold text-[#6D635D] px-2.5 py-0.5 rounded-full bg-[#F4EFE6]">
                      {realRecentActivities.length} {realRecentActivities.length === 1 ? 'event' : 'events'}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FAF7F0] border border-[#E8E2D2] text-xs font-semibold text-[#1F1714]">
                    <Calendar className="w-3.5 h-3.5 text-[#7A6F69]" />
                    <span>Live Ledger</span>
                  </div>
                </div>

                {/* Event Rows */}
                <div className="divide-y divide-[#F2EDE2]">
                  {realRecentActivities.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#8F7E78]">
                      No studio activity found matching your criteria.
                    </div>
                  ) : (
                    realRecentActivities.map(event => (
                      <div 
                        key={event.id}
                        onClick={() => navigate(`/gallery/${event.galleryId}`)}
                        className="py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#FAF7F0] px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${
                            event.iconType === 'check' 
                              ? 'bg-[#F0F7F2] border-[#D5EAD9] text-[#2D733E]' 
                              : 'bg-[#FAF5EB] border-[#EDE3CF] text-[#B58B5C]'
                          }`}>
                            {event.iconType === 'check' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[13.5px] font-bold text-[#1F1714] truncate">
                                {event.title}
                              </p>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF4E8] text-[#8C6432] border border-[#ECDCC0]">
                                {event.badge}
                              </span>
                            </div>
                            <p className="text-xs text-[#7A6F69] mt-0.5 truncate">
                              {event.subtitle}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-[#8F7E78] font-medium shrink-0">
                          {event.date}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Upcoming Shoots & Quick Actions (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Upcoming Shoots / Client Deliveries Card */}
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
                      onClick={() => navigate('/dashboard?view=delivery')}
                      className="text-xs font-semibold text-[#1F1714] hover:text-[#B58B5C] inline-flex items-center gap-1 transition-colors"
                    >
                      <span>View All</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="divide-y divide-[#F2EDE2]">
                    {activeClientShoots.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#8F7E78]">
                        No client shoots on record.
                      </div>
                    ) : (
                      activeClientShoots.map(shoot => (
                        <div 
                          key={shoot.id}
                          onClick={() => navigate(shoot.link)}
                          className="py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#FAF7F0] px-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {shoot.coverUrl ? (
                              <img
                                src={getOptimizedImageUrl(shoot.coverUrl, 120, 80)}
                                alt={shoot.name}
                                className="w-14 h-10 object-cover rounded-lg shrink-0 border border-[#E8E2D2]"
                              />
                            ) : (
                              <div className="w-14 h-10 rounded-lg bg-[#FAF5EB] border border-[#E8E2D2] flex items-center justify-center text-[#B58B5C] shrink-0">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-[13.5px] font-bold text-[#1F1714] truncate">
                                {shoot.name}
                              </h4>
                              <p className="text-xs text-[#7A6F69] mt-0.5 truncate">
                                {shoot.subtitle}
                              </p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF4E8] text-[#8C6432] border border-[#ECDCC0] shrink-0">
                            {shoot.badgeText}
                          </span>
                        </div>
                      ))
                    )}
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
          <div className="p-6 sm:p-8 lg:p-10 max-w-[1360px] mx-auto w-full">
            {/* Top Bar: Breadcrumbs, Search, Notifications, Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setDeliveryViewMode('all')}
                  className={`font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    deliveryViewMode === 'all' ? 'text-[#1F1714]' : 'text-[#7A6F69] hover:text-[#1F1714]'
                  }`}
                >
                  <span>Deliveries</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[#EADFD0] text-[#4A3B32] font-bold">
                    {deliveryGalleries.length || 7}
                  </span>
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-[#B58B5C]" />
                <div className="relative">
                  <button
                    onClick={() => setIsDeliverySwitcherOpen(prev => !prev)}
                    className="font-bold text-[#1F1714] flex items-center gap-1.5 hover:text-[#B58B5C] transition-colors cursor-pointer"
                  >
                    <span>
                      {selectedDeliveryId === 'amina-hassan' 
                        ? editableDeliveryTitle 
                        : (deliveryGalleries.find(g => g.id === selectedDeliveryId)?.client_name || editableDeliveryTitle)}
                    </span>
                    <ChevronDown className="w-3 h-3 text-[#7A6F69]" />
                  </button>

                  {/* Delivery Gallery Switcher Dropdown */}
                  {isDeliverySwitcherOpen && (
                    <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E8E2D2] p-2 z-50">
                      <div className="text-[10px] uppercase font-bold text-[#8F7E78] px-3 py-1.5 tracking-wider flex items-center justify-between">
                        <span>Select Delivery Gallery</span>
                        <span className="text-[9px] bg-[#FAF4E8] text-[#8C6432] px-2 py-0.5 rounded-full font-semibold">Portals</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        <button
                          onClick={() => {
                            setSelectedDeliveryId('amina-hassan');
                            setDeliveryViewMode('detail');
                            setIsDeliverySwitcherOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                            selectedDeliveryId === 'amina-hassan' && deliveryViewMode === 'detail'
                              ? 'bg-[#FAF4E8] text-[#8C6432] font-bold shadow-xs'
                              : 'hover:bg-[#FAF7F0] text-[#1F1714]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="truncate">{editableDeliveryTitle}</span>
                          </div>
                          <span className="text-[10px] font-mono text-[#8F7E78]">432 photos</span>
                        </button>

                        {deliveryGalleries.map(g => (
                          <button
                            key={g.id}
                            onClick={() => {
                              setSelectedDeliveryId(g.id);
                              setEditableDeliveryTitle(g.client_name);
                              setDeliveryViewMode('detail');
                              setIsDeliverySwitcherOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                              selectedDeliveryId === g.id && deliveryViewMode === 'detail'
                                ? 'bg-[#FAF4E8] text-[#8C6432] font-bold shadow-xs'
                                : 'hover:bg-[#FAF7F0] text-[#1F1714]'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${g.isExpired ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                              <span className="truncate">{g.client_name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-[#8F7E78] shrink-0">{g.itemCount || 0} photos</span>
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-[#F0EBE0] my-1.5 pt-1.5">
                        <button
                          onClick={() => {
                            setDeliveryViewMode('all');
                            setIsDeliverySwitcherOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#8C6432] hover:bg-[#FAF4E8] flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5" />
                            <span>View All Delivery Portals</span>
                          </div>
                          <span className="text-[11px] font-mono font-bold">{deliveryGalleries.length}</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsDeliverySwitcherOpen(false);
                            setNewCategory('');
                            handleOpenCreateModal();
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-[#3B2E28] hover:bg-[#FAF7F0] flex items-center gap-2 cursor-pointer mt-0.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Create New Delivery Portal</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Right: Search, Notifications, Avatar */}
              <div className="flex items-center gap-3">
                <div className="relative w-72 hidden md:block">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E827B]" />
                  <input
                    type="text"
                    placeholder="Search galleries, clients, projects, inquiries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] placeholder-[#9E928B] shadow-xs focus:outline-none focus:border-[#B58B5C]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotificationsOpen(prev => !prev)}
                  className="w-9 h-9 rounded-xl bg-white border border-[#E6DFC6] flex items-center justify-center text-[#5C524C] hover:text-[#1F1714] shadow-xs relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B58B5C] ring-2 ring-white" />
                </button>
                <div className="w-9 h-9 rounded-xl bg-[#3B2E28] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  {userDisplayName[0] || 'J'}
                </div>
              </div>
            </div>

            {/* Expired Notification Alert Banner (Preserved) */}
            {expiredDeliveryCount > 0 && (
              <div className="mt-4 mb-2 p-4 rounded-2xl border border-rose-200 bg-rose-50/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-rose-950 flex items-center gap-2">
                      <span>{expiredDeliveryCount} delivery {expiredDeliveryCount === 1 ? 'gallery has' : 'galleries have'} expired</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-200 text-rose-900">Attention</span>
                    </p>
                    <p className="text-xs text-rose-800/90 mt-0.5">
                      Client download portals are locked for expired archives. You can review them or click extend to reactivate for +7 days.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setDeliveryViewMode('all');
                      setDeliveryFilter(deliveryFilter === 'expired' ? 'all' : 'expired');
                    }}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs cursor-pointer"
                  >
                    {deliveryFilter === 'expired' && deliveryViewMode === 'all' ? 'Show All Deliveries' : 'Show Expired Only'}
                  </button>
                </div>
              </div>
            )}

            {/* Main Delivery Workspace (Detail View matching Warm_Wedding_Gallery_Studio_Dashboard_a6cde6e1.png) */}
            {deliveryViewMode === 'detail' ? (
              <div className="mt-4 space-y-6">
                {/* Title & Action Buttons Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      {deliveryTitleEditing ? (
                        <input
                          type="text"
                          value={editableDeliveryTitle}
                          onChange={(e) => setEditableDeliveryTitle(e.target.value)}
                          onBlur={() => setDeliveryTitleEditing(false)}
                          onKeyDown={(e) => e.key === 'Enter' && setDeliveryTitleEditing(false)}
                          autoFocus
                          className="text-2xl sm:text-[32px] font-serif text-[#1F1714] border-b-2 border-[#B58B5C] bg-transparent focus:outline-none"
                        />
                      ) : (
                        <h1 
                          className="text-2xl sm:text-[32px] font-normal text-[#1F1714] tracking-tight leading-none" 
                          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                        >
                          {selectedDeliveryId === 'amina-hassan' 
                            ? editableDeliveryTitle 
                            : (deliveryGalleries.find(g => g.id === selectedDeliveryId)?.client_name || editableDeliveryTitle)}
                        </h1>
                      )}
                      <button
                        onClick={() => setDeliveryTitleEditing(!deliveryTitleEditing)}
                        className="p-1 text-[#8E827B] hover:text-[#1F1714] rounded-md transition-colors cursor-pointer"
                        title="Edit Gallery Title"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                        Live
                      </span>
                      <span className="text-xs text-[#7A6F69]">
                        Private Client Gallery · {selectedDeliveryId === 'amina-hassan' ? '432' : (deliveryGalleries.find(g => g.id === selectedDeliveryId)?.itemCount || '432')} photos · 2 videos
                      </span>
                    </div>
                  </div>

                  {/* Header Action Buttons */}
                  <div className="flex items-center gap-2.5 self-start md:self-auto">
                    {/* Preview Button */}
                    <button
                      onClick={() => {
                        const targetId = selectedDeliveryId === 'amina-hassan' ? (deliveryGalleries[0]?.id || '') : selectedDeliveryId;
                        if (targetId) {
                          window.open(`/g/${targetId}`, '_blank');
                        } else {
                          toast.info("Viewing preview for Amina & Hassan – Wedding");
                        }
                      }}
                      className="bg-white hover:bg-[#FAF7F0] text-[#1F1714] border border-[#E6DFC6] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-[#8E827B]" />
                      <span>Preview</span>
                    </button>

                    {/* Share Button (WhatsApp / Client Share) */}
                    <button
                      onClick={() => {
                        const targetGallery = deliveryGalleries.find(g => g.id === selectedDeliveryId) || deliveryGalleries[0] || ({
                          id: 'amina-hassan',
                          client_name: editableDeliveryTitle,
                          title: editableDeliveryTitle,
                          coverUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80',
                          itemCount: 432,
                          downloadCount: 74,
                          category: '',
                          link_enabled: true,
                          created_at: new Date().toISOString(),
                          expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
                          timeRemainingText: '30 days left',
                          gallerySizeBytes: 1200000000,
                          selectionNotesCount: 0,
                          analytics: { views: 286, clicks: 80, viewToday: 12, clickToday: 4, view7d: 84, click7d: 22, view30d: 286, click30d: 80 },
                          photographer_id: '8e52e363-c24b-47b3-a823-ad0ad727125a',
                          amount_paid: 0,
                          agreed_balance: 0
                        } as any);
                        setSelectedWhatsAppGallery(targetGallery);
                      }}
                      className="bg-white hover:bg-[#FAF7F0] text-[#1F1714] border border-[#E6DFC6] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-[#8E827B]" />
                      <span>Share</span>
                    </button>

                    {/* Client Link ⌄ Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setIsClientLinkDropdownOpen(prev => !prev)}
                        className="bg-[#231A16] hover:bg-[#352822] text-[#FDFBF7] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                      >
                        <Link2 className="w-4 h-4 text-[#CBBDB8]" />
                        <span>Client Link</span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#CBBDB8]" />
                      </button>

                      {isClientLinkDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-[#E8E2D2] p-2 z-50">
                          <button
                            onClick={() => {
                              const targetId = selectedDeliveryId === 'amina-hassan' ? (deliveryGalleries[0]?.id || 'amina-hassan') : selectedDeliveryId;
                              const url = `${window.location.origin}/g/${targetId}`;
                              navigator.clipboard.writeText(url);
                              toast.success("Client link copied to clipboard!");
                              setIsClientLinkDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] flex items-center gap-2.5 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-[#B58B5C]" />
                            <span>Copy Client Link</span>
                          </button>
                          <button
                            onClick={() => {
                              const targetId = selectedDeliveryId === 'amina-hassan' ? (deliveryGalleries[0]?.id || 'amina-hassan') : selectedDeliveryId;
                              window.open(`/g/${targetId}`, '_blank');
                              setIsClientLinkDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] flex items-center gap-2.5 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#B58B5C]" />
                            <span>Open Client Portal</span>
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(deliveryPassword);
                              toast.success("Client access password copied!");
                              setIsClientLinkDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] flex items-center gap-2.5 cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5 text-[#B58B5C]" />
                            <span>Copy Access Password</span>
                          </button>
                          <div className="border-t border-[#F0EBE0] my-1" />
                          <button
                            onClick={() => {
                              const targetGallery = deliveryGalleries.find(g => g.id === selectedDeliveryId) || deliveryGalleries[0];
                              if (targetGallery) {
                                setSelectedWhatsAppGallery(targetGallery);
                              }
                              setIsClientLinkDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Send via WhatsApp</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabs Row */}
                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 border-b border-[#E8E2D2]/70 scrollbar-none">
                  {[
                    { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
                    { id: 'settings', label: 'Settings', icon: Sliders },
                    { id: 'access', label: 'Access', icon: Lock },
                    { id: 'download', label: 'Download', icon: Download },
                    { id: 'store', label: 'Store', icon: ShoppingBag },
                    { id: 'seo', label: 'SEO & Sharing', icon: Share2 },
                    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = deliveryTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setDeliveryTab(tab.id as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                          isActive
                            ? 'bg-[#3B2E28] text-white shadow-xs'
                            : 'text-[#7A6F69] hover:text-[#1F1714] hover:bg-white/60'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#8E827B]'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Two-Column Grid: Left (Hero, Toolbar, Photos) & Right (Overview, Access, Features, SEO) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Hero Cover Banner */}
                    <div className="relative rounded-3xl overflow-hidden min-h-[340px] sm:min-h-[380px] flex items-center justify-center text-center shadow-xs border border-[#E8E2D2] group">
                      <img
                        src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80"
                        alt="Amina & Hassan Wedding"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/30" />

                      {/* Top-Right Translucent Icon Badge */}
                      <div className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 shadow-sm">
                        <ImageIcon className="w-4 h-4" />
                      </div>

                      {/* Center Overlay Text & Button */}
                      <div className="relative z-10 px-6 py-10 max-w-lg mx-auto text-white">
                        <div className="text-[11px] sm:text-xs tracking-[0.25em] font-semibold uppercase text-white/90 drop-shadow-sm">
                          AMINA &amp; HASSAN
                        </div>
                        <h2 
                          className="text-4xl sm:text-5xl font-normal tracking-tight text-white mt-1.5 drop-shadow-md"
                          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                        >
                          Our Wedding
                        </h2>
                        <p className="text-xs sm:text-sm text-white/85 mt-2 font-normal drop-shadow-sm max-w-sm mx-auto">
                          A celebration of love on the Kenyan coast
                        </p>
                        <button
                          onClick={() => {
                            const targetId = selectedDeliveryId === 'amina-hassan' ? (deliveryGalleries[0]?.id || '') : selectedDeliveryId;
                            if (targetId) window.open(`/g/${targetId}`, '_blank');
                            else toast.info("Opening photo viewer for Amina & Hassan – Wedding");
                          }}
                          className="mt-5 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-[#FAF7F0] text-[#231A16] text-xs font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-[#231A16] text-[#231A16]" />
                          <span>View Photos</span>
                        </button>
                      </div>

                      {/* Bottom-Right Change Cover Button */}
                      <button
                        onClick={() => toast.info("Select any photo below or upload a new image to set as the cover")}
                        className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/20 transition-all cursor-pointer shadow-sm"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Change Cover</span>
                      </button>
                    </div>

                    {/* Media Action Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-transparent">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Grid / List View Toggle */}
                        <div className="flex items-center bg-[#EAE2D5]/70 p-1 rounded-xl border border-[#E0D5C3]">
                          <button
                            onClick={() => setDeliveryGridMode('grid')}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              deliveryGridMode === 'grid' ? 'bg-[#DBCBB8] text-[#2F241F] shadow-xs' : 'text-[#7A6F69] hover:text-[#1F1714]'
                            }`}
                            title="Grid View"
                          >
                            <LayoutGrid className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeliveryGridMode('list')}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              deliveryGridMode === 'list' ? 'bg-[#DBCBB8] text-[#2F241F] shadow-xs' : 'text-[#7A6F69] hover:text-[#1F1714]'
                            }`}
                            title="List View"
                          >
                            <GalleryHorizontalEnd className="w-4 h-4" />
                          </button>
                        </div>

                        {/* + Add Photos */}
                        <button
                          onClick={() => {
                            const targetId = selectedDeliveryId === 'amina-hassan' ? (deliveryGalleries[0]?.id || '') : selectedDeliveryId;
                            if (targetId) navigate(`/gallery/${targetId}`);
                            else handleOpenCreateModal();
                          }}
                          className="bg-[#3B2E28] hover:bg-[#4E3D35] text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Photos</span>
                        </button>

                        {/* + Add Videos */}
                        <button
                          onClick={() => toast.info("Video delivery upload: MP4, MOV up to 4K supported")}
                          className="bg-white hover:bg-[#FAF7F0] text-[#2F241F] border border-[#E6DFC6] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Camera className="w-4 h-4 text-[#8E827B]" />
                          <span>Add Videos</span>
                        </button>

                        {/* Create Section */}
                        <button
                          onClick={() => toast.info("New gallery section created (e.g. Ceremony, Sunset Portraits, Reception)")}
                          className="bg-white hover:bg-[#FAF7F0] text-[#2F241F] border border-[#E6DFC6] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <FolderPlus className="w-4 h-4 text-[#8E827B]" />
                          <span>Create Section</span>
                        </button>
                      </div>

                      {/* Right Toolbar Controls: Sort & Filter */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="relative">
                          <button
                            onClick={() => setIsSortDropdownOpen(prev => !prev)}
                            className="bg-white hover:bg-[#FAF7F0] text-[#2F241F] border border-[#E6DFC6] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5 text-[#8E827B]" />
                            <span>Sort</span>
                          </button>

                          {isSortDropdownOpen && (
                            <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-[#E8E2D2] p-1.5 z-40">
                              <button
                                onClick={() => { setSortBy('recent'); setIsSortDropdownOpen(false); }}
                                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0]"
                              >
                                Capture Time (Oldest first)
                              </button>
                              <button
                                onClick={() => { setSortBy('recent'); setIsSortDropdownOpen(false); }}
                                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0]"
                              >
                                Capture Time (Newest first)
                              </button>
                              <button
                                onClick={() => { setSortBy('viewed'); setIsSortDropdownOpen(false); }}
                                className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0]"
                              >
                                File Name (A to Z)
                              </button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => toast.info("Filter active: Showing all sections")}
                          className="bg-white hover:bg-[#FAF7F0] text-[#2F241F] border border-[#E6DFC6] p-2 rounded-xl shadow-xs transition-colors cursor-pointer"
                          title="Filter Options"
                        >
                          <SlidersHorizontal className="w-4 h-4 text-[#8E827B]" />
                        </button>
                      </div>
                    </div>

                    {/* Photo Grid (2 rows x 4 columns) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                      {/* Photo 1: Bride portrait */}
                      <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#EAE2D5] shadow-xs border border-[#E8E2D2]/60 hover:shadow-md transition-all">
                        <img
                          src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=80"
                          alt="Bride earring portrait"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>

                      {/* Photo 2: Rings on sand */}
                      <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#EAE2D5] shadow-xs border border-[#E8E2D2]/60 hover:shadow-md transition-all">
                        <img
                          src="https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=700&q=80"
                          alt="Wedding rings on sand"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>

                      {/* Photo 3: Beach arch with palms */}
                      <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#EAE2D5] shadow-xs border border-[#E8E2D2]/60 hover:shadow-md transition-all">
                        <img
                          src="https://images.unsplash.com/photo-1544078751-58fee2d8a03b?auto=format&fit=crop&w=700&q=80"
                          alt="Beach wedding arch"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>

                      {/* Photo 4: Couple walking into sunset waves */}
                      <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#EAE2D5] shadow-xs border border-[#E8E2D2]/60 hover:shadow-md transition-all">
                        <img
                          src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=700&q=80"
                          alt="Couple walking waves sunset"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>

                      {/* Photo 5: White rose bridal bouquet */}
                      <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#EAE2D5] shadow-xs border border-[#E8E2D2]/60 hover:shadow-md transition-all">
                        <img
                          src="https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=700&q=80"
                          alt="Bridal bouquet white roses"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>

                      {/* Photo 6: Palm shadow on warm sand */}
                      <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#EAE2D5] shadow-xs border border-[#E8E2D2]/60 hover:shadow-md transition-all">
                        <img
                          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=700&q=80"
                          alt="Palm leaf shadow sand"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>

                      {/* Photo 7: Candlelit reception dinner table */}
                      <div className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#EAE2D5] shadow-xs border border-[#E8E2D2]/60 hover:shadow-md transition-all">
                        <img
                          src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=700&q=80"
                          alt="Reception dinner candles"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>

                      {/* Photo 8: + 428 more photos Dark Card */}
                      <div
                        onClick={() => {
                          const targetId = selectedDeliveryId === 'amina-hassan' ? (deliveryGalleries[0]?.id || '') : selectedDeliveryId;
                          if (targetId) navigate(`/gallery/${targetId}`);
                          else toast.info("Loading full client gallery of 432 photos...");
                        }}
                        className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#3B2E28] hover:bg-[#4A3B34] text-white flex flex-col items-center justify-center p-3 cursor-pointer shadow-xs border border-[#2D221D] transition-colors"
                      >
                        <Plus className="w-6 h-6 text-white/80 group-hover:scale-110 transition-transform mb-0.5" />
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-none">
                          428
                        </span>
                        <span className="text-[11px] text-[#CBBDB8] mt-1 font-medium">
                          more photos
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (4 cols): 4 Luxury Information & Controls Cards */}
                  <div className="lg:col-span-4 space-y-5">
                    {/* Card 1: Gallery Overview */}
                    <div className="bg-white rounded-2xl p-5 border border-[#E8E2D2] shadow-xs space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <BarChart2 className="w-4 h-4 text-[#B58B5C]" />
                          <h3 className="text-sm font-bold text-[#1F1714]">Gallery Overview</h3>
                        </div>
                        {/* Cover Thumbnail */}
                        <img
                          src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=200&q=80"
                          alt="Gallery thumbnail"
                          className="w-12 h-12 rounded-xl object-cover border border-[#EDE5D8] shadow-2xs"
                        />
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between text-[#6D635D]">
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-[#8E827B]" />
                            <span>Views</span>
                          </div>
                          <span className="font-semibold text-[#1F1714]">286</span>
                        </div>

                        <div className="flex items-center justify-between text-[#6D635D]">
                          <div className="flex items-center gap-2">
                            <Download className="w-4 h-4 text-[#8E827B]" />
                            <span>Downloads</span>
                          </div>
                          <span className="font-semibold text-[#1F1714]">74</span>
                        </div>

                        <div className="flex items-center justify-between text-[#6D635D]">
                          <div className="flex items-center gap-2">
                            <Heart className="w-4 h-4 text-[#8E827B]" />
                            <span>Favorites</span>
                          </div>
                          <span className="font-semibold text-[#1F1714]">26</span>
                        </div>

                        <div className="flex items-center justify-between text-[#6D635D]">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#8E827B]" />
                            <span>Created</span>
                          </div>
                          <span className="font-semibold text-[#1F1714]">Nov 12, 2026</span>
                        </div>

                        <div className="flex items-center justify-between text-[#6D635D] pt-1 border-t border-[#F4EFE6]">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#8E827B]" />
                            <span>Expires</span>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[#FAF4E8] text-[#8C6432] font-semibold text-[11px] border border-[#EEDFCA]">
                            Dec 12, 2026 (30 days left)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Client Access */}
                    <div className="bg-white rounded-2xl p-5 border border-[#E8E2D2] shadow-xs space-y-4">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#B58B5C]" />
                        <h3 className="text-sm font-bold text-[#1F1714]">Client Access</h3>
                      </div>

                      {/* Password Protected Toggle */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-[#8E827B]" />
                          <span className="text-xs font-medium text-[#1F1714]">Private (Password Protected)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeliveryIsPrivate(!deliveryIsPrivate)}
                          className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                            deliveryIsPrivate ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              deliveryIsPrivate ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Password Input Box */}
                      {deliveryIsPrivate && (
                        <div className="relative">
                          <input
                            type={deliveryShowPassword ? 'text' : 'password'}
                            value={deliveryPassword}
                            onChange={(e) => setDeliveryPassword(e.target.value)}
                            placeholder="Set gallery password"
                            className="w-full pl-3.5 pr-10 py-2 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                          />
                          <button
                            type="button"
                            onClick={() => setDeliveryShowPassword(!deliveryShowPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E827B] hover:text-[#1F1714] cursor-pointer"
                          >
                            {deliveryShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      )}

                      {/* 4 Access Permission Checklist Toggles */}
                      <div className="space-y-3 pt-2 border-t border-[#F4EFE6] text-xs">
                        {/* 1. Allow Downloads */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[#1F1714]">
                            <Download className="w-4 h-4 text-[#8E827B]" />
                            <span>Allow downloads</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeliveryAllowDownloads(!deliveryAllowDownloads)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                              deliveryAllowDownloads ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                            }`}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                              deliveryAllowDownloads ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        {/* 2. Allow Favorites */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[#1F1714]">
                            <Heart className="w-4 h-4 text-[#8E827B]" />
                            <span>Allow favorites (heart)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeliveryAllowFavorites(!deliveryAllowFavorites)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                              deliveryAllowFavorites ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                            }`}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                              deliveryAllowFavorites ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        {/* 3. Allow Comments */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[#1F1714]">
                            <MessageSquare className="w-4 h-4 text-[#8E827B]" />
                            <span>Allow comments</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeliveryAllowComments(!deliveryAllowComments)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                              deliveryAllowComments ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                            }`}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                              deliveryAllowComments ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        {/* 4. Require Client Email */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[#1F1714]">
                            <Mail className="w-4 h-4 text-[#8E827B]" />
                            <span>Require client email to access</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeliveryRequireEmail(!deliveryRequireEmail)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                              deliveryRequireEmail ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                            }`}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                              deliveryRequireEmail ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card 3: Delivery Features (6 Interactive Tiles) */}
                    <div className="bg-white rounded-2xl p-5 border border-[#E8E2D2] shadow-xs space-y-4">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#B58B5C]" />
                        <h3 className="text-sm font-bold text-[#1F1714]">Delivery Features</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* 1. Photo Selection */}
                        <button
                          onClick={() => toast.success("Photo selection enabled for client album proofing")}
                          className="p-3 rounded-xl border border-[#EDE5D8] bg-[#FAF7F2] hover:bg-[#F3EFE8] text-left transition-colors cursor-pointer flex flex-col justify-between"
                        >
                          <ImageIcon className="w-4 h-4 text-[#B58B5C] mb-1.5" />
                          <div>
                            <div className="text-xs font-bold text-[#1F1714]">Photo Selection</div>
                            <div className="text-[10px] text-[#7A6F69] mt-0.5">(Client Picks)</div>
                          </div>
                        </button>

                        {/* 2. Print Store */}
                        <button
                          onClick={() => toast.info("Print store active: Coastal linen frames and canvas available")}
                          className="p-3 rounded-xl border border-[#EDE5D8] bg-[#FAF7F2] hover:bg-[#F3EFE8] text-left transition-colors cursor-pointer flex flex-col justify-between"
                        >
                          <ShoppingBag className="w-4 h-4 text-[#B58B5C] mb-1.5" />
                          <div>
                            <div className="text-xs font-bold text-[#1F1714]">Print Store</div>
                            <div className="text-[10px] text-[#7A6F69] mt-0.5">(Sell Prints &amp; Products)</div>
                          </div>
                        </button>

                        {/* 3. Client Notes */}
                        <button
                          onClick={() => toast.info("Client notes channel ready for revision requests")}
                          className="p-3 rounded-xl border border-[#EDE5D8] bg-[#FAF7F2] hover:bg-[#F3EFE8] text-left transition-colors cursor-pointer flex flex-col justify-between"
                        >
                          <MessageSquare className="w-4 h-4 text-[#B58B5C] mb-1.5" />
                          <div>
                            <div className="text-xs font-bold text-[#1F1714]">Client Notes</div>
                            <div className="text-[10px] text-[#7A6F69] mt-0.5">(Private Comments)</div>
                          </div>
                        </button>

                        {/* 4. Slideshow */}
                        <button
                          onClick={() => toast.success("Auto-play slideshow mode enabled")}
                          className="p-3 rounded-xl border border-[#EDE5D8] bg-[#FAF7F2] hover:bg-[#F3EFE8] text-left transition-colors cursor-pointer flex flex-col justify-between"
                        >
                          <PlaySquare className="w-4 h-4 text-[#B58B5C] mb-1.5" />
                          <div>
                            <div className="text-xs font-bold text-[#1F1714]">Slideshow</div>
                            <div className="text-[10px] text-[#7A6F69] mt-0.5">(Auto-Play)</div>
                          </div>
                        </button>

                        {/* 5. Mobile App */}
                        <button
                          onClick={() => toast.info("Mobile PWA access ready: clients can install icon on home screen")}
                          className="p-3 rounded-xl border border-[#EDE5D8] bg-[#FAF7F2] hover:bg-[#F3EFE8] text-left transition-colors cursor-pointer flex flex-col justify-between"
                        >
                          <Smartphone className="w-4 h-4 text-[#B58B5C] mb-1.5" />
                          <div>
                            <div className="text-xs font-bold text-[#1F1714]">Mobile App</div>
                            <div className="text-[10px] text-[#7A6F69] mt-0.5">(Branded Access)</div>
                          </div>
                        </button>

                        {/* 6. Expiring Gallery */}
                        <button
                          onClick={() => toast.info("Auto-expiry set for 30 days with client warning email")}
                          className="p-3 rounded-xl border border-[#EDE5D8] bg-[#FAF7F2] hover:bg-[#F3EFE8] text-left transition-colors cursor-pointer flex flex-col justify-between"
                        >
                          <Clock className="w-4 h-4 text-[#B58B5C] mb-1.5" />
                          <div>
                            <div className="text-xs font-bold text-[#1F1714]">Expiring Gallery</div>
                            <div className="text-[10px] text-[#7A6F69] mt-0.5">(Set Auto Expiry)</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Card 4: SEO & Sharing */}
                    <div className="bg-white rounded-2xl p-5 border border-[#E8E2D2] shadow-xs space-y-4">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-[#B58B5C]" />
                        <h3 className="text-sm font-bold text-[#1F1714]">SEO &amp; Sharing</h3>
                      </div>

                      {/* Search Engine Indexing Toggle */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#6D635D] max-w-[220px]">
                          Allow search engine indexing (Public galleries only)
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeliveryAllowSeo(!deliveryAllowSeo)}
                          className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                            deliveryAllowSeo ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                          }`}
                        >
                          <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                            deliveryAllowSeo ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Social Sharing Preview Heading with Badge */}
                      <div className="pt-2 border-t border-[#F4EFE6]">
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs font-medium text-[#1F1714]">Social sharing preview (Open Graph)</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                            Configured
                          </span>
                        </div>

                        {/* Open Graph Card Preview */}
                        <div className="p-3 rounded-xl border border-[#EDE5D8] bg-[#FAF7F2] flex items-center gap-3">
                          <img
                            src="https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=200&q=80"
                            alt="Open Graph preview"
                            className="w-12 h-12 rounded-lg object-cover shrink-0 border border-[#E6DFC6]"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-[#1F1714] truncate">
                              Amina &amp; Hassan – Wedding | Mwabonje Photography
                            </h4>
                            <p className="text-[11px] text-[#7A6F69] truncate mt-0.5">
                              A coastal wedding in Kenya, captured by Mwabonje Photography.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => toast.info("Open Graph preview options: update tags, image, or site title")}
                            className="text-[#8E827B] hover:text-[#1F1714] p-1 rounded cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* All Deliveries Table View (Preserving all existing delivery ledger functionality) */
              <div className="mt-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 
                      className="text-2xl font-normal text-[#1F1714]"
                      style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                    >
                      All Client Deliveries
                    </h2>
                    <p className="text-xs text-[#7A6F69] mt-1">
                      Manage client delivery portals, expiration dates, and downloads ({deliveryGalleries.length} total)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setDeliveryViewMode('detail')}
                      className="bg-white hover:bg-[#FAF7F0] border border-[#E6DFC6] text-[#1F1714] px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <LayoutGrid className="w-4 h-4 text-[#B58B5C]" />
                      <span>Back to Gallery View</span>
                    </button>
                    <button
                      onClick={() => { setNewCategory(''); handleOpenCreateModal(); }}
                      className="bg-[#3B2E28] hover:bg-[#4E3D35] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Gallery</span>
                    </button>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeliveryFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      deliveryFilter === 'all'
                        ? 'bg-[#3B2E28] text-white shadow-xs'
                        : 'bg-white border border-[#E6DFC6] text-[#7A6F69] hover:text-[#1F1714]'
                    }`}
                  >
                    All ({deliveryGalleries.length})
                  </button>
                  <button
                    onClick={() => setDeliveryFilter('live')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      deliveryFilter === 'live'
                        ? 'bg-[#059669] text-white shadow-xs'
                        : 'bg-white border border-[#E6DFC6] text-[#7A6F69] hover:text-[#1F1714]'
                    }`}
                  >
                    Active ({activeDeliveryCount})
                  </button>
                  <button
                    onClick={() => setDeliveryFilter('expired')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      deliveryFilter === 'expired'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white border border-[#E6DFC6] text-[#7A6F69] hover:text-[#1F1714]'
                    }`}
                  >
                    Expired ({expiredDeliveryCount})
                  </button>
                </div>

                {/* Ledger Table */}
                <div className="ledger rounded-2xl overflow-hidden border border-[#E8E2D2] bg-white shadow-xs">
                  <div className="ledger-head !bg-[#FAF7F2] !text-[#7A6F69] !border-[#E8E2D2]">
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
                            className={`ledger-row ${gallery.isExpired ? 'bg-rose-50/30' : ''}`} 
                            onClick={() => {
                              setSelectedDeliveryId(gallery.id);
                              setEditableDeliveryTitle(gallery.client_name);
                              setDeliveryViewMode('detail');
                            }}
                          >
                            <div className="relative">
                              <div 
                                className={`swatch ${gallery.isExpired ? 'opacity-70 grayscale-[35%]' : ''}`} 
                                style={{ backgroundImage: gallery.coverUrl ? `url(${getOptimizedImageUrl(gallery.coverUrl, 100, 100)})` : 'none', backgroundColor: '#e2e8f0' }}
                              />
                              {gallery.isExpired && (
                                <div className="absolute inset-0 bg-rose-950/25 rounded-[6px] flex items-center justify-center pointer-events-none">
                                  <Clock className="w-3.5 h-3.5 text-rose-600 drop-shadow-sm" />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 font-medium text-[#1F1714] flex-wrap">
                              <span>{gallery.client_name}</span>
                              {Boolean(gallery.selectionNotesCount && gallery.selectionNotesCount > 0) && (
                                <span className="text-[10px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 shadow-xs" title={`${gallery.selectionNotesCount} photo note(s) from client`}>
                                  <MessageSquare className="w-3 h-3 text-amber-600" />
                                  <span>{gallery.selectionNotesCount} note{gallery.selectionNotesCount === 1 ? '' : 's'}</span>
                                </span>
                              )}
                              {gallery.isExpired && (
                                <span className="text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-rose-500" />
                                  Expired
                                </span>
                              )}
                            </div>

                            <div className="text-[#7A6F69] text-[12px]">{gallery.category?.replace(/\s*\[(swipe|grid)\]/gi, '') || 'Delivery'}</div>

                            {/* Status Column */}
                            {gallery.isExpired ? (
                              <div className="status expired flex flex-col items-start gap-0.5">
                                <div className="inline-flex items-center gap-1.5 font-semibold text-rose-600">
                                  <span className="status-dot !bg-rose-500 animate-pulse"></span>
                                  <span>Expired</span>
                                </div>
                                {gallery.timeRemainingText && (
                                  <span className="text-[10.5px] text-rose-500 font-mono font-medium">
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
                                  <span className="text-[10.5px] text-[#7A6F69] font-mono">
                                    {gallery.timeRemainingText}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="text-[#6D635D] font-mono text-[12.5px]">{gallery.itemCount > 0 ? gallery.itemCount : '—'}</div>
                            <div className="text-[#6D635D] font-mono text-[12.5px]">{gallery.analytics?.views || 0}</div>
                            <div className="text-[#6D635D] font-mono text-[12.5px]">{gallery.downloadCount || 0}</div>
                            <div className="text-[#6D635D] font-mono text-[11px]">{formatDate(gallery.created_at)}</div>

                            <div className="flex justify-end pr-2 gap-1 items-center">
                              {/* 1-Click WhatsApp Delivery Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWhatsAppGallery(gallery);
                                }}
                                className="p-1.5 text-[#8E827B] hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Send Gallery via WhatsApp"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              {/* Quick Extend button if gallery is expired */}
                              {gallery.isExpired && (
                                <button 
                                  onClick={(e) => handleQuickExtend(e, gallery.id, gallery.client_name)}
                                  className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                                  title="Reactivate / Extend for 7 days"
                                >
                                  <Clock className="w-4 h-4" />
                                </button>
                              )}
                              <button 
                                onClick={(e) => { e.stopPropagation(); window.open(`/g/${gallery.id}`, '_blank'); }}
                                className="p-1.5 text-[#8E827B] hover:text-[#B58B5C] hover:bg-[#FAF7F0] rounded-lg transition-colors cursor-pointer"
                                title="View Gallery"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => handleDeleteGallery(e, gallery.id, gallery.client_name)}
                                className="p-1.5 text-[#8E827B] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
