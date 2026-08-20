require('dotenv').config({ path: '.env' });

async function check() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const response = await fetch(`${supabaseUrl}/rest/v1/galleries?client_name=ilike.*creative*&select=*`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const data = await response.json();
    console.log("Galleries:", JSON.stringify(data, null, 2));
}

check();
