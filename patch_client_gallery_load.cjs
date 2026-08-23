const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

const target = `      if (allFiles.length === 0) {
        setError(
          "This gallery link has expired. Please contact the photographer to request access.",
        );
      } else {
        setFiles(allFiles);
      }`;
const replacement = `      const pwFile = allFiles.find(f => f.file_path === 'GALLERY_PASSWORD');
      const actualFiles = allFiles.filter(f => f.file_path !== 'GALLERY_PASSWORD');
      
      if (pwFile && pwFile.caption) {
          setGalleryPassword(pwFile.caption);
          const savedAuth = sessionStorage.getItem(\`auth_\${activeGalleryId}\`);
          if (savedAuth === pwFile.caption) {
              setIsAuthenticated(true);
          }
      } else {
          setIsAuthenticated(true);
      }

      if (actualFiles.length === 0) {
        setError(
          "This gallery link has expired. Please contact the photographer to request access.",
        );
      } else {
        setFiles(actualFiles);
      }`;

code = code.replace(target, replacement);
fs.writeFileSync('pages/ClientGallery.tsx', code);
console.log("Patched loadGallery");
