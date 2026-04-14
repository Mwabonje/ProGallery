import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase, supabaseUrl, supabaseKey } from '../services/supabase';
import * as tus from 'tus-js-client';

interface UploadContextType {
  uploading: boolean;
  progress: number;
  activeGalleryId: string | null;
  uploadFiles: (galleryId: string, files: File[], expiryHours: number) => Promise<void>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

// Helper to deduce MIME type if browser fails (common with MKV, AVI, etc.)
const getMimeType = (file: File) => {
    if (file.type && file.type !== "") return file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();
    
    // Video fallbacks
    if (ext === 'mp4') return 'video/mp4';
    if (ext === 'mov') return 'video/quicktime';
    if (ext === 'webm') return 'video/webm';
    if (ext === 'avi') return 'video/x-msvideo';
    if (ext === 'mkv') return 'video/x-matroska';
    if (ext === 'wmv') return 'video/x-ms-wmv';
    
    // Image fallbacks
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'png') return 'image/png';
    if (ext === 'gif') return 'image/gif';
    if (ext === 'webp') return 'image/webp';
    
    return 'application/octet-stream';
};

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeGalleryId, setActiveGalleryId] = useState<string | null>(null);

  // We use a Ref to track progress of individual files without triggering re-renders for every byte
  const fileProgressMap = useRef<number[]>([]);

  const uploadFiles = useCallback(async (galleryId: string, filesToUpload: File[], expiryHours: number) => {
    if (uploading) {
        alert("An upload is already in progress. Please wait for it to finish.");
        return;
    }

    // Validate file sizes (Max 250MB)
    const MAX_FILE_SIZE = 250 * 1024 * 1024; // 250MB in bytes
    const oversizedFiles = filesToUpload.filter(file => file.size > MAX_FILE_SIZE);
    
    if (oversizedFiles.length > 0) {
        const fileList = oversizedFiles.map(f => `- ${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`).join('\n');
        alert(`Upload Cancelled.\n\nThe following files exceed the 250MB limit:\n${fileList}\n\nPlease remove them or compress them before uploading.`);
        return;
    }

    setUploading(true);
    setActiveGalleryId(galleryId);
    setProgress(0);

    const totalBytes = filesToUpload.reduce((acc, f) => acc + f.size, 0);
    // Initialize progress map with 0 for each file index
    fileProgressMap.current = new Array(filesToUpload.length).fill(0);
    const uploadErrors: string[] = [];

    // Global ticker to update the React state from the Refs
    const uiInterval = setInterval(() => {
        const totalUploaded = fileProgressMap.current.reduce((a, b) => a + b, 0);
        const percentage = totalBytes > 0 ? Math.round((totalUploaded / totalBytes) * 100) : 0;
        // Cap visual progress at 95% until everything is truly resolved
        setProgress(Math.min(95, percentage));
    }, 200);

    try {
        // Helper to run promises with a concurrency limit
        const asyncPool = async <T,>(poolLimit: number, array: T[], iteratorFn: (item: T, index: number) => Promise<void>) => {
            const ret: Promise<void>[] = [];
            const executing = new Set<Promise<void>>();
            for (let i = 0; i < array.length; i++) {
                const item = array[i];
                const p = Promise.resolve().then(() => iteratorFn(item, i));
                ret.push(p);
                executing.add(p);
                const clean = () => executing.delete(p);
                p.then(clean).catch(clean);
                if (executing.size >= poolLimit) {
                    await Promise.race(executing);
                }
            }
            return Promise.all(ret);
        };

        // Limit to 3 concurrent uploads to prevent "Failed to fetch" network errors
        await asyncPool(3, filesToUpload, async (file, index) => {
            // Adaptive Simulation:
            // For small files (<5MB), we simulate fast.
            // For large files (>50MB), we simulate slower but realistic.
            let estimatedSpeed = 3000000; // Default 3MB/s simulation
            if (file.size > 50 * 1024 * 1024) estimatedSpeed = 1000000; // 1MB/s for large files
            
            // Split bandwidth among concurrent files
            const bandwidthPerFile = estimatedSpeed / filesToUpload.length;
            const tickRateMs = 500;
            const bytesPerTick = (bandwidthPerFile * tickRateMs) / 1000;

            const simulationInterval = setInterval(() => {
                const current = fileProgressMap.current[index];
                // Only simulate up to 90% of the file size
                if (current < file.size * 0.90) {
                    fileProgressMap.current[index] = current + bytesPerTick;
                }
            }, tickRateMs);

            try {
                const uniqueId = Math.random().toString(36).substring(2);
                const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${galleryId}/${uniqueId}/${sanitizedFileName}`;
                const mimeType = getMimeType(file);

                // 1. Upload to Supabase Storage
                // Use standard upload for files <= 6MB, and TUS resumable upload for larger files
                if (file.size <= 6 * 1024 * 1024) {
                    const { error: uploadError } = await supabase.storage
                        .from('gallery-files')
                        .upload(filePath, file, {
                            cacheControl: '3600',
                            upsert: true,
                            contentType: mimeType
                        });

                    if (uploadError) throw uploadError;
                } else {
                    // TUS Resumable Upload for larger files
                    clearInterval(simulationInterval);
                    const { data: { session } } = await supabase.auth.getSession();
                    
                    if (!session) {
                        throw new Error("Authentication required for large file uploads");
                    }
                    
                    await new Promise<void>((resolve, reject) => {
                        const upload = new tus.Upload(file, {
                            endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
                            retryDelays: [0, 3000, 5000, 10000, 20000],
                            headers: {
                                authorization: `Bearer ${session?.access_token}`,
                                apikey: supabaseKey,
                                'x-upsert': 'true',
                            },
                            uploadDataDuringCreation: true,
                            removeFingerprintOnSuccess: true,
                            metadata: {
                                bucketName: 'gallery-files',
                                objectName: filePath,
                                contentType: mimeType,
                                cacheControl: '3600',
                            },
                            chunkSize: 6 * 1024 * 1024, // 6MB chunk size
                            onError: function (error) {
                                reject(error);
                            },
                            onProgress: function (bytesUploaded, bytesTotal) {
                                // Update actual progress instead of simulated progress
                                fileProgressMap.current[index] = bytesUploaded;
                            },
                            onSuccess: function () {
                                resolve();
                            },
                        });

                        // Check if there are any previous uploads to continue.
                        upload.findPreviousUploads().then(function (previousUploads) {
                            if (previousUploads.length) {
                                upload.resumeFromPreviousUpload(previousUploads[0]);
                            }
                            upload.start();
                        }).catch(reject);
                    });
                }

                // 2. Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('gallery-files')
                    .getPublicUrl(filePath);

                // 3. Insert Record into DB
                const expiresAt = new Date();
                expiresAt.setTime(expiresAt.getTime() + expiryHours * 60 * 60 * 1000);

                // Determine type for DB
                const dbFileType = mimeType.startsWith('image/') ? 'image' : 'video';

                const { error: dbError } = await supabase
                    .from('files')
                    .insert([{
                        gallery_id: galleryId,
                        file_url: publicUrl,
                        file_path: filePath,
                        file_type: dbFileType,
                        expires_at: expiresAt.toISOString()
                    }]);

                if (dbError) throw dbError;

            } catch (err: any) {
                console.error(`Failed to upload ${file.name}`, err);
                let msg = err.message || 'Unknown error';
                
                // Enhance error message for common Supabase limits
                if (msg.includes('maximum allowed size') || msg.includes('Entity Too Large')) {
                    msg = 'File exceeds server size limit. Please check Supabase Bucket settings.';
                }
                
                uploadErrors.push(`${file.name}: ${msg}`);
            } finally {
                clearInterval(simulationInterval);
                // Snap this file's progress to 100%
                fileProgressMap.current[index] = file.size;
            }
        });
    } catch (error) {
        console.error("Batch upload critical error", error);
        uploadErrors.push("Batch process failed critically.");
    } finally {
        clearInterval(uiInterval);
        setProgress(100);
        
        if (uploadErrors.length > 0) {
            alert(`Upload completed with errors:\n\n${uploadErrors.join('\n')}\n\nPlease try again or check your configuration.`);
        }

        // Reset state
        setTimeout(() => {
            setUploading(false);
            setActiveGalleryId(null);
            setProgress(0);
            fileProgressMap.current = [];
        }, 1500);
    }
  }, [uploading]);

  return (
    <UploadContext.Provider value={{ uploading, progress, activeGalleryId, uploadFiles }}>
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (!context) throw new Error('useUpload must be used within UploadProvider');
  return context;
};