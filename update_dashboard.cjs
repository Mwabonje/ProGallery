const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf-8');

// Add state variables
code = code.replace(
    /const \[timeFilter, setTimeFilter\] = useState\<'all' \| 'today' \| '7d' \| '30d'\>\('all'\);/,
    `const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [selectedGalleries, setSelectedGalleries] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'extend' | 'enable' | 'disable'>('extend');
  const [bulkExpiryHours, setBulkExpiryHours] = useState<number>(24);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

  const toggleGallerySelection = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSelectedGalleries(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleBulkUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedGalleries.length === 0) return;
      setIsUpdatingBulk(true);
      try {
          if (bulkAction === 'enable' || bulkAction === 'disable') {
              const linkEnabled = bulkAction === 'enable';
              const { error } = await supabase
                  .from('galleries')
                  .update({ link_enabled: linkEnabled })
                  .in('id', selectedGalleries);
              
              if (error) throw error;
              toast.success(\`Access \${linkEnabled ? 'enabled' : 'disabled'} for \${selectedGalleries.length} galleries\`);
          } else if (bulkAction === 'extend') {
              const newExpiry = new Date();
              newExpiry.setTime(newExpiry.getTime() + bulkExpiryHours * 60 * 60 * 1000);
              
              const { error } = await supabase
                  .from('files')
                  .update({ expires_at: newExpiry.toISOString() })
                  .in('gallery_id', selectedGalleries);
                  
              if (error) throw error;
              toast.success(\`Updated expiration for files in \${selectedGalleries.length} galleries\`);
          }
          
          setSelectedGalleries([]);
          setIsBulkModalOpen(false);
          fetchData();
      } catch (err: any) {
          console.error('Bulk update error:', err);
          toast.error(\`Failed to update galleries: \${err.message}\`);
      } finally {
          setIsUpdatingBulk(false);
      }
  };`
);

// Add bulk action toolbar at the top of the main content
code = code.replace(
    /\{\/\* Global Analytics Overview \*\/\}/,
    `{/* Bulk Actions Toolbar */}
        {selectedGalleries.length > 0 && (
            <div className="bg-slate-900 rounded-xl p-4 mb-6 shadow-lg flex items-center justify-between text-white animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                    <span className="bg-slate-800 text-slate-100 px-3 py-1 rounded-md text-sm font-medium">
                        {selectedGalleries.length} selected
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedGalleries([])}
                        className="text-slate-400 hover:text-white px-3 py-2 text-sm transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Bulk Update Link Settings
                    </button>
                </div>
            </div>
        )}

        {/* Global Analytics Overview */}`
);

// Selection checkbox for Client Deliveries
code = code.replace(
    /\{\/\* Status Badges Overlay \*\/\}/,
    `{/* Hover Checkbox */}
                    <div className={\`absolute top-2 left-2 z-20 transition-opacity duration-200 \${selectedGalleries.includes(gallery.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}\`}>
                        <div 
                            onClick={(e) => toggleGallerySelection(e, gallery.id)}
                            className={\`w-6 h-6 rounded border-2 flex items-center justify-center bg-white/80 backdrop-blur-sm shadow-sm hover:scale-105 transition-transform \${selectedGalleries.includes(gallery.id) ? 'border-slate-900 bg-slate-900' : 'border-slate-400'}\`}
                        >
                            {selectedGalleries.includes(gallery.id) && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                    </div>
                    {/* Selected Overlay */}
                    {selectedGalleries.includes(gallery.id) && (
                        <div className="absolute inset-0 bg-slate-900/10 z-10 mix-blend-multiply rounded-xl" />
                    )}

                    {/* Status Badges Overlay */}`
);

// Selection checkbox for Portfolio Collections
code = code.replace(
    /<div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" \/>/,
    `<div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                        
                        {/* Hover Checkbox */}
                        <div className={\`absolute top-2 left-2 z-20 transition-opacity duration-200 \${selectedGalleries.includes(gallery.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}\`}>
                            <div 
                                onClick={(e) => toggleGallerySelection(e, gallery.id)}
                                className={\`w-6 h-6 rounded border-2 flex items-center justify-center bg-black/40 backdrop-blur-sm shadow-sm hover:scale-105 transition-transform \${selectedGalleries.includes(gallery.id) ? 'border-white bg-white text-black' : 'border-white/70'}\`}
                            >
                                {selectedGalleries.includes(gallery.id) && <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                        </div>
                        {/* Selected Overlay */}
                        {selectedGalleries.includes(gallery.id) && (
                            <div className="absolute inset-0 bg-white/10 z-10 mix-blend-overlay rounded-xl" />
                        )}`
);

// Add the Bulk Modal code
code = code.replace(
    /\{\/\* About Settings Modal \*\/\}/,
    `{/* Bulk Actions Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-900">Bulk Update Link Settings</h2>
              <button 
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                disabled={isUpdatingBulk}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleBulkUpdate} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                   Action
                </label>
                <select 
                    value={bulkAction}
                    onChange={(e) => setBulkAction(e.target.value as any)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                    disabled={isUpdatingBulk}
                >
                    <option value="extend">Extend/Modify Download Expiration</option>
                    <option value="enable">Enable Gallery Links</option>
                    <option value="disable">Disable Gallery Links (Hide)</option>
                </select>
              </div>

              {bulkAction === 'extend' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Expiration Duration (hours from now)
                    </label>
                    <select
                        value={bulkExpiryHours}
                        onChange={(e) => setBulkExpiryHours(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                        disabled={isUpdatingBulk}
                    >
                        <option value={1}>1 Hour</option>
                        <option value={12}>12 Hours</option>
                        <option value={24}>24 Hours</option>
                        <option value={48}>48 Hours</option>
                        <option value={168}>1 Week</option>
                        <option value={720}>1 Month</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">This will update all files in the selected galleries to expire in the selected timeframe, reactivating any files that have already expired.</p>
                  </div>
              )}

              {bulkAction !== 'extend' && (
                  <p className="text-sm text-slate-600 mb-6 bg-slate-50 p-4 rounded-lg">
                      You are about to {bulkAction === 'enable' ? <strong>enable</strong> : <strong>disable</strong>} the client links for {selectedGalleries.length} galler{selectedGalleries.length === 1 ? 'y' : 'ies'}.
                  </p>
              )}

              <div className="flex gap-3 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                  disabled={isUpdatingBulk}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBulk}
                  className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdatingBulk ? 'Updating...' : 'Apply Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* About Settings Modal */}`
);

fs.writeFileSync('pages/Dashboard.tsx', code);
console.log('Done!');
