const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

code = code.replace(
    /return getDisplayUrl\(file\);\n  \};\n\n  const isFileLocked/,
    'return file.thumbnail_url || file.file_url;\n  };\n\n  const isFileLocked'
);

fs.writeFileSync('pages/ClientGallery.tsx', code);
