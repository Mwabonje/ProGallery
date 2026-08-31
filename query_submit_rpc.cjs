const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: g } = await supabase.from('galleries').select('id, selection_status, selection_enabled').eq('selection_enabled', true).limit(1);
    if (!g || g.length === 0) return;
    console.log("Before:", g);
    const { error } = await supabase.rpc('submit_selection', { gallery_id: g[0].id });
    console.log("Error:", error);
    const { data: g2 } = await supabase.from('galleries').select('id, selection_status').eq('id', g[0].id);
    console.log("After:", g2);
    // clean up
    await supabase.rpc('unsubmit_selection', { gallery_id: g[0].id });
}
check();
