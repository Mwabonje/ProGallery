const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

if (!code.includes('pendingNoteSaves.current')) {
  // Add useRef for tracking
  code = code.replace(
    /const fileInputRef = useRef<HTMLInputElement>\(null\);/,
    `const fileInputRef = useRef<HTMLInputElement>(null);\n  const pendingNoteSaves = useRef<Promise<void>[]>([]);`
  );

  // Wrap saveSelectionNoteDb body in promise tracking
  const saveFuncStart = `const saveSelectionNoteDb = async (fileId: string, note: string) => {\n    if (!gallery) return;`;
  const newSaveFuncStart = `const saveSelectionNoteDb = async (fileId: string, note: string) => {
    if (!gallery) return;
    
    const savePromise = (async () => {`;
    
  code = code.replace(saveFuncStart, newSaveFuncStart);

  // Close the promise tracking at the end of saveSelectionNoteDb
  const saveFuncEnd = `} catch (err) {\n      console.error("Error updating note", err);\n    }\n  };`;
  const newSaveFuncEnd = `} catch (err) {\n      console.error("Error updating note", err);\n    }\n    })();\n    pendingNoteSaves.current.push(savePromise);\n    await savePromise;\n  };`;
  code = code.replace(saveFuncEnd, newSaveFuncEnd);

  // Wait for promises in submitSelection
  const submitStart = `setSubmittingSelection(true);\n    try {`;
  const newSubmitStart = `setSubmittingSelection(true);\n    try {\n      await Promise.allSettled(pendingNoteSaves.current);`;
  code = code.replace(submitStart, newSubmitStart);
  
  fs.writeFileSync('pages/ClientGallery.tsx', code);
  console.log("Patched successfully");
} else {
  console.log("Already patched");
}
