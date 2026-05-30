import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === 'dist' || file === '.git' || file === 'netlify') return;
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./pages').concat(walk('./contexts'));
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let hasChanges = false;
    
    // add import if needed
    if (content.includes("fetch('/api/") && !content.includes("getApiUrl")) {
        const relativePath = path.relative(path.dirname(file), './utils/api').replace(/\\/g, '/');
        const importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
        content = `import { getApiUrl } from '${importPath}';\n` + content;
    }

    const reg = /fetch\('\/api\/([^']+)'/g;
    if (reg.test(content)) {
        hasChanges = true;
        content = content.replace(reg, "fetch(getApiUrl('/api/$1')");
    }

    if (hasChanges) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
