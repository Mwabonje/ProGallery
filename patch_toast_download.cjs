const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

const target = `setToast({ message: "🎉 Your download has started!", type: "success" });`;
const replacement = `setToast({ message: "Your download has started!", type: "download" });`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('pages/ClientGallery.tsx', code);
    console.log("Patched download call successfully");
} else {
    console.log("Target not found.");
}
