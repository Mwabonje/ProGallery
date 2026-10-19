import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url: string;
  type?: 'website' | 'article';
  keywords?: string;
  author?: string;
  publishDate?: string;
  structuredData?: any;
  noindex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords,
  author = 'Mwabonje',
  publishDate,
  structuredData: customStructuredData,
  noindex = false,
}) => {
  // Enforce canonical domain migration: always resolve to absolute HTTPS on mwabonje.co.ke
  const canonicalUrl = (() => {
    if (!url) return 'https://mwabonje.co.ke/';
    try {
      if (url.startsWith('/')) {
        return `https://mwabonje.co.ke${url === '/' ? '/' : url.replace(/\/$/, '')}`;
      }
      const parsed = new URL(url);
      const pathname = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/$/, '');
      return `https://mwabonje.co.ke${pathname}${parsed.search}`;
    } catch {
      return 'https://mwabonje.co.ke/';
    }
  })();

  const resolvedImage = image 
    ? (image.startsWith('/') ? `https://mwabonje.co.ke${image}` : image)
    : "https://mwabonje.co.ke/og-image.jpg";

  const defaultStructuredData = type === 'article' 
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "image": resolvedImage ? [resolvedImage] : [],
        "datePublished": publishDate,
        "author": {
            "@type": "Person",
            "name": author,
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
        "description": description,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": canonicalUrl
        }
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title,
        "description": description,
        "url": canonicalUrl,
        "image": resolvedImage
      };

  const finalStructuredData = customStructuredData || defaultStructuredData;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}

      {noindex ? (
        <>
          <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
          <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
        </>
      ) : (
        <>
          <link rel="canonical" href={canonicalUrl} />
          {/* Open Graph / Facebook */}
          <meta property="og:type" content={type} />
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          {resolvedImage && <meta property="og:image" content={resolvedImage} />}
          {resolvedImage && <meta property="og:image:alt" content={title} />}
          
          {type === 'article' && publishDate && <meta property="article:published_time" content={publishDate} />}
          {type === 'article' && author && <meta property="article:author" content={author} />}

          {/* Twitter */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:url" content={canonicalUrl} />
          <meta name="twitter:title" content={title} />
          <meta name="twitter:description" content={description} />
          {resolvedImage && <meta name="twitter:image" content={resolvedImage} />}

          <script type="application/ld+json">
            {JSON.stringify(finalStructuredData)}
          </script>
        </>
      )}
    </Helmet>
  );
};
