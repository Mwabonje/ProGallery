const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: q1 } = await supabase.rpc('get_function_def', { function_name: 'unsubmit_selection' });
    console.log("Q1:", q1);
}
check();
