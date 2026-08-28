const fs = require('fs');
const path = './pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update the grid-template-columns
content = content.replace(
  /grid-template-columns:34px 2\.2fr 1fr 1fr 0\.8fr 0\.8fr 0\.8fr 1fr 40px;/g,
  'grid-template-columns:34px 2.2fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr 80px;'
);

const previewButtonStr = `<div className="flex justify-end pr-2 gap-1">
                                <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(\`/g/\${gallery.id}\`, '_blank');
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                    title="Preview Gallery"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                </button>`;

// Replace the flex div
content = content.replace(
  /<div className="flex justify-end pr-2">/g,
  previewButtonStr
);

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully added preview buttons");
