import { FAQItem } from '../types';

export const DEFAULT_FAQ_DATA: FAQItem[] = [
  // General & Booking
  {
    id: 'base-location',
    category: 'general',
    categoryLabel: 'General & Booking',
    question: 'Where are you based, and do you travel for assignments?',
    answer: 'Mwabonje Photography & Film is based on the Kenyan coast (Mombasa, Kilifi, Watamu, Diani, Lamu) and regularly works across Nairobi, the Maasai Mara, Samburu, and destinations worldwide. We welcome projects across East Africa and internationally, handling all logistics smoothly.'
  },
  {
    id: 'booking-advance',
    category: 'general',
    categoryLabel: 'General & Booking',
    question: 'How far in advance should we secure our date?',
    answer: 'For destination weddings and peak safari season commissions, we recommend booking 4 to 12 months in advance to guarantee availability. For commercial hospitality briefs, editorial shoots, and private portraiture, we typically schedule 4 to 8 weeks in advance.'
  },
  {
    id: 'booking-process',
    category: 'general',
    categoryLabel: 'General & Booking',
    question: 'What is the booking process and payment schedule?',
    answer: 'Once you enquire and we confirm availability, we share a tailored creative proposal. To officially secure your date on our calendar, we require a signed agreement and an initial retainer (typically 50%). The remaining balance is settled prior to the shoot or upon preview delivery.'
  },
  {
    id: 'creative-style',
    category: 'general',
    categoryLabel: 'General & Booking',
    question: 'How would you describe your creative style and philosophy?',
    answer: 'Our visual approach is quiet, intentional, and documentary-driven with an editorial sensibility. We prioritize natural light, authentic emotions, coastal earth tones, and timeless composition over heavy filters or rigid posing. We want you to recognize yourself and feel the warmth of the moment.'
  },

  // Weddings & Celebrations
  {
    id: 'hybrid-coverage',
    category: 'weddings',
    categoryLabel: 'Weddings & Celebrations',
    question: 'Do you offer combined photography and cinematic film (video)?',
    answer: 'Yes. We specialize in cohesive, hybrid visual storytelling. Our team captures both high-resolution still imagery and cinematic, sound-designed highlight films that bottle the atmosphere, speeches, vows, and subtle emotions of your wedding day.'
  },
  {
    id: 'wedding-images-count',
    category: 'weddings',
    categoryLabel: 'Weddings & Celebrations',
    question: 'How many final photographs will we receive from our wedding?',
    answer: 'For a full-day wedding celebration, you can typically anticipate between 400 and 800+ individually color-graded, high-resolution photographs. Every delivered image is hand-curated, perfected, and free of watermarks for personal printing and archiving.'
  },
  {
    id: 'timeline-assistance',
    category: 'weddings',
    categoryLabel: 'Weddings & Celebrations',
    question: 'Do you help us plan our wedding day photography schedule?',
    answer: 'Absolutely. We collaborate closely with you and your wedding coordinator to build a light-conscious timeline. We plan for the softest golden hour light while ensuring you spend maximum time celebrating with your loved ones rather than being pulled away for hours.'
  },
  {
    id: 'backup-gear',
    category: 'weddings',
    categoryLabel: 'Weddings & Celebrations',
    question: 'What backup gear and redundancy systems do you bring?',
    answer: 'We operate with dual-slot professional mirrorless bodies, premium prime and zoom cinema lenses, redundant battery banks, dedicated audio equipment, and multiple speedlights. Photos are written to two memory cards simultaneously in-camera and backed up to multiple encrypted drives daily.'
  },

  // Hospitality & Commercial
  {
    id: 'hospitality-scope',
    category: 'hospitality',
    categoryLabel: 'Hospitality & Commercial',
    question: 'What is included in a hospitality, hotel, or safari lodge assignment?',
    answer: 'Our hospitality coverage encompasses architectural interior and exterior vistas, culinary craftsmanship, guest lifestyle experiences, wellness, and environmental landscape narratives. We also coordinate licensed aerial drone captures and vertical short-form video reels for digital marketing.'
  },
  {
    id: 'commercial-licensing',
    category: 'hospitality',
    categoryLabel: 'Hospitality & Commercial',
    question: 'How does commercial licensing and usage rights work?',
    answer: 'All commercial commissions include extensive digital and print marketing usage rights (website, social campaigns, advertising, press releases, brochures, and editorial features). Full worldwide exclusivity or buyout terms can be customized to your enterprise needs.'
  },
  {
    id: 'remote-logistics',
    category: 'hospitality',
    categoryLabel: 'Hospitality & Commercial',
    question: 'Can you travel to remote safari conservancies or coastal island lodges?',
    answer: 'Yes. We are thoroughly experienced in off-grid African logistics — from bush flights and boat transfers in the Lamu archipelago to four-wheel-drive safari conservancies in the Mara and Samburu. We carry lightweight, solar-compatible gear ready for rugged environments.'
  },

  // Deliverables & Client Galleries
  {
    id: 'turnaround-time',
    category: 'delivery',
    categoryLabel: 'Deliverables & Galleries',
    question: 'What is your delivery timeline for final galleries?',
    answer: 'We provide a curated preview ("sneak peeks") within 48 to 72 hours of your shoot so you can share immediate highlights. Complete wedding galleries are delivered within 4 to 6 weeks. Commercial hospitality projects are delivered in 2 to 3 weeks.'
  },
  {
    id: 'client-gallery-features',
    category: 'delivery',
    categoryLabel: 'Deliverables & Galleries',
    question: 'How are client galleries accessed and shared?',
    answer: 'Your collection is delivered through an elegant, private client gallery. It supports individual and batch high-resolution downloads, mobile-optimized viewing, favorite selections, and optional PIN protection to share with family or clients.'
  },
  {
    id: 'prints-and-albums',
    category: 'delivery',
    categoryLabel: 'Deliverables & Galleries',
    question: 'Do you offer fine-art prints and handcrafted heirloom albums?',
    answer: 'Yes. We offer archival museum-grade fine art prints on heavyweight cotton rag paper, along with custom-bound linen and leather heirloom photo albums designed to preserve your memories across generations.'
  },
  {
    id: 'gallery-retention',
    category: 'delivery',
    categoryLabel: 'Deliverables & Galleries',
    question: 'How long do our photographs remain backed up in the client gallery?',
    answer: 'Your private gallery remains active online for at least 12 months with cloud redundancy. We always recommend downloading your complete high-resolution collection to two physical storage locations upon delivery.'
  }
];

export const FAQ_CATEGORY_OPTIONS = [
  { id: 'general', label: 'General & Booking' },
  { id: 'weddings', label: 'Weddings & Celebrations' },
  { id: 'hospitality', label: 'Hospitality & Commercial' },
  { id: 'delivery', label: 'Deliverables & Galleries' },
  { id: 'other', label: 'Other & Miscellaneous' }
];
