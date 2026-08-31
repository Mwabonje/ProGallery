const fs = require('fs');
const path = './pages/ClientGallery.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state for unlock modal
content = content.replace(
  /const \[submittingSelection, setSubmittingSelection\] = useState\(false\);/,
  `const [submittingSelection, setSubmittingSelection] = useState(false);\n  const [showUnlockModal, setShowUnlockModal] = useState(false);\n  const [unlockPinInput, setUnlockPinInput] = useState('');\n  const [unlockError, setUnlockError] = useState('');`
);

// 2. Modify unsubmitSelection
const unsubmitCode = `  const unsubmitSelection = async () => {
    if (!gallery) return;
    if (
      !confirm(
        \`Are you sure you want to edit your selection? This will notify the photographer that you are making changes.\`,
      )
    )
      return;
    setSubmittingSelection(true);
    try {
      const { error } = await supabase.rpc("unsubmit_selection", {
        gallery_id: gallery.id,
      });
      if (error) throw error;
      setSelectionSubmitted(false);
      setToast({ message: "Selection unlocked", type: "info" });
    } catch (err) {
      console.error("Error unsubmitting:", err);
      setToast({ message: "Failed to unlock selection", type: "error" });
    } finally {
      setSubmittingSelection(false);
    }
  };`;

const newUnsubmitCode = `  const handleUnlockRequest = () => {
    setUnlockError('');
    setUnlockPinInput('');
    setShowUnlockModal(true);
  };

  const confirmUnlockSelection = async () => {
    if (!gallery) return;
    
    const expectedPin = gallery.id.split('-')[0].slice(0, 4).toUpperCase();
    if (unlockPinInput.toUpperCase() !== expectedPin) {
      setUnlockError('Incorrect PIN. Please contact your photographer.');
      return;
    }

    setShowUnlockModal(false);
    setSubmittingSelection(true);
    try {
      const { error } = await supabase.rpc("unsubmit_selection", {
        gallery_id: gallery.id,
      });
      if (error) throw error;
      setSelectionSubmitted(false);
      setToast({ message: "Selection unlocked for editing", type: "success" });
    } catch (err) {
      console.error("Error unsubmitting:", err);
      setToast({ message: "Failed to unlock selection", type: "error" });
    } finally {
      setSubmittingSelection(false);
    }
  };`;

if (content.includes(unsubmitCode)) {
  content = content.replace(unsubmitCode, newUnsubmitCode);
} else {
  console.log("Could not find unsubmitSelection to replace");
}

// 3. Replace the onClick for Edit Selection button
content = content.replace(
  /onClick=\{unsubmitSelection\}/g,
  'onClick={handleUnlockRequest}'
);

// 4. Inject the Modal at the bottom before final div
const modalCode = `      {/* Unlock Selection Modal */}
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
                  disabled={unlockPinInput.length !== 4}
                  className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Unlock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

content = content.replace(
  /    <\/div>\n  \);\n\}\n*$/g,
  modalCode
);

fs.writeFileSync(path, content, 'utf8');
console.log("Patched ClientGallery.tsx successfully");
