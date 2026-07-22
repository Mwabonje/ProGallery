const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

code = code.replace(/isFileLocked\(file\.id\) \? \(\n\s*<Lock className="w-5 h-5" \/>\n\s*\) : \(\n\s*<Download className="w-5 h-5" \/>\n\s*\)\}/g, 'isFileLocked(lightboxFile ? lightboxFile.id : "") ? (\n                    <Lock className="w-5 h-5" />\n                  ) : (\n                    <Download className="w-5 h-5" />\n                  )}');

fs.writeFileSync('pages/ClientGallery.tsx', code);
