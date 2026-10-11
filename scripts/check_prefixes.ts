import { supabase } from '../services/supabase';

async function check() {
  const { data: files } = await supabase.from('files').select('gallery_id, file_path');
  const countsByPrefix: Record<string, number> = {};
  const galleryFiles: Record<string, { count: number; prefixes: Record<string, number> }> = {};

  for (const f of files || []) {
    const prefix = (f.file_path || '').substring(0, 11);
    countsByPrefix[prefix] = (countsByPrefix[prefix] || 0) + 1;
    if (!galleryFiles[f.gallery_id]) {
      galleryFiles[f.gallery_id] = { count: 0, prefixes: {} };
    }
    galleryFiles[f.gallery_id].count++;
    galleryFiles[f.gallery_id].prefixes[prefix] = (galleryFiles[f.gallery_id].prefixes[prefix] || 0) + 1;
  }

  console.log('Global prefixes:', JSON.stringify(countsByPrefix, null, 2));
  const { data: gals } = await supabase.from('galleries').select('id, client_name, category');
  for (const g of gals || []) {
    if (galleryFiles[g.id]) {
      console.log('Gallery:', g.client_name, `[cat: ${g.category}] total: ${galleryFiles[g.id].count}`, galleryFiles[g.id].prefixes);
    }
  }
}
check();
