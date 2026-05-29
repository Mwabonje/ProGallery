import fs from 'fs';
if (fs.existsSync('.env')) {
   console.log("ENV FILE CONTENTS:");
   console.log(fs.readFileSync('.env', 'utf-8'));
} else {
   console.log("No .env file found");
}
