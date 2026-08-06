const fs = require('fs');
let code = fs.readFileSync('pages/ClientGallery.tsx', 'utf8');

const anchor = `  const [lightboxFile, setLightboxFile] = useState<GalleryFile | null>(null);`;
const replacement = anchor + `\n  const pendingNoteSaves = useRef<Promise<void>[]>([]);`;

if (code.includes(anchor) && !code.includes('const pendingNoteSaves = useRef')) {
    code = code.replace(anchor, replacement);
    fs.writeFileSync('pages/ClientGallery.tsx', code);
    console.log("Patched successfully");
} else {
    console.log("Anchor not found or already patched.");
}
