import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listFolders() {
  console.log("Listing buckets...");
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("error", error);
    return;
  }
  console.log("Buckets:", buckets?.map(b => b.name));
  
  if (buckets) {
      for (const b of buckets) {
          const { data: items } = await supabase.storage.from(b.name).list();
          console.log(`Bucket ${b.name} has ${items?.length} items in root.`);
      }
  }
}

listFolders();
