require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.example', 'utf8') + '\n' + (fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '');
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'missing';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'missing';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('selections').select('*').not('client_note', 'is', null);
  console.log('Notes:', data);
  console.log('Error:', error);
}
check();
