import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { calculateReadingTime, parseCategories } from '../utils/blogData';
import { BlogPost as BlogPostType } from '../types';
import { supabase } from '../services/supabase';
import { ArrowRight, ArrowUpRight, Clock3, List, Loader2, Share2, Bookmark, ChevronRight } from 'lucide-react';
import { SEO } from '../components/SEO';
import { PublicHeader } from '../components/PublicHeader';
import { BlogSocialShare } from '../components/BlogSocialShare';
import { BlogContentWithPinterest } from '../components/BlogContentWithPinterest';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const formatArticleDate = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeHeading, setActiveHeading] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setPost(null);
    setRelatedPosts([]);
    if (slug) fetchPost();
    else setLoading(false);
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    const container = document.getElementById('article-rich-content');
    if (!container) return;

    const headings = Array.from(container.querySelectorAll('h2, h3')) as HTMLHeadingElement[];
    const items = headings.map((heading, index) => {
      const id = heading.id || `article-section-${index + 1}`;
      heading.id = id;
      return { id, text: heading.textContent?.trim() || `Section ${index + 1}`, level: heading.tagName === 'H3' ? 3 : 2 };
    });
    setTocItems(items);

    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActiveHeading(visible[0].target.id);
    }, { rootMargin: '-15% 0px -75% 0px', threshold: 0 });
    headings.forEach(heading => observer.observe(heading));
    return () => observer.disconnect();
  }, [post]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase.from('blogs').select('*').eq('slug', slug).single();
      if (error) throw error;

      const now = new Date();
      const isPublished = (item: BlogPostType) => {
        const status = item.status || 'published';
        if (status === 'draft') return false;
        if (status === 'scheduled') return new Date(item.date) <= now;
        return true;
      };

      if (!data || !isPublished(data)) {
        setPost(null);
        return;
      }

      setPost(data);
      supabase.rpc('update_blog_v', { blog_slug: slug }).then(({ error: viewError }) => {
        if (viewError) console.error(viewError);
      });

      let relatedData: BlogPostType[] = [];
      if (data.tags?.length) {
        const { data: tagData, error: tagError } = await supabase
          .from('blogs').select('*').overlaps('tags', data.tags).neq('id', data.id);
        if (!tagError && tagData) relatedData = tagData;
      }

      if (!relatedData.length && data.category) {
        const categories = parseCategories(data.category);
        const { data: categoryData, error: categoryError } = await supabase
          .from('blogs').select('*').neq('id', data.id).limit(30);
        if (!categoryError && categoryData) {
          relatedData = categoryData.filter(item =>
            categories.some(category => parseCategories(item.category).includes(category))
          );
        }
      }
      setRelatedPosts(relatedData.filter(isPublished).slice(0, 3));
    } catch (err) {
      console.error('Error fetching blog post:', err);
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => post ? parseCategories(post.category) : [], [post]);
  const pageUrl = post ? `https://mwabonje.co.ke/blog/${post.slug}` : 'https://mwabonje.co.ke/blog';
  const pageTitle = post
    ? (post.seo_title ? `${post.seo_title} | Mwabonje` : `${post.title} | Mwabonje Photography`)
    : 'Post Not Found | Mwabonje';
  const seoDescription = post?.seo_description || post?.excerpt || '';

  const articleSchema = post ? {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mwabonje.co.ke/' },
          { '@type': 'ListItem', position: 2, name: 'Journal', item: 'https://mwabonje.co.ke/blog' },
          { '@type': 'ListItem', position: 3, name: post.title, item: pageUrl }
        ]
      },
      {
        '@type': 'BlogPosting',
        headline: post.seo_title || post.title,
        description: seoDescription,
        image: post.cover_image ? [post.cover_image] : ['https://mwabonje.co.ke/og-image.jpg'],
        datePublished: post.date,
        author: { '@type': 'Person', name: post.author || 'Mwabonje', url: 'https://mwabonje.co.ke' },
        publisher: {
          '@type': 'Organization',
          name: 'Mwabonje',
          logo: { '@type': 'ImageObject', url: 'https://mwabonje.co.ke/og-image.jpg' }
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl }
      }
    ]
  } : undefined;

  if (loading) {
    return <div className="min-h-screen bg-[#f8f3eb] dark:bg-[#0b0f17] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#9b6b3e]" /></div>;
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#f8f3eb] dark:bg-[#0b0f17] flex flex-col items-center justify-center p-8">
        <SEO title={pageTitle} description="Post not found" noindex={true} url="https://mwabonje.co.ke/blog" />
        <h1 className="font-editorial text-4xl mb-5 text-[#2c1a12] dark:text-white">Story not found</h1>
        <button onClick={() => navigate('/blog')} className="text-sm text-[#7a4528] border-b border-[#c99a61] pb-1">Return to Journal</button>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-[#faf6ef] dark:bg-[#0b0f17] text-[#211a16] dark:text-slate-100 transition-colors duration-300">
      <SEO
        title={pageTitle}
        description={seoDescription}
        image={post.cover_image || 'https://mwabonje.co.ke/og-image.jpg'}
        url={pageUrl}
        type="article"
        keywords={post.tags?.join(', ')}
        author={post.author}
        publishDate={post.date}
        structuredData={articleSchema}
      />
      <PublicHeader scrollProgress={scrollProgress} />

      {/* Cinematic editorial masthead */}
      <section className="relative isolate min-h-[390px] sm:min-h-[430px] lg:min-h-[470px] overflow-hidden bg-[#3a261d]">
        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={1800}
            height={900}
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#211713]/85 via-[#211713]/50 to-[#211713]/10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#211713]/35 via-transparent to-black/10" />
        <div className="mx-auto flex min-h-[390px] max-w-[1440px] items-end px-6 pb-10 pt-24 sm:min-h-[430px] sm:px-10 sm:pb-12 lg:min-h-[470px] lg:px-14 lg:pb-14">
          <div className="max-w-3xl text-white">
            <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-xs font-medium text-white/85 sm:text-sm">
              <Link to="/" className="hover:text-white">Home</Link><ChevronRight className="h-3 w-3" />
              <Link to="/blog" className="hover:text-white">Blog</Link><ChevronRight className="h-3 w-3" />
              <span>{categories[0] || 'Stories'}</span>
            </nav>
            {categories.length > 0 && (
              <div className="mb-3 inline-flex rounded-md bg-[#eab45f] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#392417]">
                {categories[0]}
              </div>
            )}
            <h1 className="max-w-3xl font-editorial text-4xl font-semibold leading-[1.02] tracking-[-0.035em] text-white sm:text-5xl lg:text-[58px]">
              {post.title}
            </h1>
            {post.excerpt && <p className="mt-5 max-w-xl text-sm leading-6 text-white/90 sm:text-base sm:leading-7">{post.excerpt}</p>}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-9 px-5 pb-20 pt-7 sm:px-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-10 lg:px-12 lg:pt-8 xl:grid-cols-[minmax(0,1fr)_355px]">
        <main className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#e9dfd2] pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#dfc9ad] text-sm font-semibold text-[#543522]">
                {post.cover_image ? <img src={post.cover_image} alt="" className="h-full w-full object-cover" /> : (post.author || 'M').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-[#241b16] dark:text-white">By {post.author || 'Mwabonje'}</p>
                <p className="mt-1 text-xs text-[#74685e] dark:text-slate-400">{formatArticleDate(post.date)} <span className="mx-1.5">·</span>{calculateReadingTime(post.content)} min read</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[#663b25] dark:text-amber-300">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 text-xs font-semibold hover:text-[#b47a37]" aria-label="Print article">
                <Bookmark className="h-4 w-4" /><span className="hidden sm:inline">Save / Print</span>
              </button>
              <span className="h-5 w-px bg-[#e4d8c9] dark:bg-slate-700" />
              <span className="inline-flex items-center gap-2 text-xs font-semibold"><Share2 className="h-4 w-4" />Share</span>
            </div>
          </div>

          <div id="article-rich-content" className="min-w-0">
            <BlogContentWithPinterest content={post.content} postTitle={post.title} pageUrl={pageUrl} />
          </div>

          {post.tags?.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-[#e9dfd2] pt-6 dark:border-slate-800">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#8a7666]">Filed under</span>
              {post.tags.map(tag => <span key={tag} className="rounded-full border border-[#e5d8c8] px-3 py-1 text-[11px] text-[#70543f] dark:border-slate-700 dark:text-slate-300">{tag}</span>)}
            </div>
          )}

          <div className="mt-8">
            <BlogSocialShare title={post.title} url={pageUrl} coverImage={post.cover_image} variant="card" />
          </div>

          {relatedPosts.length > 0 && (
            <section className="mt-14 border-t border-[#e8ddcf] pt-9 dark:border-slate-800">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a47748]">Continue exploring</p><h2 className="font-editorial text-3xl font-semibold text-[#261b15] dark:text-white">Related Stories</h2></div>
                <Link to="/blog" className="text-xs font-semibold text-[#70452d] hover:text-[#b17b40] dark:text-amber-300">All stories <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {relatedPosts.map(item => (
                  <article key={item.id} className="group min-w-0">
                    <Link to={`/blog/${item.slug}`} className="mb-3 block aspect-[5/3] overflow-hidden rounded-xl bg-[#e8ded1]">
                      {item.cover_image && <img src={item.cover_image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                    </Link>
                    <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[#98734f]">{calculateReadingTime(item.content)} min read</p>
                    <Link to={`/blog/${item.slug}`}><h3 className="font-editorial text-xl font-semibold leading-tight text-[#281c15] group-hover:text-[#9b6337] dark:text-white">{item.title}</h3></Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="space-y-5 lg:pt-0">
          <section className="rounded-2xl border border-[#eee4d8] bg-white/45 p-5 shadow-[0_2px_10px_rgba(61,39,22,0.035)] dark:border-slate-800 dark:bg-slate-900/40">
            <div className="mb-4 flex items-center gap-3"><List className="h-5 w-5 text-[#75472c]" /><h2 className="font-editorial text-xl font-semibold text-[#2b1d15] dark:text-white">Table of Contents</h2></div>
            {tocItems.length ? (
              <nav aria-label="Table of contents" className="space-y-1">
                {tocItems.map((item, index) => (
                  <a key={item.id} href={`#${item.id}`} onClick={(event) => { event.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`block rounded-lg px-3 py-2 text-xs leading-5 transition-colors ${activeHeading === item.id ? 'border-l-[3px] border-[#c78a3d] bg-[#f3e5d2] font-semibold text-[#4b2d1a] dark:bg-amber-950/40 dark:text-amber-200' : 'text-[#5e5148] hover:bg-[#f5ede3] dark:text-slate-300 dark:hover:bg-slate-800'} ${item.level === 3 ? 'ml-3' : ''}`}>
                    <span className="mr-2">{item.level === 2 ? `${index + 1}.` : '–'}</span>{item.text}
                  </a>
                ))}
              </nav>
            ) : <p className="text-xs leading-5 text-[#7b6c60] dark:text-slate-400">Section links will appear here when this story includes headings.</p>}
          </section>

          <section className="rounded-2xl border border-[#eee4d8] bg-white/45 p-5 shadow-[0_2px_10px_rgba(61,39,22,0.035)] dark:border-slate-800 dark:bg-slate-900/40">
            <h2 className="mb-4 font-editorial text-xl font-semibold text-[#2b1d15] dark:text-white">About the Author</h2>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dfc9ad] font-editorial text-xl text-[#543522]">{post.cover_image ? <img src={post.cover_image} alt="" className="h-full w-full object-cover" /> : 'M'}</div>
              <div><p className="text-sm font-bold text-[#241b16] dark:text-white">{post.author || 'Mwabonje'}</p><p className="mt-1 text-xs text-[#74685e] dark:text-slate-400">Photographer &amp; Visual Storyteller</p></div>
            </div>
            <p className="text-xs leading-5 text-[#5f5147] dark:text-slate-300">A photographer and visual storyteller based on Kenya's coast, creating people-centred imagery for weddings, travel, hospitality and lifestyle brands.</p>
            <Link to="/about" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#633a23] hover:text-[#a66e35] dark:text-amber-300">More about Mwabonje <ArrowRight className="h-3.5 w-3.5" /></Link>
          </section>

          {relatedPosts.length > 0 && (
            <section>
              <h2 className="mb-4 font-editorial text-2xl font-semibold text-[#2b1d15] dark:text-white">Related Articles</h2>
              <div className="space-y-3">
                {relatedPosts.map(item => (
                  <Link key={item.id} to={`/blog/${item.slug}`} className="group flex gap-3">
                    <div className="h-[76px] w-[100px] shrink-0 overflow-hidden rounded-lg bg-[#e8ded1]">{item.cover_image && <img src={item.cover_image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}</div>
                    <div className="min-w-0"><h3 className="font-editorial text-base font-semibold leading-tight text-[#2b1d15] group-hover:text-[#9b6337] dark:text-white">{item.title}</h3><p className="mt-2 flex items-center gap-1.5 text-[10px] text-[#807064] dark:text-slate-400"><Clock3 className="h-3 w-3" />{calculateReadingTime(item.content)} min read</p></div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="relative overflow-hidden rounded-2xl bg-[#442819] p-5 text-white">
            {post.cover_image && <img src={post.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
            <div className="absolute inset-0 bg-gradient-to-br from-[#321c12]/85 to-[#6a3d20]/80" />
            <div className="relative"><span className="mb-3 block h-1 w-9 bg-[#e8b75f]" /><h2 className="font-editorial text-2xl font-semibold leading-tight">Get Photography Stories &amp; Tips</h2><p className="mt-2 text-xs leading-5 text-white/85">Explore new articles, coastal location guides and photography inspiration.</p><Link to="/blog" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#e8b75f] px-4 py-2.5 text-xs font-bold text-[#3a2416] hover:bg-[#f2ca7f]">Explore the Journal <ArrowUpRight className="h-4 w-4" /></Link></div>
          </section>

          {categories.length > 0 && (
            <section className="rounded-2xl border border-[#eee4d8] bg-white/45 p-5 dark:border-slate-800 dark:bg-slate-900/40">
              <h2 className="mb-3 font-editorial text-xl font-semibold text-[#2b1d15] dark:text-white">Categories</h2>
              <div className="space-y-1">{categories.map(category => <Link key={category} to="/blog" className="flex items-center justify-between border-b border-[#eee4d8] py-2 text-xs text-[#5e5148] last:border-0 hover:text-[#9b6337] dark:border-slate-800 dark:text-slate-300"><span>{category}</span><ChevronRight className="h-3.5 w-3.5" /></Link>)}</div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
};

export default BlogPost;
