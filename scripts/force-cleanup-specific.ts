import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bdaqtpyzqutelkdgcoex.supabase.co';
const supabaseKey = 'sb_publishable_aQY9i_vVRwG-CEWB2Nz4lQ_GwtLYqib';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllFiles(folderPath = '') {
  let allFiles = [];
  let hasMore = true;
  let offset = 0;
  
  while (hasMore) {
    const { data: items, error } = await supabase.storage.from('gallery-files').list(folderPath, { limit: 100, offset });
    if (error) {
      console.error(`Error listing ${folderPath}:`, error);
      break;
    }
    
    if (items && items.length > 0) {
      for (const item of items) {
        const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;
        if (item.id === null && item.name !== '.emptyFolderPlaceholder') {
          // This is a folder. Recursive call.
          const subItems = await getAllFiles(fullPath);
          allFiles = [...allFiles, ...subItems];
          // We also add the folder itself so it can be deleted if needed
          allFiles.push({ path: fullPath, isFolder: true });
        } else {
          allFiles.push({ path: fullPath, isFolder: false });
        }
      }
      
      if (items.length < 100) {
          hasMore = false;
      } else {
          offset += 100;
      }
    } else {
      hasMore = false;
    }
  }
  return allFiles;
}

async function forceCleanup() {
  const foldersToClean = [
     '9728f539-9e37-4d27-a828-be8519b0f5ee',
     'b7c0663e-8944-43c6-b381-4d03a34a9bb7',
     'c4a25623-9496-4036-b2f8-0e409d9008a0'
  ];
  
  for (const rootFolder of foldersToClean) {
     console.log(`Analyzing ${rootFolder}...`);
     const items = await getAllFiles(rootFolder);
     const filesToDelete = items.filter(i => !i.isFolder).map(i => i.path);
     const foldersToDelete = items.filter(i => i.isFolder).map(i => i.path).reverse();
     foldersToDelete.push(rootFolder);
     
     console.log(`Found ${filesToDelete.length} files and ${foldersToDelete.length} subfolders in ${rootFolder}.`);
     
     if (filesToDelete.length > 0) {
         for (let i = 0; i < filesToDelete.length; i += 100) {
             const batch = filesToDelete.slice(i, i + 100);
             const { error } = await supabase.storage.from('gallery-files').remove(batch);
             if (error) {
                 console.error(`Error deleting file batch:`, error);
             } else {
                 console.log(`Deleted file batch of size ${batch.length}`);
             }
         }
     }
     
     for (const f of foldersToDelete) {
         await supabase.storage.from('gallery-files').remove([f]);
     }
     console.log(`COMPLETED ${rootFolder}`);
     
     // Also delete from galleries and files table just in case! 
     await supabase.from('files').delete().eq('gallery_id', rootFolder);
     await supabase.from('galleries').delete().eq('id', rootFolder);
  }
}

forceCleanup();
