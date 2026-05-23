const fs = require('fs');
let content = fs.readFileSync('components/Layout.tsx', 'utf8');

// Sidebar background
content = content.replace(/bg-slate-900 text-white/g, 'bg-zinc-950 text-slate-50');

// Navigation links
content = content.replace(/hover:bg-slate-800/g, 'hover:bg-white/5');
content = content.replace(/hover:text-white/g, 'hover:text-white');
content = content.replace(/text-slate-300 hover:text-white/g, 'text-zinc-400 hover:text-white');

// Background of main area
content = content.replace(/bg-slate-50/g, 'bg-stone-50'); // subtle warm or very neutral light grey

fs.writeFileSync('components/Layout.tsx', content);

let gallery = fs.readFileSync('pages/GalleryManager.tsx', 'utf8');

gallery = gallery.replace(/bg-slate-50/g, 'bg-zinc-50/50');
gallery = gallery.replace(/border-slate-200/g, 'border-zinc-200/60');
gallery = gallery.replace(/border-slate-100/g, 'border-zinc-200/40');
gallery = gallery.replace(/text-slate-900/g, 'text-zinc-900');
gallery = gallery.replace(/text-slate-700/g, 'text-zinc-700');
gallery = gallery.replace(/text-slate-600/g, 'text-zinc-600');
gallery = gallery.replace(/text-slate-500/g, 'text-zinc-500');

fs.writeFileSync('pages/GalleryManager.tsx', gallery);
