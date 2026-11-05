export interface GoogleReviewItem {
  id: string;
  authorName: string;
  authorPhoto?: string;
  rating: number; // 1 - 5
  relativeTimeDescription: string;
  text: string;
  shootType?: 'Destination Wedding' | 'Luxury Villa & Hospitality' | 'Coastal Elopement' | 'Couple Portraits' | 'Editorial & Brand';
  location?: 'Watamu' | 'Lamu Island' | 'Malindi' | 'Diani Beach' | 'Kilifi' | 'Safari & Coast';
  highlightQuote?: string;
  verified: boolean;
}

export interface GoogleBusinessProfileConfig {
  enabled: boolean;
  businessName: string;
  rating: number;
  totalReviews: number;
  googleProfileUrl: string; // e.g. https://share.google/JNg3LLWIVUgmB1fFr
  placeId?: string;
  headline: string;
  subheadline: string;
  reviews: GoogleReviewItem[];
}

export const DEFAULT_GOOGLE_REVIEWS: GoogleReviewItem[] = [
  {
    id: 'rev-1',
    authorName: 'Sarah & Tariq Al-Mansoor',
    authorPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    relativeTimeDescription: '2 weeks ago',
    shootType: 'Destination Wedding',
    location: 'Watamu',
    highlightQuote: 'He captured the golden coastal breeze and tears of joy without ever interrupting a single sacred moment.',
    text: 'Booking Mwabonje for our multi-day Watamu beach wedding was the best decision we made. From our sunrise traditional blessing to sunset on the bay, Michael worked with such gentle poise. The lighting in every single photograph feels like a painting. Our family in London and Nairobi cannot stop praising the gallery!',
    verified: true,
  },
  {
    id: 'rev-2',
    authorName: 'Kilele House & Estate Management',
    authorPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    relativeTimeDescription: '1 month ago',
    shootType: 'Luxury Villa & Hospitality',
    location: 'Lamu Island',
    highlightQuote: 'The architectural stills and twilight video transformed our direct villa bookings.',
    text: 'Michael understands Swahili coral architecture and natural shadows like no other photographer on the coast. His visual portfolio for our Shela villa capture the calm textures and ocean breezes flawlessly. A consummate professional with unmatched delivery turnaround.',
    verified: true,
  },
  {
    id: 'rev-3',
    authorName: 'Elena & Marcus Vance',
    authorPhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    relativeTimeDescription: '2 months ago',
    shootType: 'Coastal Elopement',
    location: 'Malindi',
    highlightQuote: 'Felt like walking along the shore with an old friend who just happens to be a world-class artist.',
    text: 'We eloped on the golden sands of Malindi at sunrise. Michael made us feel completely relaxed, never stiff or staged. When we received our private portal link, we were both in tears. The colors of the Indian Ocean and the intimacy in the portraits are beyond our wildest dreams.',
    verified: true,
  },
  {
    id: 'rev-4',
    authorName: 'Wambui Njoroge & Friends',
    authorPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    relativeTimeDescription: '3 months ago',
    shootType: 'Couple Portraits',
    location: 'Diani Beach',
    highlightQuote: 'Incredible patience, exquisite color grading, and effortless communication over WhatsApp.',
    text: 'From our initial availability check on his website to the delivery link on WhatsApp, everything was seamless. Michael directed us effortlessly during our golden hour dhow shoot. If you are anywhere along the coast, Mwabonje is the gold standard.',
    verified: true,
  },
  {
    id: 'rev-5',
    authorName: 'David & Chiedza M.',
    authorPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    relativeTimeDescription: '4 months ago',
    shootType: 'Editorial & Brand',
    location: 'Kilifi',
    highlightQuote: 'True editorial excellence rooted in authentic East African coastal culture.',
    text: 'Working with Mwabonje was a breath of fresh air. His visual sensitivity to light, ocean reflections, and movement is world-class. Our entire creative team was blown away by the depth of his compositions.',
    verified: true,
  }
];

export const DEFAULT_GOOGLE_BUSINESS_CONFIG: GoogleBusinessProfileConfig = {
  enabled: true,
  businessName: 'Mwabonje Photography',
  rating: 5.0,
  totalReviews: 28,
  googleProfileUrl: 'https://share.google/JNg3LLWIVUgmB1fFr',
  placeId: '',
  headline: 'Client Words & Coastal Memories',
  subheadline: 'Verified 5.0-star Google reviews from destination couples, luxury villas, and travellers along the East African coast.',
  reviews: DEFAULT_GOOGLE_REVIEWS,
};
