const fs = require('fs');
let code = fs.readFileSync('pages/Portfolio.tsx', 'utf8');

code = code.replace(
  /interface PortfolioGallery extends Gallery \{/,
  `interface PortfolioGallery extends Gallery {\n  baseCategory?: string;`
);

// Under enrichedGalleries
code = code.replace(
  /return \{\n\s*\.\.\.gallery,/,
  `return {\n                            ...gallery,\n                            baseCategory: gallery.category?.replace(/\\s*\\[(swipe|grid)\\]/gi, '').trim() || '',`
);

// Change categories to use baseCategory
code = code.replace(
  /const categories = \['All', \.\.\.Array\.from\(new Set\(galleries\.map\(g => g\.category\)\.filter\(c => Boolean\(c\) && c\?\.toLowerCase\(\) !== 'prints' && c\?\.toLowerCase\(\) !== 'about'\)\)\)\];/,
  `const categories = ['All', ...Array.from(new Set(galleries.map(g => g.baseCategory).filter(c => Boolean(c) && c?.toLowerCase() !== 'prints' && c?.toLowerCase() !== 'about')))];`
);

// Change filter logic
code = code.replace(
  /galleries\.filter\(g => g\.category === activeCategory\)/g,
  `galleries.filter(g => g.baseCategory === activeCategory)`
);

// Change cat loop in navs (Desktop Navigation Links and Mobile Navigation Links)
code = code.replace(
  /const catGalleries = galleries\.filter\(g => g\.category === cat\);/g,
  `const catGalleries = galleries.filter(g => g.baseCategory === cat);`
);

fs.writeFileSync('pages/Portfolio.tsx', code);
