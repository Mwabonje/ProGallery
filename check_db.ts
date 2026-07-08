import { supabase } from './services/supabase';

async function run() {
    const { data, error } = await supabase.from('files').select('*').limit(1);
    if (data && data.length > 0) {
        console.log(Object.keys(data[0]));
    } else {
        console.log('No data or error:', error);
    }
}
run();
