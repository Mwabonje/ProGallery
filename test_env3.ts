import dotenv from 'dotenv';
dotenv.config();
console.log(process.env.SUPABASE_SERVICE_ROLE_KEY ? "YES" : "NO");
console.log(process.env.VITE_SUPABASE_ANON_KEY ? "YES" : "NO");
