import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

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
