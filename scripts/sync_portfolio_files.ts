import { supabase } from '../services/supabase';

const R2_PUBLIC_BASE = 'https://pub-722a104adad649c9bb882d954680ee50.r2.dev';

// Map portfolio galleries to their authentic Mwabonje photos
const galleryPhotoMap: Record<string, Array<{ path: string; title: string; print_size?: string; material?: string; price?: string }>> = {
  'tamu hotel': [
    { path: 'portfolio/hospitality/tamu_hotel_01.jpg', title: 'Tamu Hotel Villa & Ocean Terrace' },
    { path: 'portfolio/hospitality/tamu_hotel_02.jpg', title: 'Tamu Hotel Living Pavilion' },
  ],
  'kilele house': [
    { path: 'portfolio/hospitality/kilele_house_01.jpg', title: 'Kilele House Lamu Architecture' },
    { path: 'portfolio/hospitality/kilele_house_02.jpg', title: 'Kilele House Courtyard Light' },
  ],
  'dacoum': [
    { path: 'portfolio/hospitality/dacoum_villa_01.jpg', title: 'Dacoum Coastal Villa' },
    { path: 'portfolio/hospitality/dacoum_villa_02.jpg', title: 'Dacoum Coral Stone Details' },
  ],
  'mangrove - mida': [
    { path: 'portfolio/hospitality/mangrove_mida_01.jpg', title: 'Mangrove Mida Creek Sanctuary' },
  ],
  'lamu': [
    { path: 'portfolio/places/lamu_dhow_01.jpg', title: 'Lamu Channel & Traditional Dhow' },
    { path: 'portfolio/places/lamu_lanes_01.jpg', title: 'Old Town Stone Architecture' },
  ],
  'watamu': [
    { path: 'portfolio/places/watamu_coast_01.jpg', title: 'Watamu Sandbank & Turquoise Tide' },
    { path: 'portfolio/places/watamu_coral_01.jpg', title: 'Watamu Coral Estuary' },
  ],
  'malindi': [
    { path: 'portfolio/places/malindi_shore_01.jpg', title: 'Malindi Shoreline at Dawn' },
  ],
  'chiedza & lewis': [
    { path: 'portfolio/weddings/chiedza_lewis_01.jpg', title: 'Chiedza & Lewis Beach Vows' },
    { path: 'portfolio/weddings/chiedza_lewis_02.jpg', title: 'Chiedza & Lewis Golden Sunset' },
  ],
  'raffaella': [
    { path: 'portfolio/weddings/raffaella_wedding_01.jpg', title: 'Raffaella Coastal Celebration' },
  ],
  'yashvi & jay': [
    { path: 'portfolio/couples/yashvi_jay_01.jpg', title: 'Yashvi & Jay Seaside Intimacy' },
    { path: 'portfolio/couples/yashvi_jay_02.jpg', title: 'Yashvi & Jay Golden Hour Glow' },
  ],
  'wanjira & kevin': [
    { path: 'portfolio/couples/wanjira_kevin_01.jpg', title: 'Wanjira & Kevin Coastal Story' },
  ],
  'ambrah & don': [
    { path: 'portfolio/couples/ambrah_don_01.jpg', title: 'Ambrah & Don Twilight Embrace' },
  ],
  'warehouse party': [
    { path: 'portfolio/events/warehouse_party_01.jpg', title: 'Warehouse Party Rhythm' },
    { path: 'portfolio/events/warehouse_party_02.jpg', title: 'Warehouse Party Nightfall' },
  ],
  'creative portraits': [
    { path: 'portfolio/portraits/creative_portrait_01.jpg', title: 'Creative Portrait Study I' },
    { path: 'portfolio/portraits/creative_portrait_02.jpg', title: 'Creative Portrait Study II' },
    { path: 'portfolio/portraits/barbar_portrait_01.jpg', title: 'Mwabonje Portrait at Barbar Malindi I' },
    { path: 'portfolio/portraits/barbar_portrait_02.jpg', title: 'Mwabonje Portrait at Barbar Malindi II' },
  ],
  'editorial': [
    { path: 'portfolio/portraits/editorial_portrait_01.jpg', title: 'Editorial Series — Natural Light' },
    { path: 'portfolio/portraits/editorial_portrait_02.jpg', title: 'Editorial Series — Form & Shadow' },
    { path: 'portfolio/portraits/editorial_portrait_03.jpg', title: 'Editorial Series — Modern Coastal' },
    { path: 'portfolio/portraits/barbar_portrait_03.jpg', title: 'Mwabonje Portrait at Barbar Malindi III' },
  ],
  'lifestyle': [
    { path: 'portfolio/portraits/lifestyle_portrait_01.jpg', title: 'Lifestyle Coastal Movement I' },
    { path: 'portfolio/portraits/lifestyle_portrait_02.jpg', title: 'Lifestyle Coastal Movement II' },
    { path: 'portfolio/portraits/barbar_portrait_04.jpg', title: 'Mwabonje Portrait at Barbar Malindi IV' },
  ],
  '__about__': [
    { path: 'portfolio/about/mwabonje_portrait.jpg', title: 'Michael Mwabonje Ringa' },
  ],
  'prints': [
    { 
      path: 'portfolio/prints/fine_art_coastal_01.jpg', 
      title: 'Coastal Horizon at First Light',
      print_size: 'A2 (420 x 594 mm)',
      material: 'Museum Archival Cotton Rag 310gsm',
      price: '18,500'
    },
    { 
      path: 'portfolio/prints/fine_art_coastal_02.jpg', 
      title: 'Architecture of Coastal Light',
      print_size: 'A2 (420 x 594 mm)',
      material: 'Museum Archival Cotton Rag 310gsm',
      price: '18,500'
    },
    { 
      path: 'portfolio/prints/fine_art_coastal_03.jpg', 
      title: 'Marine Dawn & Dhow Rhythm',
      print_size: 'A1 (594 x 841 mm)',
      material: 'Museum Archival Cotton Rag 310gsm',
      price: '24,000'
    },
    { 
      path: 'portfolio/prints/fine_art_coastal_04.jpg', 
      title: 'Malindi Golden Tide',
      print_size: 'A2 (420 x 594 mm)',
      material: 'Museum Archival Cotton Rag 310gsm',
      price: '18,500'
    },
  ],
};

async function syncPortfolioFiles() {
  const { data: allGals, error: gErr } = await supabase.from('galleries').select('*');
  if (gErr) throw gErr;

  console.log('Syncing portfolio galleries with authentic Mwabonje images...');

  for (const g of allGals || []) {
    const rawCat = (g.category || '').trim();
    // Exclude client delivery galleries (empty category)
    if (!rawCat) {
      console.log(`Skipping delivery gallery: "${g.client_name}"`);
      continue;
    }

    const nameKey = g.client_name.trim().toLowerCase();
    const mappedPhotos = galleryPhotoMap[nameKey];

    if (!mappedPhotos || mappedPhotos.length === 0) {
      console.log(`No explicit map for: "${g.client_name}" [cat: ${g.category}]`);
      continue;
    }

    console.log(`\nUpdating portfolio gallery "${g.client_name}" (${mappedPhotos.length} photos)...`);

    // Remove old broken 177/178 files for this portfolio gallery
    const { error: delErr } = await supabase
      .from('files')
      .delete()
      .eq('gallery_id', g.id)
      .neq('file_path', 'GALLERY_PASSWORD');

    if (delErr) {
      console.error(`Error clearing old files for ${g.client_name}:`, delErr);
    }

    // Insert the new authentic photos
    const filesToInsert = mappedPhotos.map((p, idx) => ({
      gallery_id: g.id,
      file_path: p.path,
      file_url: `${R2_PUBLIC_BASE}/${p.path}`,
      file_type: 'image',
      title: p.title,
      caption: p.title,
      description: p.title,
      print_size: p.print_size || null,
      material: p.material || null,
      price: p.price || null,
      download_count: 0,
      is_edited: false,
      expires_at: '2126-10-10T00:00:00.000Z', // Permanently stored portfolio
    }));

    const { error: insertErr } = await supabase.from('files').insert(filesToInsert);
    if (insertErr) {
      console.error(`Error inserting files for ${g.client_name}:`, insertErr);
    } else {
      console.log(`Successfully added ${filesToInsert.length} files to "${g.client_name}"!`);
    }

    // Also update cover_url in galleries table if column exists
    const primaryUrl = `${R2_PUBLIC_BASE}/${mappedPhotos[0].path}`;
    await supabase.from('galleries').update({ cover_url: primaryUrl }).eq('id', g.id);
  }

  console.log('\nPortfolio sync complete!');
}

syncPortfolioFiles();
