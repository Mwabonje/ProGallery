const fs = require('fs');
let code = fs.readFileSync('pages/Prints.tsx', 'utf8');

code = code.replace(/printsGalleries\.length > 0 && printsGalleries\[0\]\.coverUrl/g, 'prints.length > 0 && prints[0].file_url');
code = code.replace(/printsGalleries\[0\]\.coverUrl/g, 'prints[0].file_url');

fs.writeFileSync('pages/Prints.tsx', code);
console.log("Replaced");
