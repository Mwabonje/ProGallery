import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { calculateReadingTime, parseCategories } from '../utils/blogData';
import { BlogPost as BlogPostType } from '../types';
import { supabase } from '../services/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SEO } from '../components/SEO';
import { ThemeToggle } from '../components/ThemeToggle';
import { PublicHeader } from '../components/PublicHeader';
import { BlogSocialShare } from '../components/BlogSocialShare';
import { BlogContentWithPinterest } from '../components/BlogContentWithPinterest';

export const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scroll = `${totalScroll / windowHeight}`;
      setScrollProgress(Number(scroll) * 100);
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

      // Increment views without awaiting to not block rendering
      supabase.rpc('update_blog_v', { blog_slug: slug }).then(({ error }) => {
        if (error) console.error(error);
      });
      
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
        const currentCats = parseCategories(data.category);
        const { data: catData, error: catError } = await supabase
          .from('blogs')
          .select('*')
          .neq('id', data.id)
          .limit(30);
          
        if (!catError && catData) {
          relatedData = catData.filter(p => {
            const pCats = parseCategories(p.category);
            return currentCats.some(c => pCats.includes(c));
          });
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
      <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0b0f17] flex flex-col items-center justify-center p-8 transition-colors duration-300">
        <SEO title="Post Not Found | Mwabonje" description="Post not found" noindex={true} url="https://mwabonje.co.ke/blog" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Post not found</h1>
        <button onClick={() => navigate('/blog')} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-b border-slate-300 dark:border-slate-700 pb-1">
          Return to Blog
        </button>
      </div>
    );
  }

  const pageUrl = `https://mwabonje.co.ke/blog/${post.slug}`;
  const pageTitle = post.seo_title 
    ? `${post.seo_title} | Mwabonje` 
    : `${post.title} | Mwabonje Photography`;
  const seoDescription = post.seo_description || post.excerpt;

  const articleSchema = {
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
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": post.title,
            "item": pageUrl
          }
        ]
      },
      {
        "@type": "BlogPosting",
        "headline": post.seo_title || post.title,
        "description": seoDescription,
        "image": post.cover_image ? [post.cover_image] : ["https://mwabonje.co.ke/og-image.jpg"],
        "datePublished": post.date,
        "author": {
          "@type": "Person",
          "name": post.author || "Mwabonje",
          "url": "https://mwabonje.co.ke"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Mwabonje",
          "logo": {
            "@type": "ImageObject",
            "url": "https://mwabonje.co.ke/og-image.jpg"
          }
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": pageUrl
        }
      }
    ]
  };

  return (
    <article className="min-h-screen bg-white dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 transition-colors duration-300 pb-20">
      <SEO 
        title={pageTitle}
        description={seoDescription}
        image={post.cover_image || "https://mwabonje.co.ke/og-image.jpg"}
        url={pageUrl}
        type="article"
        keywords={post.tags?.join(', ')}
        author={post.author}
        publishDate={post.date}
        structuredData={articleSchema}
      />

      {/* Navigation Header */}
      <PublicHeader scrollProgress={scrollProgress} />

      {/* Hero Section */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-8 sm:pt-12 md:pt-16 pb-4 md:pb-6">
        <div className="mb-6">
          <Link 
            to="/blog" 
            className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Journal</span>
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-4 md:mb-6 text-[9px] md:text-[11px] tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400 font-bold">
          {parseCategories(post.category).length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {parseCategories(post.category).map(cat => (
                  <Link 
                    key={cat}
                    to="/blog"
                    className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            </>
          )}
          <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
          <span>{calculateReadingTime(post.content)} min read</span>
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-[56px] leading-[1.1] md:leading-[1.1] font-bold text-slate-900 dark:text-white text-center max-w-3xl mx-auto" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {post.title}
        </h1>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 mb-8 md:mb-14">
        {post.cover_image && (
          <div className="group/hero relative aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] lg:aspect-[2.5/1] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden rounded-sm shadow-sm">
            <img 
              src={post.cover_image} 
              alt={`${post.title} — Photography by Mwabonje in Kenya`} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover/hero:scale-[1.01]"
              loading="eager"
              // @ts-ignore
              fetchPriority="high"
              decoding="async"
              width={1200}
              height={630}
            />
            {/* Quick Pin on Cover Image */}
            <button
              type="button"
              onClick={() => {
                const pinUrl = `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(pageUrl)}&media=${encodeURIComponent(post.cover_image)}&description=${encodeURIComponent(post.title)}`;
                window.open(pinUrl, '_blank', 'width=650,height=550,noopener,noreferrer');
              }}
              className="absolute top-4 right-4 opacity-0 group-hover/hero:opacity-100 transition-all duration-200 bg-[#E60023] hover:bg-[#ad081b] text-white px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-black/25 z-20 cursor-pointer transform hover:scale-105 active:scale-95"
              title="Save cover photo to Pinterest"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.057.24-.19.291-.44.175-1.644-.766-2.671-3.169-2.671-5.102 0-4.156 3.019-7.973 8.709-7.973 4.572 0 8.125 3.259 8.125 7.614 0 4.544-2.864 8.2-6.84 8.2-1.336 0-2.591-.695-3.021-1.514l-.823 3.138c-.298 1.146-1.104 2.583-1.644 3.456C9.882 23.834 10.926 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
              </svg>
              <span>Save</span>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="w-full max-w-3xl mx-auto px-4 lg:px-8">
        {/* Top Social Share Bar (Pinterest, WhatsApp, Copy Link) */}
        <BlogSocialShare 
          title={post.title} 
          url={pageUrl} 
          coverImage={post.cover_image} 
          variant="compact" 
        />

        {/* Article Body with Automatic Pinterest Hover Pinning */}
        <BlogContentWithPinterest 
          content={post.content} 
          postTitle={post.title} 
          pageUrl={pageUrl} 
        />
        
        {/* Author at the bottom */}
        <div className="mt-8 text-center text-slate-500 dark:text-slate-400 italic">
          <p>By {post.author}</p>
        </div>

        {/* Bottom Social Share Card */}
        <BlogSocialShare 
          title={post.title} 
          url={pageUrl} 
          coverImage={post.cover_image} 
          variant="card" 
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-16 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 mr-2 uppercase tracking-widest self-center">Tags:</span>
            {post.tags.map(tag => (
              <span key={tag} className="px-3 py-1 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-semibold tracking-wider uppercase rounded-sm border border-slate-100 dark:border-slate-700/80">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="w-full max-w-4xl mx-auto px-4 mt-16 md:mt-20 pt-12 md:pt-16 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-6 md:mb-8 text-center" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Related Posts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {relatedPosts.map(relatedPost => (
              <article key={relatedPost.id} className="group flex flex-col h-full">
                <Link to={`/blog/${relatedPost.slug}`} className="block overflow-hidden relative aspect-[4/3] sm:aspect-[3/2] md:aspect-[4/3] bg-slate-100 dark:bg-slate-800 mb-4 md:mb-6 rounded-sm" aria-label={`Read ${relatedPost.title}`}>
                  {relatedPost.cover_image && (
                    <img 
                      src={relatedPost.cover_image} 
                      alt={`${relatedPost.title} — Photography by Mwabonje in Kenya`} 
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transform transition-transform duration-[1.5s] group-hover:scale-[1.03]"
                    />
                  )}
                </Link>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 text-[9px] md:text-[10px] tracking-widest uppercase text-slate-500 dark:text-slate-400 font-semibold">
                  <span>{new Date(relatedPost.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  {parseCategories(relatedPost.category).length > 0 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                      <span>{parseCategories(relatedPost.category).join(', ')}</span>
                    </>
                  )}
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 hidden sm:inline-block"></span>
                  <span className="hidden sm:inline-block">{calculateReadingTime(relatedPost.content)} min read</span>
                </div>
                <Link to={`/blog/${relatedPost.slug}`} className="block group">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {relatedPost.title}
                  </h3>
                </Link>
                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed mb-6 flex-grow line-clamp-3">
                  {relatedPost.excerpt}
                </p>
                <Link to={`/blog/${relatedPost.slug}`} className="inline-flex items-center text-[10px] md:text-[11px] font-bold tracking-[0.2em] uppercase text-slate-900 dark:text-amber-400 hover:text-slate-500 dark:hover:text-amber-300 transition-colors mt-auto">
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

export default BlogPost;
