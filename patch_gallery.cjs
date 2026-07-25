const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

const oldFunc = `  const getDisplayUrl = (file: GalleryFile, isLightbox = false) => {
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
  };`;

const newFunc = `  const getDisplayUrl = (file: GalleryFile, isLightbox = false) => {
    const legacyThumbnail = file.thumbnail_url;
    
    const computeWatermarkUrl = (url: string) => {
        if (!url) return url;
        const parts = url.split('/');
        const filename = parts.pop();
        if (!filename) return url;
        return parts.join('/') + '/watermark_' + filename + '.jpg';
    };

    if (isFileLocked(file.id) && !isPortfolio) {
        return legacyThumbnail || computeWatermarkUrl(file.file_url);
    }
    
    if (file.file_url && file.file_url.match(/\\.(jpg|jpeg|png|webp|gif)$/i)) {
        return file.file_url;
    }
    
    return legacyThumbnail || computeWatermarkUrl(file.file_url);
  };`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('pages/ClientGallery.tsx', code);
