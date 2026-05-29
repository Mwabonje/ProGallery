import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// use service role key for admin privileges
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing supabase URL or service key");
  throw new Error("Missing env vars");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addRpc() {
  const { error } = await supabase.rpc('execute_sql', {
    sql: `
    CREATE OR REPLACE FUNCTION track_gallery_view(p_gallery_id uuid)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      INSERT INTO public.activity_logs (gallery_id, action)
      VALUES (p_gallery_id, 'gallery_view');
    END;
    $$;

    GRANT EXECUTE ON FUNCTION track_gallery_view(uuid) TO anon;
    GRANT EXECUTE ON FUNCTION track_gallery_view(uuid) TO authenticated;
    `
  });
  
  if (error) {
    if (error.message.includes('Could not find the function')) {
         console.log("No execute_sql. Will use direct REST");
    } else {
        console.error("Error creating RPC:", error);
    }
  } else {
    console.log("RPC created successfully");
  }
}

addRpc();
