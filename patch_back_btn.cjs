const fs = require('fs');
let code = fs.readFileSync('pages/GalleryManager.tsx', 'utf8');

// Find where we can insert a back button or check if one already exists.
// Looking at the right column header
const headerPattern = '<h2 className="font-serif font-medium text-[18px] m-0 text-slate-900">Gallery content</h2>';
if (code.includes(headerPattern)) {
    const replacement = `
            <div className="flex items-center gap-3">
                <button onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    const returnTo = params.get('returnTo');
                    if (returnTo) {
                        navigate('/dashboard?view=' + returnTo);
                    } else {
                        navigate('/dashboard');
                    }
                }} className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <h2 className="font-serif font-medium text-[18px] m-0 text-slate-900">Gallery content</h2>
            </div>
    `.trim();
    code = code.replace(headerPattern, replacement);
    fs.writeFileSync('pages/GalleryManager.tsx', code);
    console.log('Added back button to GalleryManager');
} else {
    console.log('Header pattern not found');
}
