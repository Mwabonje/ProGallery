const fs = require('fs');
const path = './pages/ClientGallery.tsx';
let content = fs.readFileSync(path, 'utf8');

const unsubmitRegex = /  const unsubmitSelection = async \(\) => \{[\s\S]*?finally \{\s*setSubmittingSelection\(false\);\s*\}\s*\};/m;

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
      setGallery({ ...gallery, selection_status: "pending" });
      setToast({ message: "Selection unlocked for editing", type: "success" });
    } catch (err) {
      console.error("Error unsubmitting:", err);
      setToast({ message: "Failed to unlock selection", type: "error" });
    } finally {
      setSubmittingSelection(false);
    }
  };`;

if (unsubmitRegex.test(content)) {
  content = content.replace(unsubmitRegex, newUnsubmitCode);
  fs.writeFileSync(path, content, 'utf8');
  console.log("Replaced unsubmitSelection successfully!");
} else {
  console.log("Still could not find it via regex.");
}
