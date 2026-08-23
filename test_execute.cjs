const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: "SELECT 1" });
    console.log("Execute error:", error);
    console.log("Execute data:", data);
}
check();
