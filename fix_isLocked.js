const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

// Replace in the file map function
const fileMapRegex = /(<div[^>]*key=\{file\.id\}[^>]*>[\s\S]*?)(\{\s*isLocked\s*\?(?![^<]*<div className="flex items-center gap-2 bg-slate-50))/g;
// Wait, regex might be too complex for this. Let's do string replacement line by line.
