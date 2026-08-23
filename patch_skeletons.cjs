const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

const imgPortfolioTarget = `                      isPortfolio ? (
                        <img
                          src={getOptimizedImageUrl(`;
const imgPortfolioReplacement = `                      isPortfolio ? (
                        <>
                        <div id={\`skeleton-\${file.id}\`} className="absolute inset-0 bg-slate-200/60 animate-pulse" />
                        <img
                          onLoad={(e) => {
                            const skeleton = document.getElementById(\`skeleton-\${file.id}\`);
                            if (skeleton) skeleton.style.display = 'none';
                          }}
                          src={getOptimizedImageUrl(`;

const imgNonPortfolioTarget = `                      ) : (
                        <>
                          <img
                            src={getOptimizedImageUrl(`;
const imgNonPortfolioReplacement = `                      ) : (
                        <>
                          <div id={\`skeleton-\${file.id}\`} className="absolute inset-0 bg-slate-200/60 animate-pulse" />
                          <img
                            onLoad={(e) => {
                              const skeleton = document.getElementById(\`skeleton-\${file.id}\`);
                              if (skeleton) skeleton.style.display = 'none';
                            }}
                            src={getOptimizedImageUrl(`;

code = code.replace(imgPortfolioTarget, imgPortfolioReplacement);
code = code.replace(imgNonPortfolioTarget, imgNonPortfolioReplacement);

// Also we should close the Fragment for isPortfolio
const endPortfolioTarget = `                          onContextMenu={(e) => e.preventDefault()}
                        />
                      ) : (`;
const endPortfolioReplacement = `                          onContextMenu={(e) => e.preventDefault()}
                        />
                        </>
                      ) : (`;

code = code.replace(endPortfolioTarget, endPortfolioReplacement);

fs.writeFileSync('pages/ClientGallery.tsx', code);
console.log("Patched skeletons successfully");
