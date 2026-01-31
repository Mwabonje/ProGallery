import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Upload, Trash2, Save, ExternalLink, RefreshCw, Eye, Lock, Unlock, Download, DollarSign, Calculator, Check, Copy } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Gallery, GalleryFile } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export const GalleryManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit states
  // 'balance' here refers to the Total Agreed Amount based on DB schema
  const [agreedAmount, setAgreedAmount] = useState<number>(0);
  const [paid, setPaid] = useState<number>(0);
  const [paymentUpdated, setPaymentUpdated] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (id) fetchGalleryData();
  }, [id]);

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
    setAgreedAmount(galData.agreed_balance); // Mapping agreed_balance to Total Agreed Amount
    setPaid(galData.amount_paid);

    // Get Files
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('gallery_id', id)
      .order('created_at', { ascending: false });

    if (fileData) setFiles(fileData);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0 || !gallery) return;

    setUploading(true);
    
    // Convert FileList to Array
    const filesToUpload = Array.from(fileList);
    let successCount = 0;

    try {
      // Process all uploads in parallel
      await Promise.all(filesToUpload.map(async (file) => {
        try {
          // Use a unique ID for the folder to prevent collisions, 
          // but keep the original filename for display and download.
          const uniqueId = Math.random().toString(36).substring(2);
          // Sanitize filename to ensure it works well in URLs (optional but recommended)
          // We keep it simple to respect "default name" strictly, 
          // but basic cleaning of paths is good practice.
          const fileName = file.name; 
          const filePath = `${gallery.id}/${uniqueId}/${fileName}`;

          // 1. Upload to Storage
          const { error: uploadError } = await supabase.storage
            .from('gallery-files')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // 2. Get Public URL
          const { data: { publicUrl } } = supabase.storage
            .from('gallery-files')
            .getPublicUrl(filePath);

          // 3. Create DB Record
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);

          const { error: dbError } = await supabase
            .from('files')
            .insert([{
              gallery_id: gallery.id,
              file_url: publicUrl,
              file_path: filePath,
              file_type: file.type.startsWith('image/') ? 'image' : 'video',
              expires_at: expiresAt.toISOString()
            }]);

          if (dbError) throw dbError;
          successCount++;
        } catch (err) {
          console.error(`Failed to upload ${file.name}`, err);
        }
      }));

      if (successCount < filesToUpload.length) {
        alert(`Uploaded ${successCount} of ${filesToUpload.length} files. Check console for errors.`);
      }

      // Refresh list
      fetchGalleryData();
    } catch (error) {
      console.error('Batch upload error:', error);
      alert('An error occurred during upload.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{gallery.client_name}</h1>
          <p className="text-slate-500">Gallery ID: {gallery.id}</p>
        </div>
        <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-all active:scale-95"
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
            <a 
              href={`/#/g/${gallery.id}`}
              target="_blank" 
              rel="noreferrer"
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
            >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">View Public Link</span>
                <span className="sm:hidden">View</span>
            </a>
            <button
              onClick={toggleStatus}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-white transition-colors ${
                gallery.link_enabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {gallery.link_enabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span className="hidden sm:inline">{gallery.link_enabled ? 'Link Active' : 'Link Disabled'}</span>
               <span className="sm:hidden">{gallery.link_enabled ? 'Active' : 'Disabled'}</span>
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Payment Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-slate-500" />
              Payment & Access
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total Agreed Amount</label>
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
              
              <div className={`p-3 rounded-lg text-sm flex items-center justify-between ${remainingBalance <= 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                <span className="font-medium">{remainingBalance <= 0 ? 'Fully Paid' : 'Outstanding Balance'}</span>
                {remainingBalance <= 0 && <Unlock className="w-4 h-4" />}
                {remainingBalance > 0 && <Lock className="w-4 h-4" />}
              </div>

              <button 
                onClick={updatePayment}
                disabled={paymentUpdated}
                className={`w-full py-2 rounded-lg flex justify-center items-center gap-2 transition-all duration-200 ${
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

          {/* Stats Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold mb-4">Gallery Stats</h2>
            <div className="space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                    <span>Total Files:</span>
                    <span className="font-medium">{files.length}</span>
                </div>
                <div className="flex justify-between">
                    <span>Total Downloads:</span>
                    <span className="font-medium">{files.reduce((acc, curr) => acc + curr.download_count, 0)}</span>
                </div>
            </div>
          </div>
        </div>

        {/* Right Column: Content */}
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Gallery Content</h2>
                    <div className="flex gap-2">
                         <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="image/*,video/*"
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
                        </button>
                    </div>
                </div>

                {files.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                        <p>No files uploaded yet. Files automatically expire in 24 hours.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {files.map((file) => (
                            <div key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                        {file.file_type === 'image' ? (
                                            <img src={file.file_url} alt="Thumbnail" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-400">Video</div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{file.file_path.split('/').pop()}</p>
                                        <p className="text-xs text-slate-500">Uploaded: {formatDate(file.created_at)}</p>
                                        <p className="text-xs text-red-500">Expires: {formatDate(file.expires_at)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-xs text-slate-400 mr-2 flex items-center gap-1">
                                        <Download className="w-3 h-3" />
                                        {file.download_count}
                                    </div>
                                    <a href={file.file_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-emerald-600">
                                        <Eye className="w-4 h-4" />
                                    </a>
                                    <button 
                                        onClick={() => deleteFile(file.id, file.file_path)}
                                        className="p-2 text-slate-400 hover:text-red-600"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};