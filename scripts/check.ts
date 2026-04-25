import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: galleries, error: dbError } = await supabase.from('galleries').select('id, client_name');
  console.log(galleries);
}
check();
