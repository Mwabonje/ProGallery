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

  const uploadFiles = useCallback(async (galleryId: string, filesToUpload: File[], expiryHours: number) => {
    if (uploading) {
        alert("An upload is already in progress. Please wait for it to finish.");
        return;
    }

    setUploading(true);
    setActiveGalleryId(galleryId);
    setProgress(0);

    const totalFiles = filesToUpload.length;
    let completedCount = 0;
    
    // Fake progress smoother
    let fakeProgress = 0;
    const progressInterval = setInterval(() => {
        setProgress((prev) => {
            if (prev >= 95) return prev;
            const increment = Math.random() * 2;
            const nextFake = Math.min(fakeProgress + increment, 95);
            fakeProgress = nextFake;
            return Math.max(prev, Math.round(nextFake));
        });
    }, 500);

    try {
        await Promise.all(filesToUpload.map(async (file) => {
            try {
                const uniqueId = Math.random().toString(36).substring(2);
                const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = `${galleryId}/${uniqueId}/${sanitizedFileName}`;

                // 1. Upload
                const { error: uploadError } = await supabase.storage
                    .from('gallery-files')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false,
                        contentType: file.type
                    });

                if (uploadError) throw uploadError;

                // 2. Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('gallery-files')
                    .getPublicUrl(filePath);

                // 3. DB Insert
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

            } catch (err) {
                console.error(`Failed to upload ${file.name}`, err);
            } finally {
                completedCount++;
                const realPercentage = Math.round((completedCount / totalFiles) * 100);
                setProgress(prev => Math.max(prev, realPercentage));
                fakeProgress = Math.max(fakeProgress, realPercentage);
            }
        }));
    } catch (error) {
        console.error("Batch upload error", error);
    } finally {
        clearInterval(progressInterval);
        setProgress(100);
        // Delay clearing state so UI can show 100%
        setTimeout(() => {
            setUploading(false);
            setActiveGalleryId(null);
            setProgress(0);
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
