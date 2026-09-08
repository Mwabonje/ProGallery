import { supabase } from './services/supabase';
async function test() {
  const { data } = await supabase.from('galleries').select('id, client_name');
  if (data) {
    console.log(data.map(d => d.client_name));
  }
}
test();
