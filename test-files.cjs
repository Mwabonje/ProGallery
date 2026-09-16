require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('galleries').select('id, category').eq('category', 'SETTINGS');
  console.log("Settings galleries:", data);
  if (data && data.length > 0) {
     const { data: files } = await supabase.from('files').select('id, file_url, created_at').eq('gallery_id', data[0].id).order('created_at', {ascending: false});
     console.log("Settings files:", files);
  }
}
run();
