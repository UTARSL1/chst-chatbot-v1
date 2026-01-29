import { queryDesignationStats } from './lib/tools/query-designation-stats';

const result = queryDesignationStats({ acronym: 'LKC FES' });

if (result && result.designationCounts) {
    console.log('\n=== LKC FES Designation Summary ===\n');
    console.log('Designation                 | Count');
    console.log('----------------------------|------');

    Object.entries(result.designationCounts).forEach(([designation, count]) => {
        const designationPadded = designation.padEnd(27);
        console.log(`${designationPadded} | ${count}`);
    });

    console.log('----------------------------|------');
    console.log(`${'TOTAL'.padEnd(27)} | ${result.totalStaff}`);
}

