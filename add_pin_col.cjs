const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.example' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_statement: "ALTER TABLE galleries ADD COLUMN selection_pin TEXT;"
    });
    console.log("Result:", data, error);
}
main();
