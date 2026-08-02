const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://bdaqtpyzqutelkdgcoex.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib";
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.from('galleries').select('*').limit(1);
    console.log(data);
    if (error) console.error(error);
}
test();
