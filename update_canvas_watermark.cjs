const fs = require('fs');
let code = fs.readFileSync('contexts/UploadContext.tsx', 'utf8');

// Replace the canvas watermark drawing section
const oldDraw = `            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.rotate((-45 * Math.PI) / 180);
            
            const fontSize = Math.max(36, Math.floor(width / 8));
            ctx.font = \\\`900 \\\${fontSize}px sans-serif\\\`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            // @ts-ignore
            if (ctx.letterSpacing !== undefined) ctx.letterSpacing = "6px";
            
            ctx.fillText("MWABONJE", 0, 0);
            ctx.restore();`;

const newDraw = `            // Draw repeating watermark pattern like the CSS overlay
            const svgString = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="36" fill="rgba(255,255,255,0.4)" transform="rotate(-45 150 150)" letter-spacing="6">MWABONJE</text></svg>';
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            
            const patternImg = new Image();
            await new Promise((res) => {
                patternImg.onload = () => {
                    URL.revokeObjectURL(url);
                    const pattern = ctx.createPattern(patternImg, 'repeat');
                    if (pattern) {
                        ctx.fillStyle = pattern;
                        ctx.fillRect(0, 0, width, height);
                    }
                    res(null);
                };
                patternImg.onerror = () => {
                    URL.revokeObjectURL(url);
                    res(null);
                };
                patternImg.src = url;
            });`;

code = code.replace(oldDraw, newDraw);

// Wait, the generateWatermarkedImage function is wrapped in `return new Promise((resolve) => { img.onload = () => { ... } })`
// It cannot await inside img.onload unless we make img.onload async!
code = code.replace('img.onload = () => {', 'img.onload = async () => {');

fs.writeFileSync('contexts/UploadContext.tsx', code);
