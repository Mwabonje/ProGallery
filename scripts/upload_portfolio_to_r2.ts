import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const accountId = (process.env.R2_ACCOUNT_ID || '').replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com.*$/, '').replace(/\/$/, '');
const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://' + accountId + '.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const carrdImages = [
  // Card / Bio
  { src: 'https://mwabonje.carrd.co/assets/images/card.jpg?v=98a8609c', key: 'portfolio/about/mwabonje_portrait.jpg', category: 'about', title: 'Michael Mwabonje Ringa' },
  
  // Gallery 01 - Coastal, Hospitality, Places & Weddings
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/257d93f7_original.jpg?v=98a8609c', key: 'portfolio/hospitality/tamu_hotel_01.jpg', category: 'hospitality', title: 'Tamu Hotel Villa' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/6285b6f9_original.jpg?v=98a8609c', key: 'portfolio/hospitality/kilele_house_01.jpg', category: 'hospitality', title: 'Kilele House' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/6bad18d7_original.jpg?v=98a8609c', key: 'portfolio/hospitality/dacoum_villa_01.jpg', category: 'hospitality', title: 'Dacoum Coastal Architecture' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/30257f9b_original.jpg?v=98a8609c', key: 'portfolio/places/lamu_dhow_01.jpg', category: 'places', title: 'Lamu Waters & Dhow' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/f4b86fcb_original.jpg?v=98a8609c', key: 'portfolio/places/watamu_coast_01.jpg', category: 'places', title: 'Watamu Coastline' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/62cf7a9b_original.jpg?v=98a8609c', key: 'portfolio/places/malindi_shore_01.jpg', category: 'places', title: 'Malindi Shore' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/5b8d1dfd_original.jpg?v=98a8609c', key: 'portfolio/hospitality/mangrove_mida_01.jpg', category: 'hospitality', title: 'Mangrove Mida Retreat' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/4171184f_original.jpg?v=98a8609c', key: 'portfolio/weddings/chiedza_lewis_01.jpg', category: 'weddings', title: 'Chiedza & Lewis Celebration' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/db739e2c_original.jpg?v=98a8609c', key: 'portfolio/weddings/raffaella_wedding_01.jpg', category: 'weddings', title: 'Raffaella Wedding' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/eded13a7_original.jpg?v=98a8609c', key: 'portfolio/couples/yashvi_jay_01.jpg', category: 'couples', title: 'Yashvi & Jay Portrait' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/3114f154_original.jpg?v=98a8609c', key: 'portfolio/couples/wanjira_kevin_01.jpg', category: 'couples', title: 'Wanjira & Kevin' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/dc97b8af_original.jpg?v=98a8609c', key: 'portfolio/couples/ambrah_don_01.jpg', category: 'couples', title: 'Ambrah & Don' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/584adc7f_original.jpg?v=98a8609c', key: 'portfolio/events/warehouse_party_01.jpg', category: 'events', title: 'Warehouse Party Gathering' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/03be6d76_original.jpg?v=98a8609c', key: 'portfolio/prints/fine_art_coastal_01.jpg', category: 'prints', title: 'Fine Art Print — Coastal Horizon' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/9fe61ec6_original.jpg?v=98a8609c', key: 'portfolio/prints/fine_art_coastal_02.jpg', category: 'prints', title: 'Fine Art Print — Architecture of Light' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/caa27669_original.jpg?v=98a8609c', key: 'portfolio/prints/fine_art_coastal_03.jpg', category: 'prints', title: 'Fine Art Print — Marine Dawn' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/fdf0e2db_original.jpg?v=98a8609c', key: 'portfolio/hospitality/tamu_hotel_02.jpg', category: 'hospitality', title: 'Tamu Hotel Suites' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/6c0c22c5_original.jpg?v=98a8609c', key: 'portfolio/hospitality/kilele_house_02.jpg', category: 'hospitality', title: 'Kilele House Interior' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/fd28cc79_original.jpg?v=98a8609c', key: 'portfolio/hospitality/dacoum_villa_02.jpg', category: 'hospitality', title: 'Dacoum Courtyard' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/546ea7ba_original.jpg?v=98a8609c', key: 'portfolio/places/lamu_lanes_01.jpg', category: 'places', title: 'Lamu Stone Lanes' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/4b188969_original.jpg?v=98a8609c', key: 'portfolio/places/watamu_coral_01.jpg', category: 'places', title: 'Watamu Sandbank' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/d5947824_original.jpg?v=98a8609c', key: 'portfolio/weddings/chiedza_lewis_02.jpg', category: 'weddings', title: 'Chiedza & Lewis Sunset' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/7abe38f7_original.jpg?v=98a8609c', key: 'portfolio/couples/yashvi_jay_02.jpg', category: 'couples', title: 'Yashvi & Jay Golden Hour' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/7e7397e5_original.jpg?v=98a8609c', key: 'portfolio/events/warehouse_party_02.jpg', category: 'events', title: 'Warehouse Party Night' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery01/fd940aa5_original.jpg?v=98a8609c', key: 'portfolio/prints/fine_art_coastal_04.jpg', category: 'prints', title: 'Fine Art Print — Malindi Golden Tide' },

  // Gallery 02 - Barbar Restaurant & Portraits series
  { src: 'https://mwabonje.carrd.co/assets/images/gallery02/d727cfb5_original.jpg?v=98a8609c', key: 'portfolio/portraits/barbar_portrait_01.jpg', category: 'portraits', title: 'Barbar Series — Portrait 01' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery02/50ae3729_original.jpg?v=98a8609c', key: 'portfolio/portraits/creative_portrait_01.jpg', category: 'portraits', title: 'Creative Portrait 01' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery02/69d51324_original.jpg?v=98a8609c', key: 'portfolio/portraits/editorial_portrait_01.jpg', category: 'portraits', title: 'Editorial Portrait 01' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery02/7936b2d9_original.jpg?v=98a8609c', key: 'portfolio/portraits/lifestyle_portrait_01.jpg', category: 'portraits', title: 'Lifestyle Portrait 01' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery02/729bb3cd_original.jpg?v=98a8609c', key: 'portfolio/portraits/barbar_portrait_02.jpg', category: 'portraits', title: 'Barbar Series — Portrait 02' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery02/413ba754_original.jpg?v=98a8609c', key: 'portfolio/portraits/barbar_portrait_03.jpg', category: 'portraits', title: 'Barbar Series — Portrait 03' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery02/6c9a84f4_original.jpg?v=98a8609c', key: 'portfolio/portraits/creative_portrait_02.jpg', category: 'portraits', title: 'Creative Portrait 02' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery02/804254ea_original.jpg?v=98a8609c', key: 'portfolio/portraits/editorial_portrait_02.jpg', category: 'portraits', title: 'Editorial Portrait 02' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery02/c6b506f1_original.jpg?v=98a8609c', key: 'portfolio/portraits/lifestyle_portrait_02.jpg', category: 'portraits', title: 'Lifestyle Portrait 02' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery02/1afe94b2_original.jpg?v=98a8609c', key: 'portfolio/portraits/barbar_portrait_04.jpg', category: 'portraits', title: 'Barbar Series — Portrait 04' },
  { src: 'https://mwabonje.carrd.co/assets/images/gallery02/d58d6512_original.jpg?v=98a8609c', key: 'portfolio/portraits/editorial_portrait_03.jpg', category: 'portraits', title: 'Editorial Portrait 03' },
];

async function uploadPortfolio() {
  console.log(`Starting upload of ${carrdImages.length} authentic Mwabonje portfolio photos to Cloudflare R2...`);
  let successCount = 0;

  for (const img of carrdImages) {
    try {
      const res = await fetch(img.src);
      if (!res.ok) {
        console.error(`Failed to fetch ${img.src}: ${res.status}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const cmd = new PutObjectCommand({
        Bucket: 'my-photo-galleries',
        Key: img.key,
        Body: buffer,
        ContentType: 'image/jpeg',
      });
      await s3.send(cmd);
      successCount++;
      console.log(`Uploaded [${successCount}/${carrdImages.length}]: ${img.key} (${buffer.length} bytes)`);
    } catch (e: any) {
      console.error(`Error uploading ${img.key}:`, e.message);
    }
  }

  console.log(`\nSuccessfully uploaded ${successCount} portfolio images to Cloudflare R2!`);
}

uploadPortfolio();
