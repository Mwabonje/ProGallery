import { supabase } from './services/supabase';
async function test() {
  const { data } = await supabase.from('files').select('*').limit(1);
  console.log(data ? Object.keys(data[0]) : 'no data');
}
test();
