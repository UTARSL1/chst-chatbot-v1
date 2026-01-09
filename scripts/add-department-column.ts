/**
 * Add Department Column to CSV
 * Reads the current CSV and adds department as 4th column
 */

import fs from 'fs';

function addDepartmentColumn(): void {
    console.log('Adding department column to CSV...');
    console.log();

    // Load publication data to get department info
    const publicationData = JSON.parse(fs.readFileSync('lkcfes-scopus-publications.json', 'utf-8'));

    // Create email-to-department mapping
    const emailToDept = new Map<string, string>();
    for (const staff of publicationData.results) {
        if (staff.email) {
            emailToDept.set(staff.email, staff.departmentAcronym || staff.department || '');
        }
    }

    // Read current CSV
    const csvContent = fs.readFileSync('lkcfes-234-staff-final.csv', 'utf-8');
    const lines = csvContent.split('\n');

    // Process CSV
    const newLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) {
            newLines.push('');
            continue;
        }

        if (i === 0) {
            // Header row
            newLines.push('Name,Email,Scopus ID,Department');
            continue;
        }

        // Parse CSV line (handle quoted fields)
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current);

        // Extract email (2nd column)
        const email = parts[1] || '';

        // Get department
        const dept = emailToDept.get(email) || 'NA';

        // Add department as 4th column
        newLines.push(`${line},${dept}`);
    }

    // Save updated CSV
    const newCsv = newLines.join('\n');
    fs.writeFileSync('lkcfes-234-staff-final.csv', newCsv, 'utf-8');

    console.log('✅ Department column added!');
    console.log();
    console.log('Sample (first 5 rows):');
    const sample = newLines.slice(0, 6);
    sample.forEach((line, idx) => {
        if (idx === 0) {
            console.log(line);
            console.log('-'.repeat(100));
        } else if (line) {
            console.log(line);
        }
    });
}

if (require.main === module) {
    addDepartmentColumn();
}

export { addDepartmentColumn };
