const fs = require('fs');

const fixFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    const searchString = `const { data: galleriesData, error } = await query;\n        if (error) throw error;\n\n        \n        \n        const settingsGal = (galleriesData || []).find(g => g.category === 'SETTINGS');`;
    
    const replacementString = `const { data: galleriesData, error } = await query;\n        if (error) throw error;\n\n        let allGalleries = galleriesData || [];\n        if (!photographerId && allGalleries.length > 0) {\n            const mostRecentPortfolio = allGalleries.find(g => g.category && g.category.trim() !== '' && g.category !== 'SETTINGS' && g.category !== 'ABOUT');\n            if (mostRecentPortfolio) {\n                allGalleries = allGalleries.filter(g => g.photographer_id === mostRecentPortfolio.photographer_id);\n            }\n        }\n\n        const settingsGal = allGalleries.find(g => g.category === 'SETTINGS');`;
    
    if (content.includes(searchString)) {
        content = content.replace(searchString, replacementString);
        fs.writeFileSync(filePath, content);
        console.log(`Fixed ${filePath}`);
    } else {
        // try an alternative search string
        const altSearch = `const { data: galleriesData, error } = await query;\n        if (error) throw error;\n\n        const settingsGal = (galleriesData || []).find(g => g.category === 'SETTINGS');`;
        if (content.includes(altSearch)) {
            content = content.replace(altSearch, replacementString);
            fs.writeFileSync(filePath, content);
            console.log(`Fixed ${filePath} (alt)`);
        } else {
            console.log(`Could not find target string in ${filePath}`);
        }
    }
    
    // Also replace other usages of (galleriesData || []) with allGalleries
    if (content.includes('allGalleries = galleriesData')) {
        content = content.replace(/const portfolioItems = \(galleriesData \|\| \[\]\)/g, 'const portfolioItems = allGalleries');
        content = content.replace(/const aboutGallery = \(galleriesData \|\| \[\]\)/g, 'const aboutGallery = allGalleries');
        fs.writeFileSync(filePath, content);
    }
};

fixFile('pages/Portfolio.tsx');
