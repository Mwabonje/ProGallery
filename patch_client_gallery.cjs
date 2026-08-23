const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

const target1 = `                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.retried) {
                              target.dataset.retried = "true";
                              target.src =
                                rewriteUrlToR2(
                                  getDisplayUrl(file),
                                ) || "";
                            }
                          }}`;
const replacement1 = `                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.dataset.retried) {
                              target.dataset.retried = "true";
                              // Fallback to original image if watermarked version fails
                              target.src = rewriteUrlToR2(file.file_url) || "";
                            }
                          }}`;

const target2 = `                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.removeAttribute("srcset");
                              target.removeAttribute("sizes");
                              if (!target.dataset.retried) {
                                target.dataset.retried = "true";
                                target.src =
                                  rewriteUrlToR2(
                                    getDisplayUrl(file),
                                  ) || "";
                              }
                            }}`;
const replacement2 = `                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.removeAttribute("srcset");
                              target.removeAttribute("sizes");
                              if (!target.dataset.retried) {
                                target.dataset.retried = "true";
                                // Fallback to original image if watermarked version fails
                                target.src = rewriteUrlToR2(file.file_url) || "";
                              }
                            }}`;

const target3 = `                <img
                  key={lightboxFile.id}
                  src={getOptimizedImageUrl(
                    getDisplayUrl(lightboxFile, true),
                    1920,
                    undefined,
                    85,
                  )}
                  alt="Gallery item preview"
                  className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl animate-in fade-in duration-300"
                  style={{ WebkitTouchCallout: "none", userSelect: "none" }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isPortfolio) {
                      setShowScreenshotWarning(true);
                    }
                  }}
                />`;
const replacement3 = `                <img
                  key={lightboxFile.id}
                  src={getOptimizedImageUrl(
                    getDisplayUrl(lightboxFile, true),
                    1920,
                    undefined,
                    85,
                  )}
                  alt="Gallery item preview"
                  className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl animate-in fade-in duration-300"
                  style={{ WebkitTouchCallout: "none", userSelect: "none" }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isPortfolio) {
                      setShowScreenshotWarning(true);
                    }
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.dataset.retried) {
                      target.dataset.retried = "true";
                      // Fallback to original image if watermarked version fails
                      target.src = rewriteUrlToR2(lightboxFile.file_url) || "";
                    }
                  }}
                />`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);
code = code.replace(target3, replacement3);

fs.writeFileSync('pages/ClientGallery.tsx', code);
console.log("Patched client gallery successfully");
