const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

code = code.replace('    </div>\n    </>\n  );\n};', '    </>\n  );\n};');

fs.writeFileSync('pages/Dashboard.tsx', code);
console.log('Fixed extra div closure');
