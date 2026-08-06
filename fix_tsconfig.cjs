const fs = require('fs');
let tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
tsconfig.exclude = ["supabase/functions", "netlify", "**/*.cjs"];
fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));
console.log("Updated tsconfig");
