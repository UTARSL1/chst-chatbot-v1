import fs from 'fs';
import path from 'path';

const JSON_PATH = path.join(process.cwd(), 'lkcfes-scopus-publications.json');

console.log('Fixing staff names in JSON file...');

// Read the JSON file
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

// Fix names in results
let fixedCount = 0;
data.results.forEach((staff: any) => {
    const originalName = staff.name;

    // Sanitize name: Remove non-breaking spaces, replacement characters, and other artifacts
    staff.name = staff.name
        .replace(/\u00A0/g, ' ')  // Non-breaking space
        .replace(/�/g, ' ')        // Replacement character
        .replace(/\uFFFD/g, ' ')   // Unicode replacement character
        .replace(/\s+/g, ' ')      // Multiple spaces to single space
        .trim();

    if (originalName !== staff.name) {
        console.log(`Fixed: "${originalName}" -> "${staff.name}"`);
        fixedCount++;
    }
});

// Write back to file
fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf-8');

console.log(`\n✅ Fixed ${fixedCount} staff names`);
console.log(`📄 Updated: ${JSON_PATH}`);
