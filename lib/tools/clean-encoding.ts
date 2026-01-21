import fs from 'fs';
import path from 'path';

const staffDirPath = path.join(__dirname, 'staff_directory.json');

console.log('Loading staff directory...');
const rawData = fs.readFileSync(staffDirPath, 'utf-8');

console.log('Cleaning up encoding artifacts...');

// Remove non-breaking spaces (U+00A0) and other encoding artifacts
// The "Â" you see is actually a non-breaking space character (U+00A0)
let cleanedData = rawData
    .replace(/\u00A0/g, ' ') // Replace non-breaking space with regular space
    .replace(/\u00AD/g, '') // Remove soft hyphens
    .replace(/\u200B/g, '') // Remove zero-width spaces
    .replace(/\u2013/g, '-') // Replace en dash with hyphen
    .replace(/\u2014/g, '-') // Replace em dash with hyphen
    .replace(/\u2018/g, "'") // Replace left single quote
    .replace(/\u2019/g, "'") // Replace right single quote
    .replace(/\u201C/g, '"') // Replace left double quote
    .replace(/\u201D/g, '"'); // Replace right double quote

// Count how many replacements were made
const originalLength = rawData.length;
const cleanedLength = cleanedData.length;
const removedChars = originalLength - cleanedLength;

console.log(`Removed ${removedChars} encoding artifact characters`);

// Verify JSON is still valid
try {
    const parsed = JSON.parse(cleanedData);
    console.log('✓ JSON structure is valid after cleaning');

    // Count staff with cleaned names
    let cleanedCount = 0;
    for (const fac of Object.values(parsed.faculties)) {
        for (const dept of Object.values((fac as any).departments)) {
            for (const staff of (dept as any).staff) {
                if (staff.name !== staff.name) {
                    cleanedCount++;
                }
            }
        }
    }

    console.log(`Total staff records: ${parsed.metadata.uniqueStaffCount}`);
} catch (error) {
    console.error('ERROR: JSON is invalid after cleaning!');
    console.error(error);
    process.exit(1);
}

// Backup original file
const backupPath = path.join(__dirname, 'staff_directory_backup.json');
console.log(`Creating backup at: ${backupPath}`);
fs.writeFileSync(backupPath, rawData, 'utf-8');

// Save cleaned file
console.log('Saving cleaned staff directory...');
fs.writeFileSync(staffDirPath, cleanedData, 'utf-8');

console.log('✓ Successfully cleaned staff directory!');
console.log('\nTo verify, check staff names:');
console.log('  $json = Get-Content "lib\\tools\\staff_directory.json" -Raw | ConvertFrom-Json');
console.log('  $json.faculties."LKC FES".designationLists.Professor | Select-Object name');
