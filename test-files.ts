import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const VITE_SUPABASE_URL = envContent.match(/VITE_SUPABASE_URL=(.*)/)?.[1];
const VITE_SUPABASE_ANON_KEY = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(VITE_SUPABASE_URL!, VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from('galleries').select('id, category').eq('category', 'SETTINGS');
  console.log("Settings galleries:", data);
  if (data && data.length > 0) {
     const { data: files } = await supabase.from('files').select('id, file_url, created_at').eq('gallery_id', data[0].id).order('created_at', {ascending: false});
     console.log("Settings files:", files);
  }
}
run();
