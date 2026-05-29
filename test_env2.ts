
const keys = Object.keys(process.env).filter(k => k.includes('SUPABASE'));
console.log("Supabase keys:", keys.join(', '));
