import React, { useEffect, useState, useRef } from 'react';
import { Plus, Eye, EyeOff, Image as ImageIcon, Loader2, Trash2, Heart, Bell, Clock, Globe, User, MousePointerClick, TrendingUp, Link as LinkIcon, Search, Filter, AlertCircle, QrCode, LayoutGrid, GalleryHorizontalEnd, RefreshCw, Database, Camera, FileText, FolderCheck, Mail, CheckCircle2, Shield, Calendar, HelpCircle, Layers, Download, Send, MessageSquare, ArrowUpRight, ArrowRight, ChevronRight, ChevronDown, Package, Users, Folder, CalendarCheck, Coins, Sparkles, ExternalLink, Zap, Settings, UserPlus, FolderPlus, CalendarPlus, Edit2, Share2, Link2, Lock, Unlock, Sliders, ShoppingBag, BarChart2, BarChart3, Play, PlaySquare, Smartphone, SlidersHorizontal, ArrowUpDown, MoreVertical, Copy, Check, Star, X, List, Upload, FileDown, CheckSquare, Square, CreditCard } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Gallery, ActivityLog } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getOptimizedImageUrl, formatDate, rewriteUrlToR2, getParentGalleryId, getCleanGalleryTitle, getCleanGalleryDescription } from '../utils/formatters';
import { generateSlug } from '../utils/slug';
import { getApiUrl } from '../utils/api';
import { toast } from 'sonner';
import { useUpload } from '../contexts/UploadContext';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
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

export interface DeliveryFileItem {
  id: string;
  file_url: string;
  file_type?: string;
  file_path?: string;
  title?: string;
  caption?: string;
  download_count?: number;
  created_at?: string;
  expires_at?: string;
  is_selected?: boolean;
  is_edited?: boolean;
  thumbnail_url?: string;
  thumbnail_path?: string;
  client_note?: string;
}

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
  files?: DeliveryFileItem[];
  password?: string;
  subGalleries?: DashboardGallery[];
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
  const [createModalType, setCreateModalType] = useState<'delivery' | 'portfolio'>('delivery');
  const [newAgreedAmount, setNewAgreedAmount] = useState<string>('');
  const [newPaidAmount, setNewPaidAmount] = useState<string>('');
  const [newDeliveryPassword, setNewDeliveryPassword] = useState<string>('');
  const [newDeliveryShowPassword, setNewDeliveryShowPassword] = useState<boolean>(false);
  const [newDeliveryAllowDownloads, setNewDeliveryAllowDownloads] = useState<boolean>(true);
  const [newDeliveryExpiryHours, setNewDeliveryExpiryHours] = useState<number>(168);
  const [newDeliverySelectionLimit, setNewDeliverySelectionLimit] = useState<string>('');
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
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>('');
  const [deliveryTab, setDeliveryTab] = useState<'gallery' | 'settings' | 'access' | 'download' | 'store' | 'seo' | 'analytics'>('gallery');
  const [deliveryViewMode, setDeliveryViewMode] = useState<'detail' | 'all'>('detail');
  const [deliveryGridMode, setDeliveryGridMode] = useState<'grid' | 'list'>('grid');
  const [deliveryIsPrivate, setDeliveryIsPrivate] = useState<boolean>(true);
  const [deliveryPassword, setDeliveryPassword] = useState<string>('');
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
  const [editableDeliveryTitle, setEditableDeliveryTitle] = useState<string>('');

  // In-Dashboard File Upload & Management
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { uploading, progress, activeGalleryId, uploadFiles } = useUpload();
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  // In-Dashboard Section / Sub-Gallery Creation
  const [isCreateSectionModalOpen, setIsCreateSectionModalOpen] = useState<boolean>(false);
  const [newSectionName, setNewSectionName] = useState<string>('');
  const [newSectionDescription, setNewSectionDescription] = useState<string>('');
  const [isCreatingSection, setIsCreatingSection] = useState<boolean>(false);
  const [activeSectionFilter, setActiveSectionFilter] = useState<string>('all');

  // In-Dashboard Cover Photo Selection
  const [isChangeCoverModalOpen, setIsChangeCoverModalOpen] = useState<boolean>(false);

  // In-Dashboard Photo Lightbox & Management Modal
  const [selectedPhotoForDetail, setSelectedPhotoForDetail] = useState<DeliveryFileItem | null>(null);
  const [showAllPhotosInGrid, setShowAllPhotosInGrid] = useState<boolean>(false);
  const [photosFilter, setPhotosFilter] = useState<'all' | 'picks' | 'notes'>('all');
  const [photosSort, setPhotosSort] = useState<'newest' | 'oldest' | 'downloads' | 'name'>('newest');

  // ZIP download state
  const [isZipping, setIsZipping] = useState<boolean>(false);

  // Settings & Payment tab editing states
  const [editShootDate, setEditShootDate] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDeliverySubtitle, setEditDeliverySubtitle] = useState<string>('');
  const [editAgreedBalance, setEditAgreedBalance] = useState<number | ''>('');
  const [editAmountPaid, setEditAmountPaid] = useState<number | ''>('');
  const [editDownloadsBeforeClearing, setEditDownloadsBeforeClearing] = useState<number | ''>('');
  const [editSelectionLimit, setEditSelectionLimit] = useState<number | ''>('');
  const [deliveryExpiryHours, setDeliveryExpiryHours] = useState<number>(168);
  const [editSeoTitle, setEditSeoTitle] = useState<string>('');
  const [editSeoDescription, setEditSeoDescription] = useState<string>('');
  const [isSavingSeo, setIsSavingSeo] = useState<boolean>(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState<boolean>(false);
  const [renameTargetFile, setRenameTargetFile] = useState<DeliveryFileItem | null>(null);
  const [renameBaseName, setRenameBaseName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState<boolean>(false);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [galleryToDelete, setGalleryToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingGalleryId, setDeletingGalleryId] = useState<string | null>(null);

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

          // Get all media files for this gallery (use * so optional columns never trigger PostgREST 42703 errors)
          const { data: allFiles, error: filesError } = await supabase
            .from('files')
            .select('*')
            .eq('gallery_id', gallery.id)
            .neq('file_path', 'GALLERY_PASSWORD')
            .order('created_at', { ascending: false });

          if (filesError) console.error("Files query error for gallery", gallery.id, filesError);

          // Get password for delivery gallery if configured
          let galleryPassword = '';
          try {
            const { data: pwRow } = await supabase
              .from('files')
              .select('caption')
              .eq('gallery_id', gallery.id)
              .eq('file_path', 'GALLERY_PASSWORD')
              .maybeSingle();
            if (pwRow?.caption) {
              galleryPassword = pwRow.caption;
            }
          } catch (err) {
            // Non-blocking
          }

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

          // Fetch count of client selection notes & individual selections for delivery galleries
          let selectionNotesCount = 0;
          const selectionsMap: Record<string, { is_selected: boolean; client_note?: string }> = {};
          if (!isPortfolioGal) {
            try {
              const { data: notesData } = await supabase
                .from('selections')
                .select('file_id, client_note')
                .eq('gallery_id', gallery.id);

              if (notesData) {
                notesData.forEach(s => {
                  selectionsMap[s.file_id] = {
                    is_selected: true,
                    client_note: s.client_note || undefined,
                  };
                  if (s.client_note && s.client_note.trim()) {
                    selectionNotesCount++;
                  }
                });
              }
            } catch (err) {
              // Non-blocking
            }
          }

          let parsedSeoTitle = (gallery as any).seo_title || '';
          let parsedSeoDesc = (gallery as any).seo_description || '';
          if (gallery.title && gallery.title.trim().startsWith('{')) {
            try {
              const metaObj = JSON.parse(gallery.title);
              if (!parsedSeoTitle && metaObj.seoTitle) parsedSeoTitle = metaObj.seoTitle;
              if (!parsedSeoDesc && metaObj.seoDescription) parsedSeoDesc = metaObj.seoDescription;
            } catch {}
          }

          return {
            ...gallery,
            seo_title: parsedSeoTitle,
            seo_description: parsedSeoDesc,
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
            files: (allFiles || []).map((f: any) => ({
              id: f.id,
              file_url: f.file_url,
              file_type: f.file_type,
              file_path: f.file_path,
              title: f.title,
              caption: f.caption,
              download_count: f.download_count,
              created_at: f.created_at,
              expires_at: f.expires_at,
              is_selected: Boolean(selectionsMap[f.id]),
              is_edited: Boolean(f.is_edited),
              thumbnail_url: f.thumbnail_url,
              thumbnail_path: f.thumbnail_path,
              client_note: selectionsMap[f.id]?.client_note,
            })),
            password: galleryPassword,
            subGalleries: [] as DashboardGallery[],
          };
        })
      );

      const withSubGalleries: DashboardGallery[] = enrichedGalleries.map((gal) => ({
        ...gal,
        subGalleries: enrichedGalleries.filter((child) => getParentGalleryId(child) === gal.id),
      }));
      
      // Sort galleries
      const sortedGalleries = withSubGalleries.sort((a, b) => {
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

  const handleOpenCreateModal = (mode?: 'delivery' | 'portfolio') => {
    const resolvedMode: 'delivery' | 'portfolio' =
      userEmail !== 'ringa.michael@gmail.com'
        ? 'delivery'
        : mode || (currentView === 'galleries' ? 'portfolio' : 'delivery');

    setCreateModalType(resolvedMode);
    setNewClientName('');
    setNewDescription('');
    setNewParentGalleryId('');
    setNewAgreedAmount('');
    setNewPaidAmount('');
    setNewDeliveryPassword('');
    setNewDeliveryShowPassword(false);
    setNewDeliveryAllowDownloads(true);
    setNewDeliveryExpiryHours(168);
    setNewDeliverySelectionLimit('');

    if (resolvedMode === 'delivery') {
      setNewCategory('');
    } else if (!newCategory || newCategory.trim() === '') {
      setNewCategory('Wedding');
    }
    setIsCreateModalOpen(true);
  };

  const createGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const isDeliveryMode = createModalType === 'delivery' || userEmail !== 'ringa.michael@gmail.com';
    let matchedCategory = isDeliveryMode ? '' : newCategory;
    if (!isDeliveryMode) {
      const existingMatch = galleries.find(g => g.category && g.category.replace(/\s*\[(swipe|grid)\]/gi, '').trim().toLowerCase() === newCategory.replace(/\s*\[(swipe|grid)\]/gi, '').trim().toLowerCase());
      if (existingMatch && existingMatch.category) {
        matchedCategory = existingMatch.category.replace(/\s*\[(swipe|grid)\]/gi, '').trim();
      }
    }
    const baseCategory = matchedCategory.replace(/\s*\[(swipe|grid)\]/gi, '').trim();
    const isPortfolio = !isDeliveryMode && (Boolean(baseCategory !== '' && baseCategory.toLowerCase() !== 'delivery') || Boolean(newParentGalleryId));
    const deliveriesCount = galleries.filter(g => (!g.category || g.category.trim() === '' || g.category.toLowerCase().trim() === 'delivery') && !getParentGalleryId(g)).length;
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

      const cleanClient = newClientName.trim();
      const cleanDesc = newDescription.trim();
      let payloadTitle = `${cleanClient}'s Gallery`;
      if (isPortfolio) {
        payloadTitle = JSON.stringify({
          projectTitle: cleanClient,
          projectDescription: cleanDesc,
          parentGalleryId: newParentGalleryId || null,
        });
      } else if (cleanDesc) {
        payloadTitle = cleanDesc;
      }

      // If user selected a parent gallery, inherit parent category if blank
      let resolvedCategory = isPortfolio ? `${baseCategory || 'Editorial'} [${newLayout}]` : '';
      if (isPortfolio && newParentGalleryId) {
        const parentGal = galleries.find(g => g.id === newParentGalleryId);
        if (parentGal?.category) {
          resolvedCategory = parentGal.category;
        }
      }

      const agreedVal = !isPortfolio && newAgreedAmount.trim() !== '' ? Math.max(0, Number(newAgreedAmount) || 0) : 0;
      const paidVal = !isPortfolio && newPaidAmount.trim() !== '' ? Math.max(0, Number(newPaidAmount) || 0) : 0;
      const selectionModeEnabled = !isPortfolio && !newDeliveryAllowDownloads;
      const selectionLimitVal = !isPortfolio && newDeliverySelectionLimit.trim() !== '' ? Math.max(0, Number(newDeliverySelectionLimit) || 0) : 0;

      const { data, error } = await supabase
        .from('galleries')
        .insert([{
          photographer_id: user.id,
          client_name: cleanClient,
          title: payloadTitle,
          category: resolvedCategory,
          agreed_balance: agreedVal,
          amount_paid: paidVal,
          downloads_before_clearing: 0,
          selection_enabled: selectionModeEnabled,
          selection_limit: selectionLimitVal,
          link_enabled: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Persist chosen expiration hours preference for this gallery
      if (!isPortfolio) {
        try {
          localStorage.setItem(`gallery_expiry_${data.id}`, String(newDeliveryExpiryHours));
        } catch {}
      }

      // Save optional access password immediately for new delivery portals (Supabase + backend API)
      const cleanPass = !isPortfolio ? newDeliveryPassword.trim() : '';
      if (!isPortfolio && cleanPass) {
        try {
          await fetch(`/api/gallery/${data.id}/password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: cleanPass })
          });
        } catch (apiPwErr) {
          console.warn('Backend password endpoint warning:', apiPwErr);
        }
        try {
          await supabase.from('files').insert([{
            gallery_id: data.id,
            file_url: 'PASSWORD_SETTING',
            file_path: 'GALLERY_PASSWORD',
            file_type: 'image',
            caption: cleanPass,
            expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
          }]);
        } catch (pwErr) {
          console.warn('Password row insert warning:', pwErr);
        }
      }

      // Log gallery creation in activity logs (non-blocking)
      try {
        await supabase.from('activity_logs').insert({
          gallery_id: data.id,
          action: isPortfolio
            ? `Published portfolio collection "${cleanClient}"`
            : `Created delivery portal "${cleanClient}"`
        });
      } catch {
        // Ignore logging errors
      }

      toast.success(
        isPortfolio
          ? `Portfolio gallery "${cleanClient}" created successfully!`
          : `Delivery portal "${cleanClient}" is ready! Upload photos or share the link below.`
      );
      setIsCreateModalOpen(false);

      if (!isPortfolio) {
        // Stay right inside the new Deliveries UI and open the newly created portal!
        setSelectedDeliveryId(data.id);
        setEditableDeliveryTitle(data.client_name);
        setEditDeliverySubtitle(cleanDesc);
        setDeliveryViewMode('detail');
        setDeliveryTab('gallery');
        setDeliveryPassword(cleanPass);
        setDeliveryIsPrivate(Boolean(cleanPass));
        setDeliveryAllowDownloads(!selectionModeEnabled);
        setDeliveryAllowFavorites(selectionModeEnabled);
        setDeliveryExpiryHours(newDeliveryExpiryHours);
        setEditSelectionLimit(selectionLimitVal || '');
        setEditAgreedBalance(agreedVal);
        setEditAmountPaid(paidVal);
        setActiveSectionFilter('all');
        setShowAllPhotosInGrid(false);

        await fetchData();
        if (currentView !== 'delivery') {
          navigate(`/dashboard?view=delivery&galleryId=${data.id}`);
        }
      } else {
        navigate(`/gallery/${data.id}`);
      }
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

  const clientDeliveriesCount = galleries.filter(g => {
    const parentId = getParentGalleryId(g);
    const hasExistingParent = Boolean(parentId && galleries.some(p => p.id === parentId));
    return (!g.category || g.category.trim() === '' || g.category.toLowerCase().trim() === 'delivery') && !hasExistingParent;
  }).length;
  const portfolioCount = galleries.filter(g => g.category && g.category.trim() !== '' && g.category !== 'ABOUT').length;

  const deliveryGalleries = React.useMemo(() => {
    return galleries.filter(g => {
      const parentId = getParentGalleryId(g);
      const hasExistingParent = Boolean(parentId && galleries.some(p => p.id === parentId));
      return (!g.category || g.category.trim() === '' || g.category.toLowerCase().trim() === 'delivery') && !hasExistingParent;
    });
  }, [galleries]);

  const expiredDeliveryCount = React.useMemo(() => {
    return deliveryGalleries.filter(g => g.isExpired).length;
  }, [deliveryGalleries]);

  const activeDeliveryCount = React.useMemo(() => {
    return deliveryGalleries.filter(g => !g.isExpired && g.link_enabled).length;
  }, [deliveryGalleries]);

  // Current active delivery gallery dynamically sourced from real database data
  const currentDelivery = React.useMemo(() => {
    if (deliveryGalleries.length === 0) return null;
    if (selectedDeliveryId) {
      const match = deliveryGalleries.find(g => g.id === selectedDeliveryId);
      if (match) return match;
    }
    return deliveryGalleries[0];
  }, [deliveryGalleries, selectedDeliveryId]);

  const galleryIdParam = searchParams.get('galleryId');

  useEffect(() => {
    if (galleryIdParam && deliveryGalleries.some(g => g.id === galleryIdParam)) {
      setSelectedDeliveryId(galleryIdParam);
      setDeliveryViewMode('detail');
    }
  }, [galleryIdParam, deliveryGalleries]);

  useEffect(() => {
    if (currentDelivery) {
      if (!selectedDeliveryId) {
        setSelectedDeliveryId(currentDelivery.id);
      }
      setDeliveryPassword(currentDelivery.password || '');
      setDeliveryIsPrivate(Boolean(currentDelivery.password));
      setDeliveryAllowDownloads(!currentDelivery.selection_enabled);
      setDeliveryAllowFavorites(Boolean(currentDelivery.selection_enabled));
      setEditableDeliveryTitle(currentDelivery.client_name);
      setEditDeliverySubtitle(getCleanGalleryDescription(currentDelivery));
      setEditAgreedBalance(currentDelivery.agreed_balance ?? 0);
      setEditAmountPaid(currentDelivery.amount_paid ?? 0);
      setEditDownloadsBeforeClearing(currentDelivery.downloads_before_clearing ?? 0);
      setEditSelectionLimit(currentDelivery.selection_limit || '');
      setEditSeoTitle(currentDelivery.seo_title || '');
      setEditSeoDescription(currentDelivery.seo_description || '');
      setSelectedPhotoIds([]);
      setActiveSectionFilter('all');

      try {
        const savedExp = localStorage.getItem(`gallery_expiry_${currentDelivery.id}`);
        setDeliveryExpiryHours(savedExp ? parseFloat(savedExp) : 168);
      } catch {
        setDeliveryExpiryHours(168);
      }
    }
  }, [currentDelivery?.id]);

  const handleExpiryHoursChange = (hours: number) => {
    setDeliveryExpiryHours(hours);
    if (currentDelivery?.id) {
      try {
        localStorage.setItem(`gallery_expiry_${currentDelivery.id}`, String(hours));
      } catch {}
    }
  };

  const handleSaveDeliveryTitle = async () => {
    setDeliveryTitleEditing(false);
    if (!currentDelivery || !editableDeliveryTitle.trim() || editableDeliveryTitle.trim() === currentDelivery.client_name) return;
    try {
      const { error } = await supabase
        .from('galleries')
        .update({ client_name: editableDeliveryTitle.trim() })
        .eq('id', currentDelivery.id);
      if (error) throw error;
      toast.success('Gallery title updated');
      fetchData();
    } catch (err) {
      console.error('Failed to update gallery title:', err);
      toast.error('Failed to update gallery title');
    }
  };

  const handleSaveDeliveryPassword = async (newPass: string) => {
    if (!currentDelivery) return;
    try {
      const cleanPass = newPass.trim();

      // Sync with backend password store first
      try {
        await fetch(`/api/gallery/${currentDelivery.id}/password`, {
          method: cleanPass ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: cleanPass ? JSON.stringify({ password: cleanPass }) : undefined
        });
      } catch (apiErr) {
        console.warn("Backend password endpoint warning:", apiErr);
      }

      if (!cleanPass) {
        await supabase
          .from('files')
          .delete()
          .eq('gallery_id', currentDelivery.id)
          .eq('file_path', 'GALLERY_PASSWORD');
        setDeliveryPassword('');
        setDeliveryIsPrivate(false);
        toast.success("Password protection removed (portal is open via link)");
        await fetchData();
        return;
      }

      const { data: existing } = await supabase
        .from('files')
        .select('id')
        .eq('gallery_id', currentDelivery.id)
        .eq('file_path', 'GALLERY_PASSWORD')
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('files')
          .update({ caption: cleanPass })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('files')
          .insert([{
            gallery_id: currentDelivery.id,
            file_url: 'PASSWORD_SETTING',
            file_path: 'GALLERY_PASSWORD',
            file_type: 'image',
            caption: cleanPass,
            expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
          }]);
      }
      setDeliveryPassword(cleanPass);
      setDeliveryIsPrivate(true);
      toast.success("Access password saved");
      await fetchData();
    } catch (err) {
      console.error("Error saving password:", err);
      toast.error("Failed to update password");
    }
  };

  const handleToggleDeliveryPrivacy = async () => {
    if (!currentDelivery) return;
    if (deliveryIsPrivate) {
      // Turning OFF password protection: clear stored password immediately if one was set
      if (currentDelivery.password || deliveryPassword.trim()) {
        await handleSaveDeliveryPassword('');
      } else {
        setDeliveryIsPrivate(false);
      }
    } else {
      setDeliveryIsPrivate(true);
    }
  };

  const handleGenerateDeliveryPassword = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setDeliveryPassword(pass);
    setDeliveryIsPrivate(true);
    await handleSaveDeliveryPassword(pass);
  };

  const handleToggleLinkEnabled = async () => {
    if (!currentDelivery) return;
    try {
      const nextStatus = !currentDelivery.link_enabled;
      const updatePayload: any = { link_enabled: nextStatus };

      if (nextStatus && currentDelivery.selection_status === 'submitted') {
        if (window.confirm("The client has already submitted their selection. Do you also want to reopen the selection allowing them to edit/add their selections?")) {
          updatePayload.selection_status = 'pending';
        }
      }

      const { error } = await supabase
        .from('galleries')
        .update(updatePayload)
        .eq('id', currentDelivery.id);
      if (error) throw error;

      toast.success(nextStatus ? 'Client portal link is now Live' : 'Client portal link is now Hidden');
      await fetchData();
    } catch (err: any) {
      console.error('Error toggling portal link:', err);
      toast.error('Failed to update portal status: ' + (err?.message || 'Error'));
    }
  };

  const handleReopenSelection = async () => {
    if (!currentDelivery) return;
    try {
      const { error } = await supabase
        .from('galleries')
        .update({ selection_status: 'pending', link_enabled: true })
        .eq('id', currentDelivery.id);
      if (error) throw error;
      toast.success('Client selection reopened — client can now update their picks');
      await fetchData();
    } catch (err: any) {
      console.error('Error reopening selection:', err);
      toast.error('Failed to reopen selection');
    }
  };

  const handleToggleSelectionMode = async (enableSelection: boolean) => {
    if (!currentDelivery) return;
    setDeliveryAllowFavorites(enableSelection);
    setDeliveryAllowDownloads(!enableSelection);
    try {
      const { error } = await supabase
        .from('galleries')
        .update({ selection_enabled: enableSelection })
        .eq('id', currentDelivery.id);
      if (error) throw error;
      toast.success(
        enableSelection
          ? 'Client Selection Mode enabled (clients can heart/pick photos)'
          : 'Direct Download Mode enabled (clients can download unlocked photos)'
      );
      await fetchData();
    } catch (err: any) {
      console.error('Error toggling selection mode:', err);
      toast.error('Failed to update selection mode');
    }
  };

  const handleUpdateSelectionLimit = async (limitVal: number) => {
    if (!currentDelivery) return;
    try {
      const { error } = await supabase
        .from('galleries')
        .update({ selection_limit: limitVal })
        .eq('id', currentDelivery.id);
      if (error) throw error;
      toast.success(limitVal > 0 ? `Agreed photo limit set to ${limitVal}` : 'Photo limit set to Unlimited');
      await fetchData();
    } catch (err: any) {
      console.error('Error updating selection limit:', err);
      toast.error('Failed to update agreed photo limit');
    }
  };

  const handleSaveSeoInfo = async () => {
    if (!currentDelivery) return;
    setIsSavingSeo(true);
    try {
      const seoTitleVal = editSeoTitle.trim();
      const seoDescVal = editSeoDescription.trim();

      // Try updating dedicated SEO columns first (if present in DB schema)
      const { error: colErr } = await supabase
        .from('galleries')
        .update({
          seo_title: seoTitleVal,
          seo_description: seoDescVal,
        })
        .eq('id', currentDelivery.id);

      if (colErr) {
        // Fallback: persist SEO metadata inside JSON `title` column without losing existing title/description
        let meta: Record<string, any> = {
          projectTitle: getCleanGalleryTitle(currentDelivery),
          projectDescription: getCleanGalleryDescription(currentDelivery),
          parentGalleryId: getParentGalleryId(currentDelivery) || null,
        };
        if (currentDelivery.title && currentDelivery.title.trim().startsWith('{')) {
          try {
            meta = { ...meta, ...JSON.parse(currentDelivery.title) };
          } catch {}
        }
        meta.seoTitle = seoTitleVal;
        meta.seoDescription = seoDescVal;

        const { error: jsonErr } = await supabase
          .from('galleries')
          .update({ title: JSON.stringify(meta) })
          .eq('id', currentDelivery.id);
        if (jsonErr) throw jsonErr;
      }

      toast.success('SEO & Open Graph metadata saved');
      await fetchData();
    } catch (err: any) {
      console.error('Failed to save SEO info:', err);
      toast.error('Failed to save SEO settings');
    } finally {
      setIsSavingSeo(false);
    }
  };

  const handleApplyCustomExpiration = async (hoursToApply = deliveryExpiryHours) => {
    if (!currentDelivery) return;
    const allDeliveryFiles = [
      ...(currentDelivery.files || []),
      ...((currentDelivery.subGalleries || []).flatMap(s => s.files || []))
    ];
    if (allDeliveryFiles.length === 0) {
      toast.info('Upload files first — new uploads will automatically use this expiration');
      return;
    }

    const targetIds = [currentDelivery.id, ...(currentDelivery.subGalleries || []).map(s => s.id)];
    const newExpiry = new Date();
    newExpiry.setTime(newExpiry.getTime() + hoursToApply * 60 * 60 * 1000);
    const formattedTime = newExpiry.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

    if (!window.confirm(`Update expiration for all ${allDeliveryFiles.length} files?\n\nThey will expire ${hoursToApply >= 87600 ? 'never (archive)' : `in ${hoursToApply} hours (approx ${formattedTime})`}.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('files')
        .update({ expires_at: newExpiry.toISOString() })
        .in('gallery_id', targetIds)
        .neq('file_path', 'GALLERY_PASSWORD');
      if (error) throw error;

      await supabase
        .from('galleries')
        .update({ link_enabled: true })
        .in('id', targetIds);

      try {
        await supabase.from('activity_logs').insert({
          gallery_id: currentDelivery.id,
          action: `Extended expiration for ${allDeliveryFiles.length} files by ${hoursToApply} hours`
        });
      } catch {}

      toast.success(`Updated expiration for ${allDeliveryFiles.length} files!`);
      await fetchData();
    } catch (err: any) {
      console.error('Error applying expiration:', err);
      toast.error('Failed to update expiration');
    }
  };

  const handleExportSelectionsCSV = () => {
    if (!currentDelivery) return;
    const allFiles = [
      ...(currentDelivery.files || []),
      ...((currentDelivery.subGalleries || []).flatMap(s => s.files || []))
    ];
    if (allFiles.length === 0) {
      toast.error('No files in this gallery to export');
      return;
    }

    const selectedList = allFiles.filter(f => f.is_selected);
    const limit = currentDelivery.selection_limit || 0;
    const rows = [
      ['File Name', 'Client Selected', 'Main Selection', 'Extra Selection', 'Client Note', 'Edited', 'Downloads'],
      ...allFiles.map((f) => {
        const selIdx = selectedList.findIndex(sf => sf.id === f.id);
        const isSel = selIdx !== -1;
        const isExtra = isSel && limit > 0 && selIdx >= limit;
        const isMain = isSel && !isExtra;
        return [
          f.title || f.file_path?.split('/').pop() || f.file_url.split('/').pop() || 'file',
          isSel ? 'Yes' : 'No',
          isMain ? 'Yes' : 'No',
          isExtra ? 'Yes' : 'No',
          f.client_note || '',
          f.is_edited ? 'Yes' : 'No',
          f.download_count || 0
        ];
      })
    ];

    const csvContent = rows
      .map(row => row.map(item => `"${String(item).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${(currentDelivery.client_name || 'gallery').replace(/\s+/g, '_')}_selections.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Selections CSV exported!');
  };

  const filterDuplicateDeliveryFiles = (filesList: File[], existingFiles: DeliveryFileItem[]) => {
    const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9.\_-]/g, '_');
    const unique: File[] = [];
    let skipped = 0;

    filesList.forEach((f) => {
      const sanitized = sanitizeName(f.name);
      const dup = existingFiles.some((ef) => {
        const efName = ef.title || ef.file_path?.split('/').pop();
        return efName === sanitized;
      });
      if (dup) skipped++;
      else unique.push(f);
    });

    if (skipped > 0) {
      if (unique.length === 0) {
        toast.error('All selected files have already been uploaded.');
      } else {
        toast.info(`${skipped} duplicate file(s) skipped.`);
      }
    }
    return unique;
  };

  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>, isVideo = false) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !currentDelivery) return;
    const targetGalleryId = activeSectionFilter !== 'all' ? activeSectionFilter : currentDelivery.id;
    const targetSection = currentDelivery.subGalleries?.find(s => s.id === activeSectionFilter);
    const existingFiles = targetSection ? (targetSection.files || []) : (currentDelivery.files || []);
    const filesArray = filterDuplicateDeliveryFiles(Array.from(fileList), existingFiles);
    if (filesArray.length === 0) {
      if (e.target) e.target.value = '';
      return;
    }
    try {
      const targetName = targetSection
        ? `${currentDelivery.client_name} · ${getCleanGalleryTitle(targetSection)}`
        : currentDelivery.client_name;
      toast.info(`Uploading ${filesArray.length} ${isVideo ? 'video(s)' : 'photo(s)'} to ${targetName}...`);
      await uploadFiles(targetGalleryId, filesArray, deliveryExpiryHours || 168);
      toast.success(`${filesArray.length} file(s) uploaded successfully!`);
      await fetchData();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Upload failed: " + (err.message || 'Error'));
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim() || !currentDelivery) return;
    setIsCreatingSection(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User session not found");
        return;
      }
      const payload = JSON.stringify({
        projectTitle: newSectionName.trim(),
        projectDescription: newSectionDescription.trim(),
        parentGalleryId: currentDelivery.id,
      });
      const { data: newSection, error } = await supabase
        .from('galleries')
        .insert([{
          photographer_id: user.id,
          client_name: `${currentDelivery.client_name} – ${newSectionName.trim()}`,
          title: payload,
          category: '',
          agreed_balance: 0,
          amount_paid: 0,
          link_enabled: true
        }])
        .select()
        .single();
      if (error) throw error;
      toast.success(`Section "${newSectionName}" created! Select it below to upload directly into it.`);
      setNewSectionName('');
      setNewSectionDescription('');
      setIsCreateSectionModalOpen(false);
      await fetchData();
      if (newSection?.id) {
        setActiveSectionFilter(newSection.id);
      }
    } catch (err: any) {
      console.error("Error creating section:", err);
      toast.error("Failed to create section: " + (err.message || 'Error'));
    } finally {
      setIsCreatingSection(false);
    }
  };

  const handleSetCoverPhoto = async (file: DeliveryFileItem) => {
    if (!currentDelivery || !file?.id) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('files')
        .update({ created_at: now })
        .eq('id', file.id);
      if (error) throw error;
      toast.success("Gallery cover photo updated!");
      setIsChangeCoverModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update cover photo");
    }
  };

  const handleToggleSingleEdited = async (file: DeliveryFileItem) => {
    try {
      const nextEdited = !file.is_edited;
      const { error } = await supabase
        .from('files')
        .update({ is_edited: nextEdited })
        .eq('id', file.id);
      if (error) throw error;
      toast.success(nextEdited ? 'Marked as Edited' : 'Unmarked Edited status');
      if (selectedPhotoForDetail?.id === file.id) {
        setSelectedPhotoForDetail({ ...selectedPhotoForDetail, is_edited: nextEdited });
      }
      await fetchData();
    } catch (err: any) {
      console.error('Toggle edited failed:', err);
      toast.error('Failed to update edited status');
    }
  };

  const handleBulkToggleEdited = async (markAsEdited: boolean) => {
    if (selectedPhotoIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_edited: markAsEdited })
        .in('id', selectedPhotoIds);
      if (error) throw error;
      toast.success(`${selectedPhotoIds.length} photo(s) ${markAsEdited ? 'marked as Edited' : 'unmarked'}`);
      setSelectedPhotoIds([]);
      await fetchData();
    } catch (err: any) {
      console.error('Bulk edit failed:', err);
      toast.error('Failed to update edited status');
    }
  };

  const handleOpenRenameModal = (singleFile?: DeliveryFileItem) => {
    if (singleFile) {
      setRenameTargetFile(singleFile);
      const currentName = singleFile.title || singleFile.file_path?.split('/').pop() || singleFile.file_url.split('/').pop() || '';
      const noExt = currentName.includes('.') ? currentName.substring(0, currentName.lastIndexOf('.')) : currentName;
      setRenameBaseName(noExt);
      setIsRenameModalOpen(true);
      return;
    }
    if (selectedPhotoIds.length === 0 || !currentDelivery) return;
    setRenameTargetFile(null);
    if (selectedPhotoIds.length === 1) {
      const allFiles = [...(currentDelivery.files || []), ...((currentDelivery.subGalleries || []).flatMap(s => s.files || []))];
      const f = allFiles.find(x => x.id === selectedPhotoIds[0]);
      const currentName = f?.title || f?.file_path?.split('/').pop() || f?.file_url.split('/').pop() || '';
      const noExt = currentName.includes('.') ? currentName.substring(0, currentName.lastIndexOf('.')) : currentName;
      setRenameBaseName(noExt);
    } else {
      setRenameBaseName(getCleanGalleryTitle(currentDelivery));
    }
    setIsRenameModalOpen(true);
  };

  const confirmRenamePhotos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDelivery || !renameBaseName.trim()) return;
    const allFiles = [...(currentDelivery.files || []), ...((currentDelivery.subGalleries || []).flatMap(s => s.files || []))];
    const targetFiles = renameTargetFile ? [renameTargetFile] : allFiles.filter(f => selectedPhotoIds.includes(f.id));
    if (targetFiles.length === 0) return;

    setIsRenaming(true);
    try {
      const updates = targetFiles.map((f, i) => {
        const oldName = f.title || f.file_path?.split('/').pop() || f.file_url.split('/').pop() || '';
        const ext = oldName.includes('.') ? oldName.substring(oldName.lastIndexOf('.')) : '';
        let stripped = renameBaseName.trim();
        if (stripped.includes('.')) stripped = stripped.substring(0, stripped.lastIndexOf('.'));
        const seq = String(i + 1).padStart(3, '0');
        const newName = targetFiles.length === 1 ? `${stripped}${ext}` : `${stripped}_${seq}${ext}`;
        return { id: f.id, title: newName };
      });

      for (const upd of updates) {
        const { error } = await supabase.from('files').update({ title: upd.title }).eq('id', upd.id);
        if (error) throw error;
      }

      toast.success(`Renamed ${updates.length} ${updates.length === 1 ? 'file' : 'files'}`);
      setSelectedPhotoIds([]);
      setRenameTargetFile(null);
      setIsRenameModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Rename error:', err);
      toast.error('Failed to rename files: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsRenaming(false);
    }
  };

  const handleBulkDeletePhotos = async () => {
    if (selectedPhotoIds.length === 0 || !currentDelivery) return;
    if (!window.confirm(`Permanently delete ${selectedPhotoIds.length} selected photo(s) from database & Cloudflare R2?`)) return;
    const allFiles = [...(currentDelivery.files || []), ...((currentDelivery.subGalleries || []).flatMap(s => s.files || []))];
    const filesToDelete = allFiles.filter(f => selectedPhotoIds.includes(f.id));
    try {
      const paths = filesToDelete.map(f => f.file_path).filter(Boolean) as string[];
      if (paths.length > 0) {
        await fetch(getApiUrl('/api/delete-file'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePaths: paths })
        });
      }
      const { error } = await supabase.from('files').delete().in('id', selectedPhotoIds);
      if (error) throw error;
      toast.success(`Deleted ${selectedPhotoIds.length} photo(s)`);
      setSelectedPhotoIds([]);
      await fetchData();
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      toast.error('Failed to delete selected photos');
    }
  };

  const handleBulkDownloadZip = async () => {
    if (selectedPhotoIds.length === 0 || !currentDelivery) return;
    const allFiles = [...(currentDelivery.files || []), ...((currentDelivery.subGalleries || []).flatMap(s => s.files || []))];
    const validFiles = allFiles.filter(f => selectedPhotoIds.includes(f.id) && f.file_url);
    if (validFiles.length === 0) return;
    setIsZipping(true);
    toast.info(`Preparing ZIP archive of ${validFiles.length} selected file(s)...`);
    try {
      const zip = new JSZip();
      for (let i = 0; i < validFiles.length; i++) {
        const f = validFiles[i];
        try {
          const resp = await fetch(rewriteUrlToR2(f.file_url));
          if (resp.ok) {
            const blob = await resp.blob();
            const ext = f.file_type === 'video' ? 'mp4' : 'jpg';
            const fname = f.title || f.file_path?.split('/').pop() || `photo_${String(i + 1).padStart(3, '0')}.${ext}`;
            zip.file(fname, blob);
          }
        } catch {}
      }
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${(currentDelivery.client_name || 'gallery').replace(/\s+/g, '_')}_selected.zip`);
      toast.success('Selected ZIP download started!');
    } catch (err: any) {
      console.error('Bulk zip error:', err);
      toast.error('Failed to create ZIP file');
    } finally {
      setIsZipping(false);
    }
  };

  const handleDeletePhoto = async (file: DeliveryFileItem) => {
    if (!window.confirm("Permanently delete this photo from the gallery?")) return;
    try {
      if (file.file_path) {
        try {
          await fetch(getApiUrl('/api/delete-file'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: file.file_path })
          });
        } catch (e) {
          console.warn("Storage deletion warning:", e);
        }
      }
      const { error } = await supabase.from('files').delete().eq('id', file.id);
      if (error) throw error;
      toast.success("Photo deleted");
      setSelectedPhotoForDetail(null);
      setSelectedPhotoIds(prev => prev.filter(id => id !== file.id));
      await fetchData();
    } catch (err: any) {
      console.error("Delete photo error:", err);
      toast.error("Failed to delete photo: " + (err.message || 'Error'));
    }
  };

  const handleDownloadAllZip = async () => {
    const allFiles = [
      ...(currentDelivery?.files || []),
      ...((currentDelivery?.subGalleries || []).flatMap(s => s.files || []))
    ].filter(f => f.file_url && !f.file_url.includes('PASSWORD_SETTING'));
    if (!currentDelivery || allFiles.length === 0) {
      toast.error("No photos available to download in this gallery");
      return;
    }
    setIsZipping(true);
    toast.info(`Preparing ZIP archive for ${currentDelivery.client_name}...`);
    try {
      const zip = new JSZip();
      const folder = zip.folder((currentDelivery.client_name || 'gallery').replace(/[^\w\s-]/g, '')) || zip;
      let fetched = 0;

      await Promise.all(
        allFiles.map(async (file, index) => {
          try {
            const directUrl = rewriteUrlToR2(file.file_url);
            const resp = await fetch(directUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              const ext = file.file_type === 'video' ? 'mp4' : 'jpg';
              const fileName = file.title || file.file_path?.split('/').pop() || `photo_${String(index + 1).padStart(3, '0')}.${ext}`;
              folder.file(fileName, blob);
              fetched++;
            }
          } catch (e) {
            console.warn("Failed fetching file for zip:", file.file_url, e);
          }
        })
      );

      if (fetched === 0) {
        throw new Error("Could not download any images from storage");
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${(currentDelivery.client_name || 'delivery_gallery').replace(/\s+/g, '_')}.zip`);
      toast.success("ZIP download started!");
    } catch (err: any) {
      console.error("ZIP error:", err);
      toast.error("Failed to generate ZIP: " + (err.message || 'Error'));
    } finally {
      setIsZipping(false);
    }
  };

  const handleUpdatePayment = async (overridePaid?: number) => {
    if (!currentDelivery) return;
    setIsUpdatingPayment(true);
    try {
      const agreed = editAgreedBalance === '' ? 0 : Number(editAgreedBalance) || 0;
      const paid = overridePaid !== undefined ? overridePaid : (editAmountPaid === '' ? 0 : Number(editAmountPaid) || 0);
      const dlLimit = editDownloadsBeforeClearing === '' ? 0 : Number(editDownloadsBeforeClearing) || 0;
      const remaining = Math.max(0, agreed - paid);

      const updates: any = {
        agreed_balance: agreed,
        amount_paid: paid,
        downloads_before_clearing: dlLimit,
      };

      const { error } = await supabase
        .from('galleries')
        .update(updates)
        .eq('id', currentDelivery.id);

      if (error) throw error;

      // Log activity in activity_logs
      try {
        await supabase.from('activity_logs').insert({
          gallery_id: currentDelivery.id,
          action: remaining === 0 && agreed > 0
            ? `Payment cleared: Agreed KES ${agreed.toLocaleString()}, Paid KES ${paid.toLocaleString()} (Balance cleared · High-res downloads unlocked)`
            : `Payment updated: Agreed KES ${agreed.toLocaleString()}, Paid KES ${paid.toLocaleString()} (Remaining KES ${remaining.toLocaleString()})`
        });
      } catch (logErr) {
        console.warn("Activity log failed:", logErr);
      }

      if (remaining === 0) {
        toast.success(agreed === 0 ? "Gallery marked as free / collaboration (high-res downloads unlocked)!" : "Balance cleared! High-res downloads are now unlocked for client.");
      } else {
        toast.success(`Payment saved. Remaining balance: KES ${remaining.toLocaleString()} (downloads locked until cleared).`);
      }

      setEditAmountPaid(paid);
      await fetchData();
    } catch (err: any) {
      console.error('Error updating payment:', err);
      toast.error('Failed to update payment: ' + (err.message || 'Error'));
    } finally {
      setIsUpdatingPayment(false);
    }
  };

  const handleMarkPaidInFull = () => {
    const agreed = editAgreedBalance === '' ? (currentDelivery?.agreed_balance || 0) : Number(editAgreedBalance) || 0;
    setEditAmountPaid(agreed);
    handleUpdatePayment(agreed);
  };

  const handleSaveDeliverySettings = async () => {
    if (!currentDelivery) return;
    setIsSavingSettings(true);
    try {
      const updates: any = {};
      const nextName = editableDeliveryTitle.trim() || currentDelivery.client_name;
      if (editableDeliveryTitle.trim()) updates.client_name = editableDeliveryTitle.trim();
      const nextDesc = editDeliverySubtitle.trim();
      if (currentDelivery.title && currentDelivery.title.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(currentDelivery.title);
          updates.title = JSON.stringify({
            ...parsed,
            projectTitle: nextName,
            projectDescription: nextDesc,
          });
        } catch {
          updates.title = nextDesc || `${nextName}'s Gallery`;
        }
      } else {
        updates.title = nextDesc || `${nextName}'s Gallery`;
      }
      if (editAgreedBalance !== '') updates.agreed_balance = Number(editAgreedBalance) || 0;
      if (editAmountPaid !== '') updates.amount_paid = Number(editAmountPaid) || 0;
      if (editDownloadsBeforeClearing !== '') updates.downloads_before_clearing = Number(editDownloadsBeforeClearing) || 0;
      updates.selection_limit = editSelectionLimit === '' ? 0 : Math.max(0, Number(editSelectionLimit) || 0);
      
      const { error } = await supabase
        .from('galleries')
        .update(updates)
        .eq('id', currentDelivery.id);
      if (error) throw error;

      try {
        await supabase.from('activity_logs').insert({
          gallery_id: currentDelivery.id,
          action: `Updated gallery details`
        });
      } catch {}

      toast.success("Gallery settings saved successfully");
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save settings: " + (err.message || 'Error'));
    } finally {
      setIsSavingSettings(false);
    }
  };


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
        link: `/dashboard?view=delivery&galleryId=${g.id}`
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
          link: `/dashboard?view=delivery&galleryId=${g.id}`
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
        link: `/dashboard?view=delivery&galleryId=${g.id}`
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
      link: `/dashboard?view=delivery&galleryId=${g.id}`
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

  
  const handleDeleteGallery = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setGalleryToDelete({ id, name });
  };

  const confirmDeleteGallery = async () => {
    if (!galleryToDelete) return;
    const { id, name } = galleryToDelete;
    setDeletingGalleryId(id);

    try {
      // Collect main gallery + any child section/sub-galleries
      const childIds = galleries
        .filter((g) => getParentGalleryId(g) === id)
        .map((g) => g.id);
      const targetGalleryIds = [id, ...childIds];

      // 1. Query all files belonging to this gallery (and its sections) from database
      const { data: filesData } = await supabase
        .from('files')
        .select('file_path, file_url')
        .in('gallery_id', targetGalleryIds);

      const extractR2Key = (url?: string | null): string | null => {
        if (!url || !url.startsWith('http')) return null;
        try {
          const parsed = new URL(url);
          if (parsed.hostname.includes('r2.') || parsed.hostname.includes('mwabonje')) {
            return parsed.pathname.replace(/^\/+/, '') || null;
          }
        } catch {
          // ignore invalid URLs
        }
        return null;
      };

      const r2Paths = new Set<string>();
      if (filesData && filesData.length > 0) {
        filesData.forEach((f: any) => {
          if (f.file_path && f.file_path !== 'GALLERY_PASSWORD') r2Paths.add(f.file_path);
          if (f.thumbnail_path) r2Paths.add(f.thumbnail_path);
          const urlKey = extractR2Key(f.file_url);
          if (urlKey) r2Paths.add(urlKey);
          const thumbKey = extractR2Key(f.thumbnail_url);
          if (thumbKey) r2Paths.add(thumbKey);
        });
      }

      if (r2Paths.size > 0) {
        // Deletes the high-res files AND automatically cleans up their watermark copies in Cloudflare R2
        const delFileRes = await fetch(getApiUrl('/api/delete-file'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePaths: Array.from(r2Paths) }),
        });
        if (!delFileRes.ok) {
          console.warn('Cloudflare R2 delete-file warning:', await delFileRes.text().catch(() => ''));
        }
      }

      // 2. Delete all remaining folder objects in Cloudflare R2 (e.g. galleries/[id] or [id])
      for (const targetId of targetGalleryIds) {
        const res1 = await fetch(getApiUrl('/api/delete-folder'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath: `galleries/${targetId}` }),
        });
        if (!res1.ok) {
          console.warn('Cloudflare R2 delete-folder (galleries/) warning:', await res1.text().catch(() => ''));
        }

        const res2 = await fetch(getApiUrl('/api/delete-folder'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath: targetId }),
        });
        if (!res2.ok) {
          console.warn('Cloudflare R2 delete-folder warning:', await res2.text().catch(() => ''));
        }
      }

      // 3. Clean up legacy Supabase storage folder if any
      try {
        for (const targetId of targetGalleryIds) {
          const { data: legacyFiles } = await supabase.storage.from('gallery-files').list(targetId, { limit: 100 });
          if (legacyFiles && legacyFiles.length > 0) {
            await supabase.storage.from('gallery-files').remove(legacyFiles.map((f) => `${targetId}/${f.name}`));
          }
        }
      } catch {
        // ignore legacy cleanup errors
      }

      // 4. Clean up database records in Supabase
      await supabase.from('selections').delete().in('gallery_id', targetGalleryIds);
      await supabase.from('files').delete().in('gallery_id', targetGalleryIds);
      await supabase.from('activity_logs').delete().in('gallery_id', targetGalleryIds);

      const { error } = await supabase.from('galleries').delete().in('id', targetGalleryIds);
      if (error) throw error;

      const remainingGalleries = galleries.filter((g) => !targetGalleryIds.includes(g.id));
      setGalleries(remainingGalleries);

      if (selectedDeliveryId && targetGalleryIds.includes(selectedDeliveryId)) {
        const nextDelivery = remainingGalleries.find((g) => !getParentGalleryId(g) && (!g.category || g.category.trim() === '' || g.category.toLowerCase().trim() === 'delivery'));
        setSelectedDeliveryId(nextDelivery?.id || '');
        setEditableDeliveryTitle(nextDelivery?.client_name || '');
      }

      setGalleryToDelete(null);
      toast.success(`Gallery "${name}" deleted from database and Cloudflare R2`);

      // Refresh dashboard data to recalculate real storage stats and recent activities
      fetchData();
    } catch (err: any) {
      console.error('Failed to delete gallery:', err);
      toast.error(`Failed to delete gallery: ${err?.message || 'Unknown error'}`);
    } finally {
      setDeletingGalleryId(null);
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
                  onClick={() => handleOpenCreateModal('delivery')}
                  className="h-10 px-5 bg-[#231A16] hover:bg-[#150F0D] text-white rounded-xl text-xs font-semibold tracking-wide transition-all shadow-md flex items-center gap-2 active:scale-95 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Delivery</span>
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
                        onClick={() => {
                          const isDeliveryItem = deliveryGalleries.some(g => g.id === event.galleryId);
                          if (isDeliveryItem) {
                            navigate(`/dashboard?view=delivery&galleryId=${event.galleryId}`);
                          } else {
                            navigate(`/gallery/${event.galleryId}`);
                          }
                        }}
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
                      onClick={() => handleOpenCreateModal('delivery')}
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
                <button onClick={() => { setNewCategory('Hospitality'); handleOpenCreateModal('portfolio'); }} className="bg-[#5845EE] text-white px-4 py-2 rounded-md text-[13px] font-medium flex items-center gap-2">
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
            {/* Hidden native file inputs for direct in-page upload */}
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              ref={fileInputRef}
              onChange={(e) => handleUploadMedia(e, false)}
              className="hidden"
            />
            <input
              type="file"
              multiple
              accept="video/*"
              ref={videoInputRef}
              onChange={(e) => handleUploadMedia(e, true)}
              className="hidden"
            />

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
                    {deliveryGalleries.length}
                  </span>
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-[#B58B5C]" />
                <div className="relative">
                  <button
                    onClick={() => setIsDeliverySwitcherOpen(prev => !prev)}
                    className="font-bold text-[#1F1714] flex items-center gap-1.5 hover:text-[#B58B5C] transition-colors cursor-pointer"
                  >
                    <span>{currentDelivery?.client_name || 'Delivery Gallery'}</span>
                    <ChevronDown className="w-3 h-3 text-[#7A6F69]" />
                  </button>

                  {/* Delivery Gallery Switcher Dropdown */}
                  {isDeliverySwitcherOpen && (
                    <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E8E2D2] p-2 z-50">
                      <div className="text-[10px] uppercase font-bold text-[#8F7E78] px-3 py-1.5 tracking-wider flex items-center justify-between">
                        <span>Select Delivery Gallery</span>
                        <span className="text-[9px] bg-[#FAF4E8] text-[#8C6432] px-2 py-0.5 rounded-full font-semibold">
                          {deliveryGalleries.length} Portals
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-1">
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
                              currentDelivery?.id === g.id && deliveryViewMode === 'detail'
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
                            handleOpenCreateModal('delivery');
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
              <div className="mt-3 mb-4 p-4 rounded-2xl border border-rose-200 bg-rose-50/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
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

            {/* ALL DELIVERY GALLERIES CAROUSEL STRIP (Solves "I can't see the other galleries here") */}
            <div className="mb-6 bg-white rounded-2xl border border-[#E8E2D2] p-4 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#B58B5C]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#1F1714]">
                    Client Delivery Portals ({deliveryGalleries.length})
                  </span>
                  <span className="text-[11px] text-[#7A6F69] hidden md:inline">
                    · Click any portal card below to manage it right here
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeliveryViewMode(deliveryViewMode === 'detail' ? 'all' : 'detail')}
                    className="text-[11px] font-semibold text-[#8C6432] hover:text-[#5B3E1F] hover:bg-[#FAF4E8] px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {deliveryViewMode === 'detail' ? (
                      <>
                        <List className="w-3.5 h-3.5" />
                        <span>All Portals Table</span>
                      </>
                    ) : (
                      <>
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Studio Editor</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenCreateModal('delivery')}
                    className="text-[11px] font-semibold bg-[#3B2E28] hover:bg-[#4E3D35] text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Portal</span>
                  </button>
                </div>
              </div>

              {/* Horizontal Scrollable Gallery Cards */}
              <div className="flex items-stretch gap-3 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
                {deliveryGalleries.map((g) => {
                  const isSelected = currentDelivery?.id === g.id && deliveryViewMode === 'detail';
                  const isDeletingThis = deletingGalleryId === g.id;
                  return (
                    <div
                      key={g.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedDeliveryId(g.id);
                        setEditableDeliveryTitle(g.client_name);
                        setDeliveryViewMode('detail');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDeliveryId(g.id);
                          setEditableDeliveryTitle(g.client_name);
                          setDeliveryViewMode('detail');
                        }
                      }}
                      className={`group relative shrink-0 w-60 text-left p-2.5 pr-9 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isSelected
                          ? 'border-[#B58B5C] bg-[#FAF4E8] shadow-sm ring-2 ring-[#B58B5C]/35'
                          : 'border-[#EDE5D8] bg-[#FAF7F2] hover:bg-[#F4EFE6] hover:border-[#D6CCA6]'
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-[#E8E2D2]">
                        {g.coverUrl || g.files?.[0]?.file_url ? (
                          <img
                            src={getOptimizedImageUrl(g.coverUrl || g.files![0].file_url, 120, 120)}
                            alt={g.client_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#B58B5C]">
                            <ImageIcon className="w-5 h-5 opacity-40" />
                          </div>
                        )}
                        <span
                          className={`absolute top-1 right-1 w-2 h-2 rounded-full ring-1 ring-white ${
                            g.isExpired ? 'bg-rose-500' : g.link_enabled ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-xs truncate ${isSelected ? 'font-bold text-[#1F1714]' : 'font-semibold text-[#3B2E28]'}`}>
                          {g.client_name}
                        </h4>
                        <div className="text-[10px] text-[#7A6F69] mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{g.itemCount || g.files?.length || 0} photos</span>
                          {g.isExpired ? (
                            <span className="text-rose-600 font-semibold">· Expired</span>
                          ) : g.timeRemainingText ? (
                            <span className="text-amber-800 font-medium">· {g.timeRemainingText.split(' ')[0]}</span>
                          ) : null}
                        </div>
                      </div>

                      {/* Delete Gallery Button directly on portal card */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteGallery(e, g.id, g.client_name)}
                        disabled={isDeletingThis}
                        title={`Delete "${g.client_name}" from database & Cloudflare R2`}
                        aria-label={`Delete ${g.client_name}`}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-[#8E827B] hover:text-rose-600 hover:bg-rose-50 opacity-75 sm:opacity-60 group-hover:opacity-100 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isDeletingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}

                {/* + Create New Portal Card */}
                <button
                  onClick={() => handleOpenCreateModal('delivery')}
                  className="shrink-0 w-36 border-2 border-dashed border-[#D6CCA6] hover:border-[#B58B5C] bg-[#FAF7F2] hover:bg-[#F3EFE8] rounded-xl p-2.5 flex flex-col items-center justify-center text-center text-[#7A6F69] hover:text-[#1F1714] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#B58B5C] mb-1" />
                  <span className="text-[11px] font-bold">New Delivery</span>
                </button>
              </div>
            </div>

            {/* Active File Upload Progress Banner */}
            {uploading && (activeGalleryId === currentDelivery?.id || currentDelivery?.subGalleries?.some(s => s.id === activeGalleryId)) && (
              <div className="mb-4 p-4 rounded-2xl bg-[#FAF4E8] border border-[#EEDFCA] flex items-center justify-between gap-4 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#8C6432]/10 flex items-center justify-center text-[#8C6432]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#1F1714]">Uploading media to {currentDelivery?.client_name}...</p>
                    <p className="text-[11px] text-[#7A6F69]">Optimizing and watermarking files on Cloudflare R2 ({progress}%)</p>
                  </div>
                </div>
                <div className="w-36 bg-[#EAE2D5] rounded-full h-2.5 overflow-hidden">
                  <div className="bg-[#8C6432] h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Main Delivery Workspace (Detail View matching Warm_Wedding_Gallery_Studio_Dashboard_a6cde6e1.png) */}
            {deliveryViewMode === 'detail' && !currentDelivery ? (
              <div className="bg-white rounded-3xl border border-[#E8E2D2] p-12 text-center shadow-xs">
                <Package className="w-10 h-10 text-[#B58B5C] mx-auto mb-3 opacity-70" />
                <h3 className="text-lg font-bold text-[#1F1714]">No Client Delivery Portals Yet</h3>
                <p className="text-xs text-[#7A6F69] mt-1 max-w-sm mx-auto">
                  Create a new client delivery portal to upload photos, set access passwords, and share links.
                </p>
                <button
                  onClick={() => handleOpenCreateModal('delivery')}
                  className="mt-5 px-5 py-2.5 bg-[#3B2E28] hover:bg-[#4E3D35] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Delivery Portal</span>
                </button>
              </div>
            ) : deliveryViewMode === 'detail' ? (
              <div className="space-y-6">
                {/* Submitted Selection Banner */}
                {currentDelivery?.selection_status === 'submitted' && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-950">Client Selection Submitted</p>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          The client finalized{' '}
                          <strong>
                            {([...(currentDelivery.files || []), ...((currentDelivery.subGalleries || []).flatMap(s => s.files || []))]).filter(f => f.is_selected).length}
                          </strong>{' '}
                          selected photo(s). Review picks or reopen selection if they need to make changes.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryTab('gallery');
                          setPhotosFilter('picks');
                          setShowAllPhotosInGrid(true);
                        }}
                        className="px-3.5 py-2 bg-white hover:bg-emerald-100/60 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        View Selection
                      </button>
                      <button
                        type="button"
                        onClick={handleReopenSelection}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        Reopen Selection
                      </button>
                    </div>
                  </div>
                )}

                {/* Title & Action Buttons Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      {deliveryTitleEditing ? (
                        <input
                          type="text"
                          value={editableDeliveryTitle}
                          onChange={(e) => setEditableDeliveryTitle(e.target.value)}
                          onBlur={handleSaveDeliveryTitle}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveDeliveryTitle()}
                          autoFocus
                          className="text-2xl sm:text-[32px] font-serif text-[#1F1714] border-b-2 border-[#B58B5C] bg-transparent focus:outline-none"
                        />
                      ) : (
                        <h1 
                          className="text-2xl sm:text-[32px] font-normal text-[#1F1714] tracking-tight leading-none" 
                          style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                        >
                          {editableDeliveryTitle || currentDelivery?.client_name || 'Delivery Gallery'}
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
                      {currentDelivery?.isExpired ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                          Expired
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleToggleLinkEnabled}
                          title="Click to toggle Live / Hidden portal visibility"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                            currentDelivery?.link_enabled
                              ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${currentDelivery?.link_enabled ? 'bg-[#059669]' : 'bg-slate-400'}`} />
                          {currentDelivery?.link_enabled ? 'Live' : 'Hidden'}
                        </button>
                      )}
                      {currentDelivery?.selection_status === 'submitted' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          Selection Submitted
                        </span>
                      )}
                      {(() => {
                        const allDeliveryMedia = [
                          ...(currentDelivery?.files || []),
                          ...((currentDelivery?.subGalleries || []).flatMap(s => s.files || []))
                        ];
                        const videoCount = allDeliveryMedia.filter(f => f.file_type === 'video').length;
                        return (
                          <span className="text-xs text-[#7A6F69]">
                            Private Client Gallery · {allDeliveryMedia.length} photos{videoCount > 0 ? ` · ${videoCount} videos` : ''}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Header Action Buttons */}
                  <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                    {/* Preview Button */}
                    <button
                      onClick={() => {
                        if (currentDelivery?.id) {
                          window.open(`/g/${currentDelivery.id}`, '_blank');
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
                        if (currentDelivery) {
                          setSelectedWhatsAppGallery(currentDelivery);
                        }
                      }}
                      className="bg-white hover:bg-[#FAF7F0] text-[#1F1714] border border-[#E6DFC6] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-[#8E827B]" />
                      <span>Share</span>
                    </button>

                    {/* Delete Gallery Button */}
                    {currentDelivery && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteGallery(e, currentDelivery.id, currentDelivery.client_name)}
                        disabled={deletingGalleryId === currentDelivery.id}
                        className="bg-white hover:bg-rose-50 text-rose-600 border border-[#E6DFC6] hover:border-rose-200 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete this gallery from database & Cloudflare R2"
                      >
                        {deletingGalleryId === currentDelivery.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        <span>Delete</span>
                      </button>
                    )}

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

                      {isClientLinkDropdownOpen && currentDelivery && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#E8E2D2] p-2 z-50">
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/g/${currentDelivery.id}`;
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
                              const slug = generateSlug(currentDelivery.client_name);
                              const url = `${window.location.origin}/${slug}`;
                              navigator.clipboard.writeText(url);
                              toast.success(`Vanity link /${slug} copied!`);
                              setIsClientLinkDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] flex items-center gap-2.5 cursor-pointer"
                          >
                            <LinkIcon className="w-3.5 h-3.5 text-[#B58B5C]" />
                            <span>Copy Vanity Link (/{generateSlug(currentDelivery.client_name)})</span>
                          </button>
                          <button
                            onClick={() => {
                              window.open(`/g/${currentDelivery.id}`, '_blank');
                              setIsClientLinkDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] flex items-center gap-2.5 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#B58B5C]" />
                            <span>Open Client Portal</span>
                          </button>
                          <button
                            onClick={() => {
                              window.open(`/g/${currentDelivery.id}/display`, '_blank');
                              setIsClientLinkDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] flex items-center gap-2.5 cursor-pointer"
                          >
                            <PlaySquare className="w-3.5 h-3.5 text-[#B58B5C]" />
                            <span>Open Live Display Mode</span>
                          </button>
                          <button
                            onClick={() => {
                              const pw = deliveryPassword || currentDelivery.password || '';
                              navigator.clipboard.writeText(pw);
                              toast.success(pw ? "Client access password copied!" : "No password set on this portal");
                              setIsClientLinkDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] flex items-center gap-2.5 cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5 text-[#B58B5C]" />
                            <span>Copy Access Password</span>
                          </button>
                          <button
                            onClick={() => {
                              handleExportSelectionsCSV();
                              setIsClientLinkDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] flex items-center gap-2.5 cursor-pointer"
                          >
                            <FileDown className="w-3.5 h-3.5 text-[#B58B5C]" />
                            <span>Export Selections (CSV)</span>
                          </button>
                          <div className="border-t border-[#F0EBE0] my-1" />
                          <button
                            onClick={() => {
                              setSelectedWhatsAppGallery(currentDelivery);
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

                {/* Sub-Tabs under Title (Gallery, Settings, Access, Download, Store, SEO, Analytics) */}
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

                {/* TAB CONTENT: GALLERY TAB */}
                {deliveryTab === 'gallery' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column (8 cols): Hero Banner, Toolbar, Sections, Photo Grid */}
                    <div className="lg:col-span-8 space-y-6">
                      {/* Hero Cover Banner */}
                      <div className="relative rounded-3xl overflow-hidden min-h-[340px] sm:min-h-[380px] flex items-center justify-center text-center shadow-xs border border-[#E8E2D2] group">
                        <img
                          src={currentDelivery?.coverUrl || currentDelivery?.files?.[0]?.file_url || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80'}
                          alt={currentDelivery?.client_name || 'Delivery Banner'}
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
                            {currentDelivery?.client_name ? currentDelivery.client_name.toUpperCase() : 'MWABONJE STUDIO'}
                          </div>
                          <h2 
                            className="text-4xl sm:text-5xl font-normal tracking-tight text-white mt-1.5 drop-shadow-md"
                            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                          >
                            {currentDelivery ? getCleanGalleryTitle(currentDelivery) : 'Our Gallery'}
                          </h2>
                          <p className="text-xs sm:text-sm text-white/85 mt-2 font-normal drop-shadow-sm max-w-sm mx-auto">
                            {(currentDelivery && getCleanGalleryDescription(currentDelivery)) || 'Private client delivery collection · East African Coast'}
                          </p>
                          <button
                            onClick={() => {
                              if (currentDelivery?.id) window.open(`/g/${currentDelivery.id}`, '_blank');
                            }}
                            className="mt-5 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white hover:bg-[#FAF7F0] text-[#231A16] text-xs font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-[#231A16] text-[#231A16]" />
                            <span>View Photos</span>
                          </button>
                        </div>

                        {/* Bottom-Right Change Cover Button (Opens in-dashboard cover picker) */}
                        <button
                          onClick={() => setIsChangeCoverModalOpen(true)}
                          className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/20 transition-all cursor-pointer shadow-sm"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Change Cover</span>
                        </button>
                      </div>

                      {/* Sections Pills (Sub-galleries) */}
                      {currentDelivery?.subGalleries && currentDelivery.subGalleries.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                            <button
                              onClick={() => { setActiveSectionFilter('all'); setSelectedPhotoIds([]); }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                                activeSectionFilter === 'all'
                                  ? 'bg-[#3B2E28] text-white shadow-xs'
                                  : 'bg-white border border-[#E6DFC6] text-[#7A6F69] hover:text-[#1F1714]'
                              }`}
                            >
                              All Photos ({(currentDelivery.files?.length || 0) + currentDelivery.subGalleries.reduce((acc, s) => acc + (s.files?.length || 0), 0)})
                            </button>
                            {currentDelivery.subGalleries.map((sub) => (
                              <button
                                key={sub.id}
                                onClick={() => { setActiveSectionFilter(sub.id); setSelectedPhotoIds([]); }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                                  activeSectionFilter === sub.id
                                    ? 'bg-[#3B2E28] text-white shadow-xs'
                                    : 'bg-white border border-[#E6DFC6] text-[#7A6F69] hover:text-[#1F1714]'
                                }`}
                              >
                                {getCleanGalleryTitle(sub)} ({sub.files?.length || 0})
                              </button>
                            ))}
                            <button
                              onClick={() => setIsCreateSectionModalOpen(true)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#8C6432] bg-[#FAF4E8] hover:bg-[#F3EFE8] border border-[#EEDFCA] transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Section</span>
                            </button>
                          </div>
                          {activeSectionFilter !== 'all' && (() => {
                            const activeSub = currentDelivery.subGalleries.find(s => s.id === activeSectionFilter);
                            if (!activeSub) return null;
                            return (
                              <p className="text-[11px] text-[#8C6432] font-medium">
                                Uploads (+ Add Photos / Videos / Drag &amp; Drop) will be added directly to section <strong>"{getCleanGalleryTitle(activeSub)}"</strong>.
                              </p>
                            );
                          })()}
                        </div>
                      )}

                      {/* Media Action Toolbar (All actions handled in-place!) */}
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

                          {/* + Add Photos (Direct File Dialog right here) */}
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-[#3B2E28] hover:bg-[#4E3D35] text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Photos</span>
                          </button>

                          {/* + Add Videos (Direct File Dialog right here) */}
                          <button
                            onClick={() => videoInputRef.current?.click()}
                            className="bg-white hover:bg-[#FAF7F0] text-[#2F241F] border border-[#E6DFC6] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Camera className="w-4 h-4 text-[#8E827B]" />
                            <span>Add Videos</span>
                          </button>

                          {/* Create Section (In-dashboard modal) */}
                          <button
                            onClick={() => setIsCreateSectionModalOpen(true)}
                            className="bg-white hover:bg-[#FAF7F0] text-[#2F241F] border border-[#E6DFC6] px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <FolderPlus className="w-4 h-4 text-[#8E827B]" />
                            <span>Create Section</span>
                          </button>
                        </div>

                        {/* Right Toolbar Controls: Sort & Filter */}
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {/* Filter Pills (All / Client Picks / Notes) */}
                          <div className="flex items-center bg-white border border-[#E6DFC6] rounded-xl p-0.5 shadow-xs text-xs">
                            <button
                              onClick={() => setPhotosFilter('all')}
                              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                                photosFilter === 'all' ? 'bg-[#FAF4E8] text-[#8C6432] font-bold' : 'text-[#7A6F69] hover:text-[#1F1714]'
                              }`}
                            >
                              All ({(currentDelivery?.files?.length || 0) + ((currentDelivery?.subGalleries || []).reduce((acc, s) => acc + (s.files?.length || 0), 0))})
                            </button>
                            <button
                              onClick={() => setPhotosFilter('picks')}
                              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                                photosFilter === 'picks' ? 'bg-[#FAF4E8] text-[#8C6432] font-bold' : 'text-[#7A6F69] hover:text-[#1F1714]'
                              }`}
                            >
                              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                              <span>Picks</span>
                            </button>
                            <button
                              onClick={() => setPhotosFilter('notes')}
                              className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                                photosFilter === 'notes' ? 'bg-[#FAF4E8] text-[#8C6432] font-bold' : 'text-[#7A6F69] hover:text-[#1F1714]'
                              }`}
                            >
                              <MessageSquare className="w-3 h-3 text-amber-600" />
                              <span>Notes ({currentDelivery?.selectionNotesCount || 0})</span>
                            </button>
                          </div>

                          <div className="relative">
                            <button
                              onClick={() => setIsSortDropdownOpen(prev => !prev)}
                              className="bg-white hover:bg-[#FAF7F0] text-[#2F241F] border border-[#E6DFC6] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5 text-[#8E827B]" />
                              <span>Sort</span>
                            </button>

                            {isSortDropdownOpen && (
                              <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-[#E8E2D2] p-1.5 z-40">
                                <button
                                  onClick={() => { setPhotosSort('newest'); setIsSortDropdownOpen(false); }}
                                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] cursor-pointer"
                                >
                                  Newest First
                                </button>
                                <button
                                  onClick={() => { setPhotosSort('oldest'); setIsSortDropdownOpen(false); }}
                                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] cursor-pointer"
                                >
                                  Oldest First
                                </button>
                                <button
                                  onClick={() => { setPhotosSort('name'); setIsSortDropdownOpen(false); }}
                                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] cursor-pointer"
                                >
                                  File Name (A–Z)
                                </button>
                                <button
                                  onClick={() => { setPhotosSort('downloads'); setIsSortDropdownOpen(false); }}
                                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-[#1F1714] hover:bg-[#FAF7F0] cursor-pointer"
                                >
                                  Most Downloaded
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Photo Grid / List Container (Drag & Drop Supported) */}
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setIsDraggingOver(false);
                          if (e.dataTransfer.files?.length && currentDelivery) {
                            const targetGalleryId = activeSectionFilter !== 'all' ? activeSectionFilter : currentDelivery.id;
                            const targetSection = currentDelivery.subGalleries?.find(s => s.id === activeSectionFilter);
                            const existingFiles = targetSection ? (targetSection.files || []) : (currentDelivery.files || []);
                            const filtered = filterDuplicateDeliveryFiles(Array.from(e.dataTransfer.files), existingFiles);
                            if (filtered.length > 0) {
                              await uploadFiles(targetGalleryId, filtered, deliveryExpiryHours || 168);
                              toast.success(`${filtered.length} file(s) uploaded!`);
                              await fetchData();
                            }
                          }
                        }}
                        className={`transition-colors rounded-3xl p-1 ${
                          isDraggingOver ? 'bg-emerald-50/50 ring-2 ring-emerald-500 ring-dashed' : ''
                        }`}
                      >
                        {(() => {
                          const subMatch = activeSectionFilter !== 'all'
                            ? currentDelivery?.subGalleries?.find(s => s.id === activeSectionFilter)
                            : null;
                          let displayFiles: DeliveryFileItem[] = subMatch
                            ? [...(subMatch.files || [])]
                            : [
                                ...(currentDelivery?.files || []),
                                ...((currentDelivery?.subGalleries || []).flatMap(s => s.files || []))
                              ];

                          if (photosFilter === 'picks') {
                            displayFiles = displayFiles.filter(f => f.is_selected);
                          } else if (photosFilter === 'notes') {
                            displayFiles = displayFiles.filter(f => f.client_note && f.client_note.trim());
                          }

                          if (photosSort === 'oldest') {
                            displayFiles = [...displayFiles].reverse();
                          } else if (photosSort === 'downloads') {
                            displayFiles = [...displayFiles].sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
                          } else if (photosSort === 'name') {
                            displayFiles = [...displayFiles].sort((a, b) => {
                              const na = (a.title || a.file_path?.split('/').pop() || '').toLowerCase();
                              const nb = (b.title || b.file_path?.split('/').pop() || '').toLowerCase();
                              return na.localeCompare(nb);
                            });
                          }

                          if (displayFiles.length === 0) {
                            return (
                              <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-[#E8E2D2] p-8">
                                <ImageIcon className="w-10 h-10 text-[#B58B5C] mx-auto mb-3 opacity-60" />
                                <h3 className="text-base font-semibold text-[#1F1714]">
                                  {photosFilter !== 'all' ? 'No photos match this filter' : 'No Photos in this Gallery'}
                                </h3>
                                <p className="text-xs text-[#7A6F69] mt-1 max-w-sm mx-auto">
                                  {photosFilter !== 'all' ? 'Try switching back to "All" to view gallery photos.' : 'Drag and drop photos here or click below to upload.'}
                                </p>
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="mt-4 px-4 py-2 rounded-xl bg-[#3B2E28] hover:bg-[#4E3D35] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Upload Photos Directly</span>
                                </button>
                              </div>
                            );
                          }

                          const toggleSelectFile = (id: string) => {
                            setSelectedPhotoIds(prev =>
                              prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                            );
                          };
                          const allVisibleSelected = displayFiles.length > 0 && displayFiles.every(f => selectedPhotoIds.includes(f.id));
                          const bulkActionBar = (
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-2xl border border-[#E8E2D2] shadow-2xs">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (allVisibleSelected) {
                                      setSelectedPhotoIds([]);
                                    } else {
                                      setSelectedPhotoIds(displayFiles.map(f => f.id));
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F1714] hover:text-[#8C6432] cursor-pointer"
                                >
                                  {allVisibleSelected ? (
                                    <CheckSquare className="w-4 h-4 text-[#B58B5C]" />
                                  ) : (
                                    <Square className="w-4 h-4 text-[#8E827B]" />
                                  )}
                                  <span>
                                    {selectedPhotoIds.length > 0
                                      ? `${selectedPhotoIds.length} selected`
                                      : `Select all (${displayFiles.length})`}
                                  </span>
                                </button>
                                {selectedPhotoIds.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPhotoIds([])}
                                    className="text-[11px] font-medium text-[#7A6F69] hover:text-[#1F1714] cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>

                              {selectedPhotoIds.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={handleBulkDownloadZip}
                                    disabled={isZipping}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#3B2E28] hover:bg-[#4E3D35] text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>ZIP</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRenameModal()}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] hover:bg-[#F3EFE8] border border-[#E6DFC6] text-[#1F1714] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3 text-[#B58B5C]" />
                                    <span>Rename</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleBulkToggleEdited(true)}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Set Edited</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleBulkToggleEdited(false)}
                                    className="px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] hover:bg-[#F3EFE8] border border-[#E6DFC6] text-[#7A6F69] text-[11px] font-semibold cursor-pointer"
                                  >
                                    Unset Edited
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleBulkDeletePhotos}
                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );

                          // LIST VIEW MODE
                          if (deliveryGridMode === 'list') {
                            return (
                              <div>
                                {bulkActionBar}
                                <div className="bg-white rounded-2xl border border-[#E8E2D2] overflow-hidden shadow-xs">
                                  <div className="divide-y divide-[#F0EBE0]">
                                    {displayFiles.map((file, idx) => {
                                      const isSelectedForBulk = selectedPhotoIds.includes(file.id);
                                      const displayName = file.title || file.file_path?.split('/').pop() || `Photo #${idx + 1}`;
                                      return (
                                        <div
                                          key={file.id || idx}
                                          onClick={() => setSelectedPhotoForDetail(file)}
                                          className={`p-3 hover:bg-[#FAF7F2] transition-colors flex items-center justify-between gap-4 cursor-pointer ${
                                            isSelectedForBulk ? 'bg-[#FAF4E8]/60' : ''
                                          }`}
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            <button
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); toggleSelectFile(file.id); }}
                                              className="text-[#8E827B] hover:text-[#1F1714] cursor-pointer shrink-0"
                                              title="Select file"
                                            >
                                              {isSelectedForBulk ? (
                                                <CheckSquare className="w-4 h-4 text-[#B58B5C]" />
                                              ) : (
                                                <Square className="w-4 h-4" />
                                              )}
                                            </button>
                                            <img
                                              src={getOptimizedImageUrl(file.file_url, 100, 100)}
                                              alt={displayName}
                                              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#EDE5D8]"
                                            />
                                            <div className="min-w-0">
                                              <div className="text-xs font-semibold text-[#1F1714] truncate flex items-center gap-2">
                                                <span className="truncate max-w-[200px] sm:max-w-xs">{displayName}</span>
                                                {file.is_edited && (
                                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                                    Edited
                                                  </span>
                                                )}
                                                {file.is_selected && (
                                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200 shrink-0">
                                                    <Heart className="w-2.5 h-2.5 fill-rose-500" /> Client Pick
                                                  </span>
                                                )}
                                              </div>
                                              {file.client_note && (
                                                <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 mt-1 truncate max-w-md">
                                                  💬 Note: {file.client_note}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleOpenRenameModal(file); }}
                                              className="p-2 text-[#7A6F69] hover:text-[#1F1714] hover:bg-[#FAF4E8] rounded-lg transition-colors cursor-pointer"
                                              title="Rename File"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleSetCoverPhoto(file); }}
                                              className="p-2 text-[#7A6F69] hover:text-[#B58B5C] hover:bg-[#FAF4E8] rounded-lg transition-colors cursor-pointer"
                                              title="Set as Cover"
                                            >
                                              <Star className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(rewriteUrlToR2(file.file_url), '_blank');
                                              }}
                                              className="p-2 text-[#7A6F69] hover:text-[#1F1714] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                              title="Download Original"
                                            >
                                              <Download className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={(e) => { e.stopPropagation(); handleDeletePhoto(file); }}
                                              className="p-2 text-[#7A6F69] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                              title="Delete Photo"
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
                            );
                          }

                          // GRID VIEW MODE
                          const visibleFiles = showAllPhotosInGrid ? displayFiles : displayFiles.slice(0, 7);
                          const remainingCount = displayFiles.length - 7;

                          return (
                            <div>
                              {bulkActionBar}
                              {showAllPhotosInGrid && (
                                <div className="mb-3 flex items-center justify-between text-xs text-[#7A6F69]">
                                  <span>Showing all {displayFiles.length} photos</span>
                                  <button
                                    onClick={() => setShowAllPhotosInGrid(false)}
                                    className="text-xs font-semibold text-[#8C6432] hover:underline cursor-pointer"
                                  >
                                    Collapse to preview (7 photos)
                                  </button>
                                </div>
                              )}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                                {visibleFiles.map((file, idx) => {
                                  const isSelectedForBulk = selectedPhotoIds.includes(file.id);
                                  const displayName = file.title || file.file_path?.split('/').pop() || `Photo ${idx + 1}`;
                                  return (
                                    <div
                                      key={file.id || idx}
                                      onClick={() => setSelectedPhotoForDetail(file)}
                                      className={`group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#EAE2D5] shadow-xs border hover:shadow-md transition-all cursor-pointer ${
                                        isSelectedForBulk ? 'border-[#B58B5C] ring-2 ring-[#B58B5C]' : 'border-[#E8E2D2]/60'
                                      }`}
                                    >
                                      <img
                                        src={getOptimizedImageUrl(file.file_url, 600, 450)}
                                        alt={displayName}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        loading="lazy"
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors" />

                                      {/* Badges: Client Pick / Notes / Edited */}
                                      <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none">
                                        {file.is_selected && (
                                          <span className="w-6 h-6 rounded-full bg-rose-500/95 backdrop-blur-md text-white flex items-center justify-center shadow-xs">
                                            <Heart className="w-3.5 h-3.5 fill-white" />
                                          </span>
                                        )}
                                        {file.client_note && (
                                          <span className="w-6 h-6 rounded-full bg-amber-500/95 backdrop-blur-md text-white flex items-center justify-center shadow-xs" title={file.client_note}>
                                            <MessageSquare className="w-3.5 h-3.5 fill-white" />
                                          </span>
                                        )}
                                        {file.is_edited && (
                                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-600/95 backdrop-blur-md text-white text-[9px] font-bold shadow-xs">
                                            Edited
                                          </span>
                                        )}
                                      </div>

                                      {/* Selection Checkbox Top-Right */}
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); toggleSelectFile(file.id); }}
                                        className={`absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs ${
                                          isSelectedForBulk
                                            ? 'bg-[#B58B5C] text-white opacity-100'
                                            : 'bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-black/75'
                                        }`}
                                        title="Select photo for bulk action"
                                      >
                                        {isSelectedForBulk ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                      </button>

                                      {/* Filename Overlay Bottom-Left on hover */}
                                      <div className="absolute bottom-2 left-2 max-w-[55%] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <span className="block truncate text-[10px] font-medium text-white bg-black/55 backdrop-blur-xs px-2 py-0.5 rounded-md">
                                          {displayName}
                                        </span>
                                      </div>

                                      {/* Hover Quick Action Buttons */}
                                      <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleSetCoverPhoto(file); }}
                                          className="w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center cursor-pointer shadow-xs"
                                          title="Set as Cover"
                                        >
                                          <Star className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(rewriteUrlToR2(file.file_url), '_blank');
                                          }}
                                          className="w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center cursor-pointer shadow-xs"
                                          title="Download"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeletePhoto(file); }}
                                          className="w-7 h-7 rounded-lg bg-black/60 hover:bg-rose-600 backdrop-blur-md text-white flex items-center justify-center cursor-pointer shadow-xs"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Dark Card: + N more photos (Toggles full grid right here!) */}
                                {!showAllPhotosInGrid && remainingCount > 0 && (
                                  <div
                                    onClick={() => setShowAllPhotosInGrid(true)}
                                    className="group relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#3B2E28] hover:bg-[#4A3B34] text-white flex flex-col items-center justify-center p-3 cursor-pointer shadow-xs border border-[#2D221D] transition-colors"
                                  >
                                    <Plus className="w-6 h-6 text-white/80 group-hover:scale-110 transition-transform mb-0.5" />
                                    <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-none">
                                      {remainingCount}
                                    </span>
                                    <span className="text-[11px] text-[#CBBDB8] mt-1 font-medium">
                                      more photos
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}
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
                          {currentDelivery?.coverUrl || currentDelivery?.files?.[0]?.file_url ? (
                            <img
                              src={getOptimizedImageUrl(currentDelivery.coverUrl || currentDelivery.files![0].file_url, 120, 120)}
                              alt="Gallery thumbnail"
                              className="w-12 h-12 rounded-xl object-cover border border-[#EDE5D8] shadow-2xs"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#FAF7F0] border border-[#EDE5D8] flex items-center justify-center text-[#B58B5C]">
                              <ImageIcon className="w-5 h-5 opacity-50" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2.5 text-xs">
                          <div className="flex items-center justify-between text-[#6D635D]">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-[#8E827B]" />
                              <span>Views</span>
                            </div>
                            <span className="font-semibold text-[#1F1714]">{currentDelivery?.analytics?.views || 0}</span>
                          </div>

                          <div className="flex items-center justify-between text-[#6D635D]">
                            <div className="flex items-center gap-2">
                              <Download className="w-4 h-4 text-[#8E827B]" />
                              <span>Downloads</span>
                            </div>
                            <span className="font-semibold text-[#1F1714]">{currentDelivery?.downloadCount || 0}</span>
                          </div>

                          <div className="flex items-center justify-between text-[#6D635D]">
                            <div className="flex items-center gap-2">
                              <Heart className="w-4 h-4 text-[#8E827B]" />
                              <span>Favorites</span>
                            </div>
                            <span className="font-semibold text-[#1F1714]">
                              {currentDelivery?.files?.filter(f => f.is_selected).length || 0}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[#6D635D]">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-[#8E827B]" />
                              <span>Client Notes</span>
                            </div>
                            <span className="font-semibold text-[#1F1714]">{currentDelivery?.selectionNotesCount || 0}</span>
                          </div>

                          <div className="flex items-center justify-between text-[#6D635D]">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#8E827B]" />
                              <span>Created</span>
                            </div>
                            <span className="font-semibold text-[#1F1714]">{currentDelivery?.created_at ? formatDate(currentDelivery.created_at) : '—'}</span>
                          </div>

                          <div className="pt-2 border-t border-[#F4EFE6] space-y-2">
                            <div className="flex items-center justify-between text-[#6D635D]">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#8E827B]" />
                                <span>Expires</span>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-semibold text-[11px] border ${
                                currentDelivery?.isExpired
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-[#FAF4E8] text-[#8C6432] border-[#EEDFCA]'
                              }`}>
                                {currentDelivery?.timeRemainingText || (currentDelivery?.expires_at ? formatDate(currentDelivery.expires_at) : 'Active · No Expiry')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <select
                                value={deliveryExpiryHours}
                                onChange={(e) => handleExpiryHoursChange(Number(e.target.value))}
                                className="flex-1 px-2.5 py-1.5 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-[11px] font-medium text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                              >
                                <option value={24}>24 Hours</option>
                                <option value={48}>48 Hours</option>
                                <option value={72}>72 Hours</option>
                                <option value={168}>1 Week (7 Days)</option>
                                <option value={720}>1 Month (30 Days)</option>
                                <option value={876000}>Never Expire (Archive)</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleApplyCustomExpiration(deliveryExpiryHours)}
                                className="px-2.5 py-1.5 bg-[#FAF7F0] hover:bg-[#F3EFE8] border border-[#E6DFC6] rounded-xl text-[11px] font-semibold text-[#1F1714] cursor-pointer"
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={(e) => currentDelivery && handleQuickExtend(e, currentDelivery.id, currentDelivery.client_name)}
                                className="px-2.5 py-1.5 bg-[#3B2E28] hover:bg-[#4E3D35] text-white rounded-xl text-[11px] font-semibold cursor-pointer"
                                title="Quick Extend +7 Days"
                              >
                                +7d
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Payment & High-Res Downloads (Directly controls client high-res download unlock) */}
                      <div className="bg-white rounded-2xl p-5 border border-[#E8E2D2] shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-[#B58B5C]" />
                            <h3 className="text-sm font-bold text-[#1F1714]">Payment &amp; Downloads</h3>
                          </div>
                          {(() => {
                            const agreed = editAgreedBalance === '' ? (currentDelivery?.agreed_balance || 0) : Number(editAgreedBalance) || 0;
                            const paid = editAmountPaid === '' ? (currentDelivery?.amount_paid || 0) : Number(editAmountPaid) || 0;
                            const balance = Math.max(0, agreed - paid);

                            if (agreed === 0) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Free / Collab
                                </span>
                              );
                            }
                            if (balance === 0) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                                  <Check className="w-3 h-3" /> Paid in Full
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <Lock className="w-3 h-3 text-amber-600" /> KES {balance.toLocaleString()} Due
                              </span>
                            );
                          })()}
                        </div>

                        {/* High-res Download Access Status Banner */}
                        {(() => {
                          const agreed = editAgreedBalance === '' ? (currentDelivery?.agreed_balance || 0) : Number(editAgreedBalance) || 0;
                          const paid = editAmountPaid === '' ? (currentDelivery?.amount_paid || 0) : Number(editAmountPaid) || 0;
                          const balance = Math.max(0, agreed - paid);

                          if (balance === 0) {
                            return (
                              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold block">High-Res Downloads Unlocked</span>
                                  <span className="text-[11px] text-emerald-700 leading-tight">
                                    Client has full access to download original high-resolution photos and ZIP archives on their portal.
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
                              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block">High-Res Downloads Locked</span>
                                <span className="text-[11px] text-amber-800 leading-tight">
                                  Client portal shows preview only. Original high-res downloads unlock automatically once the remaining balance is cleared.
                                </span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Inputs: Agreed Balance, Paid Amount, Remaining Balance */}
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#6D635D] mb-1">
                              Total Agreed Amount (KES)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8E827B]">KES</span>
                              <input
                                type="number"
                                value={editAgreedBalance}
                                onChange={(e) => setEditAgreedBalance(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="0 (Free / Volunteer)"
                                className="w-full pl-12 pr-3 py-2 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs font-mono font-medium text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-[#6D635D] mb-1">
                              Amount Paid by Client (KES)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8E827B]">KES</span>
                              <input
                                type="number"
                                value={editAmountPaid}
                                onChange={(e) => setEditAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="0"
                                className="w-full pl-12 pr-3 py-2 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs font-mono font-medium text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                              />
                            </div>
                          </div>

                          {/* Remaining Balance Display */}
                          <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EDE5D8] flex items-center justify-between text-xs">
                            <span className="text-[#6D635D] font-medium">Remaining Balance:</span>
                            <span className={`font-mono font-bold text-sm ${
                              Math.max(0, (Number(editAgreedBalance) || 0) - (Number(editAmountPaid) || 0)) === 0
                                ? 'text-emerald-700'
                                : 'text-amber-800'
                            }`}>
                              KES {Math.max(0, (Number(editAgreedBalance) || 0) - (Number(editAmountPaid) || 0)).toLocaleString()}
                            </span>
                          </div>

                          {/* Action Buttons: Save Payment & Clear Balance */}
                          <div className="flex items-center gap-2 pt-2 border-t border-[#F4EFE6]">
                            <button
                              onClick={() => handleUpdatePayment()}
                              disabled={isUpdatingPayment}
                              className="flex-1 bg-[#3B2E28] hover:bg-[#4E3D35] text-white py-2 px-3 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {isUpdatingPayment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              <span>Save Payment</span>
                            </button>

                            {Math.max(0, (Number(editAgreedBalance) || 0) - (Number(editAmountPaid) || 0)) > 0 && (
                              <button
                                onClick={handleMarkPaidInFull}
                                disabled={isUpdatingPayment}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                                title="Sets amount paid equal to agreed balance and unlocks high-res downloads"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Clear Balance</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Client Access */}
                      <div className="bg-white rounded-2xl p-5 border border-[#E8E2D2] shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-[#B58B5C]" />
                            <h3 className="text-sm font-bold text-[#1F1714]">Client Access</h3>
                          </div>
                          {currentDelivery?.id && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#FAF7F0] border border-[#E6DFC6] text-[#8C6432]">
                              PIN: {currentDelivery.id.split('-')[0].slice(0, 4).toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Password Protected Toggle */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-[#8E827B]" />
                            <span className="text-xs font-medium text-[#1F1714]">Private (Password Protected)</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleDeliveryPrivacy}
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

                        {/* Password Input Box + Generate */}
                        {deliveryIsPrivate && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <input
                                  type={deliveryShowPassword ? 'text' : 'password'}
                                  value={deliveryPassword}
                                  onChange={(e) => setDeliveryPassword(e.target.value)}
                                  onBlur={() => handleSaveDeliveryPassword(deliveryPassword)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveDeliveryPassword(deliveryPassword)}
                                  placeholder="Set gallery password"
                                  className="w-full pl-3.5 pr-9 py-2 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                                />
                                <button
                                  type="button"
                                  onClick={() => setDeliveryShowPassword(!deliveryShowPassword)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E827B] hover:text-[#1F1714] cursor-pointer"
                                >
                                  {deliveryShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={handleGenerateDeliveryPassword}
                                className="px-2.5 py-2 bg-[#FAF4E8] hover:bg-[#F3EFE8] border border-[#EEDFCA] text-[#8C6432] rounded-xl text-[11px] font-semibold cursor-pointer shrink-0"
                                title="Generate random 8-character password"
                              >
                                Generate
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Live / Hidden Portal Status & Mode Toggles */}
                        <div className="space-y-3 pt-2 border-t border-[#F4EFE6] text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#1F1714]">
                              <Globe className="w-4 h-4 text-[#8E827B]" />
                              <span>Portal Link Active</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleToggleLinkEnabled}
                              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                currentDelivery?.link_enabled ? 'bg-[#059669]' : 'bg-[#D6CCA6]'
                              }`}
                            >
                              <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                                currentDelivery?.link_enabled ? 'translate-x-4' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#1F1714]">
                              <Download className="w-4 h-4 text-[#8E827B]" />
                              <span>Allow downloads (Direct Mode)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleSelectionMode(false)}
                              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                !currentDelivery?.selection_enabled ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                              }`}
                            >
                              <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                                !currentDelivery?.selection_enabled ? 'translate-x-4' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#1F1714]">
                              <Heart className="w-4 h-4 text-[#8E827B]" />
                              <span>Client Selection Mode (Favorites)</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleSelectionMode(!currentDelivery?.selection_enabled)}
                              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                currentDelivery?.selection_enabled ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                              }`}
                            >
                              <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                                currentDelivery?.selection_enabled ? 'translate-x-4' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>

                          {/* Agreed Photo Limit */}
                          <div className="pt-2 border-t border-[#F4EFE6] space-y-1.5">
                            <label className="block text-[11px] font-semibold text-[#6D635D]">
                              Agreed Photo Selection Limit (0 = Unlimited)
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                value={editSelectionLimit}
                                onChange={(e) => setEditSelectionLimit(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Unlimited"
                                className="flex-1 px-3 py-1.5 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateSelectionLimit(Number(editSelectionLimit) || 0)}
                                className="px-3 py-1.5 bg-[#3B2E28] hover:bg-[#4E3D35] text-white rounded-xl text-[11px] font-semibold cursor-pointer"
                              >
                                Apply
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleExportSelectionsCSV}
                            className="w-full py-2 px-3 bg-[#FAF7F2] hover:bg-[#F3EFE8] border border-[#E6DFC6] rounded-xl text-xs font-semibold text-[#1F1714] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <FileDown className="w-3.5 h-3.5 text-[#B58B5C]" />
                            <span>Export Selections (CSV)</span>
                          </button>
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
                            onClick={() => {
                              setPhotosFilter('picks');
                              setShowAllPhotosInGrid(true);
                              toast.info(`Showing ${currentDelivery?.files?.filter(f => f.is_selected).length || 0} client selections`);
                            }}
                            className="p-3 rounded-xl border border-[#EDE5D8] bg-[#FAF7F2] hover:bg-[#F3EFE8] text-left transition-colors cursor-pointer flex flex-col justify-between"
                          >
                            <ImageIcon className="w-4 h-4 text-[#B58B5C] mb-1.5" />
                            <div>
                              <div className="text-xs font-bold text-[#1F1714]">Photo Selection</div>
                              <div className="text-[10px] text-[#7A6F69] mt-0.5">
                                {currentDelivery?.selection_status === 'submitted' ? '(Submitted)' : '(Client Picks)'}
                              </div>
                            </div>
                          </button>

                          {/* 2. Print Store */}
                          <button
                            onClick={() => setDeliveryTab('store')}
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
                            onClick={() => {
                              setPhotosFilter('notes');
                              setShowAllPhotosInGrid(true);
                              toast.info(`Showing ${currentDelivery?.selectionNotesCount || 0} photos with client notes`);
                            }}
                            className="p-3 rounded-xl border border-[#EDE5D8] bg-[#FAF7F2] hover:bg-[#F3EFE8] text-left transition-colors cursor-pointer flex flex-col justify-between"
                          >
                            <MessageSquare className="w-4 h-4 text-[#B58B5C] mb-1.5" />
                            <div>
                              <div className="text-xs font-bold text-[#1F1714]">Client Notes</div>
                              <div className="text-[10px] text-[#7A6F69] mt-0.5">
                                ({currentDelivery?.selectionNotesCount || 0} Private Comments)
                              </div>
                            </div>
                          </button>

                          {/* 4. Slideshow */}
                          <button
                            onClick={() => {
                              if (currentDelivery?.id) window.open(`/g/${currentDelivery.id}`, '_blank');
                            }}
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
                            onClick={(e) => {
                              if (currentDelivery?.id) {
                                handleQuickExtend(e, currentDelivery.id, currentDelivery.client_name);
                              }
                            }}
                            className="p-3 rounded-xl border border-[#EDE5D8] bg-[#FAF7F2] hover:bg-[#F3EFE8] text-left transition-colors cursor-pointer flex flex-col justify-between"
                            title="Click to extend expiry (+7 days)"
                          >
                            <Clock className="w-4 h-4 text-[#B58B5C] mb-1.5" />
                            <div>
                              <div className="text-xs font-bold text-[#1F1714]">Expiring Gallery</div>
                              <div className="text-[10px] text-[#7A6F69] mt-0.5">
                                {currentDelivery?.timeRemainingText ? `(${currentDelivery.timeRemainingText})` : '(Set Auto Expiry)'}
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Card 4: SEO & Sharing */}
                      <div className="bg-white rounded-2xl p-5 border border-[#E8E2D2] shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Share2 className="w-4 h-4 text-[#B58B5C]" />
                            <h3 className="text-sm font-bold text-[#1F1714]">SEO &amp; Sharing</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeliveryTab('seo')}
                            className="text-[11px] font-semibold text-[#8C6432] hover:underline cursor-pointer"
                          >
                            Edit SEO
                          </button>
                        </div>

                        {/* Social Sharing Preview Heading with Badge */}
                        <div>
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-xs font-medium text-[#1F1714]">Social sharing preview (Open Graph)</span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                              Configured
                            </span>
                          </div>

                          {/* Open Graph Card Preview */}
                          <div className="p-3 rounded-xl border border-[#EDE5D8] bg-[#FAF7F2] flex items-center gap-3">
                            {currentDelivery?.coverUrl || currentDelivery?.files?.[0]?.file_url ? (
                              <img
                                src={getOptimizedImageUrl(currentDelivery.coverUrl || currentDelivery.files![0].file_url, 120, 120)}
                                alt="Open Graph preview"
                                className="w-12 h-12 rounded-lg object-cover shrink-0 border border-[#E6DFC6]"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-[#FAF7F0] border border-[#E6DFC6] flex items-center justify-center text-[#B58B5C] shrink-0">
                                <ImageIcon className="w-5 h-5 opacity-50" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold text-[#1F1714] truncate">
                                {currentDelivery?.seo_title || `${currentDelivery?.client_name || 'Client Delivery'} | Mwabonje Photography`}
                              </h4>
                              <p className="text-[11px] text-[#7A6F69] truncate mt-0.5">
                                {currentDelivery?.seo_description || `Private client photo delivery for ${currentDelivery?.client_name || 'clients'}, captured on the Kenyan coast by Mwabonje Photography.`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: SETTINGS TAB */}
                {deliveryTab === 'settings' && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D2] shadow-xs max-w-3xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-[#1F1714]">Portal &amp; Client Settings</h3>
                      <p className="text-xs text-[#7A6F69] mt-0.5">Manage delivery details, subtitle, selection limit, payments, and expiration.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-[#1F1714] mb-1.5">Gallery / Client Name</label>
                          <input
                            type="text"
                            value={editableDeliveryTitle}
                            onChange={(e) => setEditableDeliveryTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                            placeholder="e.g. Leah's Family Gallery"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#1F1714] mb-1.5">Agreed Photo Limit (0 = Unlimited)</label>
                          <input
                            type="number"
                            min="0"
                            value={editSelectionLimit}
                            onChange={(e) => setEditSelectionLimit(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3.5 py-2.5 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                            placeholder="Unlimited"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1F1714] mb-1.5">Welcome Subtitle / Description</label>
                        <textarea
                          rows={2}
                          value={editDeliverySubtitle}
                          onChange={(e) => setEditDeliverySubtitle(e.target.value)}
                          className="w-full px-3.5 py-2 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] focus:outline-none focus:border-[#B58B5C] resize-none"
                          placeholder="Private client delivery collection · East African Coast"
                        />
                      </div>

                      {/* Payment & Download Lock Section */}
                      <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-[#1F1714] block">Payment &amp; High-Res Downloads</span>
                            <span className="text-[11px] text-[#7A6F69]">
                              High-resolution downloads are locked until the client clears their balance.
                            </span>
                          </div>
                          {Math.max(0, (Number(editAgreedBalance) || 0) - (Number(editAmountPaid) || 0)) === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                              <Check className="w-3 h-3" /> Downloads Unlocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Lock className="w-3 h-3 text-amber-600" /> Downloads Locked
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-[#1F1714] mb-1.5">Total Agreed Amount (KES)</label>
                            <input
                              type="number"
                              value={editAgreedBalance}
                              onChange={(e) => setEditAgreedBalance(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="0 (Free / Volunteer)"
                              className="w-full px-3.5 py-2.5 bg-white border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#1F1714] mb-1.5">Amount Paid by Client (KES)</label>
                            <input
                              type="number"
                              value={editAmountPaid}
                              onChange={(e) => setEditAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="0"
                              className="w-full px-3.5 py-2.5 bg-white border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                          <div className="p-3 rounded-xl bg-white border border-[#E6DFC6] flex items-center justify-between">
                            <span className="text-xs text-[#6D635D] font-medium">Remaining Balance Due:</span>
                            <span className="font-mono font-bold text-sm text-[#1F1714]">
                              KES {Math.max(0, (Number(editAgreedBalance) || 0) - (Number(editAmountPaid) || 0)).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {Math.max(0, (Number(editAgreedBalance) || 0) - (Number(editAmountPaid) || 0)) > 0 ? (
                              <button
                                type="button"
                                onClick={handleMarkPaidInFull}
                                disabled={isUpdatingPayment}
                                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Clear Balance (Unlock Downloads)</span>
                              </button>
                            ) : (
                              <div className="w-full py-2.5 px-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium text-center border border-emerald-200">
                                ✓ Balance cleared · Client can download all files
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#6D635D] mb-1">
                            Pre-Clearance Download Allowance (Optional)
                          </label>
                          <input
                            type="number"
                            value={editDownloadsBeforeClearing}
                            onChange={(e) => setEditDownloadsBeforeClearing(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="0 = Locked until cleared"
                            className="w-full px-3.5 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                          />
                          <p className="text-[10px] text-[#8E827B] mt-1">
                            Set number of free high-res photos client can download before clearing balance (0 = none until cleared).
                          </p>
                        </div>
                      </div>

                      {/* Expiration Controls */}
                      <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#1F1714]">Portal Expiration Duration</span>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                            currentDelivery?.isExpired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {currentDelivery?.timeRemainingText || 'Active'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={deliveryExpiryHours}
                            onChange={(e) => handleExpiryHoursChange(Number(e.target.value))}
                            className="flex-1 min-w-[180px] px-3 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                          >
                            <option value={24}>24 Hours</option>
                            <option value={48}>48 Hours</option>
                            <option value={72}>72 Hours</option>
                            <option value={168}>1 Week (7 Days)</option>
                            <option value={720}>1 Month (30 Days)</option>
                            <option value={876000}>Never Expire (Archive)</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleApplyCustomExpiration(deliveryExpiryHours)}
                            className="px-3.5 py-2 bg-[#3B2E28] hover:bg-[#4E3D35] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Apply to Existing Files
                          </button>
                          <button
                            type="button"
                            onClick={(e) => currentDelivery && handleQuickExtend(e, currentDelivery.id, currentDelivery.client_name)}
                            className="px-3.5 py-2 bg-white hover:bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs font-semibold text-[#1F1714] transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <Clock className="w-3.5 h-3.5 text-[#B58B5C]" />
                            <span>Quick Extend (+7 Days)</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#F0EBE0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={(e) => currentDelivery && handleDeleteGallery(e, currentDelivery.id, currentDelivery.client_name)}
                        disabled={!currentDelivery || deletingGalleryId === currentDelivery?.id}
                        className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Gallery &amp; Cloudflare R2 Files</span>
                      </button>

                      <button
                        onClick={handleSaveDeliverySettings}
                        disabled={isSavingSettings}
                        className="px-5 py-2.5 bg-[#3B2E28] hover:bg-[#4E3D35] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        <span>Save Gallery Settings</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: ACCESS TAB */}
                {deliveryTab === 'access' && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D2] shadow-xs max-w-3xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-[#1F1714]">Client Access &amp; Permissions</h3>
                        <p className="text-xs text-[#7A6F69] mt-0.5">Control password protection, portal visibility, PIN, and client selection mode.</p>
                      </div>
                      {currentDelivery?.id && (
                        <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-[#FAF7F0] border border-[#E6DFC6] text-[#8C6432] self-start">
                          Unlock PIN: {currentDelivery.id.split('-')[0].slice(0, 4).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Password Protection */}
                      <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-[#1F1714] block">Password Protection</span>
                            <span className="text-[11px] text-[#7A6F69]">Require clients to enter a password to open this gallery.</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleDeliveryPrivacy}
                            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                              deliveryIsPrivate ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                            }`}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              deliveryIsPrivate ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        {deliveryIsPrivate && (
                          <div className="pt-2">
                            <label className="block text-[11px] font-semibold text-[#1F1714] mb-1">Access Password</label>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type={deliveryShowPassword ? 'text' : 'password'}
                                value={deliveryPassword}
                                onChange={(e) => setDeliveryPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveDeliveryPassword(deliveryPassword)}
                                placeholder="Set password"
                                className="flex-1 min-w-[160px] px-3.5 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                              />
                              <button
                                type="button"
                                onClick={() => setDeliveryShowPassword(!deliveryShowPassword)}
                                className="p-2 border border-[#E6DFC6] bg-white rounded-xl text-[#7A6F69] hover:text-[#1F1714] cursor-pointer"
                              >
                                {deliveryShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={handleGenerateDeliveryPassword}
                                className="px-3 py-2 bg-[#FAF4E8] hover:bg-[#F3EFE8] border border-[#EEDFCA] text-[#8C6432] rounded-xl text-xs font-semibold cursor-pointer"
                              >
                                Generate
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveDeliveryPassword(deliveryPassword)}
                                className="px-3.5 py-2 bg-[#3B2E28] hover:bg-[#4E3D35] text-white rounded-xl text-xs font-semibold cursor-pointer"
                              >
                                Save Password
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Permissions List */}
                      <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] space-y-3.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-[#1F1714] block">Portal Visibility (Live / Hidden)</span>
                            <span className="text-[11px] text-[#7A6F69]">Turn off to temporarily hide this gallery from clients without deleting it.</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleToggleLinkEnabled}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                              currentDelivery?.link_enabled ? 'bg-[#059669]' : 'bg-[#D6CCA6]'
                            }`}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                              currentDelivery?.link_enabled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-[#1F1714] block">Allow High-Resolution Downloads</span>
                            <span className="text-[11px] text-[#7A6F69]">Direct download experience (subject to cleared payment balance).</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleSelectionMode(false)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                              !currentDelivery?.selection_enabled ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                            }`}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                              !currentDelivery?.selection_enabled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-[#1F1714] block">Client Selection Mode (Favorites &amp; Proofs)</span>
                            <span className="text-[11px] text-[#7A6F69]">Clients pick favorites &amp; submit selection for retouching (disables bulk downloads).</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleSelectionMode(!currentDelivery?.selection_enabled)}
                            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                              currentDelivery?.selection_enabled ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                            }`}
                          >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                              currentDelivery?.selection_enabled ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        <div className="pt-2 border-t border-[#E8E2D2] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold text-[#1F1714] block">Agreed Photo Selection Limit</span>
                            <span className="text-[11px] text-[#7A6F69]">Set maximum included photos in package (0 = Unlimited).</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={editSelectionLimit}
                              onChange={(e) => setEditSelectionLimit(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="Unlimited"
                              className="w-28 px-3 py-1.5 bg-white border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateSelectionLimit(Number(editSelectionLimit) || 0)}
                              className="px-3.5 py-1.5 bg-[#3B2E28] hover:bg-[#4E3D35] text-white rounded-xl text-xs font-semibold cursor-pointer"
                            >
                              Save Limit
                            </button>
                          </div>
                        </div>

                        {currentDelivery?.selection_status === 'submitted' && (
                          <div className="pt-2 border-t border-[#E8E2D2] flex items-center justify-between gap-3">
                            <span className="text-emerald-800 font-semibold">Client selection is currently locked (Submitted).</span>
                            <button
                              type="button"
                              onClick={handleReopenSelection}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                            >
                              Reopen Selection
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: DOWNLOAD TAB */}
                {deliveryTab === 'download' && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D2] shadow-xs max-w-3xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-[#1F1714]">Direct Download &amp; Archive Export</h3>
                      <p className="text-xs text-[#7A6F69] mt-0.5">Download full gallery archives as ZIP or monitor client download activity.</p>
                    </div>

                    {/* Client High-Res Download Permission Status */}
                    {(() => {
                      const agreed = editAgreedBalance === '' ? (currentDelivery?.agreed_balance || 0) : Number(editAgreedBalance) || 0;
                      const paid = editAmountPaid === '' ? (currentDelivery?.amount_paid || 0) : Number(editAmountPaid) || 0;
                      const balance = Math.max(0, agreed - paid);

                      if (balance === 0) {
                        return (
                          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                                <Check className="w-5 h-5 text-emerald-700" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                                  <span>Client High-Res Downloads Unlocked</span>
                                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold uppercase">
                                    {agreed === 0 ? 'Free / Collab' : 'Paid in Full'}
                                  </span>
                                </p>
                                <p className="text-[11px] text-emerald-800 mt-0.5">
                                  Client has full permission to download original high-resolution photos and ZIP archives without restriction.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                              <Lock className="w-5 h-5 text-amber-700" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-amber-950 flex items-center gap-2">
                                <span>Client High-Res Downloads Locked</span>
                                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase">
                                  KES {balance.toLocaleString()} Due
                                </span>
                              </p>
                              <p className="text-[11px] text-amber-800 mt-0.5">
                                Client sees notice to clear their balance before original high-resolution downloads become accessible.
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleMarkPaidInFull}
                            disabled={isUpdatingPayment}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Clear Balance &amp; Unlock</span>
                          </button>
                        </div>
                      );
                    })()}

                    {(() => {
                      const allBundleFiles = [
                        ...(currentDelivery?.files || []),
                        ...((currentDelivery?.subGalleries || []).flatMap(s => s.files || []))
                      ];
                      return (
                        <div className="p-6 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-[#1F1714]">Download All Photos &amp; Export Selections</h4>
                            <p className="text-xs text-[#7A6F69] mt-1">
                              Creates a compressed ZIP bundle of all {allBundleFiles.length} full-resolution files or exports client picks to CSV.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <button
                              type="button"
                              onClick={handleExportSelectionsCSV}
                              disabled={allBundleFiles.length === 0}
                              className="px-4 py-2.5 bg-white hover:bg-[#FAF7F0] border border-[#E6DFC6] text-[#1F1714] rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                            >
                              <FileDown className="w-4 h-4 text-[#B58B5C]" />
                              <span>Export CSV</span>
                            </button>
                            <button
                              onClick={handleDownloadAllZip}
                              disabled={isZipping || allBundleFiles.length === 0}
                              className="px-5 py-2.5 bg-[#3B2E28] hover:bg-[#4E3D35] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                            >
                              {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                              <span>{isZipping ? 'Archiving ZIP...' : 'Download ZIP Bundle'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-white border border-[#E8E2D2] text-center">
                        <span className="text-2xl font-bold text-[#1F1714]">{currentDelivery?.downloadCount || 0}</span>
                        <p className="text-[11px] text-[#7A6F69] mt-0.5">Total Client Downloads</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-[#E8E2D2] text-center">
                        <span className="text-2xl font-bold text-[#1F1714]">
                          {(currentDelivery?.files?.length || 0) + ((currentDelivery?.subGalleries || []).reduce((acc, s) => acc + (s.files?.length || 0), 0))}
                        </span>
                        <p className="text-[11px] text-[#7A6F69] mt-0.5">Deliverable Files</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-[#E8E2D2] text-center">
                        <span className="text-2xl font-bold text-emerald-600">Active</span>
                        <p className="text-[11px] text-[#7A6F69] mt-0.5">R2 CDN Status</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: STORE TAB */}
                {deliveryTab === 'store' && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D2] shadow-xs max-w-3xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-[#1F1714]">Client Print Store</h3>
                      <p className="text-xs text-[#7A6F69] mt-0.5">Enable print orders, custom coastal framing, and canvas products for this delivery.</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">✓</div>
                        <div>
                          <p className="text-xs font-bold text-emerald-950">Print Store Enabled for Clients</p>
                          <p className="text-[11px] text-emerald-800">Clients viewing this delivery can order fine art prints, linen frames, and canvas wraps.</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl border border-[#EDE5D8] bg-[#FAF7F2]">
                        <h4 className="text-xs font-bold text-[#1F1714]">Fine Art Prints</h4>
                        <p className="text-[11px] text-[#7A6F69] mt-1">Hahnemühle Photo Rag 308gsm with archival pigment ink.</p>
                        <span className="inline-block mt-3 text-xs font-mono font-bold text-[#8C6432]">From KES 1,500</span>
                      </div>
                      <div className="p-4 rounded-2xl border border-[#EDE5D8] bg-[#FAF7F2]">
                        <h4 className="text-xs font-bold text-[#1F1714]">Coastal Linen Frame</h4>
                        <p className="text-[11px] text-[#7A6F69] mt-1">Handcrafted teak and washed natural linen framing.</p>
                        <span className="inline-block mt-3 text-xs font-mono font-bold text-[#8C6432]">From KES 6,500</span>
                      </div>
                      <div className="p-4 rounded-2xl border border-[#EDE5D8] bg-[#FAF7F2]">
                        <h4 className="text-xs font-bold text-[#1F1714]">Gallery Canvas</h4>
                        <p className="text-[11px] text-[#7A6F69] mt-1">Stretched gallery-wrap canvas with UV seal coating.</p>
                        <span className="inline-block mt-3 text-xs font-mono font-bold text-[#8C6432]">From KES 8,000</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: SEO & SHARING TAB */}
                {deliveryTab === 'seo' && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D2] shadow-xs max-w-3xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-[#1F1714]">SEO, WhatsApp &amp; Social Sharing</h3>
                      <p className="text-xs text-[#7A6F69] mt-0.5">Customize how this portal appears when shared on WhatsApp, Facebook, and search engines.</p>
                    </div>

                    <div className="p-5 rounded-2xl border border-[#EDE5D8] bg-[#FAF7F2] flex items-center gap-4">
                      {currentDelivery?.coverUrl || currentDelivery?.files?.[0]?.file_url ? (
                        <img
                          src={getOptimizedImageUrl(currentDelivery.coverUrl || currentDelivery.files![0].file_url, 160, 160)}
                          alt="Open Graph preview"
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#E6DFC6]"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-[#FAF7F0] border border-[#E6DFC6] flex items-center justify-center text-[#B58B5C] shrink-0">
                          <ImageIcon className="w-6 h-6 opacity-50" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-[#1F1714] truncate">
                          {editSeoTitle.trim() || `${currentDelivery?.client_name || 'Client Delivery'} | Mwabonje Photography`}
                        </h4>
                        <p className="text-[11px] text-[#7A6F69] mt-1">
                          {editSeoDescription.trim() || `Private client photo delivery for ${currentDelivery?.client_name || 'clients'}, captured on the Kenyan coast by Mwabonje Photography.`}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1F1714] mb-1.5">Custom SEO / Share Title</label>
                        <input
                          type="text"
                          value={editSeoTitle}
                          onChange={(e) => setEditSeoTitle(e.target.value)}
                          placeholder={`${currentDelivery?.client_name || 'Client'} | Mwabonje Photography`}
                          className="w-full px-3.5 py-2.5 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#1F1714] mb-1.5">Custom Meta / Share Description</label>
                        <textarea
                          rows={2}
                          value={editSeoDescription}
                          onChange={(e) => setEditSeoDescription(e.target.value)}
                          placeholder={`Private client photo delivery for ${currentDelivery?.client_name || 'clients'}, captured on the Kenyan coast.`}
                          className="w-full px-3.5 py-2 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] focus:outline-none focus:border-[#B58B5C] resize-none"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveSeoInfo}
                          disabled={isSavingSeo}
                          className="px-5 py-2 bg-[#3B2E28] hover:bg-[#4E3D35] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isSavingSeo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Save SEO Settings</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#F0EBE0]">
                      <button
                        onClick={() => setSelectedWhatsAppGallery(currentDelivery!)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send via WhatsApp</span>
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/g/${currentDelivery?.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Client link copied to clipboard!");
                        }}
                        className="px-4 py-2 bg-white hover:bg-[#FAF7F0] border border-[#E6DFC6] text-[#1F1714] rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Copy className="w-4 h-4 text-[#B58B5C]" />
                        <span>Copy Share Link</span>
                      </button>
                      {currentDelivery && (
                        <>
                          <button
                            onClick={() => {
                              const slug = generateSlug(currentDelivery.client_name);
                              navigator.clipboard.writeText(`${window.location.origin}/${slug}`);
                              toast.success(`Vanity link /${slug} copied!`);
                            }}
                            className="px-4 py-2 bg-white hover:bg-[#FAF7F0] border border-[#E6DFC6] text-[#1F1714] rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                          >
                            <LinkIcon className="w-4 h-4 text-[#B58B5C]" />
                            <span>Copy /{generateSlug(currentDelivery.client_name)}</span>
                          </button>
                          <button
                            onClick={() => window.open(`/g/${currentDelivery.id}/display`, '_blank')}
                            className="px-4 py-2 bg-white hover:bg-[#FAF7F0] border border-[#E6DFC6] text-[#1F1714] rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
                          >
                            <PlaySquare className="w-4 h-4 text-[#B58B5C]" />
                            <span>Open Live Display</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB CONTENT: ANALYTICS TAB */}
                {deliveryTab === 'analytics' && (
                  <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E2D2] shadow-xs max-w-3xl space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-[#1F1714]">Portal Traffic &amp; Client Engagement</h3>
                      <p className="text-xs text-[#7A6F69] mt-0.5">Real-time engagement telemetry for {currentDelivery?.client_name}.</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] text-center">
                        <span className="text-2xl font-bold text-[#1F1714]">{currentDelivery?.analytics?.views || 0}</span>
                        <p className="text-[11px] text-[#7A6F69] mt-0.5">Total Views</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] text-center">
                        <span className="text-2xl font-bold text-[#1F1714]">{currentDelivery?.downloadCount || 0}</span>
                        <p className="text-[11px] text-[#7A6F69] mt-0.5">Downloads</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] text-center">
                        <span className="text-2xl font-bold text-[#1F1714]">
                          {currentDelivery?.files?.filter(f => f.is_selected).length || 0}
                        </span>
                        <p className="text-[11px] text-[#7A6F69] mt-0.5">Client Favorites</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] text-center">
                        <span className="text-2xl font-bold text-[#1F1714]">{currentDelivery?.selectionNotesCount || 0}</span>
                        <p className="text-[11px] text-[#7A6F69] mt-0.5">Client Notes</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* All Deliveries Table View (Preserving all existing delivery ledger functionality) */
              <div className="space-y-6">
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
                      <span>Back to Studio View</span>
                    </button>
                    <button
                      onClick={() => handleOpenCreateModal('delivery')}
                      className="bg-[#3B2E28] hover:bg-[#4E3D35] text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>New Delivery</span>
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
                              {(() => {
                                const agreed = Number(gallery.agreed_balance) || 0;
                                const paid = Number(gallery.amount_paid) || 0;
                                const bal = Math.max(0, agreed - paid);

                                if (bal > 0) {
                                  return (
                                    <span className="text-[10px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shadow-xs" title={`Downloads locked · Balance due: KES ${bal.toLocaleString()}`}>
                                      <Lock className="w-2.5 h-2.5 text-amber-600" />
                                      <span>KES {bal.toLocaleString()} Due</span>
                                    </span>
                                  );
                                }
                                if (agreed > 0 && bal === 0) {
                                  return (
                                    <span className="text-[10px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shadow-xs" title="Paid in full · High-res downloads unlocked">
                                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                                      <span>Paid in Full</span>
                                    </span>
                                  );
                                }
                                return null;
                              })()}
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
                                className="p-1.5 text-[#8E827B] hover:text-[#1F1714] hover:bg-[#FAF7F0] rounded-lg transition-colors cursor-pointer"
                                title="View Client Portal"
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

            {/* IN-PAGE MODAL 1: CREATE SECTION / SUB-GALLERY */}
            {isCreateSectionModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#E8E2D2] shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE0]">
                    <div className="flex items-center gap-2">
                      <FolderPlus className="w-5 h-5 text-[#B58B5C]" />
                      <h3 className="text-base font-bold text-[#1F1714]">Create Gallery Section</h3>
                    </div>
                    <button
                      onClick={() => setIsCreateSectionModalOpen(false)}
                      className="text-[#8E827B] hover:text-[#1F1714] p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={handleCreateSection} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1F1714] mb-1">Section Title</label>
                      <input
                        type="text"
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        placeholder="e.g. Ceremony, Sunset Portraits, Reception"
                        autoFocus
                        required
                        className="w-full px-3.5 py-2.5 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#1F1714] mb-1">Description (Optional)</label>
                      <textarea
                        value={newSectionDescription}
                        onChange={(e) => setNewSectionDescription(e.target.value)}
                        rows={2}
                        placeholder="e.g. Intimate family moments on the Watamu shoreline"
                        className="w-full px-3.5 py-2 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] focus:outline-none focus:border-[#B58B5C] resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreateSectionModalOpen(false)}
                        className="px-4 py-2 border border-[#E6DFC6] rounded-xl text-xs font-semibold text-[#7A6F69] hover:bg-[#FAF7F0]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingSection}
                        className="px-5 py-2 bg-[#3B2E28] hover:bg-[#4E3D35] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {isCreatingSection && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Create Section</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* IN-PAGE MODAL 2: CHANGE COVER PHOTO */}
            {isChangeCoverModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full border border-[#E8E2D2] shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE0] shrink-0">
                    <div>
                      <h3 className="text-base font-bold text-[#1F1714]">Choose Gallery Cover</h3>
                      <p className="text-xs text-[#7A6F69] mt-0.5">Click any photo in this gallery to set it as the primary cover banner.</p>
                    </div>
                    <button
                      onClick={() => setIsChangeCoverModalOpen(false)}
                      className="text-[#8E827B] hover:text-[#1F1714] p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 pr-1 grid grid-cols-3 sm:grid-cols-4 gap-3 py-2">
                    {currentDelivery?.files && currentDelivery.files.length > 0 ? (
                      currentDelivery.files.map((file, idx) => {
                        const isCurrentCover = (currentDelivery.coverUrl === file.file_url);
                        return (
                          <div
                            key={file.id || idx}
                            onClick={() => handleSetCoverPhoto(file)}
                            className={`group relative rounded-xl overflow-hidden aspect-[4/3] bg-[#EAE2D5] border-2 transition-all cursor-pointer ${
                              isCurrentCover ? 'border-[#B58B5C] ring-2 ring-[#B58B5C]/35' : 'border-transparent hover:border-[#B58B5C]'
                            }`}
                          >
                            <img
                              src={getOptimizedImageUrl(file.file_url, 300, 225)}
                              alt={`Select cover ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            {isCurrentCover && (
                              <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-[#3B2E28] text-white text-[9px] font-bold">
                                Current
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="col-span-full py-8 text-center text-xs text-[#7A6F69]">No photos in gallery to choose from.</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-[#F0EBE0] shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsChangeCoverModalOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="text-xs font-semibold text-[#8C6432] hover:underline cursor-pointer"
                    >
                      + Upload New Photo to Use as Cover
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangeCoverModalOpen(false)}
                      className="px-4 py-2 border border-[#E6DFC6] rounded-xl text-xs font-semibold text-[#7A6F69] hover:bg-[#FAF7F0] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* IN-PAGE MODAL 3: PHOTO DETAIL & LIGHTBOX (Manage single photo without leaving!) */}
            {selectedPhotoForDetail && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in">
                <div className="relative bg-[#1F1714] text-white rounded-3xl max-w-4xl w-full border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                  {/* Top Bar */}
                  <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-white/90">Photo Details</span>
                      {selectedPhotoForDetail.is_selected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-300 text-[10px] font-bold border border-rose-500/40">
                          <Heart className="w-2.5 h-2.5 fill-rose-400" /> Client Pick
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedPhotoForDetail(null)}
                      className="text-white/60 hover:text-white p-1 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Photo Preview Body */}
                  <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-black/40">
                    <img
                      src={rewriteUrlToR2(selectedPhotoForDetail.file_url)}
                      alt="Full Preview"
                      className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-lg"
                    />

                    {/* Client Note Display */}
                    {selectedPhotoForDetail.client_note && (
                      <div className="mt-4 p-3.5 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-200 text-xs max-w-xl w-full">
                        <span className="font-bold flex items-center gap-1.5 mb-1 text-amber-300">
                          <MessageSquare className="w-3.5 h-3.5 fill-amber-300" /> Client Note:
                        </span>
                        <p className="leading-relaxed">{selectedPhotoForDetail.client_note}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="px-5 py-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0 bg-[#2A201B]">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          handleSetCoverPhoto(selectedPhotoForDetail);
                          setSelectedPhotoForDetail(null);
                        }}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 text-[#B58B5C]" />
                        <span>Set as Cover</span>
                      </button>
                      <button
                        onClick={() => handleOpenRenameModal(selectedPhotoForDetail)}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-white/80" />
                        <span>Rename</span>
                      </button>
                      <button
                        onClick={() => handleToggleSingleEdited(selectedPhotoForDetail)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                          selectedPhotoForDetail.is_edited
                            ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{selectedPhotoForDetail.is_edited ? 'Edited' : 'Mark Edited'}</span>
                      </button>
                      <button
                        onClick={() => window.open(rewriteUrlToR2(selectedPhotoForDetail.file_url), '_blank')}
                        className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-white/80" />
                        <span>Download Original</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeletePhoto(selectedPhotoForDetail)}
                      className="px-3.5 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Photo</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* IN-PAGE MODAL 5: RENAME PHOTO(S) */}
            {isRenameModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[110] animate-in fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#E8E2D2] shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE0]">
                    <div className="flex items-center gap-2">
                      <Edit2 className="w-5 h-5 text-[#B58B5C]" />
                      <h3 className="text-base font-bold text-[#1F1714]">
                        {renameTargetFile || selectedPhotoIds.length === 1 ? 'Rename Photo' : `Rename ${selectedPhotoIds.length} Selected Photos`}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setIsRenameModalOpen(false); setRenameTargetFile(null); }}
                      className="text-[#8E827B] hover:text-[#1F1714] p-1 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={confirmRenamePhotos} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1F1714] mb-1">
                        {(renameTargetFile || selectedPhotoIds.length === 1) ? 'New File Name' : 'Base Sequence Name'}
                      </label>
                      <input
                        type="text"
                        value={renameBaseName}
                        onChange={(e) => setRenameBaseName(e.target.value)}
                        placeholder="e.g. Amina_Hassan_Wedding"
                        autoFocus
                        required
                        className="w-full px-3.5 py-2.5 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                      />
                      {!renameTargetFile && selectedPhotoIds.length > 1 && (
                        <p className="text-[11px] text-[#7A6F69] mt-1.5">
                          Files will be numbered sequentially: <span className="font-mono">{renameBaseName || 'name'}_001</span>, <span className="font-mono">_002</span>, etc.
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => { setIsRenameModalOpen(false); setRenameTargetFile(null); }}
                        className="px-4 py-2 border border-[#E6DFC6] rounded-xl text-xs font-semibold text-[#7A6F69] hover:bg-[#FAF7F0] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isRenaming || !renameBaseName.trim()}
                        className="px-5 py-2 bg-[#3B2E28] hover:bg-[#4E3D35] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {isRenaming && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Save Name</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* IN-PAGE MODAL 4: DELETE GALLERY CONFIRMATION (Deletes DB + Cloudflare R2) */}
            {galleryToDelete && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[110] animate-in fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#E8E2D2] shadow-2xl space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-[#1F1714]">Delete Gallery Permanently?</h3>
                      <p className="text-xs text-[#7A6F69] mt-1 leading-relaxed">
                        Are you sure you want to delete <strong className="text-[#1F1714]">"{galleryToDelete.name}"</strong>?
                        This action cannot be undone and will permanently delete all associated photos, high-res originals, watermarks, and folders from <strong className="text-[#1F1714]">Cloudflare R2</strong> and your database.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(deletingGalleryId)}
                      onClick={() => setGalleryToDelete(null)}
                      className="text-[#8E827B] hover:text-[#1F1714] p-1 rounded-lg cursor-pointer disabled:opacity-40"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#F0EBE0]">
                    <button
                      type="button"
                      disabled={Boolean(deletingGalleryId)}
                      onClick={() => setGalleryToDelete(null)}
                      className="px-4 py-2 border border-[#E6DFC6] rounded-xl text-xs font-semibold text-[#7A6F69] hover:bg-[#FAF7F0] cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(deletingGalleryId)}
                      onClick={confirmDeleteGallery}
                      className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
                    >
                      {deletingGalleryId ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Deleting from Cloudflare...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Gallery</span>
                        </>
                      )}
                    </button>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#E8E2D2] max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#F0EBE0] flex justify-between items-center bg-[#FAF7F2] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FAF4E8] border border-[#EEDFCA] flex items-center justify-center text-[#B58B5C]">
                  {createModalType === 'delivery' ? <Package className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#1F1714]">
                    {createModalType === 'delivery' ? 'New Client Delivery Portal' : 'New Portfolio Gallery'}
                  </h2>
                  <p className="text-[11px] text-[#7A6F69]">
                    {createModalType === 'delivery'
                      ? 'Creates and opens right inside your Deliveries studio workspace.'
                      : 'Creates a public showcase collection for your portfolio.'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#8E827B] hover:text-[#1F1714] p-1 rounded-lg transition-colors cursor-pointer"
                disabled={isCreating}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={createGallery} className="p-6 overflow-y-auto space-y-4">
              {userEmail === 'ringa.michael@gmail.com' && (
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#FAF7F0] border border-[#E6DFC6]">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalType('delivery');
                      setNewCategory('');
                      setNewParentGalleryId('');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      createModalType === 'delivery'
                        ? 'bg-[#3B2E28] text-white shadow-xs'
                        : 'text-[#7A6F69] hover:text-[#1F1714]'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Client Delivery Portal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModalType('portfolio');
                      if (!newCategory) setNewCategory('Wedding');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      createModalType === 'portfolio'
                        ? 'bg-[#3B2E28] text-white shadow-xs'
                        : 'text-[#7A6F69] hover:text-[#1F1714]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Portfolio Collection</span>
                  </button>
                </div>
              )}

              <div>
                <label htmlFor="clientName" className="block text-xs font-bold text-[#1F1714] mb-1.5">
                  Client Name or Event Title *
                </label>
                <input
                  id="clientName"
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl focus:border-[#B58B5C] outline-none transition-all text-xs text-[#1F1714] placeholder-[#9E928B]"
                  placeholder={createModalType === 'delivery' ? 'e.g. Amina & Hassan — Wedding' : 'e.g. Serena Beach Editorial'}
                  autoFocus
                  required
                  disabled={isCreating}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="galleryDescription" className="block text-xs font-bold text-[#1F1714]">
                    {createModalType === 'delivery' ? 'Welcome Subtitle / Note' : 'Project Description'}
                  </label>
                  <span className="text-[11px] text-[#8E827B]">Optional</span>
                </div>
                <textarea
                  id="galleryDescription"
                  rows={createModalType === 'delivery' ? 2 : 4}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl focus:border-[#B58B5C] outline-none transition-all text-xs text-[#1F1714] placeholder-[#9E928B] leading-relaxed resize-y"
                  placeholder={
                    createModalType === 'delivery'
                      ? 'e.g. A celebration of love on the Kenyan coast'
                      : 'e.g. Social Campaign for Salvatore Ferragamo highlighting their F80 Skeleton watch.'
                  }
                  disabled={isCreating}
                />
              </div>

              {createModalType === 'delivery' ? (
                <>
                  {/* Payment & High-Res Download Lock during Creation */}
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1F1714]">Payment &amp; High-Res Downloads</span>
                      {Math.max(0, (Number(newAgreedAmount) || 0) - (Number(newPaidAmount) || 0)) === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                          <Check className="w-3 h-3" /> Unlocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Lock className="w-3 h-3 text-amber-600" /> Balance Locked
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6D635D] mb-1">
                          Total Agreed (KES)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newAgreedAmount}
                          onChange={(e) => setNewAgreedAmount(e.target.value)}
                          placeholder="0 (Free)"
                          disabled={isCreating}
                          className="w-full px-3 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6D635D] mb-1">
                          Amount Paid (KES)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newPaidAmount}
                          onChange={(e) => setNewPaidAmount(e.target.value)}
                          placeholder="0"
                          disabled={isCreating}
                          className="w-full px-3 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Access Password, Expiration, Selection Limit & Permissions */}
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE5D8] space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#1F1714] mb-1">
                        Client Access Password (Optional)
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type={newDeliveryShowPassword ? 'text' : 'password'}
                            value={newDeliveryPassword}
                            onChange={(e) => setNewDeliveryPassword(e.target.value)}
                            placeholder="Leave empty for open link access"
                            disabled={isCreating}
                            className="w-full pl-3.5 pr-10 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                          />
                          <button
                            type="button"
                            onClick={() => setNewDeliveryShowPassword(prev => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E827B] hover:text-[#1F1714] cursor-pointer"
                          >
                            {newDeliveryShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
                            let pass = '';
                            for (let i = 0; i < 8; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
                            setNewDeliveryPassword(pass);
                            setNewDeliveryShowPassword(true);
                          }}
                          className="px-3 py-2 bg-[#FAF4E8] hover:bg-[#F3EFE8] border border-[#EEDFCA] text-[#8C6432] rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                        >
                          Generate
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6D635D] mb-1">
                          Default Link Expiration
                        </label>
                        <select
                          value={newDeliveryExpiryHours}
                          onChange={(e) => setNewDeliveryExpiryHours(Number(e.target.value))}
                          disabled={isCreating}
                          className="w-full px-3 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                        >
                          <option value={24}>24 Hours</option>
                          <option value={48}>48 Hours</option>
                          <option value={72}>72 Hours</option>
                          <option value={168}>1 Week (7 Days)</option>
                          <option value={720}>1 Month (30 Days)</option>
                          <option value={876000}>Never Expire (Archive)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6D635D] mb-1">
                          Agreed Photo Limit (Optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newDeliverySelectionLimit}
                          onChange={(e) => setNewDeliverySelectionLimit(e.target.value)}
                          placeholder="0 = Unlimited"
                          disabled={isCreating}
                          className="w-full px-3 py-2 bg-white border border-[#E6DFC6] rounded-xl text-xs font-mono text-[#1F1714] focus:outline-none focus:border-[#B58B5C]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-xs font-medium text-[#1F1714] block">Allow High-Res Downloads</span>
                        <span className="text-[10px] text-[#7A6F69]">Turn off to open in Client Selection Mode (favorites only)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewDeliveryAllowDownloads(prev => !prev)}
                        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                          newDeliveryAllowDownloads ? 'bg-[#B58B5C]' : 'bg-[#D6CCA6]'
                        }`}
                      >
                        <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                          newDeliveryAllowDownloads ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {userEmail === 'ringa.michael@gmail.com' && (
                    <div>
                      <label htmlFor="category" className="block text-xs font-bold text-[#1F1714] mb-1.5">
                        Portfolio Category
                      </label>
                      <input
                        id="category"
                        type="text"
                        list="category-options"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl focus:border-[#B58B5C] outline-none transition-all text-xs text-[#1F1714]"
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
                    </div>
                  )}
                  {userEmail === 'ringa.michael@gmail.com' && newCategory.trim() !== '' && (
                    <div>
                      <label className="block text-xs font-bold text-[#1F1714] mb-1.5">
                        Display Layout
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setNewLayout('swipe')}
                          className={`px-4 py-2 border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${newLayout === 'swipe' ? 'border-[#B58B5C] bg-[#FAF4E8] text-[#1F1714]' : 'border-[#E6DFC6] text-[#7A6F69] hover:bg-[#FAF7F0]'}`}
                        >
                          <GalleryHorizontalEnd className="w-4 h-4" />
                          Swipe (Carousel)
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewLayout('grid')}
                          className={`px-4 py-2 border rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${newLayout === 'grid' ? 'border-[#B58B5C] bg-[#FAF4E8] text-[#1F1714]' : 'border-[#E6DFC6] text-[#7A6F69] hover:bg-[#FAF7F0]'}`}
                        >
                          <LayoutGrid className="w-4 h-4" />
                          Grid (4:6)
                        </button>
                      </div>
                    </div>
                  )}
                  {userEmail === 'ringa.michael@gmail.com' && (
                    <div>
                      <label htmlFor="parentGallery" className="block text-xs font-bold text-[#1F1714] mb-1.5">
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
                        className="w-full px-3.5 py-2.5 bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl focus:border-[#B58B5C] outline-none transition-all text-xs text-[#1F1714]"
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
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2.5 justify-end pt-3 border-t border-[#F0EBE0]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#7A6F69] hover:bg-[#FAF7F0] border border-[#E6DFC6] rounded-xl transition-colors cursor-pointer"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newClientName.trim() || isCreating}
                  className="px-5 py-2 bg-[#3B2E28] hover:bg-[#4E3D35] text-white text-xs font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isCreating
                      ? 'Creating...'
                      : createModalType === 'delivery'
                      ? 'Create Delivery Portal'
                      : 'Create Gallery'}
                  </span>
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
                  {isUpdatingBulk ? 'Updating...' : 'Apply Changes'}
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
