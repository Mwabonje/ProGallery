import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { calculateReadingTime, parseCategories } from '../utils/blogData';
import { BlogPost } from '../types';
import { supabase } from '../services/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { PublicHeader } from '../components/PublicHeader';

export const Blog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const pageTitle = "Journal & Stories | Mwabonje Photography — Malindi & Kenyan Coast";
  const pageDescription = "Explore photography guides, coastal location stories, wedding tips, and documentary visual storytelling from Malindi, Watamu, and Lamu by Mwabonje Photography.";
  const pageUrl = "https://mwabonje.co.ke/blog";

  // Derive unique categories present across all published posts
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    posts.forEach(post => {
      parseCategories(post.category).forEach(c => cats.add(c));
    });
    return ['All', ...Array.from(cats)];
  }, [posts]);

  // Filter posts based on selected category (matches if any category on post matches)
  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'All') return posts;
    return posts.filter(post => parseCategories(post.category).includes(selectedCategory));
  }, [posts, selectedCategory]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePostClick = (slug: string) => {
    // Fire and forget
    supabase.rpc('update_blog_c', { blog_slug: slug }).then(({ error }) => {
      if (error) console.error(error);
    });
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      const now = new Date();
      const publishedPosts = (data || []).filter((post: BlogPost) => {
        const postStatus = post.status || 'published';
        if (postStatus === 'draft') return false;
        if (postStatus === 'scheduled') {
          // If scheduled, only show if date is in the past
          return new Date(post.date) <= now;
        }
        return true;
      });
      
      setPosts(publishedPosts);
    } catch (err: any) {
      console.error('Error fetching blogs from DB, fallback to static if needed:', err);
      // Fallback could be implemented here if desired, but we'll show empty or handle gracefully
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="Mwabonje blog, photography in Malindi, wedding photography Watamu, Lamu visual storytelling, Kenyan coast photography" />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph Tags */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={posts.length > 0 && posts[0].cover_image ? posts[0].cover_image : "https://mwabonje.co.ke/og-image.jpg"} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={posts.length > 0 && posts[0].cover_image ? posts[0].cover_image : "https://mwabonje.co.ke/og-image.jpg"} />

        {/* Structured Data (JSON-LD) for Blog & BreadcrumbList */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://mwabonje.co.ke/"
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Journal",
                    "item": "https://mwabonje.co.ke/blog"
                  }
                ]
              },
              {
                "@type": "Blog",
                "name": "Mwabonje Photography Journal",
                "description": pageDescription,
                "url": pageUrl,
                "publisher": {
                  "@type": "Organization",
                  "name": "Mwabonje",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://mwabonje.co.ke/og-image.jpg"
                  }
                },
                "blogPost": posts.map(post => ({
                  "@type": "BlogPosting",
                  "headline": post.seo_title || post.title,
                  "description": post.seo_description || post.excerpt,
                  "image": post.cover_image,
                  "datePublished": post.date,
                  "author": {
                    "@type": "Person",
                    "name": post.author
                  },
                  "url": `https://mwabonje.co.ke/blog/${post.slug}`
                }))
              }
            ]
          })}
        </script>
      </Helmet>

      {/* Navigation Header */}
      <PublicHeader />

      {/* Editorial Page Intro */}
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-4 flex flex-col items-center">
        <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-slate-400 dark:text-slate-500 mb-2">Stories &amp; Chronicles</span>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl uppercase tracking-wider font-bold text-slate-900 dark:text-white text-center font-editorial">
          Journal
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 text-center max-w-lg">
          Stories, wedding reflections, and visual narratives from the Kenyan coast.
        </p>

        {/* Category Filter Pills */}
        {availableCategories.length > 2 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-6">
            {availableCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[10px] sm:text-[11px] uppercase tracking-[0.15em] font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto px-4 py-10 md:py-16">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-16 space-y-3">
            <p className="text-base">No journal entries found in "{selectedCategory}".</p>
            {selectedCategory !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className="text-xs uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                View all articles
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
            {filteredPosts.map((post) => {
              const categories = parseCategories(post.category);
              return (
                <article key={post.id} className="group flex flex-col h-full">
                  <Link to={`/blog/${post.slug}`} onClick={() => handlePostClick(post.slug)} className="block overflow-hidden relative aspect-[4/3] sm:aspect-[3/2] md:aspect-[4/3] bg-slate-100 dark:bg-slate-800 mb-4 md:mb-6" aria-label={`Read ${post.title}`}>
                    {post.cover_image && (
                      <img 
                        src={post.cover_image} 
                        alt={post.title} 
                        loading="lazy"
                        className="w-full h-full object-cover transform transition-transform duration-[1.5s] group-hover:scale-[1.03]"
                      />
                    )}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 mb-3 text-[9px] md:text-[10px] tracking-widest uppercase text-slate-500 dark:text-slate-400 font-semibold">
                    <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    {categories.length > 0 && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {categories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedCategory(cat);
                              }}
                              className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 hidden sm:inline-block"></span>
                    <span className="hidden sm:inline-block">{calculateReadingTime(post.content)} min read</span>
                  </div>
                  <Link to={`/blog/${post.slug}`} onClick={() => handlePostClick(post.slug)} className="block group">
                    <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                      {post.title}
                    </h2>
                  </Link>
                  <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed mb-6 flex-grow line-clamp-4">
                    {post.excerpt}
                  </p>
                  <Link to={`/blog/${post.slug}`} onClick={() => handlePostClick(post.slug)} className="inline-flex items-center text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase text-slate-900 dark:text-slate-200 hover:text-slate-500 dark:hover:text-white transition-colors mt-auto">
                    Read More
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
