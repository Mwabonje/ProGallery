const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

const target = `...galleries.map(g => g.category).filter(c => Boolean(c) && c !== 'ABOUT')`;
const replacement = `...galleries.map(g => g.category ? g.category.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim() : '').filter(c => Boolean(c) && c.toUpperCase() !== 'ABOUT')`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('pages/Dashboard.tsx', code);
    console.log("Patched datalist successfully");
} else {
    console.log("Could not find the target code to replace.");
}
