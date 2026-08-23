const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // try to read some common table names
    for (const t of ['settings', 'secrets', 'gallery_passwords', 'files']) {
        const { error } = await supabase.from(t).select('id').limit(1);
        console.log(`Table ${t}:`, error ? error.message : 'exists');
    }
}
check();
