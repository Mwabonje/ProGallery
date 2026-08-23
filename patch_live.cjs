const fs = require('fs');
let code = fs.readFileSync('pages/LiveDisplay.tsx', 'utf8');

const queryTarget = `.order('created_at', { ascending: false })`;
const queryReplacement = `.neq('file_path', 'GALLERY_PASSWORD')
                    .order('created_at', { ascending: false })`;

code = code.replace(queryTarget, queryReplacement);
code = code.replace(queryTarget, queryReplacement); // there are two instances

fs.writeFileSync('pages/LiveDisplay.tsx', code);
console.log("Patched LiveDisplay");
