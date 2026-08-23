const fs = require('fs');
let code = fs.readFileSync('pages/Portfolio.tsx', 'utf8');

code = code.replace(`.select('file_url, file_type')
                            .eq('gallery_id', gallery.id)
                            .order('created_at', { ascending: false })`, `.select('file_url, file_type')
                            .eq('gallery_id', gallery.id)
                            .neq('file_path', 'GALLERY_PASSWORD')
                            .order('created_at', { ascending: false })`);

fs.writeFileSync('pages/Portfolio.tsx', code);
console.log("Patched Portfolio");
