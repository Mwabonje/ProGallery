const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

const startStr = '  return (\n    <div className="admin-theme">';
const startIdx = code.indexOf(startStr);
if (startIdx !== -1) {
    const endStr = '{/* Create Gallery Modal */}';
    const endIdx = code.indexOf(endStr);
    
    if (endIdx !== -1) {
        console.log('Found block to replace. Length:', endIdx - startIdx);
    } else {
        const altEndStr = '{isCreateModalOpen && (';
        const altEndIdx = code.indexOf(altEndStr);
        console.log('Found alt end. Length:', altEndIdx - startIdx);
    }
} else {
    console.log('Start not found');
}
