const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('files').insert([{
        gallery_id: '7ce795e8-f0a5-46e0-82d5-80e9d2319ac8',
        file_url: 'PASSWORD_SETTING',
        file_path: 'password',
        file_type: 'image',
        caption: 'mysecret',
        expires_at: new Date().toISOString()
    }]).select();
    console.log("Insert error:", error);
    console.log("Insert data:", data);
    
    if (data) {
        await supabase.from('files').delete().eq('id', data[0].id);
    }
}
check();
