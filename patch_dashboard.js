const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

// Find the start of the return block
const startIdx = code.indexOf('return (\\n    <div className="admin-theme">');
if (startIdx === -1) {
  const altStart = code.indexOf('  return (\n    <div className="admin-theme">');
  console.log(altStart !== -1 ? 'Found alt start' : 'Start not found');
}
