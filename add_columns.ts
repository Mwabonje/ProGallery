import { supabase } from './services/supabase';

async function addColumns() {
  console.log("Checking if profiles exist...");
  const { data, error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    console.error("error testing profiles", error);
  } else {
    console.log("profiles exist", data);
  }
}

addColumns();
