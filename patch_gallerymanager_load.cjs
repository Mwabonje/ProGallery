const fs = require('fs');
let code = fs.readFileSync('pages/GalleryManager.tsx', 'utf8');

const target = `setEditCategory(galData.category || '');`;
const replacement = `setEditCategory(galData.category?.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim() || '');`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('pages/GalleryManager.tsx', code);
    console.log("Patched load category successfully");
} else {
    console.log("Could not find the target code to replace.");
}
