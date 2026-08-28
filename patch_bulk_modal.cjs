const fs = require('fs');
const path = './pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const modalStr = `      {/* Bulk Actions Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" style={{ fontFamily: 'Inter, sans-serif' }}>
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
                    onChange={(e) => setBulkAction(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-800"
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
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-800"
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
`;

content = content.replace('{/* About Settings Modal */}', modalStr + '\n      {/* About Settings Modal */}');
fs.writeFileSync(path, content, 'utf8');
console.log("Successfully patched bulk modal");
