const fs = require('fs');

const uiString = `
    <div className="app admin-theme-v2">
      <style>{\`
  .admin-theme-v2 {
    --sidebar:#0E1310;
    --sidebar-line: rgba(243,238,228,.12);
    --sidebar-text: rgba(243,238,228,.62);
    --bg:#F6F6F4;
    --card:#FFFFFF;
    --border:#E7E5E0;
    --text:#181A17;
    --muted:#6B6E68;
    --indigo:#4F46E5;
    --indigo-tint:#EEECFD;
    --green:#15803D;
    --green-tint:#E3F5E8;
    --red:#B42318;
    --red-tint:#FCEAE8;
    --amber:#A15C07;
    --amber-tint:#FBF0DD;
    background:var(--bg);
    color:var(--text);
    font-family:'Inter', sans-serif;
    font-size:14px;
    min-height:100vh;
  }
  .admin-theme-v2 * { box-sizing:border-box; margin:0; padding:0; }
  .admin-theme-v2 .serif { font-family:'Fraunces', serif; font-optical-sizing:auto; }
  .admin-theme-v2 a { color:inherit; text-decoration:none; }
  .admin-theme-v2 button { font-family:inherit; font-size:inherit; cursor:pointer; border:none; background:none; color:inherit; }

  .admin-theme-v2.app {
    display:grid;
    grid-template-columns:248px 1fr;
    min-height:100vh;
  }

  .admin-theme-v2 .sidebar {
    background:var(--sidebar);
    color:var(--sidebar-text);
    padding:1.75rem 1.25rem;
    display:flex;
    flex-direction:column;
    position:sticky;
    top:0;
    height:100vh;
  }

  .admin-theme-v2 .brand {
    display:flex;
    flex-direction:column;
    gap:.15rem;
    margin-bottom:2.25rem;
    padding:0 .5rem;
  }
  .admin-theme-v2 .brand .word { color:#F3EEE4; font-size:1.15rem; }
  .admin-theme-v2 .brand .sub { font-size:.72rem; letter-spacing:.02em; color:rgba(243,238,228,.4); }

  .admin-theme-v2 .nav-group { margin-bottom:1.75rem; }
  .admin-theme-v2 .nav-label { font-size:.68rem; color:rgba(243,238,228,.32); padding:0 .5rem; margin-bottom:.5rem; }
  .admin-theme-v2 .nav-item {
    width:100%; display:flex; align-items:center; gap:.7rem; padding:.55rem .5rem;
    border-radius:6px; font-size:.87rem; text-align:left; color:var(--sidebar-text);
    border-left:2px solid transparent; transition:background .15s ease, color .15s ease;
  }
  .admin-theme-v2 .nav-item svg { width:16px; height:16px; opacity:.75; flex-shrink:0; }
  .admin-theme-v2 .nav-item:hover { background:rgba(243,238,228,.06); color:#F3EEE4; }
  .admin-theme-v2 .nav-item.active { background:rgba(243,238,228,.08); color:#F3EEE4; border-left-color:#8B85F0; }
  .admin-theme-v2 .nav-item .count { margin-left:auto; font-size:.72rem; color:rgba(243,238,228,.35); }

  .admin-theme-v2 .sidebar-foot { margin-top:auto; padding-top:1rem; border-top:1px solid var(--sidebar-line); display:flex; align-items:center; gap:.65rem; }
  .admin-theme-v2 .avatar { width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#B9922F,#6E5417); flex-shrink:0; }
  .admin-theme-v2 .sidebar-foot .who { font-size:.82rem; color:#F3EEE4; }
  .admin-theme-v2 .sidebar-foot .role { font-size:.72rem; color:rgba(243,238,228,.4); }

  .admin-theme-v2 main { padding:2rem 2.5rem 4rem; max-width:1180px; }
  .admin-theme-v2 .topbar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:2rem; gap:2rem; flex-wrap:wrap; }
  .admin-theme-v2 .topbar h1 { font-size:1.9rem; font-weight:500; }
  .admin-theme-v2 .topbar p.desc { color:var(--muted); margin-top:.35rem; font-size:.9rem; max-width:46ch; }

  .admin-theme-v2 .primary-btn { background:var(--indigo); color:#fff; padding:.65rem 1.2rem; border-radius:7px; font-size:.87rem; font-weight:500; white-space:nowrap; }
  .admin-theme-v2 .primary-btn:hover { background:#4038CC; }
  .admin-theme-v2 .ghost-btn { border:1px solid var(--border); padding:.6rem 1.1rem; border-radius:7px; font-size:.85rem; color:var(--text); background:#fff; }
  .admin-theme-v2 .ghost-btn:hover { border-color:#C9C6BE; }

  .admin-theme-v2 .stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:1.1rem; margin-bottom:2.25rem; }
  .admin-theme-v2 .stat { background:var(--card); border:1px solid var(--border); border-radius:10px; padding:1.25rem 1.35rem; }
  .admin-theme-v2 .stat .label { font-size:.78rem; color:var(--muted); margin-bottom:.6rem; }
  .admin-theme-v2 .stat .value { font-size:1.7rem; font-weight:500; font-family:'Fraunces', serif; }
  .admin-theme-v2 .stat .delta { font-size:.76rem; margin-top:.4rem; }
  .admin-theme-v2 .stat .delta.up { color:var(--green); }
  .admin-theme-v2 .stat .delta.down { color:var(--red); }

  .admin-theme-v2 .panel { background:var(--card); border:1px solid var(--border); border-radius:10px; margin-bottom:1.75rem; overflow:hidden; }
  .admin-theme-v2 .panel-head { display:flex; justify-content:space-between; align-items:center; padding:1.25rem 1.4rem; border-bottom:1px solid var(--border); }
  .admin-theme-v2 .panel-head h2 { font-size:1.05rem; font-weight:500; font-family:'Fraunces', serif; }
  .admin-theme-v2 .panel-head .meta { font-size:.8rem; color:var(--muted); }

  .admin-theme-v2 table { width:100%; border-collapse:collapse; text-align: left; }
  .admin-theme-v2 thead th { text-align:left; font-size:.72rem; letter-spacing:.02em; color:var(--muted); font-weight:500; padding:.7rem 1.4rem; border-bottom:1px solid var(--border); }
  .admin-theme-v2 tbody td { padding:.9rem 1.4rem; border-bottom:1px solid var(--border); font-size:.87rem; vertical-align:middle; }
  .admin-theme-v2 tbody tr:last-child td { border-bottom:none; }
  .admin-theme-v2 tbody tr:hover { background:#FBFBFA; }
  .admin-theme-v2 .cell-primary { font-weight:500; }
  .admin-theme-v2 .cell-sub { color:var(--muted); font-size:.8rem; margin-top:.15rem; }

  .admin-theme-v2 .badge { display:inline-flex; align-items:center; gap:.4rem; padding:.28rem .65rem; border-radius:999px; font-size:.76rem; font-weight:500; }
  .admin-theme-v2 .badge.green { background:var(--green-tint); color:var(--green); }
  .admin-theme-v2 .badge.red { background:var(--red-tint); color:var(--red); }
  .admin-theme-v2 .badge.amber { background:var(--amber-tint); color:var(--amber); }
  .admin-theme-v2 .badge .dot { width:6px; height:6px; border-radius:50%; background:currentColor; }

  .admin-theme-v2 .row-actions { display:flex; gap:.5rem; justify-content:flex-end; }
  .admin-theme-v2 .icon-btn { width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:6px; color:var(--muted); }
  .admin-theme-v2 .icon-btn:hover { background:var(--bg); color:var(--text); }
  .admin-theme-v2 .icon-btn svg { width:15px; height:15px; }

  .admin-theme-v2 .view { display:none; }
  .admin-theme-v2 .view.active { display:block; }

  @media (max-width: 980px){
    .admin-theme-v2.app { grid-template-columns:1fr; }
    .admin-theme-v2 .sidebar { display:none; }
    .admin-theme-v2 .stats { grid-template-columns:repeat(2,1fr); }
    .admin-theme-v2 .cat-grid { grid-template-columns:repeat(2,1fr); }
    .admin-theme-v2 .form-grid { grid-template-columns:1fr; }
  }
  \`}</style>

      <aside className="sidebar">
        <div className="brand">
          <span className="word serif">Mwabonje</span>
          <span className="sub">Studio Console</span>
        </div>

        <div className="nav-group">
          <div className="nav-label">General</div>
          <button className={\`nav-item \${currentView === 'overview' || currentView === 'dashboard' ? 'active' : ''}\`} onClick={() => setSearchParams({view: 'overview'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
            Overview
          </button>
        </div>

        <div className="nav-group">
          <div className="nav-label">Content</div>
          <button className={\`nav-item \${currentView === 'galleries' ? 'active' : ''}\`} onClick={() => setSearchParams({view: 'galleries'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M3 14l4.5-4.5a2 2 0 0 1 2.8 0L14 13"/><circle cx="16.5" cy="7.5" r="1.5"/></svg>
            Galleries <span className="count">{galleries.length}</span>
          </button>
          <button className={\`nav-item \${currentView === 'proposals' ? 'active' : ''}\`} onClick={() => setSearchParams({view: 'proposals'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 4h16v13H8l-4 4V4z"/></svg>
            Proposals <span className="count">6</span>
          </button>
          <button className={\`nav-item \${currentView === 'delivery' ? 'active' : ''}\`} onClick={() => setSearchParams({view: 'delivery'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
            Delivery <span className="count">3</span>
          </button>
          <button className={\`nav-item \${currentView === 'blog' ? 'active' : ''}\`} onClick={() => setSearchParams({view: 'blog'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h4"/></svg>
            Blog
          </button>
          <button className={\`nav-item \${currentView === 'pages' ? 'active' : ''}\`} onClick={() => setSearchParams({view: 'pages'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 3h8l5 5v13H7z"/><path d="M15 3v5h5"/></svg>
            Pages
          </button>
        </div>

        <div className="nav-group">
          <div className="nav-label">Business</div>
          <button className={\`nav-item \${currentView === 'orders' ? 'active' : ''}\`} onClick={() => setSearchParams({view: 'orders'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 6h18M3 12h18M3 18h12"/></svg>
            Print orders <span className="count">3</span>
          </button>
          <button className={\`nav-item \${currentView === 'messages' ? 'active' : ''}\`} onClick={() => setSearchParams({view: 'messages'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 5h16v14H4z"/><path d="M4 6l8 7 8-7"/></svg>
            Messages <span className="count">4</span>
          </button>
        </div>

        <div className="nav-group">
          <div className="nav-label">System</div>
          <button className={\`nav-item \${currentView === 'settings' ? 'active' : ''}\`} onClick={() => setSearchParams({view: 'settings'})}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
            Settings
          </button>
        </div>

        <div className="sidebar-foot">
          <div className="avatar"></div>
          <div>
            <div className="who">JAMBO</div>
            <div className="role">Studio owner</div>
          </div>
        </div>
      </aside>

      <main>
        
        {/* OVERVIEW */}
        <section className={\`view \${(currentView === 'overview' || currentView === 'dashboard') ? 'active' : ''}\`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Overview</h1>
              <p className="desc">A working summary of galleries, client proposals, and orders across the site.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsCreateModalOpen(true)}>Upload to gallery</button>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="label">Published photos</div>
              <div className="value serif">1,284</div>
              <div className="delta up">+42 this month</div>
            </div>
            <div className="stat">
              <div className="label">Active proposals</div>
              <div className="value serif">6</div>
              <div className="delta">2 awaiting client review</div>
            </div>
            <div className="stat">
              <div className="label">Print orders</div>
              <div className="value serif">3</div>
              <div className="delta down">1 unfulfilled</div>
            </div>
            <div className="stat">
              <div className="label">New messages</div>
              <div className="value serif">4</div>
              <div className="delta">since last visit</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Recent activity</h2>
              <span className="meta">Last 7 days</span>
            </div>
            <table>
              <tbody>
                {activities.slice(0, 5).map(act => (
                    <tr key={act.id}>
                        <td className="cell-primary">
                            {act.action === 'gallery_created' && \`Gallery created\`}
                            {act.action === 'files_uploaded' && \`Files uploaded\`}
                            {act.action === 'gallery_password_updated' && \`Password updated\`}
                            <div className="cell-sub">{act.gallery?.client_name || 'System'}</div>
                        </td>
                        <td style={{textAlign: 'right', color: 'var(--muted)'}}>
                            {new Date(act.created_at).toLocaleDateString()}
                        </td>
                    </tr>
                ))}
                {activities.length === 0 && (
                    <tr>
                        <td className="cell-primary">Rafiki Hotel gallery published<div className="cell-sub">42 photos · Hospitality</div></td>
                        <td style={{textAlign: 'right', color: 'var(--muted)'}}>2 hours ago</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* GALLERIES */}
        <section className={\`view \${currentView === 'galleries' ? 'active' : ''}\`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Galleries</h1>
              <p className="desc">Manage the categories visible on the site and what's published in each.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsCreateModalOpen(true)}>New gallery</button>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>All Galleries</h2>
              <span className="meta">{galleries.length} total</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Gallery</th>
                  <th>Category</th>
                  <th>Views</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {galleries.map(gallery => {
                    const isExpired = gallery.expires_at && new Date(gallery.expires_at) < new Date();
                    const statusClass = isExpired ? 'red' : 'green';
                    const statusText = isExpired ? 'Archived' : 'Live';
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
                                    <div className="cell-sub">{gallery.itemCount || 0} photos</div>
                                </div>
                            </div>
                        </td>
                        <td>{gallery.category?.replace(/\\s*\\[(swipe|grid)\\]/gi, '') || 'Uncategorized'}</td>
                        <td>{gallery.analytics?.views || 0}</td>
                        <td><span className={\`badge \${statusClass}\`}><span className="dot"></span>{statusText}</span></td>
                        <td>
                            <div className="row-actions">
                                <button className="icon-btn" title="Edit" onClick={() => navigate(\`/gallery/\${gallery.id}\`)}>
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

        {/* PROPOSALS */}
        <section className={\`view \${currentView === 'proposals' ? 'active' : ''}\`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Proposal galleries</h1>
              <p className="desc">Private galleries sent to clients for review before final delivery.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsCreateModalOpen(true)}>New proposal</button>
          </div>

          <div className="panel">
            <table>
              <thead><tr><th>Client</th><th>Shoot</th><th>Photos</th><th>Status</th><th>Sent</th><th></th></tr></thead>
              <tbody>
                <tr>
                  <td className="cell-primary">Amara &amp; Kito<div className="cell-sub">Wedding</div></td>
                  <td>Shela Beach</td>
                  <td>84</td>
                  <td><span className="badge amber"><span className="dot"></span>Awaiting review</span></td>
                  <td style={{color: 'var(--muted)'}}>Yesterday</td>
                  <td><div className="row-actions"><button className="icon-btn">↗</button></div></td>
                </tr>
                <tr>
                  <td className="cell-primary">Rafiki Hotel<div className="cell-sub">Hospitality</div></td>
                  <td>Full property</td>
                  <td>142</td>
                  <td><span className="badge green"><span className="dot"></span>Approved</span></td>
                  <td style={{color: 'var(--muted)'}}>4 days ago</td>
                  <td><div className="row-actions"><button className="icon-btn">↗</button></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

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
            <div className="panel-head"><h2>Batches</h2><span className="meta">3 active</span></div>
            <table>
              <thead><tr><th>Client</th><th>Shoot</th><th>Photos</th><th>Selected</th><th>Status</th><th></th></tr></thead>
              <tbody>
                <tr>
                  <td className="cell-primary">Amara &amp; Kito<div className="cell-sub">Wedding</div></td>
                  <td>Shela Beach</td>
                  <td>210</td>
                  <td>38 of 210</td>
                  <td><span className="badge amber"><span className="dot"></span>Client selecting</span></td>
                  <td><div className="row-actions"><button className="icon-btn">↗</button></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* BLOG */}
        <section className={\`view \${currentView === 'blog' ? 'active' : ''}\`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Blog</h1>
              <p className="desc">Journal posts published on the site.</p>
            </div>
          </div>
          <div className="panel">
            <div style={{padding: '1.4rem'}}>
                <BlogAdmin />
            </div>
          </div>
        </section>

        {/* PAGES */}
        <section className={\`view \${currentView === 'pages' ? 'active' : ''}\`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Pages</h1>
              <p className="desc">Edit the fixed content on the site — the homepage hero and the About page.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsAboutModalOpen(true)}>Edit Settings</button>
          </div>

          <div className="panel">
              <div className="panel-head"><h2>Settings</h2><span className="meta">Click to edit global details</span></div>
              <div style={{padding: '1.4rem'}}>
                <button onClick={() => setIsAboutModalOpen(true)} className="ghost-btn">Open Settings Modal</button>
              </div>
          </div>
        </section>

        {/* ORDERS */}
        <section className={\`view \${currentView === 'orders' ? 'active' : ''}\`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Print orders</h1>
              <p className="desc">Orders placed through the Prints page.</p>
            </div>
          </div>

          <div className="panel">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Status</th><th style={{textAlign: 'right'}}>Amount</th></tr></thead>
              <tbody>
                <tr>
                  <td className="cell-primary">#1042</td>
                  <td>Naomi W.</td>
                  <td>3 canvas prints — Lamu series</td>
                  <td><span className="badge amber"><span className="dot"></span>Processing</span></td>
                  <td style={{textAlign: 'right'}}>KES 24,000</td>
                </tr>
                <tr>
                  <td className="cell-primary">#1041</td>
                  <td>David K.</td>
                  <td>1 framed print — Kilele House</td>
                  <td><span className="badge green"><span className="dot"></span>Fulfilled</span></td>
                  <td style={{textAlign: 'right'}}>KES 9,500</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* MESSAGES */}
        <section className={\`view \${currentView === 'messages' ? 'active' : ''}\`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Messages</h1>
              <p className="desc">Submissions from the site's contact form.</p>
            </div>
          </div>

          <div className="panel">
            <table>
              <thead><tr><th>From</th><th>Message</th><th>Received</th><th></th></tr></thead>
              <tbody>
                <tr>
                  <td className="cell-primary">Naomi W.<div className="cell-sub">naomi.w@email.com</div></td>
                  <td>Asking about availability for a couples shoot in November...</td>
                  <td style={{color: 'var(--muted)'}}>5 days ago</td>
                  <td><div className="row-actions"><button className="icon-btn">↗</button></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SETTINGS */}
        <section className={\`view \${currentView === 'settings' ? 'active' : ''}\`}>
          <div className="topbar">
            <div>
              <h1 className="serif">Settings</h1>
              <p className="desc">Site information and the navigation shown to visitors.</p>
            </div>
            <button className="primary-btn" onClick={() => setIsAboutModalOpen(true)}>Edit Global Config</button>
          </div>
          
          <div className="panel">
              <div className="panel-head"><h2>Settings</h2><span className="meta">Click to edit global details</span></div>
              <div style={{padding: '1.4rem'}}>
                <button onClick={() => setIsAboutModalOpen(true)} className="ghost-btn">Open Settings Modal</button>
              </div>
          </div>
        </section>

      </main>
    </div>
`;

let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');
const startStr = '  return (\n    <div className="admin-theme">';
const startIdx = code.indexOf(startStr);
const endStr = '      {/* Create Gallery Modal */}';
const endIdx = code.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const newCode = code.slice(0, startIdx) + '  return (\n' + uiString + '\n' + code.slice(endIdx);
    fs.writeFileSync('pages/Dashboard.tsx', newCode);
    console.log('Successfully patched Dashboard.tsx');
} else {
    console.error('Could not find boundaries.');
}

