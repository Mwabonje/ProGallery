const fs = require('fs');
let code = fs.readFileSync('pages/Prints.tsx', 'utf8');

code = code.replace(`.in('gallery_id', galleryIds)
                        .order('created_at', { ascending: false });`, `.in('gallery_id', galleryIds)
                        .neq('file_path', 'GALLERY_PASSWORD')
                        .order('created_at', { ascending: false });`);

fs.writeFileSync('pages/Prints.tsx', code);
console.log("Patched Prints");
