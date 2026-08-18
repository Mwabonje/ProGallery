const fs = require('fs');
let code = fs.readFileSync('pages/Portfolio.tsx', 'utf8');

const target = `baseCategory: gallery.category?.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim() || '',`;
const replacement = `baseCategory: (gallery.category?.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim() || '').toUpperCase(),`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('pages/Portfolio.tsx', code);
    console.log("Patched baseCategory successfully");
} else {
    console.log("Could not find the target code to replace.");
}
