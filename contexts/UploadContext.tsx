import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

interface UploadContextType {
  uploading: boolean;
  progress: number;
  activeGalleryId: string | null;
  uploadFiles: (galleryId: string, files: File[], expiryHours: number) => Promise<void>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

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

    setUploading(true);
    setActiveGalleryId(galleryId);
    setProgress(0);

    const totalBytes = filesToUpload.reduce((acc, f) => acc + f.size, 0);
    // Initialize progress map with 0 for each file index
    fileProgressMap.current = new Array(filesToUpload.length).fill(0);
    const uploadErrors: string[] = [];

    // Global ticker to update the React state from the Refs
    // This decouples the high-frequency simulation from the UI render cycle
    const uiInterval = setInterval(() => {
        const totalUploaded = fileProgressMap.current.reduce((a, b) => a + b, 0);
        const percentage = totalBytes > 0 ? Math.round((totalUploaded / totalBytes) * 100) : 0;
        // Cap at 99% until everything is truly resolved
        setProgress(Math.min(99, percentage));
    }, 200);

    try {
        await Promise.all(filesToUpload.map(async (file, index) => {
            // Estimated Upload Speed Simulation
            // We assume a shared bandwidth of roughly 3MB/s (3,000,000 bytes)
            // We split this bandwidth among concurrent uploads to avoid over-estimating speed
            const estimatedBandwidth = 3000000 / filesToUpload.length;
            const tickRateMs = 250;
            const bytesPerTick = (estimatedBandwidth * tickRateMs) / 1000;

            const simulationInterval = setInterval(() => {
                const current = fileProgressMap.current[index];
                // Only simulate up to 90% of the file size, then wait for actual promise resolution
                // This prevents the bar from hitting 100% while the server is still processing
                if (current < file.size * 0.90) {
                    fileProgressMap.current[index] = current + bytesPerTick;
                }
            }, tickRateMs);

            try {
                const uniqueId = Math.random().toString(36).substring(2);
                const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${galleryId}/${uniqueId}/${sanitizedFileName}`;

                // 1. Upload to Supabase Storage
                // For large files, Supabase client automatically handles TUS if configured correctly,
                // but standard upload works for most cases < 6MB. For larger, it internally splits or streams.
                // We ensure contentType is set.
                const { error: uploadError } = await supabase.storage
                    .from('gallery-files')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: file.type || 'application/octet-stream'
                    });

                if (uploadError) throw uploadError;

                // 2. Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('gallery-files')
                    .getPublicUrl(filePath);

                // 3. Insert Record into DB
                const expiresAt = new Date();
                expiresAt.setTime(expiresAt.getTime() + expiryHours * 60 * 60 * 1000);

                const { error: dbError } = await supabase
                    .from('files')
                    .insert([{
                        gallery_id: galleryId,
                        file_url: publicUrl,
                        file_path: filePath,
                        file_type: file.type.startsWith('image/') ? 'image' : 'video',
                        expires_at: expiresAt.toISOString()
                    }]);

                if (dbError) throw dbError;

            } catch (err: any) {
                console.error(`Failed to upload ${file.name}`, err);
                uploadErrors.push(`${file.name}: ${err.message || 'Unknown error'}`);
                // Even if failed, we mark as "processed" in the progress bar to avoid getting stuck
            } finally {
                clearInterval(simulationInterval);
                // Snap this file's progress to 100% (its full size)
                fileProgressMap.current[index] = file.size;
            }
        }));
    } catch (error) {
        console.error("Batch upload critical error", error);
        uploadErrors.push("Batch process failed critically.");
    } finally {
        clearInterval(uiInterval);
        setProgress(100);
        
        if (uploadErrors.length > 0) {
            alert(`Upload completed with errors:\n\n${uploadErrors.join('\n')}\n\nPlease try uploading the failed files again.`);
        }

        // Reset state after a short delay
        setTimeout(() => {
            setUploading(false);
            setActiveGalleryId(null);
            setProgress(0);
            fileProgressMap.current = [];
        }, 1000);
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