const fs = require('fs');
let code = fs.readFileSync('components/AboutSettingsModal.tsx', 'utf8');

const target = `.eq('gallery_id', gal.id)
                        .order('created_at', { ascending: false })`;
const replacement = `.eq('gallery_id', gal.id)
                        .neq('file_path', 'GALLERY_PASSWORD')
                        .order('created_at', { ascending: false })`;

code = code.replace(target, replacement);

const target2 = `.eq('gallery_id', galleryId)
                        .order('created_at', { ascending: false })`;
const replacement2 = `.eq('gallery_id', galleryId)
                        .neq('file_path', 'GALLERY_PASSWORD')
                        .order('created_at', { ascending: false })`;

code = code.replace(target2, replacement2);

fs.writeFileSync('components/AboutSettingsModal.tsx', code);
console.log("Patched AboutSettingsModal");
