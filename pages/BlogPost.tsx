import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { calculateReadingTime, parseCategories } from '../utils/blogData';
import { BlogPost as BlogPostType } from '../types';
import { supabase } from '../services/supabase';
import { ArrowRight, ArrowUpRight, Clock3, List, Loader2, Share2, Bookmark, ChevronRight, Search } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { SEO } from '../components/SEO';
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
    if (!post) {
      setTocItems([]);
      setActiveHeading('');
      return;
    }

    let cancelled = false;
    let observer: MutationObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let refreshFrame = 0;

    const buildTableOfContents = () => {
      if (cancelled) return;
      const container = document.getElementById('article-rich-content');
      if (!container) return;

      const headings = Array.from(container.querySelectorAll('h2'))
        .filter((heading): heading is HTMLElement => heading instanceof HTMLElement);

      const usedIds = new Set<string>();
      const items: TocItem[] = headings.reduce<TocItem[]>((result, heading, index) => {
        const text = (heading.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return result;

        const baseId = text.toLowerCase().normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `section-${index + 1}`;

        let id = heading.id || `article-${baseId}`;
        let suffix = 2;
        while (usedIds.has(id)) id = `article-${baseId}-${suffix++}`;
        usedIds.add(id);
        heading.id = id;
        heading.style.scrollMarginTop = '100px';
        result.push({ id, text, level: 2 });
        return result;
      }, []);

      setTocItems(items);

      intersectionObserver?.disconnect();
      intersectionObserver = new IntersectionObserver((entries) => {
        const visible = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveHeading(visible[0].target.id);
      }, { rootMargin: '-15% 0px -75% 0px', threshold: 0 });

      headings.forEach(heading => intersectionObserver?.observe(heading));
    };

    const scheduleRefresh = () => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(buildTableOfContents);
    };

    // Observe the document from the outset so asynchronously rendered article HTML
    // is detected even when the content wrapper exists before its headings are inserted.
    observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    scheduleRefresh();

    return () => {
      cancelled = true;
      cancelAnimationFrame(refreshFrame);
      observer?.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [post?.id, post?.content]);

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
    return <div className="min-h-screen bg-[#faf8f5] dark:bg-[#0f172b] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0f172b]" /></div>;
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#faf8f5] dark:bg-[#0f172b] flex flex-col items-center justify-center p-8">
        <SEO title={pageTitle} description="Post not found" noindex={true} url="https://mwabonje.co.ke/blog" />
        <h1 className="font-editorial text-4xl mb-5 text-[#050505] dark:text-[#faf8f5]">Story not found</h1>
        <button onClick={() => navigate('/blog')} className="text-sm text-[#0f172b] border-b border-[#0f172b] pb-1">Return to Journal</button>
      </div>
    );
  }

  return (
    <article className="min-h-screen bg-[#faf8f5] dark:bg-[#0f172b] text-[#050505] dark:text-[#faf8f5] transition-colors duration-300">
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

      <header className="sticky top-0 z-50 border-b border-[#0f172b]/15 bg-[#faf8f5]/95 backdrop-blur-md dark:border-[#faf8f5]/15 dark:bg-[#0f172b]/95">
        <div className="mx-auto flex h-[58px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link to="/" className="group flex shrink-0 flex-col leading-none text-[#050505] dark:text-[#faf8f5]">
            <span className="font-editorial text-[25px] font-bold uppercase tracking-[-0.04em]">MWABONJE</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-5 lg:flex xl:gap-7">
            <Link to="/" className="text-[11px] font-medium uppercase text-[#0f172b] hover:text-[#0f172b] dark:text-[#faf8f5]/85">Home</Link>
            <Link to="/#work" className="text-[11px] font-medium uppercase text-[#0f172b] hover:text-[#0f172b] dark:text-[#faf8f5]/85">Portfolio</Link>
            <Link to="/?category=FILMS#work" className="text-[11px] font-medium uppercase text-[#0f172b] hover:text-[#0f172b] dark:text-[#faf8f5]/85">Films</Link>
            <Link to="/blog" className="border-b border-[#0f172b] pb-1 text-[11px] font-semibold text-[#0f172b] dark:text-[#faf8f5]">Journal</Link>
            <Link to="/about" className="text-[11px] font-medium uppercase text-[#0f172b] hover:text-[#0f172b] dark:text-[#faf8f5]/85">About</Link>
            <Link to="/faq" className="text-[11px] font-medium uppercase text-[#0f172b] hover:text-[#0f172b] dark:text-[#faf8f5]/85">FAQ</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link to="/blog" aria-label="Search journal" className="hidden text-[#0f172b] hover:text-[#0f172b] dark:text-[#faf8f5]/85 sm:inline-flex"><Search className="h-[17px] w-[17px]" /></Link>
            <ThemeToggle className="text-[#0f172b] dark:text-[#faf8f5]" />
            <a href="https://mwabonjebooking.netlify.app/" target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full bg-[#0f172b] px-5 text-[10px] font-semibold uppercase tracking-wider text-[#faf8f5] transition hover:bg-[#050505] sm:px-6">ENQUIRE <ArrowUpRight className="h-3.5 w-3.5" /></a>
          </div>
        </div>
        <nav aria-label="Mobile navigation" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[#0f172b]/15 px-3 py-2.5 lg:hidden dark:border-[#faf8f5]/15">
          <Link to="/" className="text-[10px] uppercase text-[#0f172b] dark:text-[#faf8f5]/80">Home</Link>
          <Link to="/#work" className="text-[10px] uppercase text-[#0f172b] dark:text-[#faf8f5]/80">Portfolio</Link>
          <Link to="/?category=FILMS#work" className="text-[10px] uppercase text-[#0f172b] dark:text-[#faf8f5]/80">Films</Link>
          <Link to="/blog" className="text-[10px] font-semibold uppercase text-[#0f172b] dark:text-[#faf8f5]">Journal</Link>
          <Link to="/about" className="text-[10px] uppercase text-[#0f172b] dark:text-[#faf8f5]/80">About</Link>
          <Link to="/faq" className="text-[9px] font-medium uppercase tracking-[0.08em] text-[#0f172b] dark:text-[#faf8f5]/80">FAQ</Link>
        </nav>
      </header>

      {/* Cinematic editorial masthead */}
      <section className="relative isolate min-h-[420px] sm:min-h-[480px] lg:min-h-[520px] overflow-hidden bg-[#0f172b]">
        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.title}
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[center_42%] sm:object-center"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width={1800}
            height={900}
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#050505]/85 via-[#050505]/50 to-[#050505]/10" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#050505]/35 via-transparent to-black/10" />
        <div className="mx-auto flex min-h-[440px] max-w-[1440px] items-end px-5 pb-8 pt-16 sm:min-h-[480px] sm:px-8 sm:pb-8 lg:min-h-[520px] lg:px-12 lg:pb-9">
          <div className="max-w-3xl text-white">
            <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-xs font-medium text-[#faf8f5]/85 sm:text-sm">
              <Link to="/" className="hover:text-white">Home</Link><ChevronRight className="h-3 w-3" />
              <Link to="/blog" className="hover:text-white">Journal</Link><ChevronRight className="h-3 w-3" />
              <span>{categories[0] || 'Stories'}</span>
            </nav>
            {categories.length > 0 && (
              <div className="mb-3 inline-flex rounded-md bg-[#faf8f5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#050505]">
                {categories[0]}
              </div>
            )}
            <h1 className="max-w-[650px] font-editorial text-[32px] font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-[38px] lg:text-[42px]">
              {post.title}
            </h1>
            {post.excerpt && <p className="mt-3 max-w-[440px] text-[12px] leading-[1.55] text-white/90 sm:text-[13px]">{post.excerpt}</p>}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-start gap-10 px-5 pb-20 pt-6 sm:px-8 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_285px] lg:gap-12 lg:px-10 lg:pt-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        
        <section className="order-0 rounded-xl border border-[#0f172b]/15 bg-[#faf8f5] p-4 dark:border-[#faf8f5]/15 dark:bg-[#faf8f5]/[0.04] lg:hidden">
          <details>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-editorial text-lg font-semibold text-[#050505] dark:text-[#faf8f5]">
              <span className="flex items-center gap-2"><List className="h-4 w-4" /> On this page</span>
              <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-[#0f172b]/65 dark:text-[#faf8f5]/65">Contents</span>
            </summary>
            {tocItems.length > 0 && (
              <nav aria-label="Mobile table of contents" className="mt-3 grid gap-1 border-t border-[#0f172b]/15 pt-3 dark:border-[#faf8f5]/15">
                {tocItems.map((item, index) => (
                  <a key={item.id} href={`#${item.id}`} onClick={(event) => { event.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-[1.6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172b] dark:focus-visible:ring-[#faf8f5] ${activeHeading === item.id ? 'bg-[#0f172b]/[0.08] font-semibold text-[#050505] dark:bg-[#faf8f5]/[0.08] dark:text-[#faf8f5]' : 'text-[#0f172b] dark:text-[#faf8f5]/80'}`}>
                    <span className="w-5 shrink-0 text-right tabular-nums">{index + 1}.</span><span className="min-w-0 flex-1">{item.text.replace(/^\s*\d+[.)]\s*/, '')}</span>
                  </a>
                ))}
              </nav>
            )}
          </details>
        </section>
        <main className="order-1 min-w-0">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#0f172b]/15 pb-4 dark:border-[#faf8f5]/15">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#0f172b]/10 text-sm font-semibold text-[#0f172b] dark:bg-[#faf8f5]/10 dark:text-[#faf8f5]">
                {(post.author || 'M').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-[#050505] dark:text-[#faf8f5]">By {post.author || 'Mwabonje'}</p>
                <p className="mt-1 text-xs text-[#0f172b]/70 dark:text-[#faf8f5]/65">{formatArticleDate(post.date)} <span className="mx-1.5">·</span>{calculateReadingTime(post.content)} min read</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[#0f172b] dark:text-[#faf8f5] sm:gap-4">
              <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-xs font-semibold transition-colors hover:bg-[#0f172b]/[0.06] hover:text-[#050505] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172b] dark:hover:bg-[#faf8f5]/[0.08] dark:focus-visible:ring-[#faf8f5]" aria-label="Print article">
                <Bookmark className="h-4 w-4" /><span className="hidden sm:inline">Save / Print</span>
              </button>
              <span className="h-5 w-px bg-[#0f172b]/20 dark:bg-[#faf8f5]/20" />
              <span className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-xs font-semibold"><Share2 className="h-4 w-4" />Share</span>
            </div>
          </div>

          <div id="article-rich-content" className="min-w-0">
            <BlogContentWithPinterest content={post.content} postTitle={post.title} pageUrl={pageUrl} />
          </div>

          {post.tags?.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-[#0f172b]/15 pt-6 dark:border-[#faf8f5]/15">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0f172b]/65">Filed under</span>
              {post.tags.map(tag => <span key={tag} className="rounded-full border border-[#0f172b]/20 px-3 py-1 text-[11px] text-[#0f172b] dark:border-[#faf8f5]/20 dark:text-[#faf8f5]/80">{tag}</span>)}
            </div>
          )}

          <div className="mt-8">
            <BlogSocialShare title={post.title} url={pageUrl} coverImage={post.cover_image} variant="card" />
          </div>

          {relatedPosts.length > 0 && (
            <section className="mt-14 border-t border-[#0f172b]/15 pt-9 dark:border-[#faf8f5]/15">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f172b]">Continue exploring</p><h2 className="font-editorial text-3xl font-semibold text-[#050505] dark:text-[#faf8f5]">Related Stories</h2></div>
                <Link to="/blog" className="text-xs font-semibold text-[#0f172b] hover:text-[#050505] dark:text-[#faf8f5]">All stories <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {relatedPosts.map(item => (
                  <article key={item.id} className="group min-w-0 overflow-hidden rounded-xl border border-[#0f172b]/10 bg-[#faf8f5] p-2.5 transition-shadow duration-300 hover:shadow-[0_10px_30px_rgba(15,23,43,0.08)] dark:border-[#faf8f5]/10 dark:bg-[#faf8f5]/[0.03]">
                    <Link to={`/blog/${item.slug}`} className="mb-3 block aspect-[5/3] overflow-hidden rounded-lg bg-[#0f172b]/[0.06]">
                      {item.cover_image && <img src={item.cover_image} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
                    </Link>
                    <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-[#0f172b]/70">{calculateReadingTime(item.content)} min read</p>
                    <Link to={`/blog/${item.slug}`}><h3 className="font-editorial text-xl font-semibold leading-[1.25] text-[#050505] transition-colors group-hover:text-[#0f172b] dark:text-[#faf8f5]">{item.title}</h3></Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="order-2 min-w-0 space-y-5 lg:pt-0">
          <section className="hidden rounded-xl border border-[#0f172b]/15 bg-[#faf8f5] p-4 shadow-[0_2px_10px_rgba(15,23,43,0.045)] dark:border-[#faf8f5]/15 dark:bg-[#faf8f5]/[0.04] lg:block lg:self-start">
            <div className="mb-4 flex items-center gap-3"><List className="h-5 w-5 text-[#0f172b]" /><h2 className="font-editorial text-xl font-semibold text-[#050505] dark:text-[#faf8f5]">Table of Contents</h2></div>
            {tocItems.length ? (
              <nav aria-label="Table of contents" className="max-h-[min(38vh,300px)] space-y-1 overflow-y-auto overscroll-contain pr-1">
                {tocItems.map((item, index) => (
                  <a key={item.id} href={`#${item.id}`} onClick={(event) => { event.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={`flex items-start gap-2 break-words rounded-lg px-3 py-2.5 text-xs leading-[1.65] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172b] dark:focus-visible:ring-[#faf8f5] ${activeHeading === item.id ? 'border-l-[3px] border-[#0f172b] bg-[#0f172b]/[0.08] font-semibold text-[#050505] dark:bg-[#faf8f5]/[0.08] dark:text-[#faf8f5]' : 'text-[#0f172b] hover:bg-[#0f172b]/[0.06] dark:text-[#faf8f5]/80 dark:hover:bg-[#faf8f5]/[0.08]'}`}>
                    <span className="w-5 shrink-0 text-right tabular-nums">{index + 1}.</span><span className="min-w-0 flex-1">{item.text.replace(/^\s*\d+[.)]\s*/, '')}</span>
                  </a>
                ))}
              </nav>
            ) : <p className="text-xs leading-5 text-[#0f172b]/70 dark:text-[#faf8f5]/65">Section links will appear here when this story includes headings.</p>}
          </section>

          <section className="rounded-2xl border border-[#0f172b]/15 bg-[#faf8f5] p-5 shadow-[0_2px_10px_rgba(15,23,43,0.045)] dark:border-[#faf8f5]/15 dark:bg-[#faf8f5]/[0.04]">
            <h2 className="mb-4 font-editorial text-xl font-semibold text-[#050505] dark:text-[#faf8f5]">About the Author</h2>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0f172b]/10 font-editorial text-xl text-[#0f172b] dark:bg-[#faf8f5]/10 dark:text-[#faf8f5]">{(post.author || 'M').slice(0, 1).toUpperCase()}</div>
              <div><p className="text-sm font-bold text-[#050505] dark:text-[#faf8f5]">{post.author || 'Mwabonje'}</p><p className="mt-1 text-xs text-[#0f172b]/70 dark:text-[#faf8f5]/65">Photographer &amp; Visual Storyteller</p></div>
            </div>
            <p className="text-xs leading-5 text-[#0f172b] dark:text-[#faf8f5]/80">A photographer and visual storyteller based on Kenya's coast, creating people-centred imagery for weddings, travel, hospitality and lifestyle brands.</p>
            <Link to="/about" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#0f172b] hover:text-[#050505] dark:text-[#faf8f5]">More about Mwabonje <ArrowRight className="h-3.5 w-3.5" /></Link>
          </section>

          {relatedPosts.length > 0 && (
            <section>
              <h2 className="mb-4 font-editorial text-2xl font-semibold text-[#050505] dark:text-[#faf8f5]">Related Articles</h2>
              <div className="space-y-3">
                {relatedPosts.map(item => (
                  <Link key={item.id} to={`/blog/${item.slug}`} className="group flex gap-3">
                    <div className="h-[76px] w-[100px] shrink-0 overflow-hidden rounded-lg bg-[#0f172b]/[0.06]">{item.cover_image && <img src={item.cover_image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}</div>
                    <div className="min-w-0"><h3 className="font-editorial text-base font-semibold leading-tight text-[#050505] group-hover:text-[#0f172b] dark:text-[#faf8f5]">{item.title}</h3><p className="mt-2 flex items-center gap-1.5 text-[10px] text-[#0f172b]/70 dark:text-[#faf8f5]/65"><Clock3 className="h-3 w-3" />{calculateReadingTime(item.content)} min read</p></div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="relative overflow-hidden rounded-2xl bg-[#0f172b] p-5 text-white">
            {post.cover_image && <img src={post.cover_image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
            <div className="absolute inset-0 bg-gradient-to-br from-[#050505]/85 to-[#0f172b]/80" />
            <div className="relative"><span className="mb-3 block h-1 w-9 bg-[#faf8f5]" /><h2 className="font-editorial text-2xl font-semibold leading-tight">Get Photography Stories &amp; Tips</h2><p className="mt-2 text-xs leading-5 text-[#faf8f5]/85">Explore new articles, coastal location guides and photography inspiration.</p><Link to="/blog" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#faf8f5] px-4 py-2.5 text-xs font-bold text-[#050505] hover:bg-[#0f172b] hover:text-[#faf8f5]">Explore the Journal <ArrowUpRight className="h-4 w-4" /></Link></div>
          </section>

          {categories.length > 0 && (
            <section className="rounded-2xl border border-[#0f172b]/15 bg-[#faf8f5] p-5 dark:border-[#faf8f5]/15 dark:bg-[#faf8f5]/[0.04]">
              <h2 className="mb-3 font-editorial text-xl font-semibold text-[#050505] dark:text-[#faf8f5]">Categories</h2>
              <div className="space-y-1">{categories.map(category => <Link key={category} to="/blog" className="flex items-center justify-between border-b border-[#0f172b]/15 py-2 text-xs text-[#0f172b] last:border-0 hover:text-[#050505] dark:border-[#faf8f5]/15 dark:text-[#faf8f5]/80"><span>{category}</span><ChevronRight className="h-3.5 w-3.5" /></Link>)}</div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
};

export default BlogPost;
