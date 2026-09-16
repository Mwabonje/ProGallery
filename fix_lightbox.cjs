const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

// Replace handlePrevLightbox and handleNextLightbox
const prevNextRegex = /const handlePrevLightbox = \(\s*e\?: React\.MouseEvent \| KeyboardEvent\s*\) => {[\s\S]*?const handleNextLightbox = \(\s*e\?: React\.MouseEvent \| KeyboardEvent\s*\) => {[\s\S]*?};\n/m;

const newPrevNext = `const handlePrevLightbox = (e?: React.MouseEvent | KeyboardEvent) => {
    if (e && "stopPropagation" in e) e.stopPropagation();
    if (!lightboxFile) return;
    const index = displayedFiles.findIndex((f) => f.id === lightboxFile.id);
    if (index !== -1) {
      let prevIndex = index - 1;
      while (prevIndex >= 0) {
        if (!isPortfolio && isFileLocked(displayedFiles[prevIndex].id)) {
          prevIndex--;
        } else {
          break;
        }
      }
      if (prevIndex >= 0) {
        setLightboxFileWithTracking(displayedFiles[prevIndex]);
      } else {
        // wrap around
        let lastUnlocked = displayedFiles.length - 1;
        while (lastUnlocked >= 0 && !isPortfolio && isFileLocked(displayedFiles[lastUnlocked].id)) {
          lastUnlocked--;
        }
        if (lastUnlocked >= 0) {
           setLightboxFileWithTracking(displayedFiles[lastUnlocked]);
        }
      }
    }
  };

  const handleNextLightbox = (e?: React.MouseEvent | KeyboardEvent) => {
    if (e && "stopPropagation" in e) e.stopPropagation();
    if (!lightboxFile) return;
    const index = displayedFiles.findIndex((f) => f.id === lightboxFile.id);
    if (index !== -1) {
      let nextIndex = index + 1;
      while (nextIndex < displayedFiles.length) {
        if (!isPortfolio && isFileLocked(displayedFiles[nextIndex].id)) {
          nextIndex++;
        } else {
          break;
        }
      }
      if (nextIndex < displayedFiles.length) {
        setLightboxFileWithTracking(displayedFiles[nextIndex]);
      } else {
        // wrap around
        let firstUnlocked = 0;
        while (firstUnlocked < displayedFiles.length && !isPortfolio && isFileLocked(displayedFiles[firstUnlocked].id)) {
          firstUnlocked++;
        }
        if (firstUnlocked < displayedFiles.length) {
          setLightboxFileWithTracking(displayedFiles[firstUnlocked]);
        }
      }
    }
  };
`;

if (code.match(prevNextRegex)) {
    code = code.replace(prevNextRegex, newPrevNext);
    console.log("Replaced prev/next handlers");
} else {
    console.log("Could not match prev/next handlers");
}

// Replace grid onClick
const gridClickTarget = `onClick={() => {
                      if (!isPortfolio) {
                        setLightboxFile(file);
                      }
                    }}`;
const newGridClick = `onClick={() => {
                      if (!isPortfolio) {
                        if (isFileLocked(file.id)) {
                          setShowBalanceWarningModal(true);
                          return;
                        }
                        setLightboxFileWithTracking(file);
                      }
                    }}`;
                    
if (code.includes(gridClickTarget)) {
    code = code.replace(gridClickTarget, newGridClick);
    console.log("Replaced grid onClick");
} else {
    console.log("Could not find grid onClick");
}

// Replace thumbnail onClick
const thumbClickTarget = `onClick={(e) => {
                    e.stopPropagation();
                    setLightboxFile(file);
                  }}`;
const newThumbClick = `onClick={(e) => {
                    e.stopPropagation();
                    if (!isPortfolio && isFileLocked(file.id)) {
                      setShowBalanceWarningModal(true);
                      return;
                    }
                    setLightboxFileWithTracking(file);
                  }}`;

if (code.includes(thumbClickTarget)) {
    code = code.replace(thumbClickTarget, newThumbClick);
    console.log("Replaced thumbnail onClick");
} else {
    console.log("Could not find thumbnail onClick");
}

fs.writeFileSync('pages/ClientGallery.tsx', code);
