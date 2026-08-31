const fs = require('fs');
const path = './pages/ClientGallery.tsx';
let content = fs.readFileSync(path, 'utf8');

const toggleSearch = `    const isSelected = selectedFileIds.has(file.id);

    if (!isSelected && gallery.selection_limit && gallery.selection_limit > 0) {`;

const toggleReplace = `    const isSelected = selectedFileIds.has(file.id);

    if (isSelected && file.is_edited) {
      setToast({ message: "This photo has already been edited and cannot be unselected.", type: "error" });
      return;
    }

    if (!isSelected && gallery.selection_limit && gallery.selection_limit > 0) {`;

if (content.includes(toggleSearch)) {
  content = content.replace(toggleSearch, toggleReplace);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully patched toggleSelection to block edited photos.");
} else {
  console.log("Could not find toggleSearch string.");
}
