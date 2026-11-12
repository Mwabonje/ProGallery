import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { calculateReadingTime, parseCategories } from '../utils/blogData';
import { BlogPost } from '../types';
import { supabase } from '../services/supabase';
import { ArrowLeft, ArrowRight, BookOpen, Camera, Clapperboard, Grid2X2, Heart, MapPin, Sprout, Loader2 } from 'lucide-react';
import { PublicHeader } from '../components/PublicHeader';

export const Blog: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageTitle = "Journal & Stories | Mwabonje Photography — Malindi & Kenyan Coast";
  const pageDescription = "Explore photography guides, coastal location stories, wedding tips, and documentary visual storytelling from Malindi, Watamu, and Lamu by Mwabonje Photography.";
  const pageUrl = "https://mwabonje.co.ke/blog";
  const pageSize = 6;

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    posts.forEach(post => parseCategories(post.category).forEach(c => cats.add(c)));
    return ['All', ...Array.from(cats)];
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'All') return posts;
    return posts.filter(post => parseCategories(post.category).includes(selectedCategory));
  }, [posts, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(Math.max(0, filteredPosts.length - 4) / pageSize));
  const paginatedPosts = filteredPosts.slice(4 + (currentPage - 1) * pageSize, 4 + currentPage * pageSize);
  const featuredPost = filteredPosts[0];
  const latestPosts = filteredPosts.slice(1, 4);
  const popularPosts = useMemo(() => {
    return [...filteredPosts.slice(4)].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3);
  }, [filteredPosts]);

  useEffect(() => { fetchPosts(); }, []);

  useEffect(() => { setCurrentPage(1); }, [selectedCategory]);

  const handlePostClick = (slug: string) => {
    supabase.rpc('update_blog_c', { blog_slug: slug }).then(({ error }) => {
      if (error) console.error(error);
    });
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase.from('blogs').select('*').order('date', { ascending: false });
      if (error) throw error;
      const now = new Date();
      const publishedPosts = (data || []).filter((post: BlogPost) => {
        const status = post.status || 'published';
        if (status === 'draft') return false;
        if (status === 'scheduled') return new Date(post.date) <= now;
        return true;
      });
      setPosts(publishedPosts);
    } catch (err) {
      console.error('Error fetching blogs from DB:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const categoryIcon = (category: string) => {
    const value = category.toLowerCase();
    if (value.includes('wedding')) return Heart;
    if (value.includes('engagement') || value.includes('couple')) return Heart;
    if (value.includes('destination') || value.includes('travel') || value.includes('place')) return MapPin;
    if (value.includes('tip') || value.includes('portrait') || value.includes('photography')) return Camera;
    if (value.includes('behind') || value.includes('film')) return Clapperboard;
    if (value.includes('studio') || value.includes('personal')) return Sprout;
    return BookOpen;
  };

  const storyLink = (post: BlogPost, className: string, children: React.ReactNode) => (
    <Link to={`/blog/${post.slug}`} onClick={() => handlePostClick(post.slug)} className={className}>
      {children}
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#faf6ef] dark:bg-[#0b0f17] text-[#211811] dark:text-slate-100 font-sans transition-colors duration-300">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content="Mwabonje blog, photography in Malindi, wedding photography Watamu, Lamu visual storytelling, Kenyan coast photography" />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={posts.length > 0 && posts[0].cover_image ? posts[0].cover_image : "https://mwabonje.co.ke/og-image.jpg"} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={pageUrl} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={posts.length > 0 && posts[0].cover_image ? posts[0].cover_image : "https://mwabonje.co.ke/og-image.jpg"} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: "https://mwabonje.co.ke/" },
                  { "@type": "ListItem", position: 2, name: "Journal", item: "https://mwabonje.co.ke/blog" }
                ]
              },
              {
                "@type": "Blog",
                name: "Mwabonje Photography Journal",
                description: pageDescription,
                url: pageUrl,
                publisher: {
                  "@type": "Organization",
                  name: "Mwabonje",
                  logo: { "@type": "ImageObject", url: "https://mwabonje.co.ke/og-image.jpg" }
                },
                blogPost: posts.map(post => ({
                  "@type": "BlogPosting",
                  headline: post.seo_title || post.title,
                  description: post.seo_description || post.excerpt,
                  image: post.cover_image,
                  datePublished: post.date,
                  author: { "@type": "Person", name: post.author },
                  url: `https://mwabonje.co.ke/blog/${post.slug}`
                }))
              }
            ]
          })}
        </script>
      </Helmet>

      <PublicHeader />

      {/* Journal masthead */}
      <section className="relative isolate min-h-[270px] sm:min-h-[320px] lg:min-h-[350px] overflow-hidden bg-[#4a2a19]">
        {featuredPost?.cover_image && (
          <img src={featuredPost.cover_image} alt="" aria-hidden="true" className="absolute inset-0 -z-20 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#2c180f]/95 via-[#3c2115]/70 to-[#3c2115]/10" />
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 min-h-[270px] sm:min-h-[320px] lg:min-h-[350px] flex items-center">
          <div className="max-w-xl py-12 text-white">
            <p className="text-[10px] sm:text-xs tracking-[0.28em] uppercase font-semibold text-[#f2d9b7] mb-3">The Journal</p>
            <h1 className="font-editorial text-5xl sm:text-6xl lg:text-7xl leading-[0.92] tracking-tight">Stories from<br />the Coast</h1>
            <p className="mt-5 max-w-md text-sm sm:text-base leading-relaxed text-white/90">
              Photography stories, destination guides, creative insights and real moments from Malindi, Kilifi, Lamu and beyond.
            </p>
          </div>
        </div>
      </section>

      {/* Category navigation */}
      <nav aria-label="Filter journal stories" className="border-b border-[#e8ded1] dark:border-slate-800 bg-[#fbf7f0] dark:bg-[#111722]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-wrap items-stretch justify-center gap-x-3 sm:gap-x-5 lg:gap-x-8">
          {availableCategories.map(category => {
            const Icon = category === 'All' ? Grid2X2 : categoryIcon(category);
            const active = selectedCategory === category;
            return (
              <button key={category} type="button" onClick={() => setSelectedCategory(category)}
                aria-pressed={active}
                className={`shrink-0 min-w-[82px] sm:min-w-[104px] px-1 py-4 sm:py-5 flex flex-col items-center justify-center gap-1.5 border-b-2 transition-colors ${active ? 'border-[#56311e] text-[#56311e] dark:border-amber-300 dark:text-amber-200' : 'border-transparent text-[#725b4b] hover:text-[#321d12] dark:text-slate-400 dark:hover:text-white'}`}>
                <Icon size={19} strokeWidth={1.6} />
                <span className="text-[10px] sm:text-xs whitespace-nowrap">{category === 'All' ? 'All Stories' : category}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto w-full px-5 sm:px-8 lg:px-10 py-8 sm:py-10 lg:py-12">
        {loading ? (
          <div className="h-72 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#8b6b51]" /></div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-24 text-center text-[#725b4b] dark:text-slate-400">
            <BookOpen className="mx-auto mb-4" size={30} />
            <p>No journal stories found{selectedCategory !== 'All' ? ` in “${selectedCategory}”` : ''}.</p>
            {selectedCategory !== 'All' && <button onClick={() => setSelectedCategory('All')} className="mt-3 underline underline-offset-4">View all stories</button>}
          </div>
        ) : (
          <>
            {/* Featured story */}
            {featuredPost && (
              <section className="grid grid-cols-1 lg:grid-cols-[1.55fr_0.9fr] gap-7 lg:gap-10 items-center mb-10 sm:mb-14">
                {storyLink(featuredPost, "group block relative overflow-hidden rounded-md aspect-[16/9] lg:aspect-[1.55/1] bg-[#e9ddce]", <>
                  {featuredPost.cover_image && <img src={featuredPost.cover_image} alt={featuredPost.title} loading="eager" fetchPriority="high" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" />}
                </>)}
                <div className="lg:py-4">
                  <span className="inline-flex px-3 py-1 rounded-full bg-[#f2dfc4] dark:bg-amber-300/15 text-[#57341f] dark:text-amber-200 text-[9px] font-bold tracking-[0.16em] uppercase mb-4">Featured Story</span>
                  <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[42px] leading-[1.06] text-[#1d1712] dark:text-white">
                    {storyLink(featuredPost, "hover:text-[#815536] dark:hover:text-amber-200 transition-colors", featuredPost.title)}
                  </h2>
                  <p className="mt-4 text-sm sm:text-[15px] leading-relaxed text-[#594a3e] dark:text-slate-300 line-clamp-3">{featuredPost.excerpt}</p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#e7d2b7] dark:bg-slate-700 flex items-center justify-center font-editorial text-lg text-[#57341f] dark:text-amber-100">M</div>
                    <div className="text-xs">
                      <p className="font-semibold text-[#2b211a] dark:text-white">By {featuredPost.author || 'Mwabonje'}</p>
                      <p className="mt-1 text-[#806d5d] dark:text-slate-400">{formatDate(featuredPost.date)} <span className="mx-1.5">·</span> {calculateReadingTime(featuredPost.content)} min read</p>
                    </div>
                  </div>
                  {storyLink(featuredPost, "mt-5 inline-flex items-center gap-3 rounded-md bg-[#4b2b1b] hover:bg-[#65402b] text-white px-5 py-3 text-xs font-semibold transition-colors dark:bg-amber-100 dark:text-[#2b1a10] dark:hover:bg-white", <>Read Story <ArrowRight size={15} /></>)}
                </div>
              </section>
            )}

            {/* Latest stories */}
            {latestPosts.length > 0 && (
              <section className="mb-10 sm:mb-14">
                <div className="flex items-end justify-between gap-4 mb-5">
                  <h2 className="font-editorial text-3xl sm:text-4xl text-[#201811] dark:text-white">Latest Stories</h2>
                  <span className="hidden sm:block text-xs text-[#725b4b] dark:text-slate-400">{filteredPosts.length} journal entries</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-5 lg:gap-6">
                  {latestPosts.map(post => (
                    <article key={post.id} className="group min-w-0">
                      {storyLink(post, "block relative aspect-[1.55/1] overflow-hidden rounded-md bg-[#e9ddce]", <>
                        {post.cover_image && <img src={post.cover_image} alt={post.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
                      </>)}
                      <div className="pt-3 px-1">
                        {parseCategories(post.category).slice(0, 1).map(cat => <span key={cat} className="inline-block bg-[#f2dfc4] dark:bg-amber-300/15 text-[#57341f] dark:text-amber-200 rounded px-2 py-1 text-[9px] font-bold tracking-wider uppercase mb-2">{cat}</span>)}
                        <h3 className="font-editorial text-[23px] leading-[1.08] text-[#211811] dark:text-white">{storyLink(post, "hover:text-[#815536] dark:hover:text-amber-200 transition-colors", post.title)}</h3>
                        <p className="mt-2 text-xs leading-relaxed text-[#594a3e] dark:text-slate-300 line-clamp-2">{post.excerpt}</p>
                        <p className="mt-3 text-[11px] text-[#806d5d] dark:text-slate-400">{formatDate(post.date)} <span className="mx-1.5">·</span> {calculateReadingTime(post.content)} min read</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Popular stories feature band */}
            {popularPosts.length > 0 && (
              <section className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.95fr] rounded-xl overflow-hidden bg-[#f2e9dd] dark:bg-[#151d29] mb-8 sm:mb-12">
                <div className="relative h-[230px] sm:h-[280px] lg:h-[300px] overflow-hidden bg-[#e7d9c8]">
                  {popularPosts[0].cover_image && (
                    <img
                      src={popularPosts[0].cover_image}
                      alt={popularPosts[0].title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover object-[center_72%]"
                    />
                  )}
                </div>
                <div className="min-h-[280px] lg:h-[300px] flex flex-col justify-center p-6 sm:p-8 lg:px-10 lg:py-7">
                  <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-[#6a422a] dark:text-amber-200 mb-5">Popular Stories</p>
                  <div className="space-y-4 sm:space-y-4">
                    {popularPosts.map(post => (
                      <article key={post.id} className="flex items-center gap-4 min-w-0">
                        {post.cover_image && storyLink(post, "w-20 h-16 sm:w-[88px] sm:h-[68px] shrink-0 overflow-hidden rounded-md", <img src={post.cover_image} alt="" loading="lazy" className="w-full h-full object-cover" />)}
                        <div className="min-w-0">
                          <h3 className="font-editorial text-lg sm:text-xl leading-[1.12] text-[#211811] dark:text-white">{storyLink(post, "hover:text-[#815536] dark:hover:text-amber-200 transition-colors", post.title)}</h3>
                          <p className="mt-1.5 text-[11px] text-[#806d5d] dark:text-slate-400">{formatDate(post.date)} <span className="mx-1">·</span> {calculateReadingTime(post.content)} min read</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Remaining journal archive */}
            {paginatedPosts.length > 0 && (
              <section className="pt-3">
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] uppercase text-[#8a6a50] dark:text-amber-200 font-bold mb-1">Explore the Journal</p>
                    <h2 className="font-editorial text-3xl sm:text-4xl text-[#201811] dark:text-white">More Stories</h2>
                  </div>
                  <span className="text-xs text-[#806d5d] dark:text-slate-400">{paginatedPosts.length} stories</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-9">
                  {paginatedPosts.map(post => (
                    <article key={post.id} className="group">
                      {storyLink(post, "block aspect-[1.55/1] overflow-hidden rounded-md bg-[#e9ddce] mb-3", <>
                        {post.cover_image && <img src={post.cover_image} alt={post.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />}
                      </>)}
                      <p className="text-[10px] text-[#806d5d] dark:text-slate-400 mb-2">{formatDate(post.date)} <span className="mx-1">·</span> {calculateReadingTime(post.content)} min read</p>
                      <h3 className="font-editorial text-2xl leading-tight text-[#211811] dark:text-white">{storyLink(post, "hover:text-[#815536] dark:hover:text-amber-200 transition-colors", post.title)}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#594a3e] dark:text-slate-300 line-clamp-2">{post.excerpt}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {totalPages > 1 && (
              <nav aria-label="Journal pagination" className="flex justify-center items-center gap-2 sm:gap-4 pt-10">
                <button type="button" onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === 1} className="p-2 text-[#57341f] dark:text-amber-100 disabled:opacity-30" aria-label="Previous page"><ArrowLeft size={18} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} type="button" onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-current={currentPage === page ? 'page' : undefined} className={`w-9 h-9 rounded-md text-sm transition-colors ${currentPage === page ? 'bg-[#4b2b1b] text-white dark:bg-amber-100 dark:text-[#2b1a10]' : 'text-[#57341f] hover:bg-[#eadbc8] dark:text-slate-300 dark:hover:bg-slate-800'}`}>{page}</button>
                ))}
                <button type="button" onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={currentPage === totalPages} className="p-2 text-[#57341f] dark:text-amber-100 disabled:opacity-30" aria-label="Next page"><ArrowRight size={18} /></button>
              </nav>
            )}
          </>
        )}
      </main>

      {/* Newsletter contact band — directs readers to the existing contact channel */}
      <section className="mx-4 sm:mx-8 lg:mx-auto max-w-7xl mb-8 sm:mb-12 rounded-xl overflow-hidden bg-[#482817] text-white">
        <div className="px-6 sm:px-10 lg:px-16 py-8 sm:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="font-editorial text-3xl sm:text-4xl">Stay Inspired</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">Discover new photography stories, destination guides and creative notes from the Kenyan coast.</p>
          </div>
          <a href="mailto:info@mwabonje.co.ke?subject=Journal%20updates" className="inline-flex items-center justify-center gap-3 rounded-md bg-[#efbd62] hover:bg-[#f5ca7d] text-[#2d1a0f] px-6 py-3 text-sm font-semibold transition-colors">Get in Touch <ArrowRight size={16} /></a>
        </div>
      </section>
    </div>
  );
};
