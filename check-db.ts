import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from('galleries').select('id, category, created_at, client_name, title').eq('category', 'SETTINGS').order('created_at', { ascending: false });
  console.log("Settings galleries:", data);
  if (data && data.length > 0) {
     for (const gal of data) {
         const { data: files } = await supabase.from('files').select('id, file_url, created_at').eq('gallery_id', gal.id).order('created_at', {ascending: false});
         console.log(`Settings files for ${gal.id}:`, files);
     }
  }
}
run();
