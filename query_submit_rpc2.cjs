const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const galleryId = '9ac8f62a-ec3d-47a3-abf5-64519bc6747a';
    const { data: g } = await supabase.from('galleries').select('id, selection_status, link_enabled').eq('id', galleryId);
    console.log("Before:", g);
    const { error } = await supabase.rpc('submit_selection', { gallery_id: galleryId });
    console.log("Error:", error);
    const { data: g2 } = await supabase.from('galleries').select('id, selection_status, link_enabled').eq('id', galleryId);
    console.log("After (anon):", g2);
}
check();
