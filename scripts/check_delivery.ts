import { supabase } from '../services/supabase';

async function check() {
  const { data: gals } = await supabase.from('galleries').select('id, client_name').in('client_name', [
    'Golf Chenda',
    'Sumayah',
    'Cancer Awareness Images',
    'Absa Mangrove Planting Gallery'
  ]);
  for (const g of gals || []) {
    const { data: files } = await supabase.from('files').select('file_path').eq('gallery_id', g.id);
    const names = (files || []).map(f => (f.file_path || '').split('/').pop());
    console.log('Delivery gallery:', g.client_name, 'count:', files?.length, 'sample names:', names.slice(0, 10));
  }
}
check();
