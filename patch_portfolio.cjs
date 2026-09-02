const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

const target2 = `                        if (!gallery.link_enabled) {
                            statusClass = 'hidden';
                            statusText = 'Hidden';
                        }`;

const replacement2 = `                        if (gallery.selection_status === 'submitted') {
                            statusClass = 'submitted';
                            statusText = 'Selection submitted';
                        } else if (!gallery.link_enabled) {
                            statusClass = 'hidden';
                            statusText = 'Hidden';
                        }`;

if (code.includes(target2)) {
    code = code.replace(target2, replacement2);
    fs.writeFileSync('pages/Dashboard.tsx', code);
    console.log("Patched portfolio successfully.");
} else {
    console.log("Target block not found in portfolio section.");
}
