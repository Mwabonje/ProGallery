const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

code = code.replace(/gallerySizeBytes: number;/g, 'gallerySizeBytes: number;\n  analytics: { views: number; clicks: number; viewToday: number; clickToday: number; view7d: number; click7d: number; view30d: number; click30d: number; };');

fs.writeFileSync('pages/Dashboard.tsx', code);
console.log("Replaced");
