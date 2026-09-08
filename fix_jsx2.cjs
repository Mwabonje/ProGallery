const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

code = code.replace('return (\n\n    <div className="app admin-theme-v2">', 'return (\n    <>\n    <div className="app admin-theme-v2">');

fs.writeFileSync('pages/Dashboard.tsx', code);
console.log('Fixed JSX start');
