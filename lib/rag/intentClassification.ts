/**
 * Intent Classification for Query Routing
 * 
 * Classifies user queries to determine whether they are:
 * - "data": Requesting specific data, rankings, comparisons (should use tools)
 * - "explanation": Requesting explanations, definitions (should use RAG)
 * - "general": Unclear or mixed intent (use both)
 * 
 * Uses regex patterns for fast classification without extra LLM calls.
 */

export type QueryIntent = 'data' | 'explanation' | 'general';

export interface IntentClassificationResult {
    intent: QueryIntent;
    confidence: 'high' | 'medium' | 'low';
    matchedPatterns: string[];
    reasoning: string;
}

/**
 * Classify query intent using regex patterns
 * Fast, no LLM call needed
 */
export function classifyQueryIntent(query: string): IntentClassificationResult {
    const queryLower = query.toLowerCase().trim();
    const matchedPatterns: string[] = [];

    // ========================================
    // DATA QUERY PATTERNS (High Confidence)
    // ========================================

    // Pattern 1: Explicit ranking/listing queries
    const rankingPatterns = [
        /\btop\s+\d+/i,                    // "top 5", "top 10"
        /\brank(ing|ed)?\b/i,              // "ranking", "ranked"
        /\blist\s+(all|the)/i,             // "list all", "list the"
        /\bshow\s+me\s+(all|the|top)/i,   // "show me all", "show me top"
    ];

    for (const pattern of rankingPatterns) {
        if (pattern.test(queryLower)) {
            matchedPatterns.push(`ranking: ${pattern.source}`);
        }
    }

    // Pattern 2: Comparison queries
    const comparisonPatterns = [
        /\bcompare\b/i,                    // "compare"
        /\b(vs|versus)\b/i,                // "vs", "versus"
        /\bdifference\s+between\b/i,       // "difference between"
        /\bwhich\s+is\s+(better|higher)/i, // "which is better"
    ];

    for (const pattern of comparisonPatterns) {
        if (pattern.test(queryLower)) {
            matchedPatterns.push(`comparison: ${pattern.source}`);
        }
    }

    // Pattern 3: Interrogative data queries
    const interrogativeDataPatterns = [
        /\bwhich\s+.*\s+(are|is)\s+(in|the)/i,  // "which universities are in"
        /\bhow\s+many\b/i,                       // "how many"
        /\bwho\s+is\s+the\s+(dean|head|chair)/i, // "who is the dean"
        /\bwhat\s+is\s+.*\s+(ranking|position|score)/i, // "what is Harvard's ranking"
    ];

    for (const pattern of interrogativeDataPatterns) {
        if (pattern.test(queryLower)) {
            matchedPatterns.push(`interrogative-data: ${pattern.source}`);
        }
    }

    // ========================================
    // EXPLANATION QUERY PATTERNS (High Confidence)
    // ========================================

    const explanationPatterns = [
        /\bwhat\s+is\s+(the\s+)?(definition|meaning)\b/i,  // "what is the definition"
        /\bwhat\s+(is|are)\s+(?!.*\s+(ranking|position))/i, // "what is X" (but not "what is X's ranking")
        /\bhow\s+does\b/i,                                   // "how does"
        /\bwhy\s+(is|are|does|do)\b/i,                      // "why is", "why does"
        /\bexplain\b/i,                                      // "explain"
        /\btell\s+me\s+about\b/i,                           // "tell me about"
        /\b(can|could)\s+you\s+(explain|describe)\b/i,      // "can you explain"
    ];

    for (const pattern of explanationPatterns) {
        if (pattern.test(queryLower)) {
            matchedPatterns.push(`explanation: ${pattern.source}`);
        }
    }

    // ========================================
    // CLASSIFICATION LOGIC
    // ========================================

    // Count pattern matches by type
    const dataMatches = matchedPatterns.filter(p =>
        p.startsWith('ranking:') || p.startsWith('comparison:') || p.startsWith('interrogative-data:')
    ).length;

    const explanationMatches = matchedPatterns.filter(p =>
        p.startsWith('explanation:')
    ).length;

    // Decision logic
    if (dataMatches > 0 && explanationMatches === 0) {
        return {
            intent: 'data',
            confidence: 'high',
            matchedPatterns,
            reasoning: `Matched ${dataMatches} data pattern(s), no explanation patterns`
        };
    }

    if (explanationMatches > 0 && dataMatches === 0) {
        return {
            intent: 'explanation',
            confidence: 'high',
            matchedPatterns,
            reasoning: `Matched ${explanationMatches} explanation pattern(s), no data patterns`
        };
    }

    if (dataMatches > 0 && explanationMatches > 0) {
        // Mixed signals - use general
        return {
            intent: 'general',
            confidence: 'medium',
            matchedPatterns,
            reasoning: `Mixed signals: ${dataMatches} data + ${explanationMatches} explanation patterns`
        };
    }

    // No clear patterns matched
    return {
        intent: 'general',
        confidence: 'low',
        matchedPatterns: [],
        reasoning: 'No clear patterns matched, defaulting to general'
    };
}

/**
 * Determine if knowledge notes should be suppressed based on intent and available tools
 */
export function shouldSuppressKnowledgeNotes(
    intent: QueryIntent,
    confidence: 'high' | 'medium' | 'low',
    availableTools: string[]
): { suppress: boolean; reason: string } {
    // Only suppress for high-confidence data queries with relevant tools
    if (intent === 'data' && confidence === 'high') {
        // Check if we have tools that can answer data queries
        const hasDataTools = availableTools.some(tool =>
            tool === 'nature_index_lookup' ||
            tool === 'jcr_journal_metric' ||
            tool === 'utar_staff_search'
        );

        if (hasDataTools) {
            return {
                suppress: true,
                reason: 'High-confidence data query with relevant tools available'
            };
        }
    }

    return {
        suppress: false,
        reason: intent === 'data'
            ? 'Data query but no relevant tools available'
            : `Intent: ${intent}, confidence: ${confidence}`
    };
}
