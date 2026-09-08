const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

const deliveryCode = `
        {/* DELIVERY */}
        <section className={\`view \${currentView === 'delivery' ? 'active' : ''}\`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Delivery &amp; selects</h1>
              <p className="desc">Send clients their full shoot to pick favorites from, then track which images move to editing.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsCreateModalOpen(true)}>New delivery batch</button>
          </div>

          <div className="panel">
            <div className="panel-head"><h2>Delivery Galleries</h2><span className="meta">{galleries.filter(g => g.category?.toUpperCase() === 'DELIVERY').length} total</span></div>
            <table>
              <thead><tr><th>Client</th><th>Photos</th><th>Selected</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {galleries.filter(g => g.category?.toUpperCase() === 'DELIVERY').length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-500">No delivery galleries found. Create a gallery and set its category to "Delivery".</td></tr>
                )}
                {galleries.filter(g => g.category?.toUpperCase() === 'DELIVERY').map(gallery => {
                    const isExpired = gallery.expires_at && new Date(gallery.expires_at) < new Date();
                    const statusClass = isExpired ? 'red' : (gallery.selection_status === 'completed' ? 'green' : 'amber');
                    const statusText = isExpired ? 'Archived' : (gallery.selection_status === 'completed' ? 'Selections Complete' : 'Client selecting');
                    return (
                        <tr key={gallery.id} style={{cursor: 'pointer'}} onClick={(e) => {
                            if ((e.target as HTMLElement).closest('.row-actions')) return;
                            navigate(\`/gallery/\${gallery.id}\`);
                        }}>
                        <td className="cell-primary">
                            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                <div className="swatch" style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundImage: gallery.coverUrl ? \`url(\${getOptimizedImageUrl(gallery.coverUrl, 100, 100)})\` : 'none', backgroundColor: '#d1d5db', backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                                <div>
                                    {gallery.client_name}
                                </div>
                            </div>
                        </td>
                        <td>{gallery.itemCount || 0}</td>
                        <td>{gallery.selection_enabled ? 'Enabled' : 'Disabled'}</td>
                        <td><span className={\`badge \${statusClass}\`}><span className="dot"></span>{statusText}</span></td>
                        <td>
                            <div className="row-actions">
                                <button className="icon-btn" title="Edit" onClick={(e) => { e.stopPropagation(); navigate(\`/gallery/\${gallery.id}\`); }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                                </button>
                            </div>
                        </td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
          </div>
        </section>
`;

// Extract the chunk between {/* DELIVERY */} and {/* BLOG */}
const startIdx = code.indexOf('{/* DELIVERY */}');
const endIdx = code.indexOf('{/* BLOG */}');

if (startIdx !== -1 && endIdx !== -1) {
    code = code.slice(0, startIdx) + deliveryCode.trim() + '\n\n        ' + code.slice(endIdx);
    fs.writeFileSync('pages/Dashboard.tsx', code);
    console.log('Patched delivery section');
} else {
    console.error('Could not find delivery section bounds');
}
