
import { ensureJcrCacheLoaded, getJournalMetricsByTitle } from '../lib/jcrCache';

async function main() {
    console.log("Loading cache...");
    await ensureJcrCacheLoaded();
    console.log("Cache loaded.");

    // Test a known journal
    const metrics = getJournalMetricsByTitle('nature');
    console.log("Metrics for 'nature':", JSON.stringify(metrics, null, 2));

    if (metrics.length > 0) {
        console.log("SUCCESS: Data verification passed.");
    } else {
        console.error("FAILURE: No metrics found for 'nature' despite expected data.");
        process.exit(1);
    }
}

main().catch(e => {
    console.error("Verification failed:", e);
    process.exit(1);
});
