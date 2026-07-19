import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { calculateReadingTime } from '../utils/blogData';
import { BlogPost as BlogPostType } from '../types';
import { supabase } from '../services/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';

export const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Scroll to top when post loads
    window.scrollTo(0, 0);
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      
      const now = new Date();
      const isPublished = (p: BlogPostType) => {
        const s = p.status || 'published';
        if (s === 'draft') return false;
        if (s === 'scheduled') return new Date(p.date) <= now;
        return true;
      };

      if (!data || !isPublished(data)) {
        setPost(null);
        setLoading(false);
        return;
      }

      setPost(data);
      
      let relatedData: BlogPostType[] = [];
      
      if (data && data.tags && data.tags.length > 0) {
        const { data: tagData, error: tagError } = await supabase
          .from('blogs')
          .select('*')
          .overlaps('tags', data.tags)
          .neq('id', data.id);
          
        if (!tagError && tagData) {
          relatedData = tagData;
        }
      }

      if (relatedData.length === 0 && data && data.category) {
        const { data: catData, error: catError } = await supabase
          .from('blogs')
          .select('*')
          .eq('category', data.category)
          .neq('id', data.id);
          
        if (!catError && catData) {
          relatedData = catData;
        }
      }
      
      setRelatedPosts(relatedData.filter(isPublished).slice(0, 2));
    } catch (err: any) {
      console.error('Error fetching blog post:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <Helmet><title>Post Not Found | Mwabonje</title></Helmet>
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Post not found</h1>
        <button onClick={() => navigate('/blog')} className="text-slate-500 hover:text-slate-900 border-b border-slate-300 pb-1">
          Return to Blog
        </button>
      </div>
    );
  }

  const pageUrl = `${window.location.origin}/blog/${post.slug}`;
  const pageTitle = post.seo_title ? `${post.seo_title} | Mwabonje Blog` : `${post.title} | Mwabonje Blog`;
  const seoDescription = post.seo_description || post.excerpt;

  return (
    <article className="min-h-screen bg-white text-slate-900 pb-20">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={seoDescription} />
        {post.tags && post.tags.length > 0 && <meta name="keywords" content={post.tags.join(', ')} />}
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph Tags */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={pageUrl} />
        {post.cover_image && <meta property="og:image" content={post.cover_image} />}
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content={post.author} />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {post.cover_image && <meta name="twitter:image" content={post.cover_image} />}

        {/* Structured Data (JSON-LD) for Article */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.seo_title || post.title,
            "image": post.cover_image ? [post.cover_image] : [],
            "datePublished": post.date,
            "author": {
              "@type": "Person",
              "name": post.author,
              "url": window.location.origin
            },
            "publisher": {
              "@type": "Organization",
              "name": "Mwabonje",
              "logo": {
                "@type": "ImageObject",
                "url": `${window.location.origin}/og-image.jpg`
              }
            },
            "description": seoDescription,
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": pageUrl
            }
          })}
        </script>
      </Helmet>

      {/* Header */}
      <header className="w-full pt-4 pb-2 md:pt-6 md:pb-2 px-4 md:px-8 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
        <div className="w-full max-w-4xl mx-auto flex items-center relative h-8">
          <Link to="/blog" className="absolute left-0 text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-semibold tracking-widest uppercase z-10">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Blog</span>
          </Link>
          <div className="w-full flex justify-center">
            <span className="text-lg uppercase tracking-widest font-bold text-slate-800" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Mwabonje
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-12 md:pt-20 pb-6 md:pb-10">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-6 text-[9px] md:text-[11px] tracking-[0.2em] uppercase text-slate-500 font-bold">
          <span>{post.category}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden sm:inline-block"></span>
          <span className="hidden sm:inline-block">{calculateReadingTime(post.content)} min read</span>
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-[56px] leading-[1.1] md:leading-[1.1] font-bold text-slate-900 text-center max-w-3xl mx-auto" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {post.title}
        </h1>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 mb-8 md:mb-16">
        {post.cover_image && (
          <div className="aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] lg:aspect-[2.5/1] w-full bg-slate-100 overflow-hidden relative">
            <img 
              src={post.cover_image} 
              alt={post.title} 
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="w-full max-w-3xl mx-auto px-4 lg:px-8">
        <div 
          className="prose prose-slate prose-base sm:prose-lg md:prose-xl mx-auto prose-headings:font-['Playfair_Display'] prose-headings:font-bold prose-a:text-slate-900 hover:prose-a:text-slate-600 prose-img:rounded-sm"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        {/* Author at the bottom */}
        <div className="mt-12 text-slate-500 italic">
          <p>By {post.author}</p>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-16 pt-8 border-t border-slate-100 flex flex-wrap gap-2">
            <span className="text-sm font-semibold text-slate-400 mr-2 uppercase tracking-widest self-center">Tags:</span>
            {post.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-slate-50 text-slate-600 text-xs font-semibold tracking-wider uppercase rounded-sm border border-slate-100">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="w-full max-w-4xl mx-auto px-4 mt-16 md:mt-20 pt-12 md:pt-16 border-t border-slate-100">
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-6 md:mb-8 text-center" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Related Posts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {relatedPosts.map(relatedPost => (
              <article key={relatedPost.id} className="group flex flex-col h-full">
                <Link to={`/blog/${relatedPost.slug}`} className="block overflow-hidden relative aspect-[4/3] sm:aspect-[3/2] md:aspect-[4/3] bg-slate-100 mb-4 md:mb-6" aria-label={`Read ${relatedPost.title}`}>
                  {relatedPost.cover_image && (
                    <img 
                      src={relatedPost.cover_image} 
                      alt={relatedPost.title} 
                      loading="lazy"
                      className="w-full h-full object-cover transform transition-transform duration-[1.5s] group-hover:scale-[1.03]"
                    />
                  )}
                </Link>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 text-[9px] md:text-[10px] tracking-widest uppercase text-slate-500 font-semibold">
                  <span>{new Date(relatedPost.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="hidden sm:inline-block">{calculateReadingTime(relatedPost.content)} min read</span>
                </div>
                <Link to={`/blog/${relatedPost.slug}`} className="block group">
                  <h4 className="text-xl md:text-2xl font-bold text-slate-900 mb-3 group-hover:text-slate-600 transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {relatedPost.title}
                  </h4>
                </Link>
                <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6 flex-grow line-clamp-3">
                  {relatedPost.excerpt}
                </p>
                <Link to={`/blog/${relatedPost.slug}`} className="inline-flex items-center text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase text-slate-900 hover:text-slate-500 transition-colors mt-auto">
                  Read More
                </Link>
              </article>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};
