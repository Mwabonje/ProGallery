import { BlogPost } from "../types";

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    slug: 'capturing-emotions-in-hospitality-photography',
    title: 'Capturing Emotions in Hospitality Photography',
    excerpt: 'Learn how to tell a compelling story and capture the essence of a space through hospitality photography.',
    content: `
      <h2>The Importance of Visual Storytelling</h2>
      <p>When photographing luxury resorts, hotels, and boutique spaces, the goal is to make the viewer feel as though they are already there. It is not just about showing the room, it is about communicating an atmosphere.</p>
      
      <h2>Focusing on Details</h2>
      <p>Small details like the way light hits the fresh linens, or a perfectly placed coffee cup, can significantly elevate the narrative. These elements bring a sense of life to an otherwise static scene.</p>
      
      <h2>Embracing Natural Light</h2>
      <p>Whenever possible, I utilize natural light to create an inviting, authentic feel. Timing the shoot for golden hour can result in stunning, warm images that resonate deeply with audiences.</p>
    `,
    date: '2025-05-12',
    author: 'Mwabonje',
    cover_image: 'https://images.unsplash.com/photo-1542314831-c6a4d27ece50?q=80&w=2000&auto=format&fit=crop',
    category: 'Hospitality',
    tags: ['Hospitality', 'Photography', 'Lighting']
  },
  {
    id: '2',
    slug: 'the-art-of-documentary-portraiture',
    title: 'The Art of Documentary Portraiture',
    excerpt: 'A deep dive into creating authentic, unposed portraits that reveal the true character of your subjects.',
    content: `
      <h2>Authenticity Over Perfection</h2>
      <p>Documentary portraiture is about capturing people as they are, in their natural environment. The best shots often happen between the posed moments, when the subject forgets the camera is there.</p>
      
      <h2>Building Connection</h2>
      <p>Taking time to talk with your subject before and during the shoot helps put them at ease. A comfortable subject will naturally provide more genuine expressions and body language.</p>
      
      <h2>Environment Matters</h2>
      <p>The background and surroundings should complement the subject's story without overpowering it. Always look for elements in the environment that add context to the portrait.</p>
    `,
    date: '2025-06-20',
    author: 'Mwabonje',
    cover_image: 'https://images.unsplash.com/photo-1516008685121-789f24cb2820?q=80&w=2000&auto=format&fit=crop',
    category: 'Portraits',
    tags: ['Portraits', 'Documentary', 'Storytelling']
  }
];

export const calculateReadingTime = (content: string): number => {
  const text = content.replace(/<[^>]*>?/gm, '');
  const wordCount = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / 200));
};
