const fs = require('fs');

const path = './pages/Dashboard.tsx';
const content = fs.readFileSync(path, 'utf8');

const returnIndex = content.indexOf('  return (\n    <div className="flex flex-col lg:flex-row gap-8">');
if (returnIndex === -1) {
  console.log("Could not find return statement");
  process.exit(1);
}

const beforeReturn = content.substring(0, returnIndex);

const newReturn = `  return (
    <div className="admin-theme">
      <style>{\`
        .admin-theme {
          --sand:#F2EDE2;
          --surface:#FFFFFF;
          --ink:#1C1B18;
          --ink-soft:#4A473E;
          --line:#DED6C2;
          --line-soft:#E9E3D4;
          --muted:#8E8571;
          --indigo:#242C4C;
          --indigo-soft:#3B4676;
          --indigo-tint:#E7E9F1;
          --ochre:#B9822A;
          --ochre-tint:#F4E7CD;
          --rose:#A23B45;
          --green:#3F6B4A;

          font-family:'Inter', sans-serif;
          background:var(--sand);
          color:var(--ink);
          min-height: 100vh;
        }
        .admin-theme .display{ font-family:'Space Grotesk', sans-serif; }
        .admin-theme .mono{ font-family:'IBM Plex Mono', monospace; }

        .shell{ display:grid; grid-template-columns:72px 1fr 268px; min-height:100vh; }

        /* ---------------- ICON RAIL ---------------- */
        .rail{
          background:var(--indigo);
          display:flex;
          flex-direction:column;
          align-items:center;
          padding:20px 0;
          position:sticky; top:0; height:100vh;
        }
        .rail-mark{
          width:34px; height:34px;
          border-radius:8px;
          background:var(--ochre);
          display:flex; align-items:center; justify-content:center;
          font-family:'Space Grotesk', sans-serif;
          font-weight:700;
          font-size:15px;
          color:var(--indigo);
          margin-bottom:30px;
        }
        .rail-nav{ display:flex; flex-direction:column; gap:6px; flex:1; align-items:center; }
        .rail-item{
          width:52px;
          display:flex; flex-direction:column; align-items:center; gap:5px;
          padding:9px 0 7px 0;
          border-radius:9px;
          color:rgba(255,255,255,0.5);
          cursor:pointer;
          transition:background .15s ease, color .15s ease;
        }
        .rail-item:hover{ color:#fff; background:rgba(255,255,255,0.06); }
        .rail-item.active{ color:#fff; background:rgba(255,255,255,0.12); }
        .rail-item.active::before{
          content:'';
          width:3px; height:3px; border-radius:50%;
          background:var(--ochre);
        }
        .rail-item svg{ width:18px; height:18px; }
        .rail-item span{ font-size:8.5px; letter-spacing:0.02em; font-weight:500; }
        .rail-foot{ color:rgba(255,255,255,0.4); display:flex; flex-direction:column; align-items:center; gap:5px; padding-top:14px; }
        .rail-foot:hover{ color:#fff; cursor:pointer; }
        .rail-foot svg{ width:17px; height:17px; }
        .rail-foot span{ font-size:8.5px; font-weight:500; }

        /* ---------------- MAIN ---------------- */
        .main-content{ padding:0 0 60px 0; overflow-y:auto; height:100vh; }

        .topbar{
          background:var(--surface);
          border-bottom:1px solid var(--line);
          padding:20px 36px;
          display:flex;
          justify-content:space-between;
          align-items:center;
        }
        .topbar-title{ display:flex; align-items:baseline; gap:10px; }
        .topbar-title h1{
          font-family:'Space Grotesk', sans-serif;
          font-weight:600;
          font-size:20px;
          letter-spacing:-0.01em;
        }
        .topbar-title span{ font-size:12.5px; color:var(--muted); }

        .topbar-actions{ display:flex; align-items:center; gap:10px; }
        .search-pill{
          display:flex; align-items:center; gap:8px;
          background:var(--sand);
          border:1px solid var(--line);
          border-radius:20px;
          padding:8px 15px;
          width:220px;
        }
        .search-pill svg{ width:14px; height:14px; opacity:0.5; flex-shrink:0; }
        .search-pill input{
          border:none; background:transparent; outline:none;
          font-size:12.5px; font-family:'Inter', sans-serif; color:var(--ink); width:100%;
        }
        .search-pill input::placeholder{ color:var(--muted); }
        .custom-btn{
          font-family:'Space Grotesk', sans-serif;
          font-weight:500;
          font-size:12.5px;
          padding:9px 16px;
          border-radius:20px;
          display:inline-flex; align-items:center; gap:6px;
          cursor:pointer;
          border:1px solid transparent;
        }
        .btn-ochre{ background:var(--ochre); color:#2A1E08; }
        .btn-ochre:hover{ background:#A5761F; }
        .custom-btn svg{ width:13px; height:13px; }

        /* pattern divider — signature motif */
        .kanga-rule{
          height:8px;
          background-image:
            repeating-linear-gradient(45deg, var(--ochre) 0 4px, transparent 4px 9px);
          opacity:0.55;
        }

        .content-area{ padding:28px 36px 0 36px; }

        /* KPI ledger strip */
        .kpi-strip{
          display:grid;
          grid-template-columns:repeat(4, 1fr);
          background:var(--surface);
          border:1px solid var(--line);
          border-radius:10px;
          margin-bottom:30px;
          overflow:hidden;
        }
        .kpi{
          padding:16px 22px;
          border-right:1px solid var(--line-soft);
        }
        .kpi:last-child{ border-right:none; }
        .kpi-num{
          font-family:'IBM Plex Mono', monospace;
          font-size:22px;
          font-weight:500;
          color:var(--indigo);
        }
        .kpi-label{
          font-size:11px;
          color:var(--muted);
          text-transform:uppercase;
          letter-spacing:0.06em;
          margin-top:3px;
        }

        /* Tabs */
        .custom-tabs{ display:flex; gap:6px; margin-bottom:18px; }
        .custom-tab{
          font-family:'Space Grotesk', sans-serif;
          font-weight:500;
          font-size:13px;
          padding:8px 16px;
          border-radius:18px;
          cursor:pointer;
          color:var(--muted);
        }
        .custom-tab.active{ background:var(--indigo); color:#fff; }
        .custom-tab .count{
          font-family:'IBM Plex Mono', monospace;
          font-size:10.5px;
          margin-left:5px;
          opacity:0.75;
        }

        /* Ledger table */
        .ledger{
          background:var(--surface);
          border:1px solid var(--line);
          border-radius:10px;
          overflow:hidden;
          margin-bottom:38px;
        }
        .ledger-head{
          display:grid;
          grid-template-columns:34px 2.2fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr;
          padding:10px 20px;
          background:var(--sand);
          border-bottom:1px solid var(--line);
          font-size:10.5px;
          letter-spacing:0.07em;
          text-transform:uppercase;
          color:var(--muted);
          font-weight:600;
        }
        .ledger-row{
          display:grid;
          grid-template-columns:34px 2.2fr 1fr 1fr 0.8fr 0.8fr 0.8fr 1fr;
          align-items:center;
          padding:11px 20px;
          border-bottom:1px solid var(--line-soft);
          font-size:13px;
          transition:background .12s ease;
          cursor:pointer;
        }
        .ledger-row:last-child{ border-bottom:none; }
        .ledger-row:hover{ background:var(--sand); }
        .swatch{
          width:30px; height:30px;
          border-radius:6px;
          flex-shrink:0;
          background-size: cover;
          background-position: center;
        }
        .row-name{ display:flex; align-items:center; gap:11px; }
        .row-name-text{ font-weight:500; color:var(--ink); }
        .row-cat{ color:var(--muted); font-size:12px; }
        .status{
          display:inline-flex; align-items:center; gap:6px;
          font-size:11.5px; font-weight:500;
        }
        .status-dot{ width:6px; height:6px; border-radius:50%; }
        .status.submitted .status-dot{ background:var(--rose); }
        .status.live .status-dot{ background:var(--green); }
        .status.expired .status-dot{ background:var(--ochre); }
        .status.hidden .status-dot{ background:var(--muted); }
        .num{ font-family:'IBM Plex Mono', monospace; font-size:12.5px; color:var(--ink-soft); }
        .row-updated{ font-family:'IBM Plex Mono', monospace; font-size:11px; color:var(--muted); }

        .ledger-add{
          display:flex; align-items:center; gap:8px;
          padding:12px 20px;
          color:var(--ochre);
          font-size:12.5px; font-weight:500;
          font-family:'Space Grotesk', sans-serif;
          cursor:pointer;
          border-top:1px dashed var(--line);
        }
        .ledger-add svg{ width:14px; height:14px; }
        .ledger-add:hover{ background:var(--ochre-tint); }

        /* ---------------- RIGHT PANEL ---------------- */
        .side{ padding:28px 28px 60px 0; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100vh; }
        .card{
          background:var(--surface);
          border:1px solid var(--line);
          border-radius:10px;
          padding:16px;
        }
        .card-title{
          font-family:'Space Grotesk', sans-serif;
          font-weight:600;
          font-size:13px;
          margin-bottom:12px;
          display:flex; justify-content:space-between; align-items:center;
        }
        .card-title .pill{
          font-family:'IBM Plex Mono', monospace;
          font-size:11px;
          background:var(--indigo-tint);
          color:var(--indigo);
          padding:2px 8px;
          border-radius:10px;
        }
        .side-btns{ display:flex; flex-direction:column; gap:8px; }
        .side-btn{
          border:1px solid var(--line);
          border-radius:8px;
          padding:9px 12px;
          font-size:12px; font-weight:500;
          display:flex; align-items:center; gap:8px;
          cursor:pointer;
          justify-content:center;
        }
        .side-btn:hover{ border-color:var(--muted); }
        .side-btn svg{ width:13px; height:13px; opacity:0.7; }
        .side-btn.dark{ background:var(--indigo); color:#fff; border-color:var(--indigo); }

        .rank-row{
          display:flex; justify-content:space-between; align-items:center;
          padding:8px 0;
          border-bottom:1px solid var(--line-soft);
          font-size:12.5px;
          cursor:pointer;
        }
        .rank-row:hover { background: var(--sand); }
        .rank-row:last-child{ border-bottom:none; padding-bottom:0; }
        .rank-num{ font-family:'IBM Plex Mono', monospace; font-size:10px; color:var(--muted); width:16px; display:inline-block; }
        .rank-stats{ display:flex; gap:9px; font-family:'IBM Plex Mono', monospace; font-size:10.5px; color:var(--muted); }
        .rank-stats span{ display:inline-flex; gap:3px; align-items:center; }
        .rank-stats svg{ width:10px; height:10px; opacity:0.7; }

        .log-item{ padding:9px 0; border-bottom:1px solid var(--line-soft); }
        .log-item:last-child{ border-bottom:none; padding-bottom:0; }
        .log-name{ font-size:11.5px; font-weight:600; color:var(--ink); }
        .log-detail{ font-size:11px; color:var(--muted); margin-top:2px; line-height:1.4; }
        .log-time{ font-family:'IBM Plex Mono', monospace; font-size:9.5px; color:var(--muted); margin-top:3px; }
        .log-list{ max-height:340px; overflow-y:auto; }
        .log-list::-webkit-scrollbar{ width:3px; }
        .log-list::-webkit-scrollbar-thumb{ background:var(--line); }

        @media (max-width: 1200px){
          .shell{ grid-template-columns:72px 1fr; }
          .side{ display:none; }
        }
      \`}</style>
      <div className="shell">
        <aside className="rail">
          <div className="rail-mark">M</div>
          <nav className="rail-nav">
            <div className={\`rail-item \${currentView === 'dashboard' ? 'active' : ''}\`} onClick={() => navigate('/dashboard')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
              <span>Board</span>
            </div>
            <div className={\`rail-item \${currentView === 'audience' ? 'active' : ''}\`} onClick={() => navigate('/dashboard?view=audience')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/></svg>
              <span>Audience</span>
            </div>
            <div className={\`rail-item \${currentView === 'blogs' ? 'active' : ''}\`} onClick={() => navigate('/dashboard?view=blogs')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2.5h9l4 4V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z"/><path d="M9 12h6M9 16h6"/></svg>
              <span>Blog</span>
            </div>
            <div className={\`rail-item \${currentView === 'blog-analytics' ? 'active' : ''}\`} onClick={() => navigate('/dashboard?view=blog-analytics')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 20 8 10l5 5 8-11"/></svg>
              <span>Stats</span>
            </div>
            <div className={\`rail-item \${currentView === 'performance' ? 'active' : ''}\`} onClick={() => navigate('/dashboard?view=performance')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19 9.5 8l4.5 6 6-10"/></svg>
              <span>Perform</span>
            </div>
          </nav>
          <div className="rail-foot" onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>
            <span>Exit</span>
          </div>
        </aside>

        <main className="main-content">
          {currentView === 'blogs' && <div className="p-8"><BlogAdmin /></div>}
          {currentView === 'blog-analytics' && <div className="p-8"><BlogAnalytics /></div>}
          
          {(currentView === 'dashboard' || currentView === 'audience' || currentView === 'performance') && (
            <>
              <div className="topbar">
                <div className="topbar-title">
                  <h1>Galleries &amp; Deliveries</h1>
                  <span>Ledger view · All Time</span>
                </div>
                <div className="topbar-actions">
                  <div className="search-pill">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                    <input 
                        type="text" 
                        placeholder="Search galleries…" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button className="custom-btn btn-ochre" onClick={() => { setNewCategory(''); handleOpenCreateModal(); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    New Gallery
                  </button>
                </div>
              </div>
              <div className="kanga-rule"></div>

              <div className="content-area">
                <div className="kpi-strip">
                  <div className="kpi"><div className="kpi-num">{galleries.length}</div><div className="kpi-label">Total Galleries</div></div>
                  <div className="kpi"><div className="kpi-num">{clientDeliveriesCount}</div><div className="kpi-label">Active Deliveries</div></div>
                  <div className="kpi"><div className="kpi-num">{globalViews.toLocaleString()}</div><div className="kpi-label">Total Views</div></div>
                  <div className="kpi"><div className="kpi-num">{galleries.reduce((acc, g) => acc + (g.downloadCount || 0), 0).toLocaleString()}</div><div className="kpi-label">Total Downloads</div></div>
                </div>

                <div className="custom-tabs">
                  <div className="custom-tab active">Client Deliveries <span className="count">{clientDeliveriesCount}</span></div>
                </div>

                <div className="ledger">
                  <div className="ledger-head">
                    <div></div>
                    <div>Gallery</div>
                    <div>Category</div>
                    <div>Status</div>
                    <div>Items</div>
                    <div>Views</div>
                    <div>DLs</div>
                    <div>Updated</div>
                  </div>
                  <div id="delivery-rows">
                    {processedGalleries.filter(g => !g.category || g.category.trim() === '').map(gallery => {
                        let statusClass = 'live';
                        let statusText = 'Live';
                        if (!gallery.link_enabled) {
                            statusClass = 'hidden';
                            statusText = 'Hidden';
                        } else if (gallery.selection_status === 'submitted') {
                            statusClass = 'submitted';
                            statusText = 'Submitted';
                        } else if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
                            statusClass = 'expired';
                            statusText = 'Expired';
                        }
                        
                        return (
                        <div key={gallery.id} className="ledger-row" onClick={() => navigate(\`/gallery/\${gallery.id}\`)}>
                            <div className="swatch" style={{ backgroundImage: gallery.coverUrl ? \`url(\${getOptimizedImageUrl(gallery.coverUrl, 100, 100)})\` : 'none', backgroundColor: '#d1d5db' }}></div>
                            <div className="row-name"><span className="row-name-text">{gallery.client_name}</span></div>
                            <div className="row-cat">{gallery.category || 'Deliveries'}</div>
                            <div className={\`status \${statusClass}\`}><span className="status-dot"></span>{statusText}</div>
                            <div className="num">{gallery.itemCount}</div>
                            <div className="num">{getCardMetrics(gallery).v}</div>
                            <div className="num">{gallery.downloadCount || 0}</div>
                            <div className="row-updated">{formatDate(gallery.created_at)}</div>
                        </div>
                    )})}
                  </div>
                  <div className="ledger-add" onClick={() => { setNewCategory(''); handleOpenCreateModal(); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Add new delivery
                  </div>
                </div>

                <div className="custom-tabs">
                  <div className="custom-tab">Portfolio Collections <span className="count">{portfolioCount}</span></div>
                </div>

                <div className="ledger">
                  <div className="ledger-head">
                    <div></div>
                    <div>Gallery</div>
                    <div>Category</div>
                    <div>Status</div>
                    <div>Items</div>
                    <div>Views</div>
                    <div>DLs</div>
                    <div>Updated</div>
                  </div>
                  <div id="portfolio-rows">
                    {processedGalleries.filter(g => g.category && g.category.trim() !== '' && g.category !== 'ABOUT').map(gallery => {
                        let statusClass = 'live';
                        let statusText = 'Live';
                        if (!gallery.link_enabled) {
                            statusClass = 'hidden';
                            statusText = 'Hidden';
                        }
                        
                        return (
                        <div key={gallery.id} className="ledger-row" onClick={() => navigate(\`/gallery/\${gallery.id}\`)}>
                            <div className="swatch" style={{ backgroundImage: gallery.coverUrl ? \`url(\${getOptimizedImageUrl(gallery.coverUrl, 100, 100)})\` : 'none', backgroundColor: '#d1d5db' }}></div>
                            <div className="row-name"><span className="row-name-text">{gallery.client_name}</span></div>
                            <div className="row-cat">{gallery.category?.replace(/\\s*\\[(swipe|grid)\\]/gi, '')}</div>
                            <div className={\`status \${statusClass}\`}><span className="status-dot"></span>{statusText}</div>
                            <div className="num">{gallery.itemCount > 0 ? gallery.itemCount : '—'}</div>
                            <div className="num">{getCardMetrics(gallery).v}</div>
                            <div className="num">{gallery.downloadCount || 0}</div>
                            <div className="row-updated">{formatDate(gallery.created_at)}</div>
                        </div>
                    )})}
                  </div>
                  <div className="ledger-add" onClick={() => { setNewCategory('Wedding'); handleOpenCreateModal(); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Add new collection
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

        <aside className="side">
          {userId && userEmail === 'ringa.michael@gmail.com' && (
          <div className="card">
            <div className="card-title">About Page <span className="pill">{aboutViews} views</span></div>
            <div className="side-btns">
              <div className="side-btn" onClick={() => setIsAboutModalOpen(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.4"/><path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6"/></svg>
                Edit About Me
              </div>
              <div className="side-btn dark" onClick={() => window.open(\`/\`, '_blank')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-6-3.8-9S9.5 5.6 12 3Z"/></svg>
                Live Portfolio
              </div>
            </div>
          </div>
          )}

          <div className="card">
            <div className="card-title">Top Engagement</div>
            <div id="engagement-list">
                {[...galleries].sort((a,b) => (b.analytics.views + b.downloadCount) - (a.analytics.views + a.downloadCount)).slice(0, 5).map((gallery, i) => (
                    <div key={'eng-'+gallery.id} className="rank-row" onClick={() => navigate(\`/gallery/\${gallery.id}\`)}>
                        <span><span className="rank-num">{String(i+1).padStart(2,'0')}</span>{gallery.client_name}</span>
                        <span className="rank-stats">
                            <span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="2.6"/></svg>
                                {gallery.analytics.views}
                            </span>
                            <span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 20h16"/></svg>
                                {gallery.downloadCount || 0}
                            </span>
                        </span>
                    </div>
                ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Recent Activity</div>
            <div className="log-list" id="activity-list">
                {activities.length === 0 ? <div className="text-sm text-slate-400 py-4 text-center">No recent activity</div> : activities.map((log) => (
                    <div key={log.id} className="log-item">
                        <div className="log-name">{log.gallery?.client_name || 'Unknown Gallery'}</div>
                        <div className="log-detail">{log.action.replace(/Client submitted selection of (\\d+) photos/, 'Selected $1 photos')}</div>
                        <div className="log-time">{formatDate(log.timestamp)}</div>
                    </div>
                ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Modals from original code are appended outside the shell so they can float above */}
      {/* Create Gallery Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">New Gallery</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isCreating}
              >
                ✕
              </button>
            </div>
            <form onSubmit={createGallery} className="p-6">
              <div className="mb-4">
                <label htmlFor="clientName" className="block text-sm font-medium text-slate-700 mb-2">
                  Client Name or Event Title
                </label>
                <input
                  id="clientName"
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-800"
                  placeholder="e.g. John & Jane Wedding"
                  autoFocus
                  required
                  disabled={isCreating}
                />
              </div>

              {userEmail === 'ringa.michael@gmail.com' && (
              <div className="mb-6">
                <label htmlFor="category" className="block text-sm font-medium text-slate-700 mb-2">
                  Portfolio Category
                </label>
                <input
                  id="category"
                  type="text"
                  list="category-options"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-800"
                  placeholder="e.g. Wedding, Sports, Real Estate..."
                  disabled={isCreating}
                />
                <datalist id="category-options">
                  {Array.from(new Set([
                    "Wedding", 
                    "Portraits", 
                    "Couples",
                    "Commercial", 
                    "Events", 
                    "Maternity", 
                    "Boudoir", 
                    "Fine Art",
                    ...galleries.map(g => g.category ? g.category.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim() : '').filter(c => Boolean(c) && c.toUpperCase() !== 'ABOUT')
                  ])).map(cat => (
                    <option key={cat as string} value={cat as string} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-500 mt-2">Pick from the list or type your own to creatively group your public portfolio.</p>
              </div>
              )}
              {userEmail === 'ringa.michael@gmail.com' && newCategory.trim() !== '' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Display Layout
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewLayout('swipe')}
                      className={\`px-4 py-2 border rounded-lg flex items-center justify-center gap-2 transition-all \${newLayout === 'swipe' ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}\`}
                    >
                      <GalleryHorizontalEnd className="w-4 h-4" />
                      Swipe (Carousel)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLayout('grid')}
                      className={\`px-4 py-2 border rounded-lg flex items-center justify-center gap-2 transition-all \${newLayout === 'grid' ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}\`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Grid (4:6)
                    </button>
                  </div>
                </div>
              )}


              <div className="flex gap-3 justify-end mt-8">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newClientName.trim() || isCreating}
                  className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? 'Creating...' : 'Create Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* About Settings Modal */}
      {isAboutModalOpen && userId && (
         <div className="fixed inset-0 z-[100]">
         <AboutSettingsModal 
            userId={userId} 
            onClose={() => setIsAboutModalOpen(false)} 
         />
         </div>
      )}
    </div>
  );
};
`;

const finalContent = beforeReturn + newReturn;

fs.writeFileSync(path, finalContent, 'utf8');
console.log("Successfully patched Dashboard.tsx");
