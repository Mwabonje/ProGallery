import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Upload, Trash2, Save, ExternalLink, RefreshCw, Eye, Lock, Unlock, Download, DollarSign } from 'lucide-react';
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
  const [balance, setBalance] = useState<number>(0);
  const [paid, setPaid] = useState<number>(0);

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
    setBalance(galData.agreed_balance);
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
    if (!event.target.files || !event.target.files.length || !gallery) return;

    setUploading(true);
    const file = event.target.files[0];
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${gallery.id}/${fileName}`;

    try {
      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('gallery-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL (Private bucket would use signed URL, keeping simple for demo structure)
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

      // Refresh list
      fetchGalleryData();
    } catch (error) {
      alert('Error uploading file');
      console.error(error);
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
        .update({ agreed_balance: balance, amount_paid: paid })
        .eq('id', gallery.id);
      
      // Log activity
      await supabase.from('activity_logs').insert({
        gallery_id: gallery.id,
        action: `Payment updated: Paid $${paid} of $${balance}`
      });

      alert('Payment details updated');
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{gallery.client_name}</h1>
          <p className="text-slate-500">Gallery ID: {gallery.id}</p>
        </div>
        <div className="flex items-center gap-3">
            <a 
              href={`/#/g/${gallery.id}`}
              target="_blank" 
              rel="noreferrer"
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
            >
                <ExternalLink className="w-4 h-4" />
                <span>View Public Link</span>
            </a>
            <button
              onClick={toggleStatus}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 text-white transition-colors ${
                gallery.link_enabled ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {gallery.link_enabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              <span>{gallery.link_enabled ? 'Link Active' : 'Link Disabled'}</span>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Agreed Balance</label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                    <input 
                    type="number" 
                    value={balance}
                    onChange={(e) => setBalance(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paid</label>
                <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                    <input 
                    type="number" 
                    value={paid}
                    onChange={(e) => setPaid(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                </div>
              </div>
              
              <div className={`p-3 rounded-lg text-sm ${paid >= balance ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                Status: <strong>{paid >= balance ? 'Paid in Full' : 'Outstanding Balance'}</strong>
              </div>

              <button 
                onClick={updatePayment}
                className="w-full bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-800 flex justify-center items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Update Payment</span>
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
                            <span>Upload File</span>
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