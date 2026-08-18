const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

const target = `      saveAs(content, zipName);

      // Log download all feature`;

const replacement = `      saveAs(content, zipName);
      
      setToast({ message: "🎉 Your download has started!", type: "success" });
      setTimeout(() => setToast(null), 3000);

      // Log download all feature`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('pages/ClientGallery.tsx', code);
    console.log("Patched successfully");
} else {
    console.log("Target not found.");
}
