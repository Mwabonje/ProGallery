import fs from 'fs';
import { supabase } from '../services/supabase';

async function matchR2Files() {
  const text = fs.readFileSync('r2_keys.txt', 'utf-8');
  const r2Keys = text.split('\n').filter(Boolean);
  
  const { data: dbFiles } = await supabase.from('files').select('id, gallery_id, file_path, file_url');
  const dbPaths = new Map((dbFiles || []).map(f => [f.file_path, f]));

  const { data: gals } = await supabase.from('galleries').select('id, client_name, category');
  const galMap = new Map((gals || []).map(g => [g.id, g]));

  let matchedInDb = 0;
  let unmatchedInDb = 0;
  const matchesByGallery: Record<string, { count: number; name: string; cat: string }> = {};

  for (const key of r2Keys) {
    if (key === 'analytics/data_v2.json') continue;
    const dbFile = dbPaths.get(key);
    if (dbFile) {
      matchedInDb++;
      const g = galMap.get(dbFile.gallery_id);
      const gName = g ? g.client_name : 'Unknown';
      const gCat = g ? g.category : '';
      if (!matchesByGallery[dbFile.gallery_id]) {
        matchesByGallery[dbFile.gallery_id] = { count: 0, name: gName, cat: gCat };
      }
      matchesByGallery[dbFile.gallery_id].count++;
    } else {
      unmatchedInDb++;
    }
  }

  console.log(`Matched in DB: ${matchedInDb}`);
  console.log(`Unmatched in DB (e.g. watermarks or other): ${unmatchedInDb}`);
  console.log('Matches by gallery:');
  for (const [gid, info] of Object.entries(matchesByGallery)) {
    console.log(`- Gallery "${info.name}" [category: "${info.cat}"]: ${info.count} files matched`);
  }
}
matchR2Files();
