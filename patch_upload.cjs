const fs = require('fs');
let code = fs.readFileSync('contexts/UploadContext.tsx', 'utf8');

const watermarkFunc = `
// Generate a watermarked preview image
const generateWatermarkedImage = async (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            
            let width = img.width;
            let height = img.height;
            const MAX_DIM = 1920;
            
            if (width > MAX_DIM || height > MAX_DIM) {
                if (width > height) {
                    height = Math.round((height * MAX_DIM) / width);
                    width = MAX_DIM;
                } else {
                    width = Math.round((width * MAX_DIM) / height);
                    height = MAX_DIM;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.rotate((-45 * Math.PI) / 180);
            
            const fontSize = Math.max(36, Math.floor(width / 8));
            ctx.font = \`900 \${fontSize}px sans-serif\`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            // @ts-ignore
            if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "6px";
            
            ctx.fillText("MWABONJE", 0, 0);
            ctx.restore();
            
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(null);
        };
        
        img.src = objectUrl;
    });
};
`;

// Insert the function before `export const UploadProvider`
code = code.replace(/export const UploadProvider = \(\{ children \}: \{ children: React\.ReactNode \}\) => \{/, watermarkFunc + '\nexport const UploadProvider = ({ children }: { children: React.ReactNode }) => {');

const oldThumbLogic = `                // 3. Extract Thumbnail for RAW files
                let thumbPublicUrl: string | undefined = undefined;
                let thumbFilePath: string | undefined = undefined;
                if (mimeType.toLowerCase().startsWith('image/x-')) {
                    try {
                        const thumbDataUrl = await exifr.thumbnailUrl(file);
                        if (thumbDataUrl) {
                            const thumbRes = await fetch(thumbDataUrl);
                            const thumbBlob = await thumbRes.blob();
                            URL.revokeObjectURL(thumbDataUrl);
                            const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
                            const apiUrl = isNetlify ? '/.netlify/functions/upload-url' : '/api/upload-url';
                            
                            const thumbPresignRes = await fetch(apiUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fileName: 'thumb_' + file.name + '.jpg', fileType: 'image/jpeg' }),
                                signal: controller.signal
                            });
                            if (thumbPresignRes.ok) {
                                const { presignedUrl: thumbPresignedUrl, publicUrl: tpUrl, filePath: tpPath } = await thumbPresignRes.json();
                                await fetch(thumbPresignedUrl, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'image/jpeg' },
                                    body: thumbBlob,
                                    signal: controller.signal
                                });
                                thumbPublicUrl = tpUrl;
                                thumbFilePath = tpPath;
                            }
                        }
                    } catch (e) {
                         console.error("Failed to extract or upload thumbnail", e);
                    }
                }`;

const newThumbLogic = `                // 3. Extract or Generate Watermarked Thumbnail
                let thumbPublicUrl: string | undefined = undefined;
                let thumbFilePath: string | undefined = undefined;
                
                if (mimeType.startsWith('image/')) {
                    try {
                        let thumbBlob: Blob | null = null;
                        
                        // For raw files, get the embedded thumbnail first, then watermark it? 
                        // It's safer to just let the browser try to render it if possible, but browsers can't render raw images natively in canvas.
                        // So for raw files, extract the thumbnail, convert to File, and watermark it.
                        if (mimeType.toLowerCase().startsWith('image/x-')) {
                            const thumbDataUrl = await exifr.thumbnailUrl(file);
                            if (thumbDataUrl) {
                                const thumbRes = await fetch(thumbDataUrl);
                                const rawThumbBlob = await thumbRes.blob();
                                URL.revokeObjectURL(thumbDataUrl);
                                // Now watermark the extracted raw thumbnail
                                const tempFile = new File([rawThumbBlob], "temp.jpg", { type: "image/jpeg" });
                                thumbBlob = await generateWatermarkedImage(tempFile);
                            }
                        } else {
                            // Standard images (jpeg, png, webp)
                            thumbBlob = await generateWatermarkedImage(file);
                        }

                        if (thumbBlob) {
                            const isNetlify = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');
                            const apiUrl = isNetlify ? '/.netlify/functions/upload-url' : '/api/upload-url';
                            
                            const thumbPresignRes = await fetch(apiUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fileName: 'watermark_' + file.name + '.jpg', fileType: 'image/jpeg' }),
                                signal: controller.signal
                            });
                            
                            if (thumbPresignRes.ok) {
                                const { presignedUrl: thumbPresignedUrl, publicUrl: tpUrl, filePath: tpPath } = await thumbPresignRes.json();
                                await fetch(thumbPresignedUrl, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'image/jpeg' },
                                    body: thumbBlob,
                                    signal: controller.signal
                                });
                                thumbPublicUrl = tpUrl;
                                thumbFilePath = tpPath;
                            }
                        }
                    } catch (e) {
                         console.error("Failed to generate or upload watermarked thumbnail", e);
                    }
                }`;

code = code.replace(oldThumbLogic, newThumbLogic);

// Add thumbnail_url and thumbnail_path to db insert
code = code.replace(
`                            .insert([{
                                gallery_id: galleryId,
                                file_url: publicUrl,
                                file_path: filePath,
                                file_type: dbFileType,
                                expires_at: expiresAt.toISOString()
                            }]);`,
`                            .insert([{
                                gallery_id: galleryId,
                                file_url: publicUrl,
                                file_path: filePath,
                                thumbnail_url: thumbPublicUrl,
                                thumbnail_path: thumbFilePath,
                                file_type: dbFileType,
                                expires_at: expiresAt.toISOString()
                            }]);`);

fs.writeFileSync('contexts/UploadContext.tsx', code);
