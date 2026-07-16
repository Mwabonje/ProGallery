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
      setPost(data);
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
        {post.coverImage && <meta property="og:image" content={post.coverImage} />}
        <meta property="article:published_time" content={post.date} />
        <meta property="article:author" content={post.author} />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {post.coverImage && <meta name="twitter:image" content={post.coverImage} />}

        {/* Structured Data (JSON-LD) for Article */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.seo_title || post.title,
            "image": post.coverImage ? [post.coverImage] : [],
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
        <div className="w-full max-w-4xl mx-auto flex justify-between items-center">
          <Link to="/blog" className="text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-semibold tracking-widest uppercase">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Blog</span>
          </Link>
          <span className="text-lg uppercase tracking-widest font-bold text-slate-800" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Mwabonje
          </span>
          <div className="w-[88px] sm:w-[130px]"></div> {/* Spacer for symmetry */}
        </div>
      </header>

      {/* Hero Section */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-12 md:pt-20 pb-10">
        <div className="flex items-center justify-center gap-3 mb-6 text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-slate-500 font-bold">
          <span>{post.category}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span>{calculateReadingTime(post.content)} min read</span>
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-[56px] leading-[1.1] md:leading-[1.1] font-bold text-slate-900 text-center mb-8 max-w-3xl mx-auto" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {post.title}
        </h1>
        <p className="text-center text-slate-500 italic mb-12">By {post.author}</p>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 mb-16 md:mb-24">
        {post.coverImage && (
          <div className="aspect-[16/9] w-full md:aspect-[21/9] bg-slate-100 overflow-hidden relative">
            <img 
              src={post.coverImage} 
              alt={post.title} 
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="w-full max-w-2xl mx-auto px-4">
        <div 
          className="prose prose-slate prose-lg md:prose-xl mx-auto prose-headings:font-['Playfair_Display'] prose-headings:font-bold prose-a:text-slate-900 hover:prose-a:text-slate-600 prose-img:rounded-sm"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
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
    </article>
  );
};
