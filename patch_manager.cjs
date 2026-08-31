const fs = require('fs');
const path = './pages/GalleryManager.tsx';
let content = fs.readFileSync(path, 'utf8');

const settingsSearch = `                         <label className="block text-sm text-zinc-700 font-medium mb-1">Agreed Number of Photos</label>
                         <div className="flex gap-2">
                             <input 
                                 type="number"`;

const settingsReplace = `                         <label className="block text-sm text-zinc-700 font-medium mb-1">Client Unlock PIN</label>
                         <div className="flex gap-2 mb-4">
                             <input 
                                 type="text" 
                                 className="w-full text-sm p-2 border border-zinc-200/60 rounded-md bg-zinc-100 text-zinc-500 font-mono tracking-widest uppercase cursor-not-allowed"
                                 value={gallery.id.split('-')[0].slice(0, 4).toUpperCase()}
                                 readOnly
                                 title="Share this PIN with clients if they need to unlock their submitted selections."
                             />
                         </div>
                         <label className="block text-sm text-zinc-700 font-medium mb-1">Agreed Number of Photos</label>
                         <div className="flex gap-2">
                             <input 
                                 type="number"`;

if (content.includes(settingsSearch)) {
  content = content.replace(settingsSearch, settingsReplace);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully patched GalleryManager for PIN");
} else {
  console.log("Could not find the search string in GalleryManager.tsx.");
}
