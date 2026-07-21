const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://bdaqtpyzqutelkdgcoex.supabase.co', 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib');
async function test() {
  const { data, error } = await supabase.from('blogs').select('slug').limit(1);
  if (error) { console.error('Error fetching blog:', error); return; }
  if (!data || data.length === 0) { console.log('No blogs found'); return; }
  const slug = data[0].slug;
  console.log('Testing RPC on slug:', slug);
  const res = await supabase.rpc('increment_blog_view', { blog_slug: slug });
  console.log('Result:', res);
}
test();
