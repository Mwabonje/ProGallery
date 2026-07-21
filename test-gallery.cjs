const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://bdaqtpyzqutelkdgcoex.supabase.co', 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib');
async function test() {
  const { data } = await supabase.from('files').select('id').limit(1);
  if (!data || data.length === 0) return console.log('No files');
  const fileId = data[0].id;
  const { error: viewErr } = await supabase.rpc('increment_file_view', { fid: fileId });
  console.log('View Error:', viewErr);
  const { error: clickErr } = await supabase.rpc('increment_file_click', { fid: fileId });
  console.log('Click Error:', clickErr);
}
test();
