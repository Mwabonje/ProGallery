import { getApiUrl } from './api';

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

export interface UploadResult {
  url: string;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Compresses an image if its size exceeds maxSizeBytes (default 300KB = 307,200 bytes).
 * Ensures crisp visual fidelity while strictly reducing payload below the threshold.
 */
export async function compressImageUnderTargetSize(
  file: File,
  maxSizeBytes: number = 300 * 1024
): Promise<CompressionResult> {
  // If already under target size, return original file without lossy re-encoding
  if (file.size <= maxSizeBytes) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      wasCompressed: false
    };
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        // Cap maximum initial dimensions to 1920x1440 for web editorial clarity
        const maxInitialDimension = 1920;
        let width = origWidth;
        let height = origHeight;

        if (width > maxInitialDimension || height > maxInitialDimension) {
          if (width > height) {
            height = Math.round((height * maxInitialDimension) / width);
            width = maxInitialDimension;
          } else {
            width = Math.round((width * maxInitialDimension) / height);
            height = maxInitialDimension;
          }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }

        let currentWidth = width;
        let currentHeight = height;
        let quality = 0.85;
        let bestBlob: Blob | null = null;
        let attempts = 0;
        const maxAttempts = 10;

        // Iteratively tune quality and dimensions if necessary until <= maxSizeBytes
        while (attempts < maxAttempts) {
          attempts++;
          canvas.width = currentWidth;
          canvas.height = currentHeight;

          // Clear and draw with high quality smoothing
          ctx.clearRect(0, 0, currentWidth, currentHeight);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

          const blob: Blob | null = await new Promise(res => {
            canvas.toBlob(b => res(b), 'image/jpeg', quality);
          });

          if (!blob) break;

          bestBlob = blob;

          // If satisfied target size, break early
          if (blob.size <= maxSizeBytes) {
            break;
          }

          // Step down quality
          if (quality > 0.45) {
            quality = Math.max(0.40, quality - 0.12);
          } else {
            // Further step down dimensions if quality is already moderate
            currentWidth = Math.round(currentWidth * 0.85);
            currentHeight = Math.round(currentHeight * 0.85);
            quality = 0.70; // Reset quality slightly with smaller canvas
          }
        }

        if (!bestBlob) {
          return resolve({
            file,
            originalSize: file.size,
            compressedSize: file.size,
            wasCompressed: false
          });
        }

        // Create new File from compressed blob
        const cleanName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        const compressedFile = new File([bestBlob], cleanName, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });

        resolve({
          file: compressedFile,
          originalSize: file.size,
          compressedSize: compressedFile.size,
          wasCompressed: true
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = objectUrl;
  });
}

/**
 * Uploads a blog cover image to Cloudflare R2 storage via presigned URL.
 * Automatically compresses the image if it exceeds 300KB before uploading.
 */
export async function uploadBlogCoverImage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  // 1. Automatic compression check (> 300 KB)
  const compression = await compressImageUnderTargetSize(file, 300 * 1024);
  const fileToUpload = compression.file;

  // 2. Request presigned upload URL from backend
  const apiUrl = getApiUrl('/api/upload-url');
  const sanitizedName = `cover_${Date.now()}_${fileToUpload.name.replace(/[^a-zA-Z0-9.\_-]/g, '_')}`;

  const presignRes = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: sanitizedName,
      fileType: fileToUpload.type || 'image/jpeg',
      folderPath: 'blog'
    })
  });

  if (!presignRes.ok) {
    const errorText = await presignRes.text();
    throw new Error(`Failed to initialize upload: ${errorText}`);
  }

  const { presignedUrl, publicUrl } = await presignRes.json();

  // 3. Upload file directly to R2 via XMLHttpRequest
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Storage upload failed (HTTP ${xhr.status})`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during file upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was cancelled'));
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', fileToUpload.type || 'image/jpeg');
    xhr.send(fileToUpload);
  });

  return {
    url: publicUrl,
    originalSize: compression.originalSize,
    compressedSize: compression.compressedSize,
    wasCompressed: compression.wasCompressed
  };
}
