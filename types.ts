export interface Profile {
  id: string;
  email: string;
  role: 'photographer' | 'client';
}

export interface Gallery {
  id: string;
  photographer_id: string;
  client_name: string;
  title: string;
  category?: string; // New: Portfolio category (e.g. Wedding, Portraits)
  agreed_balance: number;
  amount_paid: number;
  link_enabled: boolean;
  selection_enabled: boolean; // New: Toggle selection mode
  selection_status: 'pending' | 'submitted' | 'completed';
  selection_limit?: number;
  downloads_before_clearing?: number;
  seo_title?: string;
  seo_description?: string;
  password?: string;
  created_at: string;
}

export interface GalleryFile {
  id: string;
  gallery_id: string;
  file_url: string;
  file_path: string; // Storage path for deletion
  file_type: 'image' | 'video';
  file_size?: number; // File size in bytes
  created_at: string;
  expires_at: string;
  download_count: number;
  is_edited: boolean;
  caption?: string; // New: Description/caption for each specific file (e.g., Print details)
  title?: string; // Print Title
  description?: string; // Print Description
  print_size?: string; // Print Size
  material?: string; // Print Material
  price?: string; // Print Price
  thumbnail_url?: string;
  thumbnail_path?: string;
  views?: number;
  clicks?: number;
}

export interface Selection {
  gallery_id: string;
  file_id: string;
  client_note?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  gallery_id: string;
  action: string;
  timestamp: string;
}
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  cover_image: string;
  category: string;
  categories?: string[];
  tags: string[];
  seo_title?: string;
  seo_description?: string;
  password?: string;
  status?: 'draft' | 'scheduled' | 'published';
  views?: number;
  clicks?: number;
}

export interface FAQItem {
  id: string;
  category: 'general' | 'weddings' | 'hospitality' | 'delivery' | string;
  categoryLabel: string;
  question: string;
  answer: string;
}

export interface ServiceOfferingItem {
  id: string;
  number: string;
  title: string;
  description: string;
  linkText: string;
  linkUrl: string;
}

export interface ServicesSectionConfig {
  showSection: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  services: ServiceOfferingItem[];
  showCta: boolean;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonText: string;
  ctaButtonLink: string;
}

export const DEFAULT_SERVICES_SECTION: ServicesSectionConfig = {
  showSection: true,
  eyebrow: "Studio Offerings · Malindi, Kilifi County & Kenyan Coast",
  title: "Photography Services & Visual Storytelling Across the Coast",
  subtitle: "Based in Malindi, Mwabonje Photography documents intimate weddings, architectural hospitality retreats, and authentic lifestyle portraits across Malindi, Watamu, Kilifi, and Lamu Island.",
  services: [
    {
      id: "srv-1",
      number: "01",
      title: "Wedding Photographer in Malindi & Watamu",
      description: "Documenting barefoot beach ceremonies, sunset vows, and intimate coastal celebrations with natural documentary light, quiet elegance, and authentic emotion.",
      linkText: "Wedding Guides",
      linkUrl: "/blog"
    },
    {
      id: "srv-2",
      number: "02",
      title: "Hospitality & Architectural Photography",
      description: "Editorial visual narratives for boutique hotels, private oceanfront villas, and design retreats along the Kenyan coast, highlighting light, texture, and living spaces.",
      linkText: "About the Studio",
      linkUrl: "/about"
    },
    {
      id: "srv-3",
      number: "03",
      title: "Portrait & Lifestyle Photography in Malindi",
      description: "Personal branding, creative editorial portraits, and documentary sessions set against the coral shores of Watamu, golden dunes, and historic Lamu Island.",
      linkText: "Session FAQ",
      linkUrl: "/faq"
    }
  ],
  showCta: true,
  ctaTitle: "Planning a shoot or celebrating on the coast?",
  ctaSubtitle: "Read our client FAQ, learn about our creative vision, or explore coastal guides in our Journal.",
  ctaButtonText: "Enquire About a Session",
  ctaButtonLink: ""
};

