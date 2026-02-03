import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, Trash2, Save, ExternalLink, RefreshCw, Eye, Lock, Unlock, Download, DollarSign, Calculator, Check, Copy, Clock, Loader2, ArrowLeft, Heart, Filter } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Gallery, GalleryFile } from '../types';
import { formatCurrency, formatDate, getOptimizedImageUrl } from '../utils/formatters';
import { useUpload } from '../contexts/UploadContext';
import { useNavigate } from 'react-router-dom';

export const GalleryManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [clientSelections, setClientSelections] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use Global Upload Context
  const { uploading, progress, activeGalleryId, uploadFiles } = useUpload();
  const isUploadingThisGallery = uploading && activeGalleryId === id;
  
  // Track previous uploading state to trigger refresh on completion
  const prevUploadingRef = useRef(uploading);

  // Edit states
  const [agreedAmount, setAgreedAmount] = useState<number>(0);
  const [paid, setPaid] = useState<number>(0);
  const [paymentUpdated, setPaymentUpdated] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  // UI States
  const [viewFilter, setViewFilter] = useState<'all' | 'selected'>('all');

  // Expiration settings (in hours)
  const [expiryHours, setExpiryHours] = useState<number>(24);

  // Load preference specific to this gallery ID
  useEffect(() => {
    if (!id) return;
    try {
        const key = `gallery_expiry_${id}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            setExpiryHours(parseFloat(saved));
        } else {
            setExpiryHours(24);
        }
    } catch {
        setExpiryHours(24);
    }
  }, [id]);

  // Save preference specific to this gallery ID when it changes
  useEffect(() => {
    if (!id) return;
    const key = `gallery_expiry_${id}`;
    localStorage.setItem(key, expiryHours.toString());
  }, [expiryHours, id]);

  useEffect(() => {
    if (id) fetchGalleryData();
  }, [id]);

  // Effect to refresh data when global upload finishes
  useEffect(() => {
    const wasUploading = prevUploadingRef.current;
    if (wasUploading && !uploading) {
        // Upload finished. 
        // Ideally we check if it was *this* gallery, but checking activeGalleryId is tricky because it might be null now.
        // However, a refresh is cheap enough to just do it.
        fetchGalleryData();
    }
    prevUploadingRef.current = uploading;
  }, [uploading]);

  const fetchGalleryData = async () => {
    if (!id) return;
    
    // Get Gallery
    const { data: galData, error: galError } = await supabase
      .from('galleries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (galError) {
      console.error(galError);
      return;
    }
    
    setGallery(galData);
    setAgreedAmount(galData.agreed_balance);
    setPaid(galData.amount_paid);

    // Get Files
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('gallery_id', id)
      .order('created_at', { ascending: false });

    if (fileData) setFiles(fileData);

    // Get Selections
    if (galData.selection_enabled) {
        const { data: selectionData } = await supabase
            .from('selections')
            .select('file_id')
            .eq('gallery_id', id);
        
        if (selectionData) {
            setClientSelections(new Set(selectionData.map(s => s.file_id)));
        }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0 || !gallery) return;

    const filesToUpload = Array.from(fileList);
    
    // Use Context
    await uploadFiles(gallery.id, filesToUpload, expiryHours);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExtendExpiration = async () => {
    if (!gallery || files.length === 0) return;
    
    // Calculate readable expiration time for confirmation
    const newExpiry = new Date();
    newExpiry.setTime(newExpiry.getTime() + expiryHours * 60 * 60 * 1000);
    const formattedTime = newExpiry.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

    const confirmMessage = `Are you sure you want to update the expiration for all ${files.length} files?\n\nThey will be set to expire in ${expiryHours} hours from now (approx ${formattedTime}).\n\nThis will reactivate any currently expired files.`;
    
    if (!window.confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from('files')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('gallery_id', gallery.id);
        
      if (error) throw error;
      
      // Log activity
      await supabase.from('activity_logs').insert({
        gallery_id: gallery.id,
        action: `Extended expiration for ${files.length} files by ${expiryHours} hours`
      });

      await fetchGalleryData();
      alert("Files updated successfully! The link is active again.");
    } catch (error) {
      console.error('Error updating expiration:', error);
      alert('Failed to update expiration.');
    }
  };

  const updatePayment = async () => {
    if (!gallery) return;
    
    try {
      await supabase
        .from('galleries')
        .update({ agreed_balance: agreedAmount, amount_paid: paid })
        .eq('id', gallery.id);
      
      // Log activity
      await supabase.from('activity_logs').insert({
        gallery_id: gallery.id,
        action: `Payment updated: Agreed ${agreedAmount}, Paid ${paid}`
      });

      setPaymentUpdated(true);
      setTimeout(() => setPaymentUpdated(false), 3000);
      
      fetchGalleryData();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleStatus = async () => {
    if (!gallery) return;

    try {
      const newStatus = !gallery.link_enabled;
      await supabase
        .from('galleries')
        .update({ link_enabled: newStatus })
        .eq('id', gallery.id);
      
      setGallery({ ...gallery, link_enabled: newStatus });
    } catch (error) {
      console.error(error);
    }
  };

  const toggleSelectionMode = async () => {
      if (!gallery) return;
      
      try {
          const newStatus = !gallery.selection_enabled;
          await supabase
            .from('galleries')
            .update({ selection_enabled: newStatus })
            .eq('id', gallery.id);
            
          setGallery({ ...gallery, selection_enabled: newStatus });
          
          if (newStatus) {
              fetchGalleryData(); // Fetch selections if turning on
          }
      } catch (error) {
          console.error(error);
      }
  };

  const handleCopyLink = async () => {
    if (!gallery) return;
    const url = `${window.location.origin}/#/g/${gallery.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const deleteFile = async (fileId: string, filePath: string) => {
    if (!confirm('Delete this file permanently?')) return;

    try {
      // Delete from storage
      await supabase.storage.from('gallery-files').remove([filePath]);
      // Delete from DB
      await supabase.from('files').delete().eq('id', fileId);
      
      setFiles(files.filter(f => f.id !== fileId));
    } catch (error) {
      console.error(error);
    }
  };

  if (!gallery) return <div className="p-8">Loading...</div>;

  const remainingBalance = Math.max(0, agreedAmount - paid);
  const isVolunteer = agreedAmount === 0;

  // Filter files based on view
  const visibleFiles = viewFilter === 'selected' 
     ? files.filter(f => clientSelections.has(f.id))
     : files;

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Back Button (Mobile only) */}
        <button onClick={() => navigate('/dashboard')} className="md:hidden flex items-center text-slate-500 hover:text-slate-900 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 break-words">{gallery.client_name}</h1>
            <p className="text-slate-500 text-sm">ID: <span className="font-mono">{gallery.id.slice(0, 8)}...</span></p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
                <button
                onClick={handleCopyLink}
                className="flex-1 md:flex-none justify-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-all active:scale-95 text-sm font-medium shadow-sm"
                >
                {linkCopied ? (
                    <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                    </>
                ) : (
                    <>
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copy Link</span>
                    <span className="inline sm:hidden">Copy</span>
                    </>
                )}
                </button>
                
                <a 
                href={`/#/g/${gallery.id}`}
                target="_blank" 
                rel="noreferrer"
                className="flex-1 md:flex-none justify-center px-4 py-2 bg-slate-900 border border-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2 text-sm font-medium shadow-sm transition-colors whitespace-nowrap"
                >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Client Preview</span>
                    <span className="inline sm:hidden">Preview</span>
                </a>
                
                <button
                onClick={toggleStatus}
                className={`flex-1 md:flex-none justify-center px-4 py-2 rounded-lg flex items-center gap-2 text-white transition-colors text-sm font-medium shadow-sm ${
                    gallery.link_enabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                }`}
                >
                {gallery.link_enabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>{gallery.link_enabled ? 'Active' : 'Disabled'}</span>
                </button>
            </div>
        </div>
      </div>
      
      {/* Notifications Area */}
      {gallery.selection_status === 'submitted' && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="bg-rose-100 p-2 rounded-full">
                      <Heart className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                      <p className="font-semibold text-rose-900">Client Selection Submitted</p>
                      <p className="text-sm text-rose-700">The client has finished selecting {clientSelections.size} photos.</p>
                  </div>
              </div>
              <button 
                onClick={() => setViewFilter('selected')}
                className="text-sm font-medium text-rose-700 hover:text-rose-900 underline"
              >
                  View Selection
              </button>
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column: Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Payment Card */}
          <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-slate-500" />
              Payment & Access
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Total Agreed Amount
                    <span className="text-xs font-normal text-slate-400 ml-2">(Set 0 for volunteer)</span>
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">KES</span>
                    <input 
                    type="number" 
                    value={agreedAmount}
                    onChange={(e) => setAgreedAmount(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="Total amount"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid</label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">KES</span>
                    <input 
                    type="number" 
                    value={paid}
                    onChange={(e) => setPaid(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="Amount received"
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remaining Balance</label>
                <div className="relative bg-slate-50 rounded-lg">
                    <span className="absolute left-3 top-2 text-slate-400">KES</span>
                    <input 
                    type="text" 
                    value={formatCurrency(remainingBalance).replace('KES', '').trim()}
                    disabled
                    className="w-full pl-12 pr-4 py-2 border border-slate-300 bg-slate-100 text-slate-500 rounded-lg outline-none cursor-not-allowed"
                    />
                    <div className="absolute right-3 top-2.5">
                      <Calculator className="w-4 h-4 text-slate-400" />
                    </div>
                </div>
              </div>
              
              <div className={`p-3 rounded-lg text-sm flex items-center justify-between ${
                isVolunteer 
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' 
                    : remainingBalance <= 0 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                <span className="font-medium">
                    {isVolunteer ? 'Volunteer / Collaboration' : (remainingBalance <= 0 ? 'Fully Paid' : 'Outstanding Balance')}
                </span>
                {isVolunteer ? <Heart className="w-4 h-4" /> : (remainingBalance <= 0 ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />)}
              </div>

              <button 
                onClick={updatePayment}
                disabled={paymentUpdated}
                className={`w-full py-2.5 rounded-lg flex justify-center items-center gap-2 transition-all duration-200 font-medium ${
                  paymentUpdated 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {paymentUpdated ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Updated!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Update Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200">
             <h2 className="text-lg font-semibold mb-4">Gallery Settings</h2>
             
             {/* Selection Mode Toggle */}
             <div className="flex items-center justify-between mb-2">
                 <div>
                     <p className="font-medium text-slate-900">Client Selection</p>
                     <p className="text-xs text-slate-500">Allow clients to "heart" photos</p>
                 </div>
                 <button
                    onClick={toggleSelectionMode}
                    className={`w-11 h-6 rounded-full transition-colors relative ${gallery.selection_enabled ? 'bg-rose-500' : 'bg-slate-300'}`}
                 >
                     <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${gallery.selection_enabled ? 'translate-x-5' : ''}`}></div>
                 </button>
             </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4">Gallery Stats</h2>
            <div className="space-y-3 text-sm text-slate-600">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span>Total Files</span>
                    <span className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{files.length}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span>Selected by Client</span>
                    <span className="font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">{clientSelections.size}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span>Total Downloads</span>
                    <span className="font-medium text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{files.reduce((acc, curr) => acc + curr.download_count, 0)}</span>
                </div>
            </div>
          </div>
        </div>

        {/* Right Column: Content */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-slate-200 flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold">Gallery Content</h2>
                        {/* Filter Tabs */}
                        <div className="bg-slate-100 p-1 rounded-lg flex text-xs font-medium">
                            <button 
                                onClick={() => setViewFilter('all')}
                                className={`px-3 py-1 rounded-md transition-all ${viewFilter === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                All ({files.length})
                            </button>
                            <button 
                                onClick={() => setViewFilter('selected')}
                                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${viewFilter === 'selected' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-rose-600'}`}
                            >
                                <Heart className="w-3 h-3" />
                                Selected ({clientSelections.size})
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-200 flex-1 sm:flex-none">
                           <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                           <select 
                             value={expiryHours}
                             onChange={(e) => setExpiryHours(Number(e.target.value))}
                             className="bg-transparent text-sm text-slate-700 outline-none cursor-pointer w-full sm:w-auto"
                             title="Content Expiration"
                             disabled={uploading}
                           >
                             <option value={0.5}>30 Minutes</option>
                             <option value={1}>1 Hour</option>
                             <option value={2}>2 Hours</option>
                             <option value={3}>3 Hours</option>
                             <option value={6}>6 Hours</option>
                             <option value={12}>12 Hours</option>
                             <option value={24}>24 Hours</option>
                             <option value={48}>48 Hours</option>
                             <option value={72}>3 Days</option>
                             <option value={168}>1 Week</option>
                           </select>

                           {files.length > 0 && (
                            <>
                                <div className="w-px h-4 bg-slate-300 mx-1"></div>
                                <button
                                    onClick={handleExtendExpiration}
                                    disabled={uploading}
                                    className="text-slate-400 hover:text-emerald-600 transition-colors p-1 rounded-md hover:bg-emerald-50"
                                    title="Apply this duration to all existing files (Reactivate expired)"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </>
                           )}
                        </div>
                        
                        <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>

                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="image/*,video/*"
                        />
                        
                        {isUploadingThisGallery ? (
                          <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 flex-1 sm:flex-none">
                             <div className="flex flex-col w-full sm:w-32">
                                <div className="flex justify-between text-xs mb-1">
                                   <span className="text-slate-600 font-medium">Uploading...</span>
                                   <span className="text-emerald-600 font-bold">{progress}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                   <div 
                                      className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                                      style={{ width: `${progress}%` }}
                                   />
                                </div>
                             </div>
                          </div>
                        ) : (
                          <button 
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploading} 
                              className={`bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 flex justify-center items-center gap-2 font-medium transition-colors shadow-sm ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                              <Upload className="w-4 h-4" />
                              <span>Upload Files</span>
                          </button>
                        )}
                    </div>
                </div>

                {visibleFiles.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        {viewFilter === 'selected' ? (
                            <>
                                <Heart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                <p>No files selected by the client yet.</p>
                            </>
                        ) : (
                            <>
                                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                <p>No files uploaded yet. Select an expiration time above and upload.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {visibleFiles.map((file) => {
                            const isExpired = new Date(file.expires_at) < new Date();
                            const isSelected = clientSelections.has(file.id);
                            return (
                                <div key={file.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${isSelected ? 'bg-rose-50/50' : ''}`}>
                                    <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                                        <div className="relative w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                                            {file.file_type === 'image' ? (
                                                <img 
                                                  src={getOptimizedImageUrl(file.file_url, 100, 100)} 
                                                  alt="Thumbnail" 
                                                  className="w-full h-full object-cover" 
                                                  onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    if (target.src !== file.file_url) target.src = file.file_url;
                                                  }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50">
                                                    <span className="text-xs">Video</span>
                                                </div>
                                            )}
                                            {isSelected && (
                                                <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center">
                                                    <Heart className="w-6 h-6 text-rose-600 fill-rose-600" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900 truncate flex items-center gap-2">
                                                {file.file_path.split('/').pop()}
                                                {isSelected && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">SELECTED</span>}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">Uploaded: {formatDate(file.created_at)}</p>
                                            <p className={`text-xs mt-0.5 truncate ${isExpired ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                                {isExpired ? 'Expired: ' : 'Expires: '} {formatDate(file.expires_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 md:gap-3 pl-2">
                                        <div className="hidden md:flex text-xs text-slate-400 mr-2 items-center gap-1">
                                            <Download className="w-3 h-3" />
                                            {file.download_count}
                                        </div>
                                        <a href={file.file_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-emerald-600 rounded-full hover:bg-emerald-50 transition-colors">
                                            <Eye className="w-5 h-5 md:w-4 md:h-4" />
                                        </a>
                                        <button 
                                            onClick={() => deleteFile(file.id, file.file_path)}
                                            className="p-2 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5 md:w-4 md:h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};