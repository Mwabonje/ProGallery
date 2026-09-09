import { supabase } from './services/supabase';
async function test() {
  const settings = JSON.stringify({ brandName: "TEST" });
  console.log("String length:", settings.length);
}
test();
