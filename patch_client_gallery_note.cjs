const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

const oldFunc = `  const saveSelectionNoteDb = async (fileId: string, note: string) => {
    if (!gallery) return;

    try {
      const { error } = await supabase
        .from("selections")
        .update({ client_note: note })
        .eq("gallery_id", gallery.id)
        .eq("file_id", fileId);

      if (error) {
        console.error("Failed to update note", error);
      }
    } catch (err) {
      console.error("Error updating note", err);
    }
  };`;

const newFunc = `  const saveSelectionNoteDb = async (fileId: string, note: string) => {
    if (!gallery) return;

    try {
      // 1. Fetch existing created_at
      const { data: existingSelection, error: fetchError } = await supabase
        .from("selections")
        .select("created_at")
        .eq("gallery_id", gallery.id)
        .eq("file_id", fileId)
        .maybeSingle();
        
      if (fetchError) {
          console.error("Failed to fetch selection for note update", fetchError);
          return;
      }

      // 2. Delete existing
      const { error: delError } = await supabase
        .from("selections")
        .delete()
        .eq("gallery_id", gallery.id)
        .eq("file_id", fileId);

      if (delError) {
          console.error("Failed to delete selection for note update", delError);
          return;
      }

      // 3. Insert new with note and original created_at
      const { error: insertError } = await supabase
        .from("selections")
        .insert({
           gallery_id: gallery.id,
           file_id: fileId,
           client_note: note,
           ...(existingSelection?.created_at ? { created_at: existingSelection.created_at } : {})
        });

      if (insertError) {
        console.error("Failed to insert updated note", insertError);
      }
    } catch (err) {
      console.error("Error updating note", err);
    }
  };`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('pages/ClientGallery.tsx', code);
