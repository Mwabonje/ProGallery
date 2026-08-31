const fs = require('fs');
const path = './pages/ClientGallery.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('Unlock Selections')) {
    const parts = content.lastIndexOf('</div>');
    if (parts !== -1) {
        const before = content.substring(0, parts);
        const after = content.substring(parts);
        const modalCode = `
      {/* Unlock Selection Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Unlock Selections</h3>
            <p className="text-sm text-slate-600 mb-6">
              Please enter the 4-character PIN provided by your photographer to unlock and modify your submitted selections.
            </p>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={unlockPinInput}
                  onChange={(e) => setUnlockPinInput(e.target.value.toUpperCase())}
                  placeholder="Enter PIN"
                  maxLength={4}
                  className="w-full text-center text-2xl tracking-widest font-mono py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                />
                {unlockError && <p className="text-red-500 text-sm mt-2">{unlockError}</p>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUnlockModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUnlockSelection}
                  disabled={unlockPinInput.length !== 4 || submittingSelection}
                  className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {submittingSelection ? 'Unlocking...' : 'Unlock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
`;
        content = before + modalCode + after;
        fs.writeFileSync(path, content, 'utf8');
        console.log("Modal injected!");
    } else {
        console.log("Could not find last div");
    }
} else {
    console.log("Modal already exists");
}
