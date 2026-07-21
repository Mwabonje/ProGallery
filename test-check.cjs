const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://bdaqtpyzqutelkdgcoex.supabase.co', 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib');

async function test() {
  const { data } = await supabase.from('blogs').select('slug, views, clicks');
  console.log(data);
}
test();
