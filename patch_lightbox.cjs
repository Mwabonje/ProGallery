const fs = require('fs');
const path = './pages/ClientGallery.tsx';
let content = fs.readFileSync(path, 'utf8');

const lightboxSearch = `            {displayedFiles.length > 1 && (
              <>
                <button`;

const lightboxReplace = `            {lightboxFile.is_edited && !isPortfolio && (
              <div className="absolute top-4 left-4 z-50 pointer-events-none">
                <span className="bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded shadow-lg tracking-wide">
                  EDITED
                </span>
              </div>
            )}
            {displayedFiles.length > 1 && (
              <>
                <button`;

if (content.includes(lightboxSearch)) {
  content = content.replace(lightboxSearch, lightboxReplace);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully patched lightbox");
} else {
  console.log("Could not find the lightbox search string");
}
