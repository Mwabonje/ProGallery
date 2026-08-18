const fs = require('fs');
let code = fs.readFileSync('pages/GalleryManager.tsx', 'utf8');

// 1. Add state for layout
const stateTarget = `const [editCategory, setEditCategory] = useState('');`;
const stateReplacement = `const [editCategory, setEditCategory] = useState('');
  const [editLayout, setEditLayout] = useState<'grid' | 'swipe'>('grid');`;
code = code.replace(stateTarget, stateReplacement);

// 2. Set layout on load
const fetchTarget = `setEditCategory(galData.category?.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim() || '');`;
const fetchReplacement = `setEditCategory(galData.category?.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim() || '');
    setEditLayout(galData.category?.match(/\\[swipe\\]/i) ? 'swipe' : 'grid');`;
code = code.replace(fetchTarget, fetchReplacement);

// 3. Set layout on cancel
const cancelTarget = `setEditCategory(gallery?.category?.replace(/\\s*\\[(swipe|grid)\\]/gi, '') || '');`;
const cancelReplacement = `setEditCategory(gallery?.category?.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim() || '');
                                    setEditLayout(gallery?.category?.match(/\\[swipe\\]/i) ? 'swipe' : 'grid');`;
code = code.replace(cancelTarget, cancelReplacement);

// 4. Update updateMeta
const updateMetaTarget = `const updateMeta = async () => {
    if (!gallery) return;
    try {
      let finalCategory = editCategory.trim();
      const layoutMatch = gallery.category?.match(/\\s*\\[(swipe|grid)\\]/i);
      if (layoutMatch && finalCategory) {
          finalCategory = \`\${finalCategory.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim()} \${layoutMatch[0].trim()}\`;
      }`;
const updateMetaReplacement = `const updateMeta = async () => {
    if (!gallery) return;
    try {
      let finalCategory = editCategory.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim();
      if (finalCategory) {
          finalCategory = \`\${finalCategory} [\${editLayout}]\`;
      }`;
code = code.replace(updateMetaTarget, updateMetaReplacement);

// 5. Add UI in edit mode
const uiTarget = `<datalist id="gallery-category-options">
                            {["Wedding", "Portraits", "Couples", "Commercial", "Events", "Maternity", "Boudoir", "Fine Art", "Prints"].map(cat => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                        <div className="flex gap-2">`;
const uiReplacement = `<datalist id="gallery-category-options">
                            {["Wedding", "Portraits", "Couples", "Commercial", "Events", "Maternity", "Boudoir", "Fine Art", "Prints"].map(cat => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                        {editCategory.trim() !== '' && (
                            <select
                                value={editLayout}
                                onChange={(e) => setEditLayout(e.target.value as 'grid' | 'swipe')}
                                className="w-full text-zinc-700 border border-zinc-200/60 rounded-md p-2 text-sm focus:border-slate-400 focus:outline-none"
                            >
                                <option value="grid">Grid Layout (Vertical Scroll)</option>
                                <option value="swipe">Swipe Layout (Horizontal Scroll)</option>
                            </select>
                        )}
                        <div className="flex gap-2">`;
code = code.replace(uiTarget, uiReplacement);

fs.writeFileSync('pages/GalleryManager.tsx', code);
console.log("Patched successfully");
