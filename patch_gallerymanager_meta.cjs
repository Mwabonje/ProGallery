const fs = require('fs');
let code = fs.readFileSync('pages/GalleryManager.tsx', 'utf8');

const target = `const updateMeta = async () => {
    if (!gallery) return;
    try {
      const { error } = await supabase
        .from('galleries')
        .update({ client_name: editClientName, title: editTitle, category: editCategory })
        .eq('id', gallery.id);`;

const replacement = `const updateMeta = async () => {
    if (!gallery) return;
    try {
      let finalCategory = editCategory.trim();
      const layoutMatch = gallery.category?.match(/\\s*\\[(swipe|grid)\\]/i);
      if (layoutMatch && finalCategory) {
          finalCategory = \`\${finalCategory.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim()} \${layoutMatch[0].trim()}\`;
      }
      
      const { error } = await supabase
        .from('galleries')
        .update({ client_name: editClientName, title: editTitle, category: finalCategory })
        .eq('id', gallery.id);`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('pages/GalleryManager.tsx', code);
    console.log("Patched updateMeta successfully");
} else {
    console.log("Could not find the target code to replace.");
}
