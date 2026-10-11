// Authentic coastal portfolio photography by Mwabonje Studio (Michael Mwabonje Ringa)
// Sourced from the photographer's genuine portfolio work stored in Cloudflare R2

export interface ThemedGalleryAsset {
  coverUrl: string;
  images: string[];
  isVideo?: boolean;
}

const R2_BASE = 'https://pub-722a104adad649c9bb882d954680ee50.r2.dev';

export const REAL_HERO_IMAGE_URL = `${R2_BASE}/portfolio/hospitality/tamu_hotel_01.jpg`;
export const REAL_ABOUT_IMAGE_URL = `${R2_BASE}/portfolio/about/mwabonje_portrait.jpg`;

export const PORTFOLIO_THEMED_IMAGES: Record<string, ThemedGalleryAsset> = {
  "tamu hotel": {
    coverUrl: `${R2_BASE}/portfolio/hospitality/tamu_hotel_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/hospitality/tamu_hotel_01.jpg`,
      `${R2_BASE}/portfolio/hospitality/tamu_hotel_02.jpg`,
      `${R2_BASE}/portfolio/hospitality/dacoum_villa_01.jpg`,
      `${R2_BASE}/portfolio/hospitality/kilele_house_01.jpg`,
    ]
  },
  "kilele house": {
    coverUrl: `${R2_BASE}/portfolio/hospitality/kilele_house_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/hospitality/kilele_house_01.jpg`,
      `${R2_BASE}/portfolio/hospitality/kilele_house_02.jpg`,
      `${R2_BASE}/portfolio/hospitality/tamu_hotel_01.jpg`,
      `${R2_BASE}/portfolio/hospitality/dacoum_villa_02.jpg`,
    ]
  },
  "dacoum": {
    coverUrl: `${R2_BASE}/portfolio/hospitality/dacoum_villa_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/hospitality/dacoum_villa_01.jpg`,
      `${R2_BASE}/portfolio/hospitality/dacoum_villa_02.jpg`,
      `${R2_BASE}/portfolio/hospitality/kilele_house_02.jpg`,
      `${R2_BASE}/portfolio/hospitality/tamu_hotel_02.jpg`,
    ]
  },
  "mangrove - mida": {
    coverUrl: `${R2_BASE}/portfolio/hospitality/mangrove_mida_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/hospitality/mangrove_mida_01.jpg`,
      `${R2_BASE}/portfolio/places/watamu_coast_01.jpg`,
      `${R2_BASE}/portfolio/places/lamu_dhow_01.jpg`,
    ]
  },
  "lamu": {
    coverUrl: `${R2_BASE}/portfolio/places/lamu_dhow_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/places/lamu_dhow_01.jpg`,
      `${R2_BASE}/portfolio/places/lamu_lanes_01.jpg`,
      `${R2_BASE}/portfolio/hospitality/kilele_house_01.jpg`,
      `${R2_BASE}/portfolio/prints/fine_art_coastal_01.jpg`,
    ]
  },
  "watamu": {
    coverUrl: `${R2_BASE}/portfolio/places/watamu_coast_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/places/watamu_coast_01.jpg`,
      `${R2_BASE}/portfolio/places/watamu_coral_01.jpg`,
      `${R2_BASE}/portfolio/places/malindi_shore_01.jpg`,
    ]
  },
  "malindi": {
    coverUrl: `${R2_BASE}/portfolio/places/malindi_shore_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/places/malindi_shore_01.jpg`,
      `${R2_BASE}/portfolio/places/watamu_coast_01.jpg`,
      `${R2_BASE}/portfolio/places/watamu_coral_01.jpg`,
    ]
  },
  "chiedza & lewis": {
    coverUrl: `${R2_BASE}/portfolio/weddings/chiedza_lewis_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/weddings/chiedza_lewis_01.jpg`,
      `${R2_BASE}/portfolio/weddings/chiedza_lewis_02.jpg`,
      `${R2_BASE}/portfolio/weddings/raffaella_wedding_01.jpg`,
      `${R2_BASE}/portfolio/couples/yashvi_jay_01.jpg`,
    ]
  },
  "raffaella": {
    coverUrl: `${R2_BASE}/portfolio/weddings/raffaella_wedding_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/weddings/raffaella_wedding_01.jpg`,
      `${R2_BASE}/portfolio/weddings/chiedza_lewis_01.jpg`,
      `${R2_BASE}/portfolio/weddings/chiedza_lewis_02.jpg`,
    ]
  },
  "yashvi & jay": {
    coverUrl: `${R2_BASE}/portfolio/couples/yashvi_jay_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/couples/yashvi_jay_01.jpg`,
      `${R2_BASE}/portfolio/couples/yashvi_jay_02.jpg`,
      `${R2_BASE}/portfolio/couples/wanjira_kevin_01.jpg`,
      `${R2_BASE}/portfolio/couples/ambrah_don_01.jpg`,
    ]
  },
  "wanjira & kevin": {
    coverUrl: `${R2_BASE}/portfolio/couples/wanjira_kevin_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/couples/wanjira_kevin_01.jpg`,
      `${R2_BASE}/portfolio/couples/yashvi_jay_01.jpg`,
      `${R2_BASE}/portfolio/couples/ambrah_don_01.jpg`,
    ]
  },
  "ambrah & don": {
    coverUrl: `${R2_BASE}/portfolio/couples/ambrah_don_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/couples/ambrah_don_01.jpg`,
      `${R2_BASE}/portfolio/couples/yashvi_jay_02.jpg`,
      `${R2_BASE}/portfolio/couples/wanjira_kevin_01.jpg`,
    ]
  },
  "warehouse party": {
    coverUrl: `${R2_BASE}/portfolio/events/warehouse_party_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/events/warehouse_party_01.jpg`,
      `${R2_BASE}/portfolio/events/warehouse_party_02.jpg`,
    ]
  },
  "creative portraits": {
    coverUrl: `${R2_BASE}/portfolio/portraits/creative_portrait_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/portraits/creative_portrait_01.jpg`,
      `${R2_BASE}/portfolio/portraits/creative_portrait_02.jpg`,
      `${R2_BASE}/portfolio/portraits/barbar_portrait_01.jpg`,
      `${R2_BASE}/portfolio/portraits/barbar_portrait_02.jpg`,
    ]
  },
  "editorial": {
    coverUrl: `${R2_BASE}/portfolio/portraits/editorial_portrait_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/portraits/editorial_portrait_01.jpg`,
      `${R2_BASE}/portfolio/portraits/editorial_portrait_02.jpg`,
      `${R2_BASE}/portfolio/portraits/editorial_portrait_03.jpg`,
      `${R2_BASE}/portfolio/portraits/barbar_portrait_03.jpg`,
    ]
  },
  "lifestyle": {
    coverUrl: `${R2_BASE}/portfolio/portraits/lifestyle_portrait_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/portraits/lifestyle_portrait_01.jpg`,
      `${R2_BASE}/portfolio/portraits/lifestyle_portrait_02.jpg`,
      `${R2_BASE}/portfolio/portraits/barbar_portrait_04.jpg`,
      `${R2_BASE}/portfolio/portraits/creative_portrait_02.jpg`,
    ]
  },
  "prints": {
    coverUrl: `${R2_BASE}/portfolio/prints/fine_art_coastal_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/prints/fine_art_coastal_01.jpg`,
      `${R2_BASE}/portfolio/prints/fine_art_coastal_02.jpg`,
      `${R2_BASE}/portfolio/prints/fine_art_coastal_03.jpg`,
      `${R2_BASE}/portfolio/prints/fine_art_coastal_04.jpg`,
    ]
  },
  "mvuvi": {
    coverUrl: `${R2_BASE}/portfolio/places/lamu_dhow_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/places/lamu_dhow_01.jpg`,
    ],
    isVideo: true
  },
  "malindi sunset": {
    coverUrl: `${R2_BASE}/portfolio/places/malindi_shore_01.jpg`,
    images: [
      `${R2_BASE}/portfolio/places/malindi_shore_01.jpg`,
    ],
    isVideo: true
  },
  "about": {
    coverUrl: REAL_ABOUT_IMAGE_URL,
    images: [REAL_ABOUT_IMAGE_URL]
  }
};

export const isRealPortfolioUrl = (url?: string | null): boolean => {
  if (!url) return false;
  // Generic placeholders
  if (url.includes('images.unsplash.com')) {
    return false;
  }
  return true;
};


export const getThemedCoverImage = (clientName?: string, category?: string): string => {
  const name = (clientName || '').toLowerCase().trim();
  const cat = (category || '').toLowerCase().trim();

  for (const [key, asset] of Object.entries(PORTFOLIO_THEMED_IMAGES)) {
    if (name.includes(key)) {
      return asset.coverUrl;
    }
  }

  if (cat.includes('wedding')) {
    return PORTFOLIO_THEMED_IMAGES['chiedza & lewis'].coverUrl;
  }
  if (cat.includes('couple')) {
    return PORTFOLIO_THEMED_IMAGES['yashvi & jay'].coverUrl;
  }
  if (cat.includes('portrait')) {
    return PORTFOLIO_THEMED_IMAGES['editorial'].coverUrl;
  }
  if (cat.includes('airbnb') || cat.includes('hospitality')) {
    return PORTFOLIO_THEMED_IMAGES['tamu hotel'].coverUrl;
  }
  if (cat.includes('film')) {
    return PORTFOLIO_THEMED_IMAGES['malindi sunset'].coverUrl;
  }
  if (cat.includes('place')) {
    return PORTFOLIO_THEMED_IMAGES['lamu'].coverUrl;
  }
  if (cat.includes('event')) {
    return PORTFOLIO_THEMED_IMAGES['warehouse party'].coverUrl;
  }
  if (cat.includes('print')) {
    return PORTFOLIO_THEMED_IMAGES['prints'].coverUrl;
  }
  if (cat.includes('about')) {
    return REAL_ABOUT_IMAGE_URL;
  }

  return REAL_HERO_IMAGE_URL;
};

export const getThemedLookbookImages = (clientName?: string, category?: string): string[] => {
  const name = (clientName || '').toLowerCase().trim();
  const cat = (category || '').toLowerCase().trim();

  for (const [key, asset] of Object.entries(PORTFOLIO_THEMED_IMAGES)) {
    if (name.includes(key)) {
      return asset.images;
    }
  }

  if (cat.includes('wedding')) {
    return PORTFOLIO_THEMED_IMAGES['chiedza & lewis'].images;
  }
  if (cat.includes('couple')) {
    return PORTFOLIO_THEMED_IMAGES['yashvi & jay'].images;
  }
  if (cat.includes('portrait')) {
    return PORTFOLIO_THEMED_IMAGES['editorial'].images;
  }
  if (cat.includes('airbnb') || cat.includes('hospitality')) {
    return PORTFOLIO_THEMED_IMAGES['tamu hotel'].images;
  }
  if (cat.includes('film')) {
    return PORTFOLIO_THEMED_IMAGES['malindi sunset'].images;
  }
  if (cat.includes('place')) {
    return PORTFOLIO_THEMED_IMAGES['lamu'].images;
  }
  if (cat.includes('event')) {
    return PORTFOLIO_THEMED_IMAGES['warehouse party'].images;
  }
  if (cat.includes('print')) {
    return PORTFOLIO_THEMED_IMAGES['prints'].images;
  }
  if (cat.includes('about')) {
    return [REAL_ABOUT_IMAGE_URL];
  }

  return PORTFOLIO_THEMED_IMAGES['lamu'].images;
};
