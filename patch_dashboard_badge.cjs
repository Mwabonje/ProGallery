const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

const target = `{gallery.selection_enabled && gallery.selection_status === 'pending' && (
                            <div className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                                PENDING SELECTION
                            </div>
                        )}`;

const replacement = `{gallery.selection_enabled && gallery.selection_status === 'pending' && (
                            gallery.expires_at && new Date(gallery.expires_at) < new Date() ? (
                                <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                                    EXPIRED
                                </div>
                            ) : (
                                <div className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                                    PENDING SELECTION
                                </div>
                            )
                        )}`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('pages/Dashboard.tsx', code);
    console.log("Patched badge successfully");
} else {
    console.log("Could not find the target code to replace.");
}
