const fs = require('fs');
let code = fs.readFileSync('pages/Dashboard.tsx', 'utf8');

code = code.replace(/deliveriesCount >= 6/g, 'deliveriesCount >= 50');
code = code.replace(/maximum limit of 6 Client Deliveries/g, 'maximum limit of 50 Client Deliveries');
code = code.replace(/\{clientDeliveriesCount\} of 6 used/g, '{clientDeliveriesCount} of 50 used');

fs.writeFileSync('pages/Dashboard.tsx', code);
console.log("Patched limit successfully");
