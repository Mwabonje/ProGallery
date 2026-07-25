const fs = require('fs');
let code = fs.readFileSync('contexts/UploadContext.tsx', 'utf8');

// 1. Send folderPath for the watermark
code = code.replace(
`                            const thumbPresignRes = await fetch(apiUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fileName: 'watermark_' + file.name + '.jpg', fileType: 'image/jpeg' }),
                                signal: controller.signal
                            });`,
`                            const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
                            const thumbPresignRes = await fetch(apiUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fileName: 'watermark_' + file.name + '.jpg', fileType: 'image/jpeg', folderPath }),
                                signal: controller.signal
                            });`
);

// 2. Remove thumbnail_url and thumbnail_path from insert
code = code.replace(
`                            .insert([{
                                gallery_id: galleryId,
                                file_url: publicUrl,
                                file_path: filePath,
                                thumbnail_url: thumbPublicUrl,
                                thumbnail_path: thumbFilePath,
                                file_type: dbFileType,
                                expires_at: expiresAt.toISOString()
                            }]);`,
`                            .insert([{
                                gallery_id: galleryId,
                                file_url: publicUrl,
                                file_path: filePath,
                                file_type: dbFileType,
                                expires_at: expiresAt.toISOString()
                            }]);`
);

fs.writeFileSync('contexts/UploadContext.tsx', code);
