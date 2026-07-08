import { supabase } from './services/supabase';

async function run() {
    const { error } = await supabase.rpc('get_portfolio_galleries');
    console.log(error);
}
run();
