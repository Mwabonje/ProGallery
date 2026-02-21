import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Clock, Lock, AlertCircle, X, ShieldAlert, FolderDown, Loader2, Mail, CheckCircle2, Heart, FileImage, FileVideo, Send, Eye, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Gallery, GalleryFile } from '../types';
import { formatCurrency, getTimeRemaining, getOptimizedImageUrl } from '../utils/formatters';
// @ts-ignore
import JSZip from 'jszip';
// @ts-ignore
import saveAs from 'file-saver';

export const ClientGallery: React.FC = () => {
  const { galleryId } = useParams<{ galleryId: string }>();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  
  // Selection Mode State
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [submittingSelection, setSubmittingSelection] = useState(false);
  const [selectionSubmitted, setSelectionSubmitted] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Download states
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusText, setDownloadStatusText] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Ref to cancel download if needed
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (galleryId) loadGallery();
  }, [galleryId]);

  // Network Optimization: Preconnect to Supabase Storage
  useEffect(() => {
    if (files.length > 0) {
      try {
        // Extract the hostname from the first file URL to preconnect
        const url = new URL(files[0].file_url);
        const origin = url.origin;
        
        // Check if link already exists
        if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = origin;
            document.head.appendChild(link);
        }
      } catch (e) {
        // Ignore URL parsing errors
      }
    }
  }, [files]);

  // Timer effect
  useEffect(() => {
    if (!files.length) return;
    
    // Find the earliest expiry date
    const firstFile = files[0];
    
    const updateTimer = () => {
        const { days, hours, minutes, expired } = getTimeRemaining(firstFile.expires_at);
        if (expired) {
            setTimeRemaining('Expired');
        } else if (days > 0) {
            setTimeRemaining(`${days}d ${hours}h`);
        } else {
            setTimeRemaining(`${hours}h ${minutes}m`);
        }
    };

    updateTimer(); 
    const timer = setInterval(updateTimer, 60000); 

    return () => clearInterval(timer);
  }, [files]);

  // Anti-Screenshot & Right-Click Protection
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if ((e.target as HTMLElement).tagName === 'IMG' || (e.target as HTMLElement).tagName === 'VIDEO') {
          setShowScreenshotWarning(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        setShowScreenshotWarning(true);
        try { navigator.clipboard.writeText(''); } catch (err) {}
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === 's')) {
            setShowScreenshotWarning(true);
        }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const loadGallery = async () => {
    try {
      if (!galleryId) return;

      const { data: galData, error: galError } = await supabase
        .from('galleries')
        .select('*')
        .eq('id', galleryId)
        .single();

      if (galError || !galData) {
        setError('Gallery not found or accessed denied.');
        setLoading(false);
        return;
      }

      if (!galData.link_enabled) {
        setError('This gallery is currently unavailable. Please contact the photographer.');
        setLoading(false);
        return;
      }

      setGallery(galData);
      if (galData.selection_status === 'submitted' || galData.selection_status === 'completed') {
        setSelectionSubmitted(true);
      }

      // Load Files
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('*')
        .eq('gallery_id', galleryId)
        .gt('expires_at', new Date().toISOString()) 
        .order('expires_at', { ascending: true }); 

      if (fileError) throw fileError;
      
      if (!fileData || fileData.length === 0) {
         setError('This gallery link has expired. Please contact the photographer to request access.');
      } else {
         setFiles(fileData);
      }

      // Load Selections if enabled
      if (galData.selection_enabled) {
        const { data: selectionData } = await supabase
            .from('selections')
            .select('file_id')
            .eq('gallery_id', galleryId);
        
        if (selectionData) {
            setSelectedFileIds(new Set(selectionData.map(s => s.file_id)));
        }
      }

    } catch (err) {
      console.error(err);
      setError('Error loading gallery.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = async (file: GalleryFile) => {
    if (!gallery?.selection_enabled || selectionSubmitted) return;

    const isSelected = selectedFileIds.has(file.id);
    const newSet = new Set(selectedFileIds);
    
    // Optimistic UI Update
    if (isSelected) {
        newSet.delete(file.id);
        setToast({ message: 'Removed from favorites', type: 'info' });
    } else {
        newSet.add(file.id);
        setToast({ message: 'Added to favorites', type: 'success' });
    }
    setSelectedFileIds(newSet);
    
    // Auto hide toast
    setTimeout(() => setToast(null), 2000);

    try {
        if (isSelected) {
            // Remove from DB
            await supabase
                .from('selections')
                .delete()
                .eq('gallery_id', gallery.id)
                .eq('file_id', file.id);
        } else {
            // Add to DB
            await supabase
                .from('selections')
                .insert({ gallery_id: gallery.id, file_id: file.id });
        }
    } catch (err) {
        console.error("Selection sync failed", err);
        // Revert on error
        setSelectedFileIds(selectedFileIds); // Revert to old state
    }
  };

  const submitSelection = async () => {
    if (!gallery) return;
    if (!confirm(`Are you sure you want to submit your selection of ${selectedFileIds.size} photos? This will notify the photographer.`)) return;

    setSubmittingSelection(true);
    try {
        const { error } = await supabase.rpc('submit_selection', { gallery_id: gallery.id });
        
        if (error) throw error;
        
        // Log activity
        await supabase.from('activity_logs').insert({
            gallery_id: gallery.id,
            action: `Client submitted selection of ${selectedFileIds.size} photos`
        });

        setSelectionSubmitted(true);
        setGallery({ ...gallery, selection_status: 'submitted' });
        
        alert("Selection submitted successfully! The photographer has been notified.");
    } catch (err) {
        console.error(err);
        alert("Failed to submit selection. Please try again.");
    } finally {
        setSubmittingSelection(false);
    }
  };

  const handleDownload = async (file: GalleryFile) => {
    if (!gallery) return;

    if (gallery.selection_enabled) {
        alert("Downloads are disabled while Selection Mode is active.");
        return;
    }

    const balance = (gallery.agreed_balance || 0) - (gallery.amount_paid || 0);
    
    if (balance > 0) {
      setShowPayModal(true);
      return;
    }

    setDownloadingId(file.id);

    try {
      await supabase.rpc('increment_download', { row_id: file.id });
      
      const response = await fetch(file.file_url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.file_path.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Short timeout to allow the download to start before removing spinner
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (e) {
      console.error('Download failed', e);
      alert('Download failed. Please check your internet connection.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!gallery || !files.length) return;
    
    if (gallery.selection_enabled) {
        alert("Downloads are disabled while Selection Mode is active.");
        return;
    }

    const balance = (gallery.agreed_balance || 0) - (gallery.amount_paid || 0);
    if (balance > 0) {
      setShowPayModal(true);
      return;
    }

    setDownloadingAll(true);
    setDownloadProgress(0);
    setDownloadStatusText('Preparing list...');
    abortControllerRef.current = new AbortController();

    try {
      const zip = new JSZip();
      let processed = 0;
      const total = files.length;
      
      // We process files in batches (Concurrency Limit) to avoid choking the browser/network
      const CONCURRENCY_LIMIT = 3;
      const queue = [...files];
      const activePromises: Promise<void>[] = [];
      const signal = abortControllerRef.current.signal;

      const processFile = async (file: GalleryFile) => {
        if (signal.aborted) return;
        
        try {
          const response = await fetch(file.file_url, { signal });
          if (!response.ok) throw new Error(`Failed to fetch ${file.file_path}`);
          const blob = await response.blob();
          const fileName = file.file_path.split('/').pop() || `file-${file.id}`;
          zip.file(fileName, blob);
        } catch (error: any) {
          if (error.name !== 'AbortError') {
             console.error(`Error downloading file: ${file.id}`, error);
          }
        } finally {
          processed++;
          setDownloadProgress(Math.round((processed / total) * 100));
          setDownloadStatusText(`Fetching files (${processed}/${total})...`);
        }
      };

      // Helper to manage concurrency
      const next = async (): Promise<void> => {
        if (queue.length === 0) return;
        const file = queue.shift();
        if (file) {
           await processFile(file);
           await next();
        }
      };

      // Start initial batch
      for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, files.length); i++) {
         activePromises.push(next());
      }
      
      await Promise.all(activePromises);

      if (signal.aborted) return;

      setDownloadStatusText('Packaging... (almost done)');
      
      // Use STORE compression (no compression) which is MUCH faster for images/videos
      const content = await zip.generateAsync({ 
          type: "blob", 
          compression: "STORE" 
      });
      
      if (signal.aborted) return;

      const galleryName = gallery.client_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      saveAs(content, `${galleryName}_photos.zip`);

    } catch (error) {
      console.error('Error creating zip:', error);
      alert('Failed to download all files. Please try downloading individually.');
    } finally {
      setDownloadingAll(false);
      setDownloadProgress(0);
      setDownloadStatusText('');
      abortControllerRef.current = null;
    }
  };

  const cancelDownloadAll = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          setDownloadingAll(false);
          setDownloadStatusText('');
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full"></div></div>;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-3">Gallery Unavailable</h1>
            <p className="text-slate-600 mb-8 leading-relaxed">{error}</p>
            <div className="pt-6 border-t border-slate-100">
                <p className="text-sm text-slate-400">ProGallery</p>
            </div>
        </div>
      </div>
    );
  }

  const agreedAmount = gallery?.agreed_balance || 0;
  const amountPaid = gallery?.amount_paid || 0;
  const balanceDue = Math.max(0, agreedAmount - amountPaid);
  const isLocked = balanceDue > 0;
  const isSelectionMode = gallery?.selection_enabled;

  const displayedFiles = showFavoritesOnly 
    ? files.filter(f => selectedFileIds.has(f.id))
    : files;

  return (
    <div className={`min-h-screen bg-white select-none ${isSelectionMode ? 'pb-24' : ''}`}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 border-b border-slate-100 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                {showFavoritesOnly && (
                    <button onClick={() => setShowFavoritesOnly(false)} className="md:hidden mr-1 text-slate-400">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                {showFavoritesOnly ? "My Selection" : gallery?.client_name}
            </h1>
            <p className="text-xs md:text-sm text-slate-500 flex items-center gap-2">
                {displayedFiles.length} items 
                <span className="text-slate-300">•</span>
                {timeRemaining === 'Expired' ? (
                   <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs uppercase tracking-wide">Expired</span>
                ) : (
                   <span>Expires in <span className="text-red-500 font-medium">{timeRemaining}</span></span>
                )}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
             {isSelectionMode ? (
                 // Selection Mode Header Content
                 <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-full font-medium border border-rose-200 text-xs md:text-sm animate-in fade-in">
                        <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                        <span>Selection Mode Active</span>
                     </div>
                 </div>
             ) : (
                // Standard Mode Header Content
                <>
                    {/* Download All Button */}
                    <button
                        onClick={handleDownloadAll}
                        disabled={downloadingAll || files.length === 0}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                            isLocked 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : downloadingAll 
                                ? 'bg-slate-100 text-slate-600 cursor-wait'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                    >
                        {downloadingAll ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Preparing...</span>
                            </>
                        ) : (
                            <>
                                <FolderDown className="w-4 h-4" />
                                <span>Download All</span>
                            </>
                        )}
                    </button>

                    {isLocked ? (
                        <div className="flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                            <div className="flex flex-col text-right">
                                <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold">Balance Due</span>
                                <span className="font-bold text-amber-700 text-sm leading-tight">{formatCurrency(balanceDue)}</span>
                            </div>
                            <Lock className="w-4 h-4 text-amber-600" />
                        </div>
                    ) : agreedAmount === 0 ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full font-medium border border-indigo-200 text-xs md:text-sm">
                            <Heart className="w-4 h-4 text-indigo-600" />
                            <span>Collaboration</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-200 text-xs md:text-sm">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Paid in Full</span>
                        </div>
                    )}
                </>
             )}
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-8">
        {isSelectionMode && !showFavoritesOnly && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-3 md:hidden">
                <Heart className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                <p className="text-sm text-rose-800">
                    <strong>Selection Mode:</strong> Tap the heart icon to select your favorites. Downloads are disabled until selection is complete.
                </p>
            </div>
        )}

        {displayedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                {showFavoritesOnly ? (
                    <>
                        <Heart className="w-16 h-16 text-slate-200 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-600">No Favorites Yet</h3>
                        <p className="text-sm mb-6 max-w-xs text-center">Tap the heart icon on photos to add them to your selection.</p>
                        <button 
                            onClick={() => setShowFavoritesOnly(false)}
                            className="text-rose-600 font-medium hover:underline"
                        >
                            Browse Photos
                        </button>
                    </>
                ) : (
                    <>
                        <ImageIcon className="w-16 h-16 text-slate-200 mb-4" />
                        <p>No photos available.</p>
                    </>
                )}
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {displayedFiles.map((file, index) => {
                const isSelected = selectedFileIds.has(file.id);
                return (
                <div 
                    key={file.id} 
                    className={`group relative aspect-square bg-slate-200 rounded-lg overflow-hidden break-inside-avoid ${isSelectionMode && isSelected ? 'ring-4 ring-rose-500' : ''} content-vis-auto`}
                    style={{ contentVisibility: 'auto' }}
                >
                {file.file_type === 'image' ? (
                    <img 
                        src={getOptimizedImageUrl(file.file_url, 400, 400, 30)}
                        srcSet={`
                            ${getOptimizedImageUrl(file.file_url, 150, 150, 25)} 150w,
                            ${getOptimizedImageUrl(file.file_url, 300, 300, 30)} 300w,
                            ${getOptimizedImageUrl(file.file_url, 600, 600, 40)} 600w,
                            ${getOptimizedImageUrl(file.file_url, 900, 900, 50)} 900w
                        `}
                        sizes="(max-width: 640px) 48vw, (max-width: 1024px) 32vw, 24vw"
                        alt="Gallery item" 
                        className="w-full h-full object-cover transition-transform duration-500 md:group-hover:scale-105 pointer-events-none will-change-transform"
                        loading={index < 8 ? "eager" : "lazy"}
                        decoding="async"
                        // @ts-ignore
                        fetchPriority={index < 4 ? "high" : "auto"}
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.removeAttribute('srcset');
                            target.removeAttribute('sizes');
                            if (target.src !== file.file_url) {
                                target.src = file.file_url;
                            }
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                    />
                ) : (
                    <video src={file.file_url} className="w-full h-full object-cover" controls controlsList="nodownload" />
                )}
                
                {/* Desktop Hover Overlay */}
                <div className="hidden md:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-3">
                    {isSelectionMode ? (
                        <button
                            onClick={() => toggleSelection(file)}
                            className={`p-3 rounded-full shadow-lg transform transition-all hover:scale-110 ${isSelected ? 'bg-rose-500 text-white' : 'bg-white text-slate-400 hover:text-rose-500'}`}
                            disabled={selectionSubmitted}
                        >
                            <Heart className={`w-5 h-5 ${isSelected ? 'fill-current' : ''}`} />
                        </button>
                    ) : (
                        <button
                            onClick={() => handleDownload(file)}
                            disabled={downloadingId === file.id}
                            className="bg-white/95 hover:bg-white text-slate-900 px-4 py-2 rounded-full font-medium flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg text-sm disabled:opacity-75 disabled:cursor-wait"
                        >
                            {downloadingId === file.id ? <Loader2 className="w-3 h-3 animate-spin" /> : isLocked ? <Lock className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                            <span>{downloadingId === file.id ? 'Loading...' : (isLocked ? 'Locked' : 'Download')}</span>
                        </button>
                    )}
                </div>

                {/* Mobile Actions */}
                <div className="md:hidden absolute bottom-2 right-2 flex gap-2">
                    {isSelectionMode && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleSelection(file);
                            }}
                            disabled={selectionSubmitted}
                            className={`p-2.5 rounded-full shadow-md backdrop-blur-sm transition-all active:scale-95 border border-white/20 ${isSelected ? 'bg-rose-500 text-white' : 'bg-white/90 text-slate-400'}`}
                        >
                            <Heart className={`w-4 h-4 ${isSelected ? 'fill-current' : ''}`} />
                        </button>
                    )}
                    {!isSelectionMode && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file);
                            }}
                            disabled={downloadingId === file.id}
                            className={`p-2.5 rounded-full shadow-md backdrop-blur-sm transition-all active:scale-95 border border-white/20
                                ${isLocked 
                                    ? 'bg-amber-100/90 text-amber-700' 
                                    : 'bg-white/90 text-slate-900'
                                }`}
                        >
                            {downloadingId === file.id ? <Loader2 className="w-4 h-4 animate-spin" /> : isLocked ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                        </button>
                    )}
                </div>
                </div>
            )})}
            </div>
        )}
      </main>

      {/* Selection Mode Bottom Bar */}
      {isSelectionMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-30">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div 
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    >
                        <div className={`p-2 rounded-full transition-colors ${showFavoritesOnly ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'}`}>
                            <Heart className={`w-5 h-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">{selectedFileIds.size} Selected</p>
                            <p className="text-xs text-slate-500 hidden sm:inline-block">
                                {showFavoritesOnly ? "Showing favorites" : "Tap heart to select"}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm transition-colors"
                    >
                        {showFavoritesOnly ? "Browse All" : "Review"}
                    </button>

                    {selectionSubmitted ? (
                        <div className="flex-1 sm:flex-none bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-medium border border-emerald-200 flex items-center justify-center gap-2 text-sm">
                            <CheckCircle2 className="w-5 h-5" />
                            <span>Submitted</span>
                        </div>
                    ) : (
                        <button 
                            onClick={submitSelection}
                            disabled={submittingSelection || selectedFileIds.size === 0}
                            className="flex-1 sm:flex-none bg-slate-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                        >
                            {submittingSelection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            <span>Submit Selection</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium ${
                toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
            }`}>
                {toast.type === 'success' ? <Heart className="w-4 h-4 fill-current" /> : <Heart className="w-4 h-4" />}
                {toast.message}
            </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Downloads Locked</h3>
            <p className="text-slate-600 mb-6 text-sm">
              You have a remaining balance of <strong className="text-slate-900">{formatCurrency(balanceDue)}</strong>.
              <br/>
              <span className="text-xs text-slate-500 mt-2 block">(Agreed: {formatCurrency(agreedAmount)} - Paid: {formatCurrency(amountPaid)})</span>
            </p>
            <div className="space-y-3">
                <button 
                    onClick={() => setShowPayModal(false)}
                    className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                    Close
                </button>
                <p className="text-xs text-slate-400">Contact your photographer to settle payment.</p>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {downloadingAll && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                        <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
                        <div className="absolute inset-0 border-2 border-slate-200 rounded-full"></div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Preparing Download</h3>
                    <p className="text-sm text-slate-500 mt-1">{downloadStatusText}</p>
                </div>
                
                <div className="mb-6">
                    <div className="flex justify-between text-xs mb-2 font-medium">
                        <span className="text-slate-600">Progress</span>
                        <span className="text-emerald-600">{downloadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-200 ease-out" 
                            style={{ width: `${downloadProgress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-center">
                        Please do not close this window.
                    </p>
                </div>

                <button 
                    onClick={cancelDownloadAll}
                    className="w-full py-2.5 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors text-sm"
                >
                    Cancel
                </button>
            </div>
        </div>
      )}

      {/* Screenshot Warning Modal */}
      {showScreenshotWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="relative">
                <button 
                    onClick={() => setShowScreenshotWarning(false)}
                    className="absolute right-0 top-0 text-slate-400 hover:text-slate-600 p-2"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldAlert className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Screenshotting Not Allowed</h3>
                <p className="text-slate-600 mb-6 text-sm">
                  To protect the photographer's work, screenshots are disabled. 
                  <br/><br/>
                  {isSelectionMode ? (
                      <span className="font-medium text-rose-600">Downloads are currently disabled while Selection Mode is active. Please select your favorites first.</span>
                  ) : (
                      <span>Please {isLocked ? 'complete the payment' : 'use the download button'} to access high-quality versions of these images.</span>
                  )}
                </p>
                <button 
                    onClick={() => setShowScreenshotWarning(false)}
                    className="w-full bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                    I Understand
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};