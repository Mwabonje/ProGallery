const fs = require('fs');

const filePath = 'pages/Portfolio.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// We need to fetch the ABOUT gallery explicitly in the useEffect and put it in state,
// or just find it from allGalleries and set it in state.

// Find where we set settingsGal
const searchSettings = `const settingsGal = allGalleries.find(g => g.category === 'SETTINGS');`;
const replacementSettings = `const settingsGal = allGalleries.find(g => g.category === 'SETTINGS');
        const aboutGal = allGalleries.find(g => g.client_name === '__ABOUT__' || g.category === 'ABOUT');
        if (aboutGal) {
            const { data: aboutFiles } = await supabase
              .from('files')
              .select('file_url')
              .eq('gallery_id', aboutGal.id)
              .neq('file_path', 'GALLERY_PASSWORD')
              .order('created_at', { ascending: false })
              .limit(1);
            if (aboutFiles && aboutFiles.length > 0) {
                setAboutGallery({ ...aboutGal, coverUrl: aboutFiles[0].file_url, baseCategory: 'ABOUT' } as any);
            }
        }`;

if (content.includes(searchSettings) && !content.includes('setAboutGallery({')) {
    content = content.replace(searchSettings, replacementSettings);
    
    // Add state for aboutGallery
    content = content.replace(`const [galleries, setGalleries] = useState<PortfolioGallery[]>([]);`, `const [galleries, setGalleries] = useState<PortfolioGallery[]>([]);\n  const [aboutGallery, setAboutGallery] = useState<PortfolioGallery | null>(null);`);
    
    // Remove old aboutGallery extraction
    content = content.replace(`const aboutGallery = galleries.find(g => g.client_name === '_ABOUT_' || g.baseCategory === 'ABOUT');\n  const portfolioGalleries = galleries.filter(g => g.id !== aboutGallery?.id);`, `const portfolioGalleries = galleries;`);
    
    // Replace portfolioGalleries with galleries if needed, actually portfolioGalleries is already used.
    
    fs.writeFileSync(filePath, content);
    console.log("Fixed about section!");
} else {
    console.log("Could not find insertion point.");
}
