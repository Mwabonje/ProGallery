const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

code = code.replace(/galleries.filter\\(g => !g.category \\|\\| g.category.trim\\(\\) === ''\\).length < 6/g, "galleries.filter(g => !g.category || g.category.trim() === '').length < 50");

fs.writeFileSync('pages/Dashboard.tsx', code);
console.log("Patched create card condition successfully");
