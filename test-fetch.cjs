const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://bdaqtpyzqutelkdgcoex.supabase.co', 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib');
async function test() {
  const { data, error } = await supabase.from('blogs').select('*').eq('slug', 'why-golden-hour-is-the-best-time-for-photos').single();
  console.log('Error:', error);
  console.log('Data exists:', !!data);
}
test();
