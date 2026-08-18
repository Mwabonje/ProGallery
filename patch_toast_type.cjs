const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

let target = `type: "success" | "info";`;
let replacement = `type: "success" | "info" | "download";`;
code = code.replace(target, replacement);

target = `{toast.type === "success" ? (
              <Heart className="w-4 h-4 fill-current" />
            ) : (
              <Heart className="w-4 h-4" />
            )}`;
replacement = `{toast.type === "success" ? (
              <Heart className="w-4 h-4 fill-current" />
            ) : toast.type === "download" ? (
              <span className="text-base leading-none">🎉</span>
            ) : (
              <Heart className="w-4 h-4" />
            )}`;
code = code.replace(target, replacement);

fs.writeFileSync('pages/ClientGallery.tsx', code);
console.log("Patched type successfully");
