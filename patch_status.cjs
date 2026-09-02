const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

const target1 = `                        if (!gallery.link_enabled) {
                            statusClass = 'hidden';
                            statusText = 'Hidden';
                        } else if (gallery.selection_status === 'submitted') {
                            statusClass = 'submitted';
                            statusText = 'Submitted';
                        } else if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
                            statusClass = 'expired';
                            statusText = 'Expired';
                        }`;

const replacement1 = `                        if (gallery.selection_status === 'submitted') {
                            statusClass = 'submitted';
                            statusText = 'Selection submitted';
                        } else if (!gallery.link_enabled) {
                            statusClass = 'hidden';
                            statusText = 'Hidden';
                        } else if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
                            statusClass = 'expired';
                            statusText = 'Expired';
                        }`;

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    fs.writeFileSync('pages/Dashboard.tsx', code);
    console.log("Patched successfully.");
} else {
    console.log("Target block not found.");
}
