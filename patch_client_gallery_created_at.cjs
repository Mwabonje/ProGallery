const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

code = code.replace(
  /const \[selectionNotes, setSelectionNotes\] = useState<Record<string, string>>\(\{\}\);/,
  `const [selectionNotes, setSelectionNotes] = useState<Record<string, string>>({});
  const [selectionDates, setSelectionDates] = useState<Record<string, string>>({});`
);

code = code.replace(
  /\.select\("file_id, client_note"\)/,
  `.select("file_id, client_note, created_at")`
);

code = code.replace(
  /const notes: Record<string, string> = \{\};/,
  `const notes: Record<string, string> = {};
          const dates: Record<string, string> = {};`
);

code = code.replace(
  /if \(s\.client_note\) notes\[s\.file_id\] = s\.client_note;/,
  `if (s.client_note) notes[s.file_id] = s.client_note;
            if (s.created_at) dates[s.file_id] = s.created_at;`
);

code = code.replace(
  /setSelectionNotes\(notes\);/,
  `setSelectionNotes(notes);
          setSelectionDates(dates);`
);

code = code.replace(
  /client_note: note/,
  `client_note: note,
          ...(selectionDates[fileId] ? { created_at: selectionDates[fileId] } : {})`
);

// We should also update toggleSelection to save the created_at when a new selection is made
code = code.replace(
  /const \{ error \} = await supabase\n\s*\.from\("selections"\)\n\s*\.insert\(\{\n\s*gallery_id: gallery\.id,\n\s*file_id: fileId,\n\s*\}\);/,
  `// Create a local timestamp to use immediately
      const now = new Date().toISOString();
      setSelectionDates(prev => ({ ...prev, [fileId]: now }));
      
      const { error } = await supabase
        .from("selections")
        .insert({
          gallery_id: gallery.id,
          file_id: fileId,
          created_at: now
        });`
);

fs.writeFileSync('pages/ClientGallery.tsx', code);
