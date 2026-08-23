const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);
async function check() {
    const { data, error } = await supabase.from('galleries').update({ seo_description: "test" }).eq('id', '7ce795e8-f0a5-46e0-82d5-80e9d2319ac8');
    console.log("Update error:", error);
}
check();
