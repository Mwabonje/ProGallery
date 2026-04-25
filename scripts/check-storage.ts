import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listFolders() {
  console.log("Listing inside c4a25623-9496-4036-b2f8-0e409d9008a0...");
  const { data: items, error: storageError } = await supabase.storage.from('gallery-files').list('c4a25623-9496-4036-b2f8-0e409d9008a0', { limit: 10000 });
  if (storageError) {
    console.error("error", storageError);
    return;
  }
  console.log(items);
}

listFolders();
