const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

// Replace the two navigate(`/gallery/${gallery.id}`) occurrences with URL query persistence
code = code.replace(/navigate\(\`\/gallery\/\$\{gallery.id\}\`\)/g, "navigate(`/gallery/${gallery.id}?returnTo=${currentView}`)");
code = code.replace(/navigate\(\`\/gallery\/\$\{data.id\}\`\)/g, "navigate(`/gallery/${data.id}?returnTo=${currentView}`)");

fs.writeFileSync('pages/Dashboard.tsx', code);
console.log('Patched navigation returnTo');
