import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, Trash2, Save, ExternalLink, RefreshCw, Eye, Lock, Unlock, Download, DollarSign, Calculator, Check, Copy, Clock, Loader2, ArrowLeft, Heart, Filter, FileDown, Edit2, Star, List, LayoutGrid, MessageSquare, Folder, X, QrCode, Flame } from 'lucide-react';

import { toast } from 'sonner';

import { supabase } from '../services/supabase';
import { Gallery, GalleryFile } from '../types';
import { formatCurrency, formatDate, getOptimizedImageUrl, rewriteUrlToR2 } from '../utils/formatters';
import { generateSlug } from '../utils/slug';
import { useUpload } from '../contexts/UploadContext';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';

export const GalleryManager: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [clientSelections, setClientSelections] = useState<string[]>([]);
  const [selectionNotes, setSelectionNotes] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use Global Upload Context
  const { uploading, progress, activeGalleryId, uploadFiles, uploadTasks } = useUpload();
  const isUploadingThisGallery = uploading && activeGalleryId === id;
  
  // Track previous uploading state to trigger refresh on completion
  const prevUploadingRef = useRef(uploading);

  // Edit states
  const [agreedAmount, setAgreedAmount] = useState<number | ''>('');
  const [paid, setPaid] = useState<number | ''>('');
  const [downloadsBeforeClearing, setDownloadsBeforeClearing] = useState<number | ''>('');
  const [paymentUpdated, setPaymentUpdated] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [galleryPassword, setGalleryPassword] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLayout, setEditLayout] = useState<'grid' | 'swipe'>('grid');
  
  // UI States
  const [checkedFiles, setCheckedFiles] = useState<string[]>([]);
  const [isZipping, setIsZipping] = useState(false);
  const [layoutView, setLayoutView] = useState<'list' | 'grid'>('list');
  const [isHeatmapActive, setIsHeatmapActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Rename Modal State
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [renameBaseName, setRenameBaseName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [viewFilter, setViewFilter] = useState<'all' | 'selected' | 'main' | 'extras'>('all');
  const [showEditedIndicator, setShowEditedIndicator] = useState(false);
  const editedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expiration settings (in hours)
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [isDragging, setIsDragging] = useState(false);

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
        fetchGalleryData();
    }
    prevUploadingRef.current = uploading;
  }, [uploading]);

  const fetchGalleryData = async () => {
    if (!id) return;
    
    // Check if new columns exist
    const { error: schemaErr } = await supabase.from('files').select('price, views, clicks').limit(1);
    if (schemaErr && schemaErr.message.includes('column')) {
        setSchemaMissing(true);
    } else {
        // Check if the ad-blocker safe RPC exists
        const { error: rpcErr } = await supabase.rpc('update_file_v', { fid: '00000000-0000-0000-0000-000000000000' });
        const { error: gallerySchemaErr } = await supabase.from('galleries').select('downloads_before_clearing').limit(1);
        if (rpcErr && rpcErr.code === 'PGRST202') {
            setSchemaMissing(true);
        } else if (gallerySchemaErr && gallerySchemaErr.message.includes('column')) {
            setSchemaMissing(true);
        } else {
            setSchemaMissing(false);
        }
    }
    
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
    setAgreedAmount(galData.agreed_balance === 0 ? '' : galData.agreed_balance);
    setPaid(galData.amount_paid === 0 ? '' : galData.amount_paid);
    setDownloadsBeforeClearing(galData.downloads_before_clearing === 0 || !galData.downloads_before_clearing ? '' : galData.downloads_before_clearing);
    setEditClientName(galData.client_name);
    setEditTitle(galData.title);
    setEditCategory(galData.category?.replace(/\s*\[(swipe|grid)\]/gi, '').trim() || '');
    setEditLayout(galData.category?.match(/\[swipe\]/i) ? 'swipe' : 'grid');

    // Get Files
    let allFiles: GalleryFile[] = [];
    let hasMore = true;
    let offset = 0;
    const limit = 1000;
    
    while (hasMore) {
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .select('*')
        .eq('gallery_id', id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
        
      if (fileData) {
          allFiles = [...allFiles, ...fileData];
          if (fileData.length < limit) {
              hasMore = false;
          } else {
              offset += limit;
          }
      } else {
          hasMore = false;
      }
    }

    setFiles(allFiles);

    // Get Selections - Always fetch these so the photographer can see them even if they disabled the mode
    const { data: selectionData } = await supabase
        .from('selections')
        .select('file_id, client_note')
        .eq('gallery_id', id)
        .order('created_at', { ascending: true }); // Important for counting extras
    
    if (selectionData) {
        setClientSelections(selectionData.map(s => s.file_id));
        const notes: Record<string, string> = {};
        selectionData.forEach(s => {
            if (s.client_note) notes[s.file_id] = s.client_note;
        });
        setSelectionNotes(notes);
    }
  };

  const isPortfolio = Boolean(gallery?.category && gallery.category.trim() !== '');
  const isPrintsGallery = Boolean(gallery?.category && gallery.category.toLowerCase().includes('print'));
  
  const [localLimit, setLocalLimit] = useState<number | ''>('');
  useEffect(() => {
    if (gallery?.selection_limit !== undefined) {
      setLocalLimit(gallery.selection_limit || '');
    }
  }, [gallery?.selection_limit]);

  const filterDuplicateFiles = (fileList: FileList) => {
    const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9.\_-]/g, "_");
    const newFiles: File[] = [];
    const duplicateFiles: string[] = [];

    Array.from(fileList).forEach(f => {
        const sanitized = sanitizeName(f.name);
        // Compare with existing file names
        const isDuplicate = files.some(existingFile => {
            const existingName = existingFile.file_path.split('/').pop();
            return existingName === sanitized;
        });
        
        if (isDuplicate) {
            duplicateFiles.push(f.name);
        } else {
            newFiles.push(f);
        }
    });

    if (duplicateFiles.length > 0) {
        if (newFiles.length === 0) {
            alert("All selected files have already been uploaded.");
        } else {
            alert(`${duplicateFiles.length} file(s) are already uploaded and will be skipped.`);
        }
    }
    
    return newFiles;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0 || !gallery) return;

    const filesToUpload = filterDuplicateFiles(fileList);
    if (filesToUpload.length === 0) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }
    
    // Use Context
    await uploadFiles(gallery.id, filesToUpload, isPortfolio ? 876000 : expiryHours);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setIsDragging(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    const fileList = event.dataTransfer.files;
    if (!fileList || fileList.length === 0 || !gallery) return;

    const filesToUpload = filterDuplicateFiles(fileList);
    if (filesToUpload.length === 0) {
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }
    
    // Use Context
    await uploadFiles(gallery.id, filesToUpload, isPortfolio ? 876000 : expiryHours);
    
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
      const { error } = await supabase
        .from('galleries')
        .update({ 
            agreed_balance: Number(agreedAmount) || 0, 
            amount_paid: Number(paid) || 0,
            downloads_before_clearing: Number(downloadsBeforeClearing) || 0
        })
        .eq('id', gallery.id);
      
      if (error) throw error;

      // Log activity
      await supabase.from('activity_logs').insert({
        gallery_id: gallery.id,
        action: `Payment updated: Agreed ${Number(agreedAmount) || 0}, Paid ${Number(paid) || 0}`
      });

      setPaymentUpdated(true);
      setTimeout(() => setPaymentUpdated(false), 3000);
      
      fetchGalleryData();
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Failed to update payment.');
    }
  };

  const updateMeta = async () => {
    if (!gallery) return;
    try {
      let finalCategory = editCategory.replace(/\s*\[(swipe|grid)\]/gi, '').trim();
      if (finalCategory) {
          finalCategory = `${finalCategory} [${editLayout}]`;
      }
      
      const { error } = await supabase
        .from('galleries')
        .update({ client_name: editClientName, title: editTitle, category: finalCategory })
        .eq('id', gallery.id);
      
      if (error) throw error;

      await supabase.from('activity_logs').insert({
        gallery_id: gallery.id,
        action: `Updated gallery details`
      });

      setIsEditingMeta(false);
      fetchGalleryData();
    } catch (error) {
      console.error('Error updating metadata:', error);
      alert('Failed to update details.');
    }
  };

  const updateFileDetails = async (fileId: string, updates: Partial<GalleryFile>) => {
    try {
      const { error } = await supabase
        .from('files')
        .update(updates)
        .eq('id', fileId);
        
      if (error) throw error;
      
      setFiles(files.map(f => f.id === fileId ? { ...f, ...updates } : f));
    } catch (error: any) {
      console.error('Error updating file details:', error);
      alert('Failed to update details. You might need to update your database schema in Supabase SQL Editor. Error: ' + (error?.message || ''));
    }
  };

  const toggleStatus = async () => {
    if (!gallery) return;

    try {
      const newStatus = !gallery.link_enabled;
      
      const updatePayload: any = { link_enabled: newStatus };
      
      if (newStatus && gallery.selection_status === 'submitted') {
          if (window.confirm("The client has already submitted their selection. Do you also want to reopen the selection allowing them to edit/add their selections?")) {
              updatePayload.selection_status = 'pending';
          }
      }
      
      const { error } = await supabase
        .from('galleries')
        .update(updatePayload)
        .eq('id', gallery.id);
      
      if (error) throw error;
      
      setGallery({ ...gallery, ...updatePayload });
    } catch (error: any) {
      console.error('Error toggling status:', error);
      alert('Failed to update gallery status: ' + (error?.message || JSON.stringify(error)));
    }
  };

  const updateSelectionStatus = async (status: boolean | 'pending') => {
      if (!gallery) return;
      try {
          const payload: any = {};
          if (typeof status === 'boolean') {
              payload.link_enabled = status;
          } else {
              payload.selection_status = status;
              payload.link_enabled = true; // ensure it's enabled if we reopen
          }
          const { error } = await supabase.from('galleries').update(payload).eq('id', gallery.id);
          if (error) throw error;
          fetchGalleryData();
      } catch (e: any) {
          console.error(e);
          toast.error("Failed to update status");
      }
  };

  const toggleSelectionMode = async () => {
      if (!gallery) return;
      
      try {
          const newStatus = !gallery.selection_enabled;
          const { error } = await supabase
            .from('galleries')
            .update({ selection_enabled: newStatus })
            .eq('id', gallery.id);
            
          if (error) throw error;
            
          setGallery({ ...gallery, selection_enabled: newStatus });
          // Note: We don't need to fetch selections here anymore because we fetch them unconditionally on load
      } catch (error: any) {
          console.error('Error toggling selection mode:', error);
          alert('Failed to update selection mode: ' + (error?.message || JSON.stringify(error)));
      }
  };

  const updateSeoInfo = async (field: 'seo_title' | 'seo_description', value: string) => {
      if (!gallery) return;
      try {
          const { error } = await supabase
            .from('galleries')
            .update({ [field]: value })
            .eq('id', gallery.id);
          if (error) throw error;
          setGallery({ ...gallery, [field]: value });
      } catch (error: any) {
          console.error(`Error updating ${field}:`, error);
      }
  };

  const updatePassword = async (newPassword: string) => {
      if (!gallery) return;
      try {
          if (!newPassword.trim()) {
              await supabase.from('files').delete().match({ gallery_id: gallery.id, file_path: 'GALLERY_PASSWORD' });
              setGalleryPassword('');
              toast.success("Password protection removed");
              return;
          }

          const { data: existing } = await supabase.from('files').select('id').match({ gallery_id: gallery.id, file_path: 'GALLERY_PASSWORD' }).single();

          if (existing) {
              const { error } = await supabase.from('files').update({ caption: newPassword.trim() }).eq('id', existing.id);
              if (error) throw error;
          } else {
              const { error } = await supabase.from('files').insert([{
                  gallery_id: gallery.id,
                  file_url: 'PASSWORD_SETTING',
                  file_path: 'GALLERY_PASSWORD',
                  file_type: 'image',
                  caption: newPassword.trim(),
                  expires_at: new Date(Date.now() + 100*365*24*60*60*1000).toISOString()
              }]);
              if (error) throw error;
          }
          setGalleryPassword(newPassword.trim());
          toast.success("Password updated");
      } catch (error: any) {
          console.error("Error updating password", error);
          toast.error("Failed to update password");
      }
  };

  const updateSelectionLimit = async (limit: number) => {
      if (!gallery) return;
      try {
          const { error } = await supabase
            .from('galleries')
            .update({ selection_limit: limit })
            .eq('id', gallery.id);
          if (error) throw error;
          setGallery({ ...gallery, selection_limit: limit });
      } catch (error: any) {
          console.error('Error updating selection limit:', error);
          alert('Failed to update: ' + (error?.message || 'Database column selection_limit might be missing.'));
      }
  };

  const handleToggleEdited = async (fileId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_edited: !currentStatus })
        .eq('id', fileId);
        
      if (error) throw error;
      
      // Update local state
      setFiles(files.map(f => f.id === fileId ? { ...f, is_edited: !currentStatus } : f));
      
      setShowEditedIndicator(true);
      if (editedIndicatorTimeoutRef.current) {
          clearTimeout(editedIndicatorTimeoutRef.current);
      }
      editedIndicatorTimeoutRef.current = setTimeout(() => {
          setShowEditedIndicator(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error toggling edited status:', error);
      alert('Failed to update edited status: ' + (error?.message || JSON.stringify(error)));
    }
  };

  const handleSetCover = async (fileId: string) => {
    if (!gallery) return;
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('files')
        .update({ created_at: now })
        .eq('id', fileId);
        
      if (error) throw error;
      
      const updatedFiles = files.map(f => f.id === fileId ? { ...f, created_at: now } : f);
      // Sort in descending order to match database sort
      updatedFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setFiles(updatedFiles);
    } catch (error: any) {
      console.error('Error setting cover:', error);
      alert(`Database Error: ${error.message || 'Error setting cover'}`);
    }
  };


  const handleExportCSV = () => {
    if (!files || files.length === 0) return;
    if (clientSelections.length === 0) {
        alert('No photos selected yet.');
        return;
    }
    
    const selectedFiles = files.filter(f => clientSelections.includes(f.id));
    
    // Create CSV content definition
    const rows = [
      ["File Name", "Uploaded At", "Status", "Edited"],
      ...selectedFiles.map(f => [
        f.file_path.split('/').pop() || 'unknown',
        new Date(f.created_at).toLocaleString(),
        "Selected",
        f.is_edited ? "Yes" : "No"
      ])
    ];

    const csvContent = rows.map(row => 
      row.map(item => `"${String(item).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Create downloaded blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${gallery?.client_name || 'gallery'}_selections.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = async () => {
    if (!gallery) return;
    const slug = generateSlug(gallery.client_name);
    // If it's the netlify app domain, just use the origin + slug.
    const url = `${window.location.origin}/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  
  const handleRenameSelected = () => {
    if (checkedFiles.length === 0) return;
    setRenameBaseName('Gallery');
    setIsRenameModalOpen(true);
  };

  const confirmRenameSelected = async () => {
    if (checkedFiles.length === 0 || !renameBaseName.trim()) return;
    setIsRenaming(true);

    const filesToRename = files.filter(f => checkedFiles.includes(f.id));
    
    try {
        const updates = filesToRename.map((f, i) => {
            const oldName = f.file_path.split('/').pop() || '';
            const ext = oldName.includes('.') ? oldName.substring(oldName.lastIndexOf('.')) : '';
            
            let strippedPattern = renameBaseName.trim();
            if (strippedPattern.includes('.')) {
                strippedPattern = strippedPattern.substring(0, strippedPattern.lastIndexOf('.'));
            }
            
            const seq = String(i + 1).padStart(3, '0');
            const newName = `${strippedPattern}_${seq}${ext}`;
            
            return { id: f.id, title: newName };
        });
        
        for (const update of updates) {
            await supabase.from('files').update({ title: update.title }).eq('id', update.id);
        }
        
        setFiles(prev => prev.map(f => {
            const upd = updates.find(u => u.id === f.id);
            return upd ? { ...f, title: upd.title } : f;
        }));
        
        setCheckedFiles([]);
        setIsRenameModalOpen(false);
    } catch (e) {
        console.error("Rename failed", e);
        alert("Failed to rename files");
    } finally {
        setIsRenaming(false);
    }
  };

  const handleCheckAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setCheckedFiles(visibleFiles.map(f => f.id));
    } else {
      setCheckedFiles([]);
    }
  };

  const handleCheckFile = (fileId: string) => {
    setCheckedFiles(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const handleDeleteSelected = async () => {
    if (checkedFiles.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${checkedFiles.length} selected files?`)) return;

    try {
      const filesToDelete = files.filter(f => checkedFiles.includes(f.id));
      
      // Delete from storage
      const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
      
      const filePaths = filesToDelete.map(f => f.file_path);
      
      await fetch(isNetlify ? '/.netlify/functions/delete-file' : '/api/delete-file', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ filePaths })
      });
      
      // Delete from DB
      await supabase.from('files').delete().in('id', checkedFiles);
      
      setFiles(files.filter(f => !checkedFiles.includes(f.id)));
      setCheckedFiles([]);
    } catch (error) {
      console.error(error);
      alert("Error deleting some files");
    }
  };

  const handleDownloadZip = async () => {
    if (checkedFiles.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const filesToDownload = files.filter(f => checkedFiles.includes(f.id));
      
      for (let i = 0; i < filesToDownload.length; i++) {
        const file = filesToDownload[i];
        try {
          const response = await fetch(rewriteUrlToR2(file.file_url));
          const blob = await response.blob();
          const filename = file.title || file.file_path.split('/').pop() || `file_${i}`;
          zip.file(filename, blob);
        } catch (e) {
          console.error("Failed to fetch file for zip", e);
        }
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${gallery?.client_name || 'gallery'}_selected.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Zip generation failed", error);
      alert("Failed to create ZIP file");
    } finally {
      setIsZipping(false);
    }
  };

  const deleteFile = async (fileId: string, filePath: string) => {
    if (!confirm('Delete this file permanently?')) return;

    try {
      // Delete from storage
      const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
      await fetch(isNetlify ? '/.netlify/functions/delete-file' : '/api/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      // Delete from DB
      await supabase.from('files').delete().eq('id', fileId);
      
      setFiles(files.filter(f => f.id !== fileId));
    } catch (error) {
      console.error(error);
    }
  };

  if (!gallery) return (
      <div className="p-8 flex justify-center items-center h-[50vh]">
          <div className="w-8 h-8 relative flex items-center justify-center">
              <div className="absolute inset-0 border border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border border-slate-900 border-r-transparent rounded-full animate-spin"></div>
          </div>
      </div>
  );

  const remainingBalance = Math.max(0, Number(agreedAmount || 0) - Number(paid || 0));
  const isVolunteer = Number(agreedAmount || 0) === 0;

  const limit = gallery?.selection_limit || 0;
  const mainSelections = limit > 0 ? clientSelections.slice(0, limit) : clientSelections;
  const extraSelections = limit > 0 ? clientSelections.slice(limit) : [];

  let visibleFiles = files;
  if (viewFilter === 'selected') visibleFiles = files.filter(f => clientSelections.includes(f.id));
  if (viewFilter === 'main') visibleFiles = files.filter(f => mainSelections.includes(f.id));
  if (viewFilter === 'extras') visibleFiles = files.filter(f => extraSelections.includes(f.id));

  const maxViews = Math.max(...visibleFiles.map(f => f.views || 0), 1);
  const maxClicks = Math.max(...visibleFiles.map(f => f.clicks || 0), 1);
  const editedCount = files.filter(f => f.is_edited).length;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans pb-20">
      {schemaMissing && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded text-rose-700 mb-6 mx-4 md:mx-8 mt-4">
          <h3 className="font-bold text-lg">Database Schema Update Required</h3>
          <p className="mt-1">
             The prints features cannot be saved correctly because some database columns are missing.
             To fix this, please run the following SQL command in your <strong>Supabase SQL Editor</strong>:
          </p>
          <pre className="bg-rose-100 p-3 rounded mt-2 text-[10px] sm:text-xs font-mono text-rose-900 border border-rose-200 overflow-x-auto whitespace-pre-wrap">
            ALTER TABLE public.files ADD COLUMN IF NOT EXISTS title text;{'\n'}
            ALTER TABLE public.files ADD COLUMN IF NOT EXISTS description text;{'\n'}
            ALTER TABLE public.files ADD COLUMN IF NOT EXISTS print_size text;{'\n'}
            ALTER TABLE public.files ADD COLUMN IF NOT EXISTS material text;{'\n'}
            ALTER TABLE public.files ADD COLUMN IF NOT EXISTS price text;{'\n'}
            ALTER TABLE public.files ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;{'\n'}
            ALTER TABLE public.files ADD COLUMN IF NOT EXISTS clicks integer DEFAULT 0;{'\n'}
            ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS downloads_before_clearing integer DEFAULT 0;{'\n'}
{'\n'}
            -- Create RPC function to increment views with ad-blocker safe names{'\n'}
            CREATE OR REPLACE FUNCTION update_file_v(fid uuid) RETURNS void AS $\n
            BEGIN{'\n'}
              UPDATE files SET views = COALESCE(views, 0) + 1 WHERE id = fid;{'\n'}
            END;{'\n'}
            $$ LANGUAGE plpgsql SECURITY DEFINER;{'\n'}
{'\n'}
            -- Create RPC function to increment clicks with ad-blocker safe names{'\n'}
            CREATE OR REPLACE FUNCTION update_file_c(fid uuid) RETURNS void AS $\n
            BEGIN{'\n'}
              UPDATE files SET clicks = COALESCE(clicks, 0) + 1 WHERE id = fid;{'\n'}
            END;{'\n'}
            $$ LANGUAGE plpgsql SECURITY DEFINER;{'\n'}
          </pre>
          <p className="mt-2 text-sm italic">After running this command, refresh this page so that the data saves successfully.</p>
        </div>
      )}

      {/* Topbar */}
      <div className="flex justify-between items-end mb-6 flex-wrap gap-4 pt-6 md:pt-10">
        <div>
            {isEditingMeta ? (
                <div className="space-y-3 w-full max-w-xl mb-4">
                    <input
                        type="text"
                        value={editClientName}
                        onChange={(e) => setEditClientName(e.target.value)}
                        placeholder="Gallery Name / Client Name"
                        className="w-full text-3xl font-serif font-medium tracking-tight text-slate-900 border-b border-slate-300 focus:border-slate-900 focus:outline-none bg-transparent pb-1"
                    />
                    <textarea
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Description or Subtitle (e.g., Print Details)"
                        rows={2}
                        className="w-full text-slate-600 border border-slate-200 rounded-[3px] p-2 text-[13px] focus:border-slate-300 focus:outline-none resize-none bg-white"
                    />
                    <input
                        type="text"
                        list="gallery-category-options"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        placeholder="Category (e.g. Wedding, Portraits...)"
                        className="w-full text-slate-700 border border-slate-200 rounded-[3px] p-2 text-[13px] focus:border-slate-300 focus:outline-none bg-white"
                    />
                    <datalist id="gallery-category-options">
                        {["Wedding", "Portraits", "Couples", "Commercial", "Events", "Maternity", "Boudoir", "Fine Art", "Prints"].map(cat => (
                            <option key={cat} value={cat} />
                        ))}
                    </datalist>
                    {editCategory.trim() !== '' && (
                        <select
                            value={editLayout}
                            onChange={(e) => setEditLayout(e.target.value as 'grid' | 'swipe')}
                            className="w-full text-slate-700 border border-slate-200 rounded-[3px] p-2 text-[13px] focus:border-slate-300 focus:outline-none bg-white"
                        >
                            <option value="grid">Grid Layout (Vertical Scroll)</option>
                            <option value="swipe">Swipe Layout (Horizontal Scroll)</option>
                        </select>
                    )}
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={updateMeta}
                            className="font-sans text-[12.5px] font-medium px-4 py-2 rounded-[3px] bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                        >
                            Save Details
                        </button>
                        <button
                            onClick={() => {
                                setIsEditingMeta(false);
                                setEditClientName(gallery.client_name);
                                setEditTitle(gallery.title);
                                setEditCategory(gallery?.category?.replace(/\s*\[(swipe|grid)\]/gi, '').trim() || '');
                                setEditLayout(gallery?.category?.match(/\[swipe\]/i) ? 'swipe' : 'grid');
                            }}
                            className="font-sans text-[12.5px] font-medium px-4 py-2 rounded-[3px] border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="group flex items-start gap-3">
                    <div>
                        <h1 className="font-serif text-3xl font-medium tracking-tight text-slate-900 mb-1 flex items-center gap-3">
                            {gallery.client_name}
                            {gallery.category && (
                                <span className="text-[10px] font-sans font-bold tracking-widest uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded-sm">
                                    {gallery.category?.replace(/\s*\[(swipe|grid)\]/gi, '')}
                                </span>
                            )}
                        </h1>
                        <div className="font-mono text-[11.5px] text-slate-500">ID · {gallery.id.slice(0, 8)}</div>
                    </div>
                    <button
                        onClick={() => setIsEditingMeta(true)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-[3px] opacity-0 group-hover:opacity-100 transition-all mt-1"
                        title="Edit Details"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleCopyLink} className="font-sans text-[12.5px] font-medium px-3.5 py-2 rounded-[3px] border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5">
            {linkCopied ? <><Check className="w-3.5 h-3.5 text-emerald-600"/> <span className="text-emerald-600">Copied</span></> : <><Copy className="w-3.5 h-3.5"/> Copy link</>}
          </button>
          <a href={`/${gallery.id}/display`} target="_blank" rel="noreferrer" className="font-sans text-[12.5px] font-medium px-3.5 py-2 rounded-[3px] border border-indigo-50 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors inline-flex items-center gap-1.5">
            <LayoutGrid className="w-3.5 h-3.5" /> Live display
          </a>
          <a href={`/${gallery.id}`} target="_blank" rel="noreferrer" className="font-sans text-[12.5px] font-medium px-3.5 py-2 rounded-[3px] border border-slate-900 bg-slate-900 text-white hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Client preview
          </a>
          <button onClick={() => {
              if (gallery.selection_status === 'submitted') {
                  if (window.confirm("The client has already submitted their selection. Do you want to reopen it?")) {
                      updateSelectionStatus('pending');
                  }
              } else {
                  updateSelectionStatus(!gallery.link_enabled);
              }
          }} className={`font-sans text-[12.5px] font-medium px-3.5 py-2 rounded-[3px] border transition-colors inline-flex items-center gap-1.5 ${!gallery.link_enabled || gallery.selection_status === 'submitted' ? 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'}`}>
             {!gallery.link_enabled ? <Lock className="w-3.5 h-3.5" /> : gallery.selection_status === 'submitted' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
             {!gallery.link_enabled ? 'Disabled' : gallery.selection_status === 'submitted' ? 'Locked (Submitted)' : 'Active'}
          </button>
        </div>
      </div>

      {/* Banner */}
      {!isPortfolio && gallery.selection_status === 'submitted' && (
          <div className="flex justify-between items-center bg-rose-50 border border-rose-200 border-l-[3px] border-l-rose-600 rounded-[3px] px-4 py-3.5 mb-6 flex-wrap gap-4">
            <div>
              <div className="text-[13.5px] font-semibold text-rose-900 mb-0.5">Client selection submitted</div>
              <div className="text-[12.5px] text-rose-700">The client has finished selecting <b className="text-rose-900 font-bold">{clientSelections.length} photos</b>.</div>
            </div>
            <div className="text-[12px] flex gap-4 whitespace-nowrap">
              <button onClick={() => setViewFilter('selected')} className="text-rose-900 underline underline-offset-2 hover:text-rose-700">View selection</button>
              <button onClick={() => updateSelectionStatus('pending')} className="text-rose-900 underline underline-offset-2 hover:text-rose-700">Reopen selection</button>
            </div>
          </div>
      )}

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[296px_1fr] gap-7 items-start">
        
        {/* Left Column */}
        <div className="flex flex-col">
          
          {!isPortfolio && (
            <div className="bg-white border border-slate-200 rounded-[4px] p-5 mb-5">
              <h2 className="font-serif font-medium text-[17px] mb-4 flex items-center gap-2 text-slate-900">
                <span className="text-[14px] opacity-60">●</span> Payment & access
              </h2>
              <div className="mb-4">
                <label className="block text-[11.5px] text-slate-500 mb-1.5 font-medium">Total agreed amount <span className="font-normal text-slate-400">— set 0 for volunteer</span></label>
                <input 
                    type="number" 
                    value={agreedAmount}
                    onChange={(e) => setAgreedAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="KES 0"
                    className="w-full font-sans text-[13px] px-2.5 py-2 border border-slate-200 rounded-[3px] bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:bg-white"
                />
              </div>
              <div className="mb-4">
                <label className="block text-[11.5px] text-slate-500 mb-1.5 font-medium">Amount paid</label>
                <input 
                    type="number" 
                    value={paid}
                    onChange={(e) => setPaid(e.target.value ? Number(e.target.value) : '')}
                    placeholder="KES 0"
                    className="w-full font-sans text-[13px] px-2.5 py-2 border border-slate-200 rounded-[3px] bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:bg-white"
                />
              </div>
              <div className="mb-[14px]">
                <label className="block text-[11.5px] text-slate-500 mb-1.5 font-medium">Remaining balance</label>
                <input 
                    type="text"
                    value={Math.max(0, (Number(agreedAmount) || 0) - (Number(paid) || 0))}
                    disabled
                    placeholder="KES 0"
                    className="w-full font-sans text-[13px] px-2.5 py-2 border border-slate-200 rounded-[3px] bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
              {(Number(agreedAmount) || 0) === 0 && (
                <div className="inline-flex items-center gap-1.5 text-[12px] text-indigo-600 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full mb-[14px] font-medium">
                  ♡ Volunteer / collaboration
                </div>
              )}
              <button 
                onClick={updatePayment}
                className="w-full justify-center font-sans text-[12.5px] font-medium px-4 py-2 rounded-[3px] bg-slate-900 text-white hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 mt-4"
              >
                {paymentUpdated ? <Check className="w-4 h-4" /> : 'Update payment'}
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-[4px] p-5 mb-5">
            <h2 className="font-serif font-medium text-[17px] mb-4 flex items-center gap-2 text-slate-900">
              <span className="text-[14px] opacity-60">●</span> Gallery settings
            </h2>

            {!isPortfolio && (
                <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <label className="block text-[11.5px] text-slate-500 mb-1 font-medium">Client selection</label>
                    <div className="text-[11px] text-slate-400 mt-1 max-w-[190px] leading-[1.4]">When enabled, clients can favourite photos but cannot download them.</div>
                  </div>
                  <button 
                    onClick={() => updateSelectionStatus(!gallery.link_enabled)}
                    className={`relative w-9 h-5 shrink-0 rounded-full transition-colors ${!gallery.link_enabled ? 'bg-emerald-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-white transition-all ${!gallery.link_enabled ? 'right-[2px]' : 'left-[2px]'}`}></div>
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-[11.5px] text-slate-500 mb-1.5 font-medium">Client unlock PIN</label>
                  <input 
                      type="text" 
                      value={gallery.id.split('-')[0].slice(0, 4).toUpperCase()}
                      readOnly
                      className="w-full font-sans text-[13px] px-2.5 py-2 border border-slate-200 rounded-[3px] bg-slate-100 text-slate-600 cursor-not-allowed"
                  />
                  <div className="text-[11px] text-slate-400 mt-1.5 leading-[1.4]">Share this PIN with clients if they need to unlock submitted selections.</div>
                </div>

                <div className="mb-4">
                  <label className="block text-[11.5px] text-slate-500 mb-1.5 font-medium">Agreed number of photos</label>
                  <input 
                      type="number" 
                      value={localLimit}
                      onChange={(e) => setLocalLimit(e.target.value ? Number(e.target.value) : '')}
                      onBlur={() => updateSelectionLimit(Number(localLimit) || 0)}
                      placeholder="Unlimited"
                      className="w-full font-sans text-[13px] px-2.5 py-2 border border-slate-200 rounded-[3px] bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:bg-white"
                  />
                  <div className="text-[11px] text-slate-400 mt-1.5 leading-[1.4]">Set to 0 or leave blank for unlimited. If greater than 0, clients are asked to confirm before selecting extras.</div>
                </div>
                </>
            )}

            <div className="mb-4">
              <label className="block text-[11.5px] text-slate-500 mb-1.5 font-medium">Password protection</label>
              <div className="flex gap-2">
                  <input 
                      type="text" 
                      placeholder="Leave blank for public"
                      defaultValue={gallery.password || ''}
                      onBlur={(e) => {
                          if (e.target.value !== (gallery.password || '')) {
                              supabase.from('galleries').update({ password: e.target.value }).eq('id', gallery.id).then(() => fetchGalleryData());
                          }
                      }}
                      className="w-full font-sans text-[13px] px-2.5 py-2 border border-slate-200 rounded-[3px] bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:bg-white"
                  />
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5 leading-[1.4]">If set, visitors must enter this password to view the gallery.</div>
            </div>

            <div className="mb-4">
              <label className="block text-[11.5px] text-slate-500 mb-1.5 font-medium">Link Expiration (Hours)</label>
              <div className="flex gap-2">
                  <input 
                      type="number"
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(Number(e.target.value))}
                      className="w-full font-sans text-[13px] px-2.5 py-2 border border-slate-200 rounded-[3px] bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:bg-white"
                  />
                  <button 
                    onClick={handleExtendExpiration}
                    className="shrink-0 font-sans text-[12.5px] font-medium px-3 py-2 rounded-[3px] border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors"
                  >
                    Apply
                  </button>
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5 leading-[1.4]">Updates all files to expire N hours from now.</div>
            </div>
            
            {isPrintsGallery && (
                <div className="mb-0">
                  <label className="block text-[11.5px] text-slate-500 mb-1.5 font-medium">Downloads before clearing <span className="font-normal text-slate-400">— e.g. for prints</span></label>
                  <div className="flex gap-2">
                      <input 
                          type="number"
                          value={downloadsBeforeClearing}
                          onChange={(e) => setDownloadsBeforeClearing(e.target.value ? Number(e.target.value) : '')}
                          placeholder="0 = Unlimited"
                          className="w-full font-sans text-[13px] px-2.5 py-2 border border-slate-200 rounded-[3px] bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-300 focus:bg-white"
                      />
                      <button 
                        onClick={updatePayment}
                        className="shrink-0 font-sans text-[12.5px] font-medium px-3 py-2 rounded-[3px] border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        Save
                      </button>
                  </div>
                </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-[4px] p-5 mb-5">
            <h2 className="font-serif font-medium text-[17px] mb-4 flex items-center gap-2 text-slate-900">
              <span className="text-[14px] opacity-60">●</span> Gallery stats
            </h2>
            <div className="flex justify-between items-baseline py-2.5 border-b border-slate-100 text-[13px] text-slate-700">
                <span>Total files</span><span className="font-serif text-[17px] text-slate-900">{files.length}</span>
            </div>
            {!isPortfolio && (
                <div className="flex justify-between items-baseline py-2.5 border-b border-slate-100 text-[13px] text-slate-700">
                    <span>Selected by client</span><span className="font-serif text-[17px] text-rose-600">{clientSelections.length}</span>
                </div>
            )}
            <div className="flex justify-between items-baseline py-2.5 text-[13px] text-slate-700">
                <span>Total downloads</span><span className="font-serif text-[17px] text-slate-900">{files.reduce((acc, f) => acc + (f.download_count || 0), 0)}</span>
            </div>
            
            <button 
               onClick={() => {
                  const csvRows = [
                      ["Filename", "Client Selected", "Main Selection", "Extra Selection", "Edited", "Downloads"],
                      ...files.map(f => [
                          (f.file_url.split('/').pop() || 'file'),
                          clientSelections.includes(f.id) ? 'Yes' : 'No',
                          mainSelections.includes(f.id) ? 'Yes' : 'No',
                          limit > 0 && clientSelections.indexOf(f.id) >= limit ? 'Yes' : 'No',
                          f.is_edited ? 'Yes' : 'No',
                          f.download_count || 0
                      ])
                  ];
                  const csvContent = csvRows.map(e => e.join(",")).join("\n");
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement("a");
                  const url = URL.createObjectURL(blob);
                  link.setAttribute("href", url);
                  link.setAttribute("download", `${gallery.client_name.replace(/\s+/g, '_')}_selections.csv`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
               }}
               className="w-full justify-center mt-4 font-sans text-[12.5px] font-medium px-4 py-2 rounded-[3px] border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5"
            >
               Export selections (CSV)
            </button>
          </div>

        </div>

        {/* Right Column */}
        <div className="bg-white border border-slate-200 rounded-[4px] overflow-hidden flex flex-col relative min-h-[600px]">
          <div className="px-5 pt-5 pb-4 flex justify-between items-center border-b border-slate-200 flex-wrap gap-4">
            <h2 className="font-serif font-medium text-[18px] m-0 text-slate-900">Gallery content</h2>
            <div className="flex items-center gap-2">
                <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    accept="image/*,video/*"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-emerald-600 text-white border-none text-[12.5px] font-medium px-4 py-2 rounded-[3px] inline-flex items-center gap-1.5 hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" /> Upload files
                </button>
            </div>
          </div>

          <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-200 flex-wrap gap-2.5">
            <div className="flex gap-1.5 flex-wrap">
              <div onClick={() => setViewFilter('all')} className={`text-[12px] px-3 py-1.5 rounded-full border cursor-pointer font-medium transition-all ${viewFilter === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>All ({files.length})</div>
              <div onClick={() => setViewFilter('selected')} className={`text-[12px] px-3 py-1.5 rounded-full border cursor-pointer font-medium transition-all ${viewFilter === 'selected' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Selected ({clientSelections.length})</div>
              {limit > 0 && (
                  <>
                  <div onClick={() => setViewFilter('main')} className={`text-[12px] px-3 py-1.5 rounded-full border cursor-pointer font-medium transition-all ${viewFilter === 'main' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Main ({mainSelections.length})</div>
                  <div onClick={() => setViewFilter('extras')} className={`text-[12px] px-3 py-1.5 rounded-full border cursor-pointer font-medium transition-all ${viewFilter === 'extras' ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>Extras ({extraSelections.length})</div>
                  </>
              )}
            </div>
            <div className="flex items-center gap-3.5 text-[12px] text-slate-500">
               <button onClick={() => setIsExtendModalOpen(true)} className="p-1 hover:bg-slate-100 rounded text-slate-500 transition-colors" title="Reactivate / Extend Expiry">
                  <RefreshCw className="w-3.5 h-3.5" />
               </button>
            </div>
          </div>
          
          {uploading && (
             <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[13px] font-medium text-slate-700 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-emerald-600"/> Uploading...</span>
                    <span className="text-[13px] font-medium text-emerald-600">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
             </div>
          )}

          {files.length === 0 ? (
            <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const fileList = e.dataTransfer.files;
                    if (!fileList || fileList.length === 0) return;
                    const filesToUpload = filterDuplicateFiles(fileList);
                    if (filesToUpload.length > 0) {
                        uploadFiles(gallery.id, filesToUpload, isPortfolio ? 876000 : expiryHours);
                    }
                }}
                className={`flex-1 flex flex-col items-center justify-center p-12 text-center transition-colors ${isDragging ? 'bg-emerald-50/50' : 'bg-transparent'}`}
            >
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Upload className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No files uploaded yet</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                    Drag and drop your photos and videos here, or click the upload button to get started.
                </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-[26px_minmax(56px,1fr)_100px_90px_84px] md:grid-cols-[26px_56px_1fr_100px_90px_84px] gap-3.5 px-5 py-2.5 text-[10.5px] tracking-[0.06em] uppercase text-slate-400 border-b border-slate-200 font-semibold sticky top-0 bg-white z-10 hidden md:grid">
                <input 
                    type="checkbox" 
                    checked={visibleFiles.length > 0 && checkedFiles.length === visibleFiles.length}
                    onChange={handleCheckAll}
                    className="w-[15px] h-[15px] accent-emerald-600 cursor-pointer"
                />
                <span></span>
                <span>File</span>
                <span>Status</span>
                <span>Uploaded</span>
                <span></span>
              </div>

              {visibleFiles.map((file) => {
                 const isSelected = clientSelections.includes(file.id);
                 return (
                    <div key={file.id} className={`grid grid-cols-[26px_minmax(0,1fr)_50px] md:grid-cols-[26px_56px_minmax(0,1fr)_100px_90px_84px] gap-3.5 px-5 py-3 items-center border-b border-slate-100 hover:bg-slate-50 transition-colors ${checkedFiles.includes(file.id) ? 'bg-indigo-50/30' : isSelected ? 'bg-emerald-50/20' : ''}`}>
                        <input 
                            type="checkbox" 
                            checked={checkedFiles.includes(file.id)}
                            onChange={() => handleCheckFile(file.id)}
                            className="w-[15px] h-[15px] accent-emerald-600 cursor-pointer shrink-0"
                        />
                        <div className="hidden md:block w-11 h-11 rounded-[6px] bg-slate-200 shrink-0 overflow-hidden relative shadow-[inset_0_0_1px_rgba(0,0,0,0.2)]">
                            {file.file_type === 'image' ? (
                                <img 
                                    src={file.thumbnail_url ? getOptimizedImageUrl(file.thumbnail_url, 100, 100) : getOptimizedImageUrl(file.file_url, 100, 100)}
                                    alt="Thumbnail" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (!target.dataset.retried) {
                                            target.dataset.retried = 'true';
                                            target.src = file.thumbnail_url ? rewriteUrlToR2(file.thumbnail_url) : rewriteUrlToR2(file.file_url);
                                        }
                                    }}
                                />
                            ) : (
                                <video 
                                    src={`${rewriteUrlToR2(file.file_url)}#t=0.001`} 
                                    className="w-full h-full object-cover"
                                    preload="metadata"
                                    muted playsInline loop
                                />
                            )}
                        </div>
                        
                        <div className="min-w-0">
                            <div className="font-mono text-[12.5px] font-medium text-slate-900 truncate" title={(file.file_url.split('/').pop() || 'file')}>{(file.file_url.split('/').pop() || 'file')}</div>
                            <div className="md:hidden text-[11px] text-slate-500 mt-0.5">{new Date(file.created_at).toLocaleDateString()} &middot; {new Date(file.created_at).toLocaleTimeString([], {timeStyle: 'short'})}</div>
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {isSelected && <span className="text-[9.5px] font-semibold tracking-[0.04em] px-2 py-0.5 rounded-full uppercase bg-emerald-600 text-white">Selected</span>}
                                {file.is_edited && <span className="text-[9.5px] font-semibold tracking-[0.04em] px-2 py-0.5 rounded-full uppercase bg-indigo-50 text-indigo-600">Edited</span>}
                            </div>
                        </div>

                        <div className="hidden md:block">
                            {file.is_edited ? (
                                <span className="text-[11.5px] font-medium text-slate-500 cursor-pointer hover:text-slate-900" onClick={() => handleToggleEdited(file.id, true)}>Edited</span>
                            ) : (
                                <span className="text-[11.5px] font-medium text-slate-400 cursor-pointer hover:text-slate-900" onClick={() => handleToggleEdited(file.id, false)}>—</span>
                            )}
                            {file.expires_at && new Date(file.expires_at) < new Date() && (
                                <div className="text-[10.5px] text-rose-600 font-semibold mt-0.5">Expired</div>
                            )}
                        </div>

                        <div className="hidden md:block text-[11px] text-slate-500">
                            {new Date(file.created_at).toLocaleTimeString([], {timeStyle: 'short'})}
                        </div>

                        <div className="flex gap-2.5 justify-end text-[13px] text-slate-500 ml-auto md:ml-0">
                            {isPortfolio && (
                                <button
                                    onClick={() => handleSetCover(file.id)}
                                    className={`hover:text-slate-900 transition-colors ${file.id === files[0]?.id ? 'text-slate-900' : ''}`}
                                    title={file.id === files[0]?.id ? "Current Cover" : "Set as Cover"}
                                >
                                    <Star className={`w-4 h-4 ${file.id === files[0]?.id ? 'fill-current' : ''}`} />
                                </button>
                            )}
                            <a href={rewriteUrlToR2(file.file_url)} target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors" title="View Original">
                                <Eye className="w-4 h-4" />
                            </a>
                            <a href={rewriteUrlToR2(file.file_url)} download target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors hidden md:block" title="Download">
                                <Download className="w-4 h-4" />
                            </a>
                            <button onClick={() => deleteFile(file.id, file.file_path)} className="hover:text-rose-600 transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                 );
              })}
            </div>
          )}
        </div>

      </div>

      {checkedFiles.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-full shadow-[0_20px_40px_rgb(0,0,0,0.2)] z-50 animate-in slide-in-from-bottom-8">
              <span className="font-semibold text-sm whitespace-nowrap">{checkedFiles.length} selected</span>
              <div className="w-px h-4 bg-slate-700 mx-1"></div>
              <button
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="flex items-center gap-2 text-sm font-medium hover:text-indigo-300 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                  {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                  <span>{isZipping ? 'Zipping...' : 'Download'}</span>
              </button>
              <button
                  onClick={() => setIsRenameModalOpen(true)}
                  disabled={isZipping}
                  className="flex items-center gap-2 text-sm font-medium hover:text-white disabled:opacity-50 transition-colors whitespace-nowrap hidden sm:flex"
              >
                  <Edit2 className="w-4 h-4" />
                  <span>Rename</span>
              </button>
              <button
                  onClick={handleDeleteSelected}
                  disabled={isZipping}
                  className="flex items-center gap-2 text-sm font-medium text-rose-400 hover:text-rose-300 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
              </button>
              <div className="w-px h-4 bg-slate-700 mx-1"></div>
              <button 
                  onClick={() => setCheckedFiles([])}
                  className="p-1 hover:bg-slate-800 rounded-full transition-colors ml-1"
              >
                  <X className="w-4 h-4" />
              </button>
          </div>
      )}

      {showEditedIndicator && editedCount > 0 && (
        <div className="fixed bottom-8 right-8 flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-full shadow-[0_20px_40px_rgb(0,0,0,0.2)] z-40 animate-in slide-in-from-bottom-8">
            <Check className="w-4 h-4 text-emerald-100" />
            <span className="font-semibold text-sm tracking-wide">{editedCount} {editedCount === 1 ? 'photo' : 'photos'} edited</span>
        </div>
      )}

      {/* Extend Modal */}
      {isExtendModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden pointer-events-auto">
            <div className="p-6 md:p-8">
              <h2 className="text-xl font-serif font-bold text-slate-900 mb-2">Reactivate Links</h2>
              <p className="text-slate-500 text-[13px] mb-6">
                Set a new expiration time to reactivate all {files.length} files in this gallery.
              </p>
              
              <div className="mb-6">
                 <label className="block text-[11.5px] text-slate-500 mb-1.5 font-medium uppercase tracking-wider">Expiration (Hours from now)</label>
                 <input 
                      type="number"
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(Number(e.target.value))}
                      className="w-full font-sans text-[14px] px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsExtendModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 font-medium text-[13px] text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleExtendExpiration}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-600 font-medium text-[13px] text-white hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                >
                  Reactivate Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden pointer-events-auto">
            <div className="p-6 md:p-8">
              <h2 className="text-xl font-serif font-bold text-slate-900 mb-2">Rename Selected Files</h2>
              <p className="text-slate-500 text-[13px] mb-6">
                Enter a base name (e.g., 'Wedding'). {checkedFiles.length} files will be sequentially named 'Wedding_001', 'Wedding_002', etc.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[11.5px] font-medium text-slate-700 mb-1">
                    Base Name
                  </label>
                  <input
                    type="text"
                    value={renameBaseName}
                    onChange={(e) => setRenameBaseName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-[3px] bg-slate-50 hover:bg-slate-100 focus:bg-white focus:outline-none focus:border-slate-300 transition-all font-sans text-[13px]"
                    placeholder="Enter base name"
                    autoFocus
                  />
                  {renameBaseName.trim() && (
                    <p className="text-xs text-slate-500 mt-2">
                      Preview: <span className="font-mono text-slate-700">{renameBaseName.trim()}_001.jpg</span>
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setIsRenameModalOpen(false)}
                    disabled={isRenaming}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-50 border border-transparent rounded-[3px] transition-colors font-medium text-[12.5px] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRenameSelected}
                    disabled={isRenaming || !renameBaseName.trim()}
                    className="bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-[3px] font-medium text-[12.5px] transition-colors flex items-center gap-2"
                  >
                    {isRenaming && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isRenaming ? 'Renaming...' : 'Rename'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
