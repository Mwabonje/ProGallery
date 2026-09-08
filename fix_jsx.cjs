const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

const uiString = `
    <>
      <div className="app admin-theme-v2">
      <style>{\`
`;

code = code.replace('  return (\n    <div className="app admin-theme-v2">\n      <style>{`', '  return (\n    <>\n      <div className="app admin-theme-v2">\n      <style>{`');

const endStr = '      {/* Create Gallery Modal */}';
// Wait, we need to add `</>` at the very end of the return statement.
// The return statement ends at the end of the file:
// `  );\n};\n`

code = code.replace('    </div>\n  );\n};', '    </div>\n    </>\n  );\n};');

fs.writeFileSync('pages/Dashboard.tsx', code);
console.log('Fixed JSX wrapping');
