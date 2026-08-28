const fs = require('fs');
const path = './pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /grid-template-columns:34px 2\.2fr 1fr 1fr 0\.8fr 0\.8fr 0\.8fr 1fr;/g,
  'grid-template-columns:34px 2.2fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr 40px;'
);

content = content.replace(
  /<div>Updated<\/div>\s*<\/div>\s*<div id="delivery-rows">/g,
  '<div>Updated</div>\n                    <div></div>\n                  </div>\n                  <div id="delivery-rows">'
);

content = content.replace(
  /<div>Updated<\/div>\s*<\/div>\s*<div id="portfolio-rows">/g,
  '<div>Updated</div>\n                    <div></div>\n                  </div>\n                  <div id="portfolio-rows">'
);

content = content.replace(
  /<div className="row-updated">{formatDate\(gallery\.created_at\)}<\/div>\s*<\/div>/g,
  `<div className="row-updated">{formatDate(gallery.created_at)}</div>
                            <div className="flex justify-end pr-2">
                                <button 
                                    onClick={(e) => deleteGallery(e, gallery.id, gallery.client_name)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="Delete Gallery"
                                >
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                            </div>
                        </div>`
);

fs.writeFileSync(path, content, 'utf8');
console.log("Successfully patched delete button");
