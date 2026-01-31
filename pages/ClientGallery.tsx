import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Clock, Lock, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Gallery, GalleryFile } from '../types';
import { formatCurrency, getTimeRemaining } from '../utils/formatters';

export const ClientGallery: React.FC = () => {
  const { galleryId } = useParams<{ galleryId: string }>();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    if (galleryId) loadGallery();
  }, [galleryId]);

  // Timer effect
  useEffect(() => {
    if (!files.length) return;
    
    // Find the earliest expiry date (assuming batch upload, they are close)
    const firstFile = files[0];
    
    const timer = setInterval(() => {
        const { hours, minutes, expired } = getTimeRemaining(firstFile.expires_at);
        if (expired) {
            setTimeRemaining('Expired');
        } else {
            setTimeRemaining(`${hours}h ${minutes}m`);
        }
    }, 60000); // Update every minute

    // Initial set
    const { hours, minutes, expired } = getTimeRemaining(firstFile.expires_at);
    if(expired) setTimeRemaining('Expired');
    else setTimeRemaining(`${hours}h ${minutes}m`);

    return () => clearInterval(timer);
  }, [files]);

  const loadGallery = async () => {
    try {
      if (!galleryId) return;

      // 1. Fetch Gallery Details
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
        setError('This gallery is currently unavailable. Please contact your photographer.');
        setLoading(false);
        return;
      }

      setGallery(galData);

      // 2. Fetch Files
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('*')
        .eq('gallery_id', galleryId)
        .gt('expires_at', new Date().toISOString()); // Only fetch non-expired

      if (fileError) throw fileError;
      
      if (!fileData || fileData.length === 0) {
         setError('This gallery has expired or has no files.');
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

    // Payment Check
    if (gallery.amount_paid < gallery.agreed_balance) {
      setShowPayModal(true);
      return;
    }

    try {
      // Increment download count
      await supabase.rpc('increment_download', { row_id: file.id });
      
      // Force browser download
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full"></div></div>;

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
            <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Access Restricted</h1>
            <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const isLocked = gallery && gallery.amount_paid < gallery.agreed_balance;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{gallery?.client_name}</h1>
            <p className="text-sm text-slate-500">
                {files.length} items • Expires in <span className="text-red-500 font-medium">{timeRemaining}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-4">
             {isLocked ? (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-200">
                    <Lock className="w-3 h-3" />
                    <span>Balance Due: {formatCurrency((gallery?.agreed_balance || 0) - (gallery?.amount_paid || 0))}</span>
                 </div>
             ) : (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
                    <span>Paid in Full</span>
                 </div>
             )}
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div key={file.id} className="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden break-inside-avoid">
              {file.file_type === 'image' ? (
                <img 
                    src={file.file_url} 
                    alt="Gallery item" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />
              ) : (
                <video src={file.file_url} className="w-full h-full object-cover" controls />
              )}
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => handleDownload(file)}
                  className="bg-white/90 hover:bg-white text-slate-900 px-6 py-2 rounded-full font-medium flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all"
                >
                  {isLocked ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
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
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Downloads Locked</h3>
            <p className="text-slate-600 mb-6">
              Please clear the remaining balance of <strong>{formatCurrency((gallery?.agreed_balance || 0) - (gallery?.amount_paid || 0))}</strong> to download full resolution files.
            </p>
            <div className="space-y-3">
                <button 
                    onClick={() => setShowPayModal(false)}
                    className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800"
                >
                    Close
                </button>
                <p className="text-xs text-slate-400">Contact your photographer to settle payment.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};