/**
 * Re-sync FCS by Department
 * 
 * Sync each FCS department individually to ensure all 33 staff are captured
 */

import { scrapeUnitStaff } from './staff-directory';
import fs from 'fs';
import path from 'path';

async function resyncFCSByDepartment() {
    console.log('='.repeat(60));
    console.log('🔄 Re-syncing FCS by Individual Departments');
    console.log('='.repeat(60));
    console.log('');

    const departments = [
        { code: 'DCS-KPR', id: '7389', name: 'Department of Chinese Studies (Kampar)' },
        { code: 'DCS-SL', id: '7390', name: 'Department of Chinese Studies (Sungai Long)' },
        { code: 'FGO-KPR-FCS', id: '7391', name: 'Faculty General Office (Kampar)' },
        { code: 'FGO-SL-FCS', id: '7392', name: 'Faculty General Office (Sungai Long)' }
    ];

    let totalStaff = 0;

    for (const dept of departments) {
        console.log(`\n📋 Syncing ${dept.name}...`);
        console.log(`   Department ID: ${dept.id}`);

        try {
            const staff = await scrapeUnitStaff(
                'FCS',
                dept.id,
                (msg: string) => console.log(`   ${msg}`)
            );

            console.log(`   ✅ Found ${staff.length} staff`);
            totalStaff += staff.length;

            // Show staff names
            staff.forEach((s, i) => {
                console.log(`      ${i + 1}. ${s.name} (${s.designation})`);
            });

        } catch (error) {
            console.error(`   ❌ Error syncing ${dept.code}:`, error);
        }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`✅ Total Staff Found: ${totalStaff}`);
    console.log(`📊 Expected: ~33 staff`);
    console.log('='.repeat(60));
    console.log('');
}

resyncFCSByDepartment();
