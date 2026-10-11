import { supabase } from '../services/supabase';

async function report() {
  const { data: gals, error } = await supabase.from('galleries').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching galleries:', error);
    return;
  }

  console.log(`=== TOTAL GALLERIES: ${gals?.length} ===`);
  for (const g of gals || []) {
    const { data: files } = await supabase.from('files').select('id, file_path, file_url, created_at').eq('gallery_id', g.id);
    const nonPw = (files || []).filter(f => f.file_path !== 'GALLERY_PASSWORD');
    console.log(`\nGallery: "${g.client_name}" | Category: "${g.category}" | ID: ${g.id} | Photog: ${g.photographer_id}`);
    console.log(`  Title: "${g.title}" | Created: ${g.created_at}`);
    console.log(`  File count: ${nonPw.length}`);
    if (nonPw.length > 0) {
      console.log(`  Sample 3 files:`, nonPw.slice(0, 3).map(f => ({
        path: f.file_path,
        url: f.file_url?.substring(0, 80)
      })));
    }
  }
}
report();
