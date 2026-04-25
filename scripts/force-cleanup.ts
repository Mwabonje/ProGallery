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
          // After returning from recursive call, we also add the folder itself so it can be deleted if needed
          allFiles.push({ path: fullPath, isFolder: true });
        } else {
          // File
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
  console.log("Fetching active galleries...");
  const { data: galleries, error: dbError } = await supabase.from('galleries').select('id');
  if (dbError) {
    console.error("DB error", dbError);
    return;
  }
  const activeIds = new Set((galleries || []).map(g => g.id));
  
  console.log("Exploring full storage tree...");
  const rootItemsResponse = await supabase.storage.from('gallery-files').list('', { limit: 1000 });
  const rootItems = rootItemsResponse.data || [];
  
  const foldersToClean = [];
  for (const item of rootItems) {
    if (item.id === null && item.name !== '.emptyFolderPlaceholder') {
      if (!activeIds.has(item.name)) {
        foldersToClean.push(item.name);
      }
    }
  }
  
  console.log(`Found ${foldersToClean.length} root level orphaned folders.`);
  
  for (const rootFolder of foldersToClean) {
     console.log(`Analyzing ${rootFolder}...`);
     const items = await getAllFiles(rootFolder);
     const filesToDelete = items.filter(i => !i.isFolder).map(i => i.path);
     const foldersToDelete = items.filter(i => i.isFolder).map(i => i.path).reverse(); // Deepest first
     foldersToDelete.push(rootFolder); // Add root folder at the end
     
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
     
     // Delete folders
     for (const f of foldersToDelete) {
         await supabase.storage.from('gallery-files').remove([f]);
     }
     console.log(`COMPLETED ${rootFolder}`);
  }
}

forceCleanup();
