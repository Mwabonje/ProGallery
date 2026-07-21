import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://bdaqtpyzqutelkdgcoex.supabase.co', 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib');

async function test() {
  const { data, error } = await supabase.rpc('increment_blog_view', { blog_slug: 'why-golden-hour-is-the-best-time-for-photos' });
  console.log('Error:', error);
  console.log('Data:', data);
}

test();
