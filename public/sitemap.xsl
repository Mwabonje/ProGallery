<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  exclude-result-prefixes="s">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:strip-space elements="*"/>
  <xsl:template match="/">
    <xsl:apply-templates select="s:urlset"/>
  </xsl:template>
  <xsl:template match="s:urlset">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>Mwabonje Photography | Sitemap</title>
        <style>
          :root{--forest:#003223;--lime:#8cc74f;--ink:#1d2923;--muted:#68756d;--line:#e5eae4;--paper:#f7f8f3;--white:#fff}
          *{box-sizing:border-box}
          body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 Inter,"Helvetica Neue",Arial,sans-serif}
          .page{width:min(100% - 40px,980px);margin:auto;padding:64px 0 72px}
          .brand{display:flex;align-items:center;gap:10px;color:var(--forest);font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
          .dot{width:9px;height:9px;border-radius:50%;background:var(--lime);box-shadow:0 0 0 4px #8cc74f29}
          h1{margin:22px 0 10px;color:var(--forest);font:400 clamp(38px,6vw,58px)/1.04 Georgia,"Times New Roman",serif;letter-spacing:-.045em}
          .intro{max-width:650px;margin:0;color:var(--muted)}
          .summary{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:34px 0 18px;padding:18px 20px;border:1px solid var(--line);border-radius:12px;background:var(--white)}
          .label{color:var(--muted);font-size:11px;letter-spacing:.1em;text-transform:uppercase}
          .count{display:block;margin-top:2px;color:var(--forest);font:32px/1.1 Georgia,serif}
          .note{color:var(--muted);font-size:13px;text-align:right}
          .listhead{display:flex;justify-content:space-between;padding:0 4px 10px;color:var(--muted);font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
          .entries{overflow:hidden;border:1px solid var(--line);border-radius:12px;background:var(--white)}
          .entry{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:17px 20px;border-bottom:1px solid var(--line)}
          .entry:last-child{border-bottom:0}
          .url{display:block;overflow-wrap:anywhere;color:var(--forest);font-size:14px;font-weight:600;text-decoration:none}
          .url:hover{text-decoration:underline;text-decoration-color:var(--lime);text-underline-offset:4px}
          .date{white-space:nowrap;color:var(--muted);font-size:12px}
          .datelabel{display:block;margin-bottom:2px;color:#89948c;font-size:10px;letter-spacing:.08em;text-align:right;text-transform:uppercase}
          footer{display:flex;justify-content:space-between;gap:16px;margin-top:24px;color:var(--muted);font-size:12px}
          footer a{color:var(--forest);text-decoration-color:var(--lime);text-underline-offset:3px}
          @media(max-width:620px){.page{width:min(100% - 28px,980px);padding-top:40px}.summary{align-items:flex-start;flex-direction:column}.note{text-align:left}.entry{grid-template-columns:1fr;gap:7px;padding:15px 16px}.date{white-space:normal}.datelabel{display:inline;margin:0 6px 0 0;text-align:left}.listhead{display:none}footer{flex-direction:column}}
        </style>
      </head>
      <body>
        <main class="page">
          <div class="brand"><span class="dot"></span>Mwabonje Photography</div>
          <h1>Website sitemap</h1>
          <p class="intro">A directory of publicly available pages on mwabonje.co.ke. This sitemap helps search engines discover the site's pages.</p>
          <section class="summary" aria-label="Sitemap summary">
            <div><span class="label">Pages listed</span><strong class="count"><xsl:value-of select="count(s:url)"/></strong></div>
            <div class="note">XML sitemap · Public website pages</div>
          </section>
          <div class="listhead"><span>Page address</span><span>Last modified</span></div>
          <section class="entries" aria-label="Sitemap URLs">
            <xsl:for-each select="s:url">
              <div class="entry">
                <div><a class="url"><xsl:attribute name="href"><xsl:value-of select="s:loc"/></xsl:attribute><xsl:value-of select="s:loc"/></a></div>
                <div class="date">
                  <xsl:if test="s:lastmod"><span class="datelabel">Updated</span><xsl:value-of select="s:lastmod"/></xsl:if>
                  <xsl:if test="not(s:lastmod)"><span class="datelabel">Last modified</span><span>Not provided</span></xsl:if>
                </div>
              </div>
            </xsl:for-each>
          </section>
          <footer><span>© Mwabonje Photography</span><a href="https://mwabonje.co.ke/">Visit mwabonje.co.ke</a></footer>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
