const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `      const { fileName, fileType } = req.body;
      
      if (!fileName || !fileType) {
         return res.status(400).json({ error: "fileName and fileType are required" });
      }

      // Generate a clean, unique file path mimicking what the app does
      const uniqueId = Math.random().toString(36).substring(2);
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\\_-]/g, "_");
      const filePath = \`uploads/\${Date.now()}_\${uniqueId}/\${sanitizedFileName}\`;`;

const replacement = `      const { fileName, fileType, folderPath } = req.body;
      
      if (!fileName || !fileType) {
         return res.status(400).json({ error: "fileName and fileType are required" });
      }

      // Generate a clean, unique file path mimicking what the app does
      const uniqueId = Math.random().toString(36).substring(2);
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\\_-]/g, "_");
      
      let filePath;
      if (folderPath) {
          filePath = \`\${folderPath}/\${sanitizedFileName}\`;
      } else {
          filePath = \`uploads/\${Date.now()}_\${uniqueId}/\${sanitizedFileName}\`;
      }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("Patched server successfully");
} else {
    console.log("Target not found.");
}
