import { supabase } from './services/supabase';
async function test() {
  const { data } = await supabase.from('galleries').select('id, client_name').eq('client_name', 'MVUVI').limit(1);
  if (data && data.length > 0) {
    const gal = data[0];
    const { data: files } = await supabase.from('files').select('file_url, file_type, file_path').eq('gallery_id', gal.id).neq('file_path', 'GALLERY_PASSWORD').order('created_at', { ascending: false }).limit(2);
    console.log("Mvuvi files:", files);
  } else {
    console.log("Mvuvi gallery not found");
  }
}
test();
