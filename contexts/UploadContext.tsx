import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase';

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
        await Promise.all(filesToUpload.map(async (file, index) => {
            // Adaptive Simulation:
            // For small files (<5MB), we simulate fast.
            // For large files (>50MB), we simulate VERY slow to avoid the "stuck at 90%" feeling.
            let estimatedSpeed = 2000000; // Default 2MB/s simulation
            if (file.size > 50 * 1024 * 1024) estimatedSpeed = 500000; // 0.5MB/s for large files
            
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
                const { error: uploadError } = await supabase.storage
                    .from('gallery-files')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: true, // changed to true to avoid conflicts
                        contentType: mimeType
                    });

                if (uploadError) throw uploadError;

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
                uploadErrors.push(`${file.name}: ${err.message || 'Unknown error'}`);
            } finally {
                clearInterval(simulationInterval);
                // Snap this file's progress to 100%
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
            // Keep the "Uploading..." UI visible for a moment if there's an error so user sees context?
            // Actually, we should alert immediately.
            alert(`Upload completed with errors:\n\n${uploadErrors.join('\n')}\n\nPlease check your file size (limits may apply) and internet connection.`);
        }

        // Reset state
        setTimeout(() => {
            setUploading(false);
            setActiveGalleryId(null);
            setProgress(0);
            fileProgressMap.current = [];
        }, 1500); // Increased delay slightly to let user see 100%
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