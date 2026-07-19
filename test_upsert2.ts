import { supabase } from './services/supabase';

async function run() {
  const { data, error } = await supabase
    .from('blogs')
    .insert([{
      slug: 'test-slug',
      title: 'test',
      status: 'draft'
    }]);
    
  console.log("Insert result:", data, "error:", error);
}

run();
