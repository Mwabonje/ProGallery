const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

const target = `const baseCategory = newCategory.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim();`;
const replacement = `let matchedCategory = newCategory;
    const existingMatch = galleries.find(g => g.category && g.category.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim().toLowerCase() === newCategory.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim().toLowerCase());
    if (existingMatch && existingMatch.category) {
        matchedCategory = existingMatch.category.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim();
    }
    const baseCategory = matchedCategory.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim();`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('pages/Dashboard.tsx', code);
    console.log("Patched category successfully");
} else {
    console.log("Could not find the target code to replace.");
}
