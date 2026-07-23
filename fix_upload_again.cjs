const fs = require('fs');
let code = fs.readFileSync('contexts/UploadContext.tsx', 'utf8');

const watermarkFunc = `
// Generate a watermarked preview image
const generateWatermarkedImage = async (file: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = async () => {
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
            
            // Draw repeating watermark pattern like the CSS overlay
            const svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="36" fill="rgba(255,255,255,0.4)" transform="rotate(-45 150 150)" letter-spacing="6">MWABONJE</text></svg>';
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const patternImg = new Image();
            await new Promise((res) => {
                patternImg.onload = () => {
                    URL.revokeObjectURL(url);
                    const pattern = ctx.createPattern(patternImg, 'repeat');
                    if (pattern) {
                        ctx.fillStyle = pattern;
                        ctx.fillRect(0, 0, width, height);
                    }
                    res(null);
                };
                patternImg.onerror = () => {
                    URL.revokeObjectURL(url);
                    res(null);
                };
                patternImg.src = url;
            });
            
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

code = code.replace(/export const UploadProvider: React\.FC<\{ children: React\.ReactNode \}> = \(\{ children \}\) => \{/, watermarkFunc + 'export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {');

const startIdx = code.indexOf('// 3. Extract Thumbnail for RAW files');
const endIdx = code.indexOf('// 4. Insert Record into DB');

if (startIdx !== -1 && endIdx !== -1) {
    const newThumbLogic = `// 3. Extract or Generate Watermarked Thumbnail
                let thumbPublicUrl: string | undefined = undefined;
                let thumbFilePath: string | undefined = undefined;
                
                if (mimeType.startsWith('image/')) {
                    try {
                        let thumbBlob: Blob | null = null;
                        
                        if (mimeType.toLowerCase().startsWith('image/x-')) {
                            const thumbDataUrl = await exifr.thumbnailUrl(file);
                            if (thumbDataUrl) {
                                const thumbRes = await fetch(thumbDataUrl);
                                const rawThumbBlob = await thumbRes.blob();
                                URL.revokeObjectURL(thumbDataUrl);
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
                }
                
                `;
    code = code.substring(0, startIdx) + newThumbLogic + code.substring(endIdx);
}

fs.writeFileSync('contexts/UploadContext.tsx', code);
