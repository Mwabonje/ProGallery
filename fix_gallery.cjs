const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

// We will add a helper function `getDisplayUrl(file, isLightbox = false)`
const getDisplayUrlFunc = `
  const getDisplayUrl = (file: GalleryFile, isLightbox = false) => {
    // If it's locked and we have a watermarked thumbnail, use it
    if (isFileLocked(file.id) && file.thumbnail_url && !isPortfolio) {
        return file.thumbnail_url;
    }
    // If unlocked (or portfolio where there's no watermark anyway)
    // For standard images, we can just use the file_url so they see the clean version
    if (file.file_url && file.file_url.match(/\\.(jpg|jpeg|png|webp|gif)$/i)) {
        return file.file_url;
    }
    // For RAW files, we MUST use the thumbnail because browsers can't render RAW
    return file.thumbnail_url || file.file_url;
  };
`;

code = code.replace(/const isFileLocked = \(fileId: string\) => \{/, getDisplayUrlFunc + '\n  const isFileLocked = (fileId: string) => {');

// Now replace usages of `file.thumbnail_url || file.file_url` with `getDisplayUrl(file)`
code = code.replace(/file\.thumbnail_url \|\| file\.file_url/g, 'getDisplayUrl(file)');

// Also for lightboxFile, replacing `lightboxFile.file_url` with `getDisplayUrl(lightboxFile, true)`
code = code.replace(/getOptimizedImageUrl\(\n\s*lightboxFile\.file_url,/g, 'getOptimizedImageUrl(\n                    getDisplayUrl(lightboxFile, true),');

fs.writeFileSync('pages/ClientGallery.tsx', code);
