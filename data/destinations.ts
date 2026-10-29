export interface DestinationInfo {
  id: string;
  name: string;
  shortLabel: string;
  tagline: string;
  description: string;
  coverImage: string;
  keywords: string[];
  bestSeasons: string;
  bestLighting: string;
  weddingVibe: string;
  highlights: string[];
}

export const DESTINATIONS: DestinationInfo[] = [
  {
    id: 'watamu',
    name: 'Watamu',
    shortLabel: 'Watamu',
    tagline: 'Turquoise Bays & Beachfront Villas',
    description: 'Sun-drenched marine reserves, golden coral coves, and luxury residences like Hemingway’s and Medina Palms.',
    coverImage: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg',
    keywords: ['watamu', 'garoda', 'hemingways', 'medina', 'marine park', 'ocean sports', 'turtle bay'],
    bestSeasons: 'Dec – March (Crystal calm turquoise seas) · July – Oct (Breezy trade winds)',
    bestLighting: '06:15 – 07:30 (Soft sunrise over the bay) & 17:15 – 18:45 (Golden tide retreat)',
    weddingVibe: 'Barefoot luxury, marine sandbar vows, private beachfront estate celebrations',
    highlights: [
      'Sandbar ceremonies at low tide',
      'Oceanfront cocktail receptions in private villas',
      'Sunset dhow champagne cruises'
    ]
  },
  {
    id: 'lamu',
    name: 'Lamu Island',
    shortLabel: 'Lamu Island',
    tagline: 'Swahili Coral Architecture & Shela Vows',
    description: 'Centuries of Swahili coral masonry, tranquil car-free streets, golden hour dhow cruises, and relaxed Shela village elegance.',
    coverImage: 'https://images.pexels.com/photos/17311090/pexels-photo-17311090.jpeg',
    keywords: ['lamu', 'shela', 'peponi', 'manda', 'dhow', 'swahili', 'coral', 'kizingo'],
    bestSeasons: 'Nov – April (Golden calm waters) · Aug – Oct (Cool breeze & golden light)',
    bestLighting: '06:30 – 07:45 (Quiet village light) & 16:45 – 18:30 (Famous Lamu golden hour dhow sail)',
    weddingVibe: 'Bohemian editorial, historic stone courtyards, poetic dhow crossings',
    highlights: [
      'Intimate Shela rooftop elopements overlooking the channel',
      'Traditional sail dhow golden hour portraiture',
      'Ancient carved Swahili doorway editorial aesthetics'
    ]
  },
  {
    id: 'malindi',
    name: 'Malindi',
    shortLabel: 'Malindi',
    tagline: 'Golden Dunes & Coastal Lifestyle',
    description: 'Golden hour sand dunes at Che Shale, expansive untouched drift beaches, and vibrant tropical coastal architecture.',
    coverImage: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg',
    keywords: ['malindi', 'che shale', 'drift beach', 'vasco da gama', 'driftwood', 'sabaki'],
    bestSeasons: 'All year round (Warm coastal sun & dramatic expansive tides)',
    bestLighting: '06:15 – 07:15 (Dawn beach mist) & 17:00 – 18:30 (Che Shale golden sand dune light)',
    weddingVibe: 'Wild coastal romance, kitesurfing chic, golden dune sunsets',
    highlights: [
      'Che Shale golden sand dune editorial sessions',
      'Expansive open drift beach bridal portraits',
      'Tropical hideaway boutique celebrations'
    ]
  },
  {
    id: 'diani',
    name: 'Diani Beach',
    shortLabel: 'Diani Beach',
    tagline: 'Powder-White Sands & Coconut Groves',
    description: 'Expansive powder-white sands, gentle turquoise shallows, and world-class boutique eco-resorts on Kenya’s south coast.',
    coverImage: 'https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg',
    keywords: ['diani', 'galu', 'tiwi', 'south coast', 'sands', 'kinondo'],
    bestSeasons: 'Nov – March & July – Oct (Warm tropical waters)',
    bestLighting: '06:00 – 07:15 (Pristine pink sunrise) & 17:30 – 18:45 (Pastel twilight glow)',
    weddingVibe: 'Classic tropical paradise, palm-fringed lawns, wide ocean horizons',
    highlights: [
      'Galu beach sunrise vow exchanges',
      'Boutique luxury treehouse elopements',
      'Secluded coconut grove couple sessions'
    ]
  },
  {
    id: 'safari',
    name: 'Safari & Beyond',
    shortLabel: 'Safari & Nairobi',
    tagline: 'Masai Mara & Great Rift Valley',
    description: 'Bespoke safari elopements and luxury tented lodge celebrations across Kenya’s iconic savannas.',
    coverImage: 'https://images.pexels.com/photos/631317/pexels-photo-631317.jpeg',
    keywords: ['safari', 'mara', 'nairobi', 'rift valley', 'naivasha', 'amboseli', 'bush'],
    bestSeasons: 'July – Oct (Great Migration) · Jan – March (Golden dry savannah)',
    bestLighting: '06:00 – 07:30 (Dawn savanna mist) & 17:00 – 18:45 (Acacia golden sunset)',
    weddingVibe: 'Cinematic wilderness, luxury canvas tented lodges, untamed African horizon',
    highlights: [
      'Golden savanna portraits under lone acacia trees',
      'Private safari camp bush dining and vows',
      'Helicopter flight over Great Rift Valley'
    ]
  }
];

export const SHOOT_EXPERIENCES = [
  {
    id: 'wedding',
    title: 'Destination Wedding',
    subtitle: 'Multi-Day or Full Day Celebration',
    icon: '💍',
    suggestedDuration: 'Full Day (8–12 hrs) or Multi-Day Weekend',
    inquiryTopic: 'Destination Wedding Celebration'
  },
  {
    id: 'elopement',
    title: 'Intimate Coastal Elopement',
    subtitle: 'Couples & Small Gatherings (< 20 Guests)',
    icon: '🌿',
    suggestedDuration: '4–6 Hours (Golden Hour & Sunset Dhow)',
    inquiryTopic: 'Intimate Coastal Elopement'
  },
  {
    id: 'hospitality',
    title: 'Luxury Villa & Hospitality',
    subtitle: 'Resort Architecture & Brand Film',
    icon: '🏨',
    suggestedDuration: '1–3 Days Full Property Coverage',
    inquiryTopic: 'Luxury Villa / Hospitality Architecture Shoot'
  },
  {
    id: 'editorial_portraits',
    title: 'Editorial Portraits',
    subtitle: 'Fashion, Brand & Creative Narratives',
    icon: '📸',
    suggestedDuration: '2–3 Hours (Editorial Styling)',
    inquiryTopic: 'Editorial Portraits Session'
  },
  {
    id: 'couple_portraits',
    title: 'Couple Portraits',
    subtitle: 'Honeymoon, Anniversary & Lifestyle',
    icon: '✨',
    suggestedDuration: '1.5–2.5 Hours (Golden Hour Session)',
    inquiryTopic: 'Couple Portraits Session'
  }
];
