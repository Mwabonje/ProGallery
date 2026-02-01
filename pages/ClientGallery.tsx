import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Clock, Lock, AlertCircle, X, ShieldAlert, FolderDown, Loader2, Mail, CheckCircle2, Heart } from 'lucide-react';
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
  
  // Download All State
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (galleryId) loadGallery();
  }, [galleryId]);

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

    } catch (err) {
      console.error(err);
      setError('Error loading gallery.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: GalleryFile) => {
    if (!gallery) return;

    const balance = (gallery.agreed_balance || 0) - (gallery.amount_paid || 0);
    
    if (balance > 0) {
      setShowPayModal(true);
      return;
    }

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
    } catch (e) {
      console.error('Download failed', e);
    }
  };

  const handleDownloadAll = async () => {
    if (!gallery || !files.length) return;

    const balance = (gallery.agreed_balance || 0) - (gallery.amount_paid || 0);
    if (balance > 0) {
      setShowPayModal(true);
      return;
    }

    setDownloadingAll(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();
      let processed = 0;

      const promises = files.map(async (file) => {
        try {
          const response = await fetch(file.file_url);
          if (!response.ok) throw new Error(`Failed to fetch ${file.file_path}`);
          const blob = await response.blob();
          const fileName = file.file_path.split('/').pop() || `file-${file.id}`;
          zip.file(fileName, blob);
        } catch (error) {
          console.error(`Error downloading file: ${file.id}`, error);
        } finally {
          processed++;
          setDownloadProgress(Math.round((processed / files.length) * 100));
        }
      });

      await Promise.all(promises);

      const content = await zip.generateAsync({ type: "blob" });
      const galleryName = gallery.client_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      saveAs(content, `${galleryName}_photos.zip`);

    } catch (error) {
      console.error('Error creating zip:', error);
      alert('Failed to download all files. Please try downloading individually.');
    } finally {
      setDownloadingAll(false);
      setDownloadProgress(0);
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

  return (
    <div className="min-h-screen bg-white select-none">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4 flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900">{gallery?.client_name}</h1>
            <p className="text-xs md:text-sm text-slate-500 flex items-center gap-2">
                {files.length} items 
                <span className="text-slate-300">•</span>
                {timeRemaining === 'Expired' ? (
                   <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-xs uppercase tracking-wide">Expired</span>
                ) : (
                   <span>Expires in <span className="text-red-500 font-medium">{timeRemaining}</span></span>
                )}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
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
                        <span>{downloadProgress}%</span>
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
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-2 md:px-4 py-4 md:py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
          {files.map((file) => (
            <div key={file.id} className="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden break-inside-avoid">
              {file.file_type === 'image' ? (
                <img 
                    src={getOptimizedImageUrl(file.file_url, 400, 400)} 
                    alt="Gallery item" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                    loading="lazy"
                    onError={(e) => {
                        // Fallback to original if optimization fails
                        const target = e.target as HTMLImageElement;
                        if (target.src !== file.file_url) {
                            target.src = file.file_url;
                        }
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <video src={file.file_url} className="w-full h-full object-cover" controls controlsList="nodownload" />
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => handleDownload(file)}
                  className="bg-white/95 hover:bg-white text-slate-900 px-4 py-2 rounded-full font-medium flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg text-sm"
                >
                  {isLocked ? <Lock className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                  <span>{isLocked ? 'Locked' : 'Download'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

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
                  Please {isLocked ? 'complete the payment' : 'use the download button'} to access high-quality versions of these images.
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