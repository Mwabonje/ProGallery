import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { calculateReadingTime } from '../utils/blogData';
import { BlogPost as BlogPostType } from '../types';
import { supabase } from '../services/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { SEO } from '../components/SEO';
import { ThemeToggle } from '../components/ThemeToggle';

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
  const pageTitle = post.seo_title ? `${post.seo_title} | Mwabonje Blog` : `${post.title} | Mwabonje Blog`;
  const seoDescription = post.seo_description || post.excerpt;

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
      />

      {/* Header */}
      <header className="w-full pt-4 pb-2 md:pt-6 md:pb-2 px-4 md:px-8 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-[#0b0f17]/95 backdrop-blur-sm z-20 transition-colors duration-300">
        <div 
          className="absolute top-0 left-0 h-1 bg-slate-900 dark:bg-amber-400 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between relative h-8">
          <Link to="/blog" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 text-sm font-semibold tracking-widest uppercase z-10">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Blog</span>
          </Link>
          <div className="absolute inset-x-0 flex justify-center pointer-events-none">
            <span className="text-lg uppercase tracking-widest font-bold text-slate-800 dark:text-white pointer-events-auto" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Mwabonje
            </span>
          </div>
          <div className="z-10">
            <ThemeToggle className="text-slate-600 dark:text-amber-300" />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-12 md:pt-20 pb-4 md:pb-6">
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-4 md:mb-6 text-[9px] md:text-[11px] tracking-[0.2em] uppercase text-slate-500 dark:text-slate-400 font-bold">
          <span>{post.category}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
          <span>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
          <span>{calculateReadingTime(post.content)} min read</span>
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-[56px] leading-[1.1] md:leading-[1.1] font-bold text-slate-900 dark:text-white text-center max-w-3xl mx-auto" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {post.title}
        </h1>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 mb-8 md:mb-16">
        {post.cover_image && (
          <div className="aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] lg:aspect-[2.5/1] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative rounded-sm">
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
          className="prose prose-slate dark:prose-invert prose-base sm:prose-lg md:prose-xl mx-auto prose-headings:font-['Playfair_Display'] prose-headings:font-bold prose-headings:text-slate-900 dark:prose-headings:text-white prose-a:text-slate-900 dark:prose-a:text-amber-400 hover:prose-a:text-slate-600 dark:hover:prose-a:text-amber-300 prose-img:rounded-sm text-slate-700 dark:text-slate-300"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        
        {/* Author at the bottom */}
        <div className="mt-8 text-center text-slate-500 dark:text-slate-400 italic">
          <p>By {post.author}</p>
        </div>

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
          <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-6 md:mb-8 text-center" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Related Posts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {relatedPosts.map(relatedPost => (
              <article key={relatedPost.id} className="group flex flex-col h-full">
                <Link to={`/blog/${relatedPost.slug}`} className="block overflow-hidden relative aspect-[4/3] sm:aspect-[3/2] md:aspect-[4/3] bg-slate-100 dark:bg-slate-800 mb-4 md:mb-6 rounded-sm" aria-label={`Read ${relatedPost.title}`}>
                  {relatedPost.cover_image && (
                    <img 
                      src={relatedPost.cover_image} 
                      alt={relatedPost.title} 
                      loading="lazy"
                      className="w-full h-full object-cover transform transition-transform duration-[1.5s] group-hover:scale-[1.03]"
                    />
                  )}
                </Link>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 text-[9px] md:text-[10px] tracking-widest uppercase text-slate-500 dark:text-slate-400 font-semibold">
                  <span>{new Date(relatedPost.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span className="hidden sm:inline-block">{calculateReadingTime(relatedPost.content)} min read</span>
                </div>
                <Link to={`/blog/${relatedPost.slug}`} className="block group">
                  <h4 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                    {relatedPost.title}
                  </h4>
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
