const fs = require('fs');
let code = fs.readFileSync('netlify/edge-functions/og-tags.ts', 'utf8');

const ogUrlReplace = `html = html.replace(/<meta property="og:url" content=".*?" \\/>/, \\\`<meta property="og:url" content="\\\${url.href}" />\\\`);
          html = html.replace(/<link rel="canonical" href=".*?" \\/>/, \\\`<link rel="canonical" href="\\\${url.href}" />\\\`);`;

code = code.replace(
    /html = html\.replace\(\/<meta property="og:type" content=".*?" \\/>\/, \`<meta property="og:type" content="article" \\/>\`\);/g,
    `html = html.replace(/<meta property="og:type" content=".*?" \\/>/, \`<meta property="og:type" content="article" />\`);
          ${ogUrlReplace}`
);

code = code.replace(
    /html = html\.replace\(\/<meta property="og:type" content=".*?" \\/>\/, \`<meta property="og:type" content="website" \\/>\`\);/g,
    `html = html.replace(/<meta property="og:type" content=".*?" \\/>/, \`<meta property="og:type" content="website" />\`);
            ${ogUrlReplace}`
);

fs.writeFileSync('netlify/edge-functions/og-tags.ts', code);
