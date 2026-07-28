const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/<link rel="canonical" href=".*?" \/>\n/g, '');
code = code.replace(/<meta property="og:url" content=".*?" \/>\n/g, '');
code = code.replace(/<!-- Canonical URL -->\n/g, '');

fs.writeFileSync('index.html', code);
