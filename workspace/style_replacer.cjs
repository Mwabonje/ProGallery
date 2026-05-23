const fs = require('fs');
let content = fs.readFileSync('pages/GalleryManager.tsx', 'utf8');

// Replace card classes
content = content.replace(/bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200/g, 'bg-white p-6 rounded-2xl shadow-sm border border-slate-200');

// Input fields
content = content.replace(/border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/g, 'border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all');

content = content.replace(/rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none/g, "rounded-xl bg-slate-50 hover:bg-slate-100 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all");

// Secondary Buttons
content = content.replace(/bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex/g, 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 flex shadow-sm');
content = content.replace(/border rounded-lg flex items-center/g, 'border rounded-xl flex items-center');

// Headings
content = content.replace(/text-2xl md:text-3xl font-bold/g, 'text-3xl md:text-4xl font-semibold tracking-tight');
content = content.replace(/text-lg font-semibold mb-4/g, 'text-lg font-semibold tracking-tight mb-5');
content = content.replace(/h2 className="text-lg font-semibold/g, 'h2 className="text-lg font-semibold tracking-tight');

// Update button wrappers (the unified update button style)
content = content.replace(/className={`w-full py-2.5 rounded-lg flex justify-center/g, 'className={`w-full py-3 rounded-xl flex justify-center');
content = content.replace(/className="w-full py-2.5 bg-emerald-50/g, 'className="w-full py-3 bg-emerald-50');

// Dropzone 
content = content.replace(/bg-white rounded-xl shadow-sm border overflow-hidden transition-colors relative/g, 'bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-colors relative');
content = content.replace(/border-slate-200/g, 'border-slate-200');

// General rounded-lg -> rounded-xl for buttons
content = content.replace(/rounded-lg flex items-center/g, 'rounded-xl flex items-center');
content = content.replace(/rounded-lg font-medium/g, 'rounded-xl font-medium');
content = content.replace(/px-4 py-2 border border-slate-300 text-slate-700 rounded-lg/g, 'px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm');
content = content.replace(/px-4 py-2 justify-center bg-white border border-slate-300 text-slate-700 rounded-lg/g, 'px-4 py-2 justify-center bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm');
content = content.replace(/flex-1 md:flex-none justify-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg/g, 'flex-1 md:flex-none justify-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl');

// Make "Payment & Access" icon more subtle
content = content.replace(/<DollarSign className="w-5 h-5 text-slate-500" \/>/g, '<DollarSign className="w-5 h-5 text-slate-400" />');

// "View Selection" button cleaner
content = content.replace(/text-sm font-medium text-rose-700 hover:text-rose-900 underline/g, 'text-sm font-semibold text-rose-700 hover:text-rose-800 transition-colors');
content = content.replace(/text-sm font-medium text-slate-500 hover:text-slate-700 underline/g, 'text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors');

fs.writeFileSync('pages/GalleryManager.tsx', content);
