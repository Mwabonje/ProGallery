const fs = require('fs');
const path = './pages/ClientGallery.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldBadges = `{/* Badges */}
                    {isSelectionMode && isSelected && !isPortfolio && (
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
                        <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                          SELECTED
                        </span>
                        {isExtra && (
                          <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                            EXTRA
                          </span>
                        )}
                        {selectionNotes[file.id] && (
                          <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                            NOTE ADDED
                          </span>
                        )}
                      </div>
                    )}`;

const newBadges = `{/* Badges */}
                    {!isPortfolio && ((isSelectionMode && isSelected) || file.is_edited) && (
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
                        {isSelectionMode && isSelected && (
                          <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                            SELECTED
                          </span>
                        )}
                        {file.is_edited && (
                          <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm tracking-wide">
                            EDITED
                          </span>
                        )}
                        {isSelectionMode && isSelected && isExtra && (
                          <span className="bg-slate-800 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                            EXTRA
                          </span>
                        )}
                        {isSelectionMode && isSelected && selectionNotes[file.id] && (
                          <span className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                            NOTE ADDED
                          </span>
                        )}
                      </div>
                    )}`;

if (content.includes(oldBadges)) {
  content = content.replace(oldBadges, newBadges);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully patched grid badges");
} else {
  console.log("Could not find the exact old badges code in ClientGallery.tsx grid.");
}
