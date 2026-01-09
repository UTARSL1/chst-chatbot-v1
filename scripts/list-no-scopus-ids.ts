import fs from 'fs';

const data = JSON.parse(fs.readFileSync('lkcfes-inaccessible-scopus.json', 'utf-8'));

const staff = data.staff;

console.log(`Total staff without Scopus IDs: ${staff.length}`);
console.log('');
console.log('Staff names (semicolon-separated):');
console.log('');

const names = staff.map((s: any) => s.name);
console.log(names.join('; '));
