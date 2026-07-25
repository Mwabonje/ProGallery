const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace(
`      const { fileName, fileType } = req.body;
      
      if (!fileName || !fileType) {
         return res.status(400).json({ error: "fileName and fileType are required" });
      }

      // Generate a clean, unique file path mimicking what the app does
      const uniqueId = Math.random().toString(36).substring(2);
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\\_-]/g, "_");
      const filePath = \\\`uploads/\\\${Date.now()}_\\\${uniqueId}/\\\${sanitizedFileName}\\\`;`,
`      const { fileName, fileType, folderPath } = req.body;
      
      if (!fileName || !fileType) {
         return res.status(400).json({ error: "fileName and fileType are required" });
      }

      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.\\_-]/g, "_");
      let filePath = '';
      if (folderPath) {
          filePath = \\\`\\\${folderPath}/\\\${sanitizedFileName}\\\`;
      } else {
          const uniqueId = Math.random().toString(36).substring(2);
          filePath = \\\`uploads/\\\${Date.now()}_\\\${uniqueId}/\\\${sanitizedFileName}\\\`;
      }`
);
fs.writeFileSync('server.ts', serverCode);

let netlifyCode = fs.readFileSync('netlify/functions/upload-url.ts', 'utf8');
netlifyCode = netlifyCode.replace(
`    const { fileName, fileType } = body;
    
    if (!fileName || !fileType) {
      return { statusCode: 400, body: JSON.stringify({ error: "fileName and fileType required" }) };
    }

    const uniqueId = Math.random().toString(36).substring(2);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = \\\`uploads/\\\${Date.now()}_\\\${uniqueId}/\\\${sanitizedFileName}\\\`;`,
`    const { fileName, fileType, folderPath } = body;
    
    if (!fileName || !fileType) {
      return { statusCode: 400, body: JSON.stringify({ error: "fileName and fileType required" }) };
    }

    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    let filePath = '';
    if (folderPath) {
        filePath = \\\`\\\${folderPath}/\\\${sanitizedFileName}\\\`;
    } else {
        const uniqueId = Math.random().toString(36).substring(2);
        filePath = \\\`uploads/\\\${Date.now()}_\\\${uniqueId}/\\\${sanitizedFileName}\\\`;
    }`
);
fs.writeFileSync('netlify/functions/upload-url.ts', netlifyCode);

