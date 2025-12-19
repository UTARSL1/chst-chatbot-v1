import { loadStaffDirectory } from './staff-directory';
import { searchStaffFromDirectory } from './search-from-directory';
import { getStaffCountsFromMetadata } from './get-staff-counts';

/**
 * Query staff directory (READ-ONLY, lookup table only)
 * This is the user-facing tool that only queries pre-synced data
 * No live web scraping - instant responses from lookup table
 */
export async function queryStaffDirectory(
    params: {
        acronym?: string;
        faculty?: string;
        department?: string;
        name?: string;
        expertise?: string;
        role?: string;
    },
    logger?: (msg: string) => void
): Promise<any> {
    const log = (msg: string) => {
        console.log(`[QueryStaffDirectory] ${msg}`);
        if (logger) logger(`[QueryStaffDirectory] ${msg}`);
    };

    log('Querying staff directory (lookup table only)...');

    // Load directory
    const directory = loadStaffDirectory();
    if (!directory) {
        log('ERROR: Staff directory not found. Please contact admin to sync staff data.');
        return {
            error: 'Staff directory not available. Please contact your administrator to sync the staff database.',
            suggestion: 'The staff directory needs to be synced by an administrator. Please ask them to use the Tool Management page to sync staff data.'
        };
    }

    // Check if query is just for counts (no name/expertise/role filters)
    const isCountOnlyQuery = !params.name && !params.expertise && !params.role;

    if (isCountOnlyQuery && params.acronym) {
        log('Using pre-calculated metadata for count query...');
        const counts = getStaffCountsFromMetadata({ acronym: params.acronym }, logger);

        if (counts) {
            const breakdown: string[] = [];
            if (counts.fullTimeCount > 0) breakdown.push(`${counts.fullTimeCount} full-time`);
            if (counts.adjunctCount > 0) breakdown.push(`${counts.adjunctCount} adjunct`);
            if (counts.partTimeCount > 0) breakdown.push(`${counts.partTimeCount} part-time`);
            if (counts.expatriateCount > 0) breakdown.push(`${counts.expatriateCount} expatriate`);
            if (counts.emeritusCount > 0) breakdown.push(`${counts.emeritusCount} emeritus`);

            const message = `There are ${counts.staffCount} staff members (${breakdown.join(', ')}).`;

            return {
                message,
                totalCount: counts.staffCount,
                fullTimeCount: counts.fullTimeCount,
                adjunctCount: counts.adjunctCount,
                partTimeCount: counts.partTimeCount,
                expatriateCount: counts.expatriateCount,
                emeritusCount: counts.emeritusCount,
                dataSource: 'lookup-table',
                lastSynced: directory.lastUpdated
            };
        }
    }

    // For detailed queries (name, expertise, role), search the lookup table
    log('Searching lookup table for detailed query...');
    const results = searchStaffFromDirectory(params, logger);

    if (results.length === 0) {
        return {
            message: 'No staff found matching your criteria.',
            totalCount: 0,
            dataSource: 'lookup-table',
            lastSynced: directory.lastUpdated
        };
    }

    // Count employment types
    const fullTimeCount = results.filter(s => s.staffType === 'full-time').length;
    const adjunctCount = results.filter(s => s.staffType === 'adjunct').length;
    const partTimeCount = results.filter(s => s.staffType === 'part-time').length;
    const expatriateCount = results.filter(s => s.staffType === 'expatriate').length;
    const emeritusCount = results.filter(s => s.staffType === 'emeritus').length;

    const breakdown: string[] = [];
    if (fullTimeCount > 0) breakdown.push(`${fullTimeCount} full-time`);
    if (adjunctCount > 0) breakdown.push(`${adjunctCount} adjunct`);
    if (partTimeCount > 0) breakdown.push(`${partTimeCount} part-time`);
    if (expatriateCount > 0) breakdown.push(`${expatriateCount} expatriate`);
    if (emeritusCount > 0) breakdown.push(`${emeritusCount} emeritus`);

    const message = `Found ${results.length} staff members (${breakdown.join(', ')}).`;

    return {
        message,
        staff: results.slice(0, 50), // Limit to 50 results for performance
        totalCount: results.length,
        fullTimeCount,
        adjunctCount,
        partTimeCount,
        expatriateCount,
        emeritusCount,
        dataSource: 'lookup-table',
        lastSynced: directory.lastUpdated,
        note: results.length > 50 ? 'Showing first 50 results. Please refine your search for more specific results.' : undefined
    };
}
