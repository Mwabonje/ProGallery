const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkDownloads() {
    const { data: gallery, error: galErr } = await supabase
        .from('galleries')
        .select('*')
        .ilike('client_name', '%creative%')
        .limit(1)
        .single();
    
    if (galErr) {
        console.log("Gallery error:", galErr);
        return;
    }
    
    console.log("Gallery ID:", gallery.id, "Name:", gallery.client_name);
    
    const { data: files, error: fileErr } = await supabase
        .from('files')
        .select('id, file_path, download_count, created_at')
        .eq('gallery_id', gallery.id)
        .gt('download_count', 0);
        
    console.log("Files with downloads:", files);
    
    const { data: logs, error: logErr } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('gallery_id', gallery.id)
        .ilike('action', '%download%');
        
    console.log("Activity Logs related to downloads:", logs);
}

checkDownloads();
