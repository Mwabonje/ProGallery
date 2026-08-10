const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

code = code.replace(/gallerySizeBytes: number;/g, 'gallerySizeBytes: number;\n  expires_at: string | null;');

fs.writeFileSync('pages/Dashboard.tsx', code);
console.log("Interface updated");
