import { supabase } from './services/supabase.ts';

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_statement: 'SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = \'selections\'' });
  console.log('Policies:', data);
  console.log('Error:', error);
}
check();
