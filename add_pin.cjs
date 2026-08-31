const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // We don't have execute_sql actually working maybe, let's try calling supabase sql via a function or just see if the column exists.
    // If not, maybe we can fetch it?
    // Let's try to query it.
    const { data, error } = await supabase.from('galleries').select('selection_pin').limit(1);
    console.log(error);
}
main();
