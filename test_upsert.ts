import { supabase } from './services/supabase.ts';

async function test() {
  // Try to insert a note for a dummy file/gallery or find an existing one?
  // First let's fetch an existing selection
  const { data: selData } = await supabase.from('selections').select('*').limit(1);
  if (!selData || selData.length === 0) {
      console.log('No selections to test');
      return;
  }
  const sel = selData[0];
  console.log('Testing with:', sel);
  
  // Try to update
  const { error: updErr } = await supabase.from('selections').update({ client_note: 'test update' }).eq('gallery_id', sel.gallery_id).eq('file_id', sel.file_id);
  console.log('Update Error:', updErr);
  
  // Try to upsert
  const { error: upsErr } = await supabase.from('selections').upsert({ gallery_id: sel.gallery_id, file_id: sel.file_id, client_note: 'test upsert' });
  console.log('Upsert Error:', upsErr);

  // Try Delete then Insert
  const { error: delErr } = await supabase.from('selections').delete().eq('gallery_id', sel.gallery_id).eq('file_id', sel.file_id);
  console.log('Delete Error:', delErr);
  
  if (!delErr) {
      const { error: insErr } = await supabase.from('selections').insert({ gallery_id: sel.gallery_id, file_id: sel.file_id, client_note: 'test delete+insert' });
      console.log('Insert Error:', insErr);
  }
}
test();
