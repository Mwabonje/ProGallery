import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { calculateReadingTime } from '../utils/blogData';
import { BlogPost } from '../types';
import { supabase } from '../services/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const Blog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const pageTitle = "Blog | Mwabonje - Photography Insights & Stories";
  const pageDescription = "Explore the latest insights, stories, and tips on hospitality photography, portraits, and documentary visual storytelling by Mwabonje.";
  const pageUrl = `${window.location.origin}/blog`;

  useEffect(() => {
    fetchPosts();
  }, []);

  const handlePostClick = (slug: string) => {
    // Fire and forget
    supabase.rpc('update_blog_c', { blog_slug: slug }).catch(console.error);
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
    <div className="min-h-screen bg-white text-slate-900">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="Mwabonje blog, photography blog, hospitality photography, documentary portraits, visual storytelling" />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph Tags */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        {posts.length > 0 && <meta property="og:image" content={posts[0].cover_image} />}

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {posts.length > 0 && <meta name="twitter:image" content={posts[0].cover_image} />}

        {/* Structured Data (JSON-LD) for Blog */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "Mwabonje Photography Blog",
            "description": pageDescription,
            "url": pageUrl,
            "publisher": {
              "@type": "Organization",
              "name": "Mwabonje",
              "logo": {
                "@type": "ImageObject",
                "url": `${window.location.origin}/og-image.jpg`
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
              "url": `${window.location.origin}/blog/${post.slug}`
            }))
          })}
        </script>
      </Helmet>

      {/* Header */}
      <header className="w-full pt-4 pb-2 md:pt-6 md:pb-2 px-4 md:px-8 flex flex-col items-center border-b border-slate-100">
        <div className="w-full max-w-5xl mx-auto flex justify-between items-center relative">
          <Link to="/" className="text-slate-400 hover:text-slate-900 transition-colors" aria-label="Back to Portfolio">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl md:text-3xl lg:text-[40px] uppercase tracking-wider font-bold text-slate-800 text-center" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Journal
          </h1>
          <div className="w-6"></div> {/* Spacer to center the title */}
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-5xl mx-auto px-4 py-12 md:py-20">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            <p>No journal entries found. Check back later!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
            {posts.map((post) => (
              <article key={post.id} className="group flex flex-col h-full">
                <Link to={`/blog/${post.slug}`} onClick={() => handlePostClick(post.slug)} className="block overflow-hidden relative aspect-[4/3] sm:aspect-[3/2] md:aspect-[4/3] bg-slate-100 mb-4 md:mb-6" aria-label={`Read ${post.title}`}>
                  {post.cover_image && (
                    <img 
                      src={post.cover_image} 
                      alt={post.title} 
                      loading="lazy"
                      className="w-full h-full object-cover transform transition-transform duration-[1.5s] group-hover:scale-[1.03]"
                    />
                  )}
                </Link>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 text-[9px] md:text-[10px] tracking-widest uppercase text-slate-500 font-semibold">
                  <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span>{post.category}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:inline-block"></span>
                  <span className="hidden sm:inline-block">{calculateReadingTime(post.content)} min read</span>
                </div>
                <Link to={`/blog/${post.slug}`} onClick={() => handlePostClick(post.slug)} className="block group">
                  <h2 className="text-2xl md:text-2xl lg:text-3xl font-bold text-slate-900 mb-3 group-hover:text-slate-600 transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {post.title}
                  </h2>
                </Link>
                <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6 flex-grow line-clamp-4">
                  {post.excerpt}
                </p>
                <Link to={`/blog/${post.slug}`} onClick={() => handlePostClick(post.slug)} className="inline-flex items-center text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase text-slate-900 hover:text-slate-500 transition-colors mt-auto">
                  Read More
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
