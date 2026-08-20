async function check() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    // Check galleries
    const response = await fetch(`${supabaseUrl}/rest/v1/galleries?client_name=ilike.*creative*&select=*`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const data = await response.json();
    console.log("Galleries:", JSON.stringify(data, null, 2));
    
    if (data.length > 0) {
        // Check files
        const fResp = await fetch(`${supabaseUrl}/rest/v1/files?gallery_id=eq.${data[0].id}&download_count=gt.0&select=id,file_path,download_count`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        const fdata = await fResp.json();
        console.log("Files with downloads:", JSON.stringify(fdata, null, 2));
    }
}

check();
