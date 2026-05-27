const fs = require('fs');
let content = fs.readFileSync('pages/GalleryManager.tsx', 'utf8');

// 1. Update the wrapper
content = content.replace(
    /<div className="divide-y divide-slate-100">/,
    '<div className={layoutView === \\\'grid\\\' ? "p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "divide-y divide-slate-100"}>'
);

// 2. Update the item root className
content = content.replace(
    /<div key=\{file\.id\} className=\{\`p-4 flex items-center justify-between hover:bg-zinc-50\\/80 transition-colors \\\$\{isSelected \? 'bg-rose-50\\/50' : ''\}\`\}>/,
    `<div key={file.id} className={layoutView === 'grid' ? \\\`relative group rounded-xl overflow-hidden border \\\${isSelected ? 'border-rose-300 ring-2 ring-rose-200' : 'border-zinc-200/60'} bg-white hover:shadow-md transition-all flex flex-col\\\` : \\\`p-4 flex items-center justify-between hover:bg-zinc-50/80 transition-colors \\\${isSelected ? 'bg-rose-50/50' : ''}\\\`}>`
);

// 3. Update the inner containers for flex/grid formatting
content = content.replace(
    /<div className="flex items-center gap-3 md:gap-4 overflow-hidden">/,
    `<div className={layoutView === 'grid' ? "flex flex-col flex-1" : "flex items-center gap-3 md:gap-4 overflow-hidden"}>`
);

// 4. Update checkbox container
content = content.replace(
    /<div className="flex items-center mr-1 md:mr-2">/,
    `<div className={layoutView === 'grid' ? \\\`absolute top-2 left-2 z-10 bg-white/80 backdrop-blur-sm rounded-md p-1 shadow-sm transition-opacity \\\${checkedFiles.includes(file.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}\\\` : "flex items-center mr-1 md:mr-2"}>`
);

// 5. Update thumbnail container
content = content.replace(
    /<div className="relative w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-200\/60">/,
    `<div className={layoutView === 'grid' ? "relative aspect-square bg-slate-100 w-full overflow-hidden border-b border-zinc-200/60 shrink-0" : "relative w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-200/60"}>`
);

// 6. Update details container
content = content.replace(
    /<div className="min-w-0 flex-1">/,
    `<div className={layoutView === 'grid' ? "p-3 flex-1 flex flex-col min-w-0" : "min-w-0 flex-1"}>`
);

// 7. Update actions container
content = content.replace(
    /<div className="flex items-center gap-1 md:gap-3 pl-2">/,
    `<div className={layoutView === 'grid' ? "flex items-center justify-between gap-2 p-2 border-t border-zinc-100 bg-zinc-50" : "flex items-center gap-1 md:gap-3 pl-2"}>`
);

fs.writeFileSync('pages/GalleryManager.tsx', content);
