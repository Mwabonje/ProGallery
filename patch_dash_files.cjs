const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

code = code.replace(`.select('*', { count: 'exact', head: true })
            .eq('gallery_id', gallery.id);`, `.select('*', { count: 'exact', head: true })
            .eq('gallery_id', gallery.id)
            .neq('file_path', 'GALLERY_PASSWORD');`);

code = code.replace(`.select('file_url, file_type, download_count, created_at, expires_at')
            .eq('gallery_id', gallery.id)
            .order('created_at', { ascending: false });`, `.select('file_url, file_type, download_count, created_at, expires_at')
            .eq('gallery_id', gallery.id)
            .neq('file_path', 'GALLERY_PASSWORD')
            .order('created_at', { ascending: false });`);

fs.writeFileSync('pages/Dashboard.tsx', code);
console.log("Patched Dashboard");
