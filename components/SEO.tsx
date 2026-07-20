import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: 'website' | 'article';
  keywords?: string;
  author?: string;
  publishDate?: string;
  structuredData?: any;
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
}) => {
  const defaultStructuredData = type === 'article' 
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "image": image ? [image] : [],
        "datePublished": publishDate,
        "author": {
            "@type": "Person",
            "name": author,
            "url": "https://mwabonje.com"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Mwabonje",
          "logo": {
            "@type": "ImageObject",
            "url": "https://mwabonje.com/og-image.jpg"
          }
        },
        "description": description,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": url
        }
      }
    : {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title,
        "description": description,
        "image": image
      };

  const finalStructuredData = customStructuredData || defaultStructuredData;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:alt" content={title} />}
      
      {type === 'article' && publishDate && <meta property="article:published_time" content={publishDate} />}
      {type === 'article' && author && <meta property="article:author" content={author} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}

      <script type="application/ld+json">
        {JSON.stringify(finalStructuredData)}
      </script>
    </Helmet>
  );
};
