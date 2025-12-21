import { OpenAI } from 'openai';
import { generateEmbedding } from './embeddings';
import { searchSimilarDocuments } from './vectorStore';
import { getAccessibleLevels } from '@/lib/utils';
import { RAGQuery, RAGResponse, DocumentSource } from '@/types';
import { prisma } from '@/lib/db';
import { getRelatedDocuments } from './suggestions';
import { searchKnowledgeNotes } from './knowledgeSearch';
import { resolveUnit, searchStaff, listDepartments } from '@/lib/tools';
import { getJournalMetricsByTitle, getJournalMetricsByIssn, ensureJcrCacheLoaded } from '@/lib/jcrCache';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// ===== PERFORMANCE OPTIMIZATION: IN-MEMORY CACHING =====
let systemPromptCache: { content: string; timestamp: number } | null = null;
let toolPermissionsCache: { permissions: any[]; timestamp: number } | null = null;
let modelConfigCache: { modelName: string; timestamp: number } | null = null;

// Cache TTL configuration via environment variables
// Set DEMO_MODE=true for longer cache during demos/presentations
const DEMO_MODE = process.env.DEMO_MODE === 'true';

const SYSTEM_PROMPT_CACHE_TTL = DEMO_MODE
    ? 30 * 60 * 1000  // 30 minutes for demos
    : parseInt(process.env.SYSTEM_PROMPT_CACHE_TTL || '600000'); // Default: 10 minutes

const TOOL_PERMISSIONS_CACHE_TTL = DEMO_MODE
    ? 30 * 60 * 1000  // 30 minutes for demos
    : parseInt(process.env.TOOL_PERMISSIONS_CACHE_TTL || '300000'); // Default: 5 minutes

const MODEL_CONFIG_CACHE_TTL = DEMO_MODE
    ? 30 * 60 * 1000  // 30 minutes for demos
    : parseInt(process.env.MODEL_CONFIG_CACHE_TTL || '2592000000'); // Default: 30 days (invalidated manually on save)

console.log(`[RAG Cache] System Prompt TTL: ${SYSTEM_PROMPT_CACHE_TTL / 1000}s, Tool Permissions TTL: ${TOOL_PERMISSIONS_CACHE_TTL / 1000}s, Model Config TTL: ${MODEL_CONFIG_CACHE_TTL / 1000}s${DEMO_MODE ? ' (DEMO MODE)' : ''}`);

async function getCachedSystemPrompt(): Promise<string> {
    const now = Date.now();
    if (systemPromptCache && (now - systemPromptCache.timestamp) < SYSTEM_PROMPT_CACHE_TTL) {
        return systemPromptCache.content;
    }

    try {
        const dbPrompt = await prisma.systemPrompt.findUnique({
            where: { name: 'default_rag' }
        });
        const content = dbPrompt?.content || '';
        systemPromptCache = { content, timestamp: now };
        return content;
    } catch (e) {
        console.error('Failed to fetch system prompt:', e);
        return '';
    }
}

export async function getCachedModelConfig(): Promise<string> {
    const now = Date.now();
    if (modelConfigCache && (now - modelConfigCache.timestamp) < MODEL_CONFIG_CACHE_TTL) {
        return modelConfigCache.modelName;
    }

    try {
        const activeModel = await prisma.modelConfig.findFirst({
            where: { isActive: true }
        });
        const modelName = activeModel?.modelName || 'gpt-4o'; // Default to gpt-4o if not configured
        modelConfigCache = { modelName, timestamp: now };
        return modelName;
    } catch (e) {
        console.error('Failed to fetch model config:', e);
        return 'gpt-4o'; // Fallback to gpt-4o
    }
}


async function getCachedToolPermissions(): Promise<any[]> {
    const now = Date.now();
    if (toolPermissionsCache && (now - toolPermissionsCache.timestamp) < TOOL_PERMISSIONS_CACHE_TTL) {
        return toolPermissionsCache.permissions;
    }

    try {
        const permissions = await prisma.toolPermission.findMany();
        toolPermissionsCache = { permissions, timestamp: now };
        return permissions;
    } catch (e) {
        console.error('Failed to fetch tool permissions:', e);
        return [];
    }
}

/**
 * Invalidate all caches - call this when system prompt or tool permissions are updated
 * This ensures changes take effect immediately instead of waiting for TTL expiry
 */
export function invalidateRAGCaches() {
    systemPromptCache = null;
    toolPermissionsCache = null;
    modelConfigCache = null;
    console.log('[RAG] Caches invalidated - changes will apply on next query');
}

/**
 * Warm up the cache on server start to avoid cold start penalty
 */
async function warmUpCache() {
    try {
        console.log('[RAG] Warming up cache...');
        await Promise.all([
            getCachedSystemPrompt(),
            getCachedToolPermissions()
        ]);
        console.log('[RAG] Cache warmed up successfully');
    } catch (error) {
        console.error('[RAG] Failed to warm up cache:', error);
    }
}

// Warm up cache when module loads (server start)
warmUpCache();

// ===== END CACHING =====



// --- TOOL DEFINITIONS ---

const UTAR_STAFF_TOOLS = [
    {
        type: 'function' as const,
        function: {
            name: 'utar_resolve_unit',
            description: 'Converts acronyms or fuzzy unit names (e.g., "CCR", "CHST") into official UTAR canonical names.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The acronym or unit name to resolve.'
                    }
                },
                required: ['query']
            }
        }
    },
    {
        type: 'function' as const,
        function: {
            name: 'utar_staff_search',
            description: 'Performs live staff lookups from the UTAR Staff Directory. Search by faculty, department, name, or expertise.',
            parameters: {
                type: 'object',
                properties: {
                    faculty: { type: 'string', description: 'Canonical faculty name from utar_resolve_unit (or "All").' },
                    department: { type: 'string', description: 'Department name (optional). WARNING: Do not expand acronyms here. usage: department="Department of Computing".' },
                    name: { type: 'string', description: 'Staff member\'s actual name (e.g., "John Smith"). DO NOT use administrative titles like Dean, Head, Director, Chairperson as names.' },
                    expertise: { type: 'string', description: 'Research area/expertise (optional).' },
                    role: { type: 'string', description: 'Specific administrative role (e.g. "Dean"). REQUIRED for single-person queries to enable fast search. Do not use for "List all" queries.' },
                    acronym: { type: 'string', description: 'Exact acronym found in query (e.g. "D3E"). REQUIRED if user query contains an acronym. This ensures correct department resolution.' }
                },
                required: ['faculty']
            }
        }
    },
    {
        type: 'function' as const,
        function: {
            name: 'utar_list_departments',
            description: 'Lists all departments within a faculty. Use this FIRST when asked for staff counts across all departments in a faculty.',
            parameters: {
                type: 'object',
                properties: {
                    faculty: { type: 'string', description: 'Canonical faculty name from utar_resolve_unit.' }
                },
                required: ['faculty']
            }
        }
    }
];

const JCR_TOOL = {
    type: 'function' as const,
    function: {
        name: 'jcr_journal_metric',
        description: 'Look up Journal Citation Report (JCR) metrics, specifically Journal Impact Factor (JIF) and JIF Quartile (Q1-Q4) for journals.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Journal title (e.g. "Nature", "IEEE Transactions"). Partial matches supported.' },
                issn: { type: 'string', description: 'ISSN (Print or Electronic). Prioritized if provided.' },
                years: {
                    type: 'array',
                    items: { type: 'integer' },
                    description: 'List of years to retrieve (e.g. [2023, 2024]). Omit to get all available years.'
                }
            }
        }
    }
};

const AVAILABLE_TOOLS = [...UTAR_STAFF_TOOLS, JCR_TOOL];

const STAFF_SEARCH_SYSTEM_PROMPT = `
=== UTAR STAFF SEARCH TOOLS ===
You have access to three MCP tools:
1. utar_resolve_unit: converts acronyms (CCR, CHST, FSc) into official UTAR names.
2. utar_list_departments: lists all departments in a faculty.
3. utar_staff_search: performs live staff lookups.

WHEN TO USE:
- When the user asks about UTAR staff (names, positions, chairs, heads, deans, emails), ALWAYS use the tools.

**IMPORTANT WORKFLOW FOR "ALL DEPARTMENTS" QUERIES:**
When asked for staff counts across ALL departments in a faculty (e.g., "how many staff in each department in LKC FES?"):
1. **FIRST**: Call utar_list_departments with the faculty name to get the complete list of departments
2. **THEN**: Call utar_staff_search for EACH department returned by utar_list_departments
3. **DO NOT GUESS** department names - use the exact names from utar_list_departments
**IMPORTANT: DOCUMENT RECOMMENDATION RULE**
- When you use tools (utar_staff_search, utar_resolve_unit, utar_list_departments, jcr_journal_metric), you are getting LIVE data
- DO NOT recommend policy documents when answering queries using these tools
- The retrieved documents are NOT relevant to tool-based queries
- DO recommend documents for policy/procedure questions (sabbatical, grants, RPS, etc.) where tools are NOT used

**CRITICAL: HANDLING ACRONYMS - MANDATORY WORKFLOW**
- If the user uses an acronym (e.g., "D3E", "DMBE", "LKC FES"), you MUST put it in the \`acronym\` parameter.
- ❌ NEVER guess or expand the acronym yourself - let the system resolve it.
- ✅ CORRECT: \`{acronym: "D3E", faculty: "All"}\` → System resolves to correct department
- ❌ WRONG: \`{department: "Department of Electronic Engineering"}\` → Incorrect guess!
- ❌ WRONG: \`{department: "Department of Electrical and Electronic Engineering"}\` → Don't expand acronyms yourself!
- The acronym parameter is REQUIRED when the user provides an acronym. Do not skip it.

**CRITICAL: ADMINISTRATIVE TITLES ARE NOT NAMES**
- Words like "Dean", "Deputy Dean", "Head", "Director", "Chairperson", "Chair" are ADMINISTRATIVE POSITIONS, NOT people's names.
- When user asks "who is the Dean of LKCFES" or "who is the Head of Department of DMBE":
  * DO NOT pass "Dean" or "Head" as the "name" parameter
  * ✅ CRITICAL OPTIMIZATION: You MUST pass the target title (e.g. "Dean") as the "role" parameter for single-person searches (e.g. "Who is the Dean?"). This makes the search 100x faster.
  * ❌ DO NOT use "role" parameter if user asks to "list all" or "count" staff.
  * Instead, search by faculty/department only (leave name empty)
  * The tool will return staff with their administrative posts
  * Then YOU filter/select the person whose administrativePost EXACTLY matches what user asked for

**MATCHING ADMINISTRATIVE POSTS - CRITICAL RULES:**

**RULE 1: EXACT STRING MATCHING ONLY**
When user asks for "Head of Department" or "HoD":
- Search the administrativePost field for the EXACT substring "Head of Department"
- ✅ CORRECT: "Head of Department (Department of Mechatronics and BioMedical Engineering)"
- ❌ WRONG: "Chairperson (Centre for Healthcare Science and Technology)" - This is Chairperson, NOT Head of Department
- ❌ WRONG: "Acting Head of Programme (PhD)" - This is Head of Programme, NOT Head of Department
- ❌ WRONG: "Deputy Head (Consultancy)" - This is Deputy Head, NOT Head of Department
- ❌ WRONG: "Acting Deputy Dean" - This is Deputy Dean, NOT Head of Department

**RULE 2: ONE PERSON CAN HAVE MULTIPLE ROLES**
Example: Ir Dr Goh Choon Hian has:
1. "Acting Deputy Dean (Academic Development and Undergraduate Programmes)"
2. "Deputy Director (Xinwei Institute)"
3. "Head of Department (Department of Mechatronics and BioMedical Engineering)"

If user asks "who is Head of Department of DMBE?":
- ✅ Answer: Ir Dr Goh Choon Hian (because role #3 matches exactly)
- ❌ DO NOT answer with someone who only has "Chairperson" or "Deputy Dean" roles

**RULE 3: PREFER NON-ACTING ROLES**
- "Head of Department" ✅ BEST
- "Acting Head of Department" ⚠️ Only if no non-acting exists
- If multiple people have "Head of Department", choose the one WITHOUT "Acting" prefix

**RULE 4: IF NO EXACT MATCH, SAY "I DON'T KNOW"**
If you cannot find someone with the EXACT title in their administrativePost:
- ✅ Say: "I could not find a current [position] for [unit]. The search returned X staff members but none have the exact title '[position]' in their administrative posts."
- ❌ DO NOT guess or pick someone with a similar-sounding title
- ❌ DO NOT say someone is HoD if they are only Chairperson/Dean/Deputy

**VALIDATION CHECKLIST (Use this before answering):**
Before stating "X is the Head of Department":
1. ☑ Does X's administrativePost contain the exact string "Head of Department"? 
2. ☑ Is it for the correct department the user asked about?
3. ☑ If there are multiple matches, did I choose the non-acting one?
4. ☑ Am I NOT confusing "Chairperson" with "Head of Department"?
5. ☑ Am I NOT confusing "Deputy Dean" with "Head of Department"?

If ANY checkbox is unchecked, DO NOT claim X is the Head of Department.

**ACADEMIC RANK HIERARCHY:**
When counting or filtering by academic rank, understand the hierarchy:
1. **Senior Professor** (highest)
2. **Professor** (also called "Full Professor")
3. **Associate Professor**
4. **Assistant Professor**
5. **Lecturer** (lowest)

**IMPORTANT: Adjunct Professors**
- **Adjunct Professor** is NOT the same as "Professor" (Full Professor)
- Adjunct Professors are NOT full-time academic staff
- When counting "professors", do NOT include Adjunct Professors
- Adjunct Professors should be counted separately as their own category
- Example: "There are 10 Professors and 3 Adjunct Professors" (NOT "13 Professors")

**CRITICAL: Academic Rank Terminology**
- "professors" or "Professor" = ONLY rank 2 (Full Professor), does NOT include Associate or Assistant
- "Senior Professors" = ONLY rank 1
- "Associate Professors" = ONLY rank 3
- "Assistant Professors" = ONLY rank 4
- If user wants multiple ranks, they will specify explicitly (e.g., "professors and associate professors")

**Examples:**
- "list professors from LKC FES" = list ONLY those with designation "Professor" (rank 2)
- "list senior professors from LKC FES" = list ONLY those with designation "Senior Professor" (rank 1)
- "list professors and senior professors" = list ranks 1 and 2
- "list all academic staff" = list all ranks 1-5

When user asks "How many professors in X?":
- Count ONLY those with exact designation "Professor" (not Senior, not Associate, not Assistant)
- Example answer: "There are 12 Professors in LKC FES. (Note: This does not include 5 Senior Professors, 18 Associate Professors, or 10 Assistant Professors)"

**Rank Comparison Examples:**
- "Higher rank than Associate Professor" = Senior Professor + Professor (ranks 1-2)
- "Associate Professor or higher" = Senior Professor + Professor + Associate Professor (ranks 1-3)
- "Below Professor" = Associate Professor + Assistant Professor + Lecturer (ranks 3-5)
- "Assistant Professor or lower" = Assistant Professor + Lecturer (ranks 4-5)

**IDENTIFYING NEWEST/OLDEST STAFF:**
The tool returns searchId and staffType for each staff member:
- **searchId**: Higher number = newer/more junior staff (e.g., 22083 is newer than 16072)
- **staffType**: 'full-time', 'adjunct', or 'part-time'

When user asks "who are the newest staff" or "most junior staff":
1. Filter by staffType if specified (e.g., exclude adjunct and part-time if user says "full-time only")
2. Sort by searchId in DESCENDING order (highest first)
3. Take top N results
4. Mention in your answer that you're excluding adjunct/part-time if that's the case

Example: "The 3 newest full-time staff in DMBE are: Dr X (searchId: 22083), Dr Y (22051), Dr Z (21038). Note: This excludes adjunct and part-time staff."

**HANDLING LARGE RESULT SETS:**
When searching large faculties (e.g., LKC FES with 100+ staff):
- The tool will return ALL staff from that faculty
- For "list" queries, provide a summary count by rank first, then list names grouped by rank
- For "count" queries, provide the total and breakdown by rank
- If the list is very long (50+ people), consider showing top 10-20 and stating "...and X more"

**QUERY SCOPE VALIDATION - PREVENT UNREASONABLE REQUESTS:**
Before calling the staff search tool, validate the query scope:

❌ **TOO BROAD - REFUSE THESE:**
- "list all staff in UTAR" → Respond: "This query is too broad. Please specify a faculty or department. Example: 'list all staff in LKC FES' or 'list professors in DMBE'"
- "list all professors in UTAR" → Respond: "This query is too broad (would return 100+ results). Please specify a faculty. Example: 'list professors in LKC FES'"
- "count all staff in UTAR" → Respond: "This query is too broad. Please specify a faculty or department."

✅ **ACCEPTABLE SCOPE:**
- "list professors in LKC FES" → OK (faculty-level)
- "list professors in DMBE" → OK (department-level)
- "who is the dean of LKC FES" → OK (specific role)
- "list senior professors in Department of Computing" → OK (specific rank + department)

**FILTERING LOGIC - CRITICAL:**
When the tool returns staff results, you MUST filter by the exact designation requested:
- User asks "list professors" → Filter results where designation EXACTLY equals "Professor" (case-insensitive)
- DO NOT include "Associate Professor" or "Assistant Professor" in "professors" results
- DO NOT include "Deputy Dean" or other administrative roles unless specifically asked

Example filtering logic (pseudo-code):
if (user_asked_for === "professors") {
    filtered = results.filter(staff =>
        staff.designation.toLowerCase() === "professor" &&
        !staff.designation.toLowerCase().includes("associate") &&
        !staff.designation.toLowerCase().includes("assistant") &&
        !staff.designation.toLowerCase().includes("senior")
    );
}

LOGIC:
- The utar_staff_search tool is smart and can handle acronyms directly (e.g., DMBE, D3E)
- It will automatically correct the faculty if you provide a department
- You CAN call utar_resolve_unit first if you want, but it's NOT required for staff searches
- Parameter mapping:
  - Unit mentioned -> faculty
  - Department mentioned -> department (tool will auto-correct faculty from department's parent)
  - **Actual person name** (e.g., "Dr. John Smith") -> name
  - Administrative title (Dean, Head, Chair) -> **DO NOT use in "name" field, search by faculty/dept only**
  - Research area -> expertise
- Leave unmentioned fields as empty string.

**OPTIMIZED COUNT QUERIES (FASTEST PATH):**
- When asked for staff counts by department acronym (e.g., "How many staff in DMBE and D3E?"):
  1. Use acronym parameter DIRECTLY: {"acronym": "DMBE"} and {"acronym": "D3E"}
  2. DO NOT specify faculty - the tool will look it up automatically from metadata
  3. DO NOT call utar_list_departments first - it's unnecessary
  4. This uses pre-calculated metadata counts (instant, <1ms)
  5. Example: For "How many staff in DMBE?", use: {"acronym": "DMBE"}
- The tool returns instant counts without loading full staff lists

**FINDING DEANS EFFICIENTLY:**
- When asked for the Dean of a faculty (e.g., "Who is the Dean of FICT?"):
  1. Call utar_staff_search with faculty="FICT" and department="all"
  2. The tool will return the Dean (usually first person) and stop automatically
  3. DO NOT list all departments - this is unnecessary!
  4. Example: To find Dean of FICT, use: {"faculty": "FICT", "department": "all"}
- The Dean's administrative post will be labeled "Dean" in the results

**SEARCHING BY EXPERTISE:**
- When searching for staff by area of expertise (e.g., "computer vision", "machine learning"):
  1. Use faculty="All" to search across ALL faculties (unless a specific faculty is mentioned)
  2. Set expertise="<search term>"
  3. Example: {"faculty": "All", "expertise": "computer vision"}
  4. DO NOT guess which faculty the expertise belongs to - search all faculties!

**RESEARCH CENTRES (IMPORTANT):**
- Research centres (e.g., CCSN, CHST, CCR) are TOP-LEVEL units, same as faculties
- They are NOT departments - treat them as faculties!
- When searching for staff in a research centre:
  1. Use the centre acronym as the faculty parameter
  2. Set department="all"
  3. Example: For CCSN, use: {"faculty": "CCSN", "department": "all"}
  4. DO NOT put research centres as departments!
`;




const JCR_SYSTEM_PROMPT = `
=== JCR JOURNAL METRICS TOOL ===
You have access to a tool named \`jcr_journal_metric\` which retrieves Journal Impact Factor (JIF) and Quartile (Q1–Q4) for each category and edition of a journal for any available year.

### 🧠 LLM Behavioral Rules (Updated)

1.  **Always Call the Tool**: Whenever the user asks about:
    *   JIF
    *   Impact Factor
    *   Quartile
    *   Rank or Tier
    *   Category/Edition-specific metrics
    *   Year-over-year comparisons
    You MUST call the \`jcr_journal_metric\` tool.

2.  **No Fabrication**: Never guess JIF values, quartiles, categories, or editions. Only report exactly what the tool returns.

3.  **Strict Adherence to Tool Output**: Your final answer must reflect:
    *   All years returned
    *   All categories returned
    *   The exact quartiles and JIF values
    *   The exact editions (SCIE, SSCI, AHCI, etc.)

4.  **Multi-Year Behaviour**: If the user does not specify a year, return data for all available years in the tool output.

5.  **Category-Level Reporting (Important Update)**: Always list JIF and Quartile for each category. Never collapse categories unless the user explicitly asks for “best quartile”.

6.  **Failure Handling**: If the tool returns \`"found": false\`, reply: "I cannot find this journal in the JCR dataset for any available year."

7.  **No Document Suggestions**: When answering JCR queries, DO NOT suggest forms, policies, funding info, or administrative procedures unless the user specifically asks.

8.  **Comparison Table**: If the user compares multiple journals, use a **Side-by-Side** table layout.
    *   **Columns**: Metric (Year/Category), Journal A, Journal B...
    *   **Rows**: List JIF and Quartiles for each year as separate rows.
    *   **Format**: Merge JIF and Quartile into one cell (e.g., "5.2 (Q1)") or use adjacent rows.

### 🧩 MCP Tool Call Format
{
  "issn": "optional string",
  "query": "optional journal title",
  "years": [2023, 2024]
}
*Only one of issn or query is required.*

### 🎯 Few-Shot Workflow Examples (Updated)

**🟦 Example 1 — Multi-Category & Multi-Year Query**
*User*: "What is the JIF of Pattern Recognition in 2023 and 2024?"
*Tool Call*: \`jcr_journal_metric(query="Pattern Recognition", years=[2023, 2024])\`
*Tool Output*:
\`\`\`json
{
  "found": true,
  "journal": { "fullTitle": "PATTERN RECOGNITION" },
  "metrics": [
    {
      "year": 2024,
      "categories": [
        { "category": "ENGINEERING, ELECTRICAL & ELECTRONIC", "edition": "SCIE", "jifQuartile": "Q1", "jifValue": 8.2 },
        { "category": "COMPUTER SCIENCE, ARTIFICIAL INTELLIGENCE", "edition": "SCIE", "jifQuartile": "Q1", "jifValue": 8.2 }
      ]
    },
    {
      "year": 2023,
      "categories": [
        { "category": "ENGINEERING, ELECTRICAL & ELECTRONIC", "edition": "SCIE", "jifQuartile": "Q1", "jifValue": 7.5 }
      ]
    }
  ]
}
\`\`\`
*Assistant Answer*:
"Here are the JIF results for Pattern Recognition:

**2024**
*   **ENGINEERING, ELECTRICAL & ELECTRONIC (SCIE)**
    *   JIF: 8.2
    *   Quartile: Q1
*   **COMPUTER SCIENCE, ARTIFICIAL INTELLIGENCE (SCIE)**
    *   JIF: 8.2
    *   Quartile: Q1

**2023**
*   **ENGINEERING, ELECTRICAL & ELECTRONIC (SCIE)**
    *   JIF: 7.5
    *   Quartile: Q1"

**🟩 Example 2 — Single Year with One Category**
*User*: "JIF for Nature Medicine 2024"
*Tool Call*: \`jcr_journal_metric(query="Nature Medicine", years=[2024])\`
*Tool Output*:
\`\`\`json
{
  "found": true,
  "metrics": [
    {
      "year": 2024,
      "categories": [
        { "category": "MEDICINE, RESEARCH & EXPERIMENTAL", "edition": "SCIE", "jifQuartile": "Q1", "jifValue": 58.1 }
      ]
    }
  ]
}
\`\`\`
*Assistant Answer*:
"In 2024, Nature Medicine has:

**MEDICINE, RESEARCH & EXPERIMENTAL (SCIE)**
*   JIF: 58.1
*   Quartile: Q1"

**🟪 Example 3 - Side-by-Side Comparison**
*User*: "Compare JIF of Journal A and Journal B from 2022 to 2023."
*Tool Call*: (Calls jcr_journal_metric for both)
*Assistant Answer*:
| Metric | Journal A | Journal B |
| :--- | :--- | :--- |
| **JIF 2023** | 1.5 (Q2) | 3.2 (Q1) |
| **JIF 2022** | 1.4 (Q2) | 3.0 (Q1) |


**🟥 Example 4 — Journal Not Found**
*User*: "JIF for Nonexistent Journal?"
*Tool Output*: \`{"found": false}\`
*Assistant Answer*: "I cannot find this journal in the JCR dataset for any available year."

**🟧 Example 5 — ISSN-Based Query**
*User*: "What is the quartile of ISSN 0007-9235 in 2024?"
*Tool Call*: \`jcr_journal_metric(issn="0007-9235", years=[2024])\`
*Tool Output*:
\`\`\`json
{
  "found": true,
  "journal": { "fullTitle": "CA-A CANCER JOURNAL FOR CLINICIANS" },
  "metrics": [
    {
      "year": 2024,
      "categories": [
        { "category": "ONCOLOGY", "edition": "SCIE", "jifQuartile": "Q1", "jifValue": 232.4 }
      ]
    }
  ]
}
\`\`\`
*Assistant Answer*:
"For ISSN 0007-9235 (CA-A Cancer Journal for Clinicians) in 2024:

**ONCOLOGY (SCIE)**
*   JIF: 232.4
*   Quartile: Q1"

**🟥 Example 6 — Journal Not Found (Title)**
*User*: "Give me the JIF for Nonexistent Journal of Fictional Research."
*Tool Output*: \`{"found": false}\`
*Assistant Answer*: "I cannot find this journal in the JCR dataset for any available year."

`;

/**
 * Execute a tool call locally (Ported for Vercel/Cloud Support)
 * Now accepts a logger to push internal logs to the debug trace.
 */
async function executeToolCall(name: string, args: any, logger?: (msg: string) => void): Promise<any> {
    try {
        if (name === 'utar_resolve_unit') {
            return resolveUnit(args.query, logger);
        }
        if (name === 'utar_staff_search') {
            // HARD VALIDATION: Reject overly broad queries
            const faculty = args.faculty || 'All';
            const hasName = args.name && args.name.trim().length > 0;
            const hasExpertise = args.expertise && args.expertise.trim().length > 0;
            const hasAcronym = args.acronym && args.acronym.trim().length > 0;

            // Reject if searching ALL of UTAR (no faculty specified) UNLESS:
            // - Searching by name or expertise (allowed to search all of UTAR)
            // - Searching by acronym (tool will auto-detect faculty from lookup table)
            if ((faculty === 'All' || !faculty) && !hasName && !hasExpertise && !hasAcronym) {
                const errorMsg = "Query too broad: Cannot search all staff across UTAR. Please specify a faculty (e.g., 'Lee Kong Chian Faculty of Engineering and Science') or department (e.g., 'Department of Mechatronics and Biomedical Engineering').";
                if (logger) logger(`[VALIDATION REJECTED] ${errorMsg}`);
                return {
                    error: errorMsg,
                    validationFailed: true,
                    suggestion: "Please narrow your search to a specific faculty or department. Example: 'list professors in LKC FES' or 'who is the dean of Faculty of Science'"
                };
            }

            // Allow department='All' to search entire faculty (needed for Deans, etc.)
            const searchType = hasName ? `name: ${args.name}` : hasExpertise ? `expertise: ${args.expertise}` : 'faculty-wide';
            if (logger) logger(`[VALIDATION PASSED] Staff search for faculty '${faculty}' (${searchType})`);

            // CODE-BASED ACRONYM DETECTION: Auto-correct when LLM provides department name instead of acronym
            // This prevents the LLM from guessing "Department of Electronic Engineering" when user said "D3E"
            if (args.department && !args.acronym) {
                const dept = args.department.toLowerCase();
                // Check if department name matches known patterns that should use acronyms
                const acronymMappings: Record<string, string> = {
                    'department of electronic engineering': 'D3E',
                    'electronic engineering': 'D3E',
                    'department of electrical and electronic engineering': 'D3E',
                    'electrical and electronic engineering': 'D3E',
                    'department of mechatronics and biomedical engineering': 'DMBE',
                    'mechatronics and biomedical engineering': 'DMBE',
                    'department of mechatronics and biomed engineering': 'DMBE',
                };

                for (const [pattern, acronym] of Object.entries(acronymMappings)) {
                    if (dept.includes(pattern)) {
                        if (logger) logger(`[AUTO-CORRECTION] Detected department name "${args.department}" → Setting acronym="${acronym}"`);
                        args.acronym = acronym;
                        args.department = undefined; // Clear department to let acronym resolution handle it
                        break;
                    }
                }
            }

            // Proceed with search
            return await searchStaff(args, logger);
        }
        if (name === 'utar_list_departments') {
            return listDepartments(args.faculty, logger);
        }
        if (name === 'jcr_journal_metric') {
            // Ensure data is loaded
            await ensureJcrCacheLoaded();

            // Prioritize ISSN if present
            if (args.issn) {
                return getJournalMetricsByIssn(args.issn, args.years);
            }

            // Fallback to title query
            if (args.query) {
                return getJournalMetricsByTitle(args.query, args.years);
            }

            return { found: false, error: 'No query or ISSN provided' };
        }
        return { error: `Unknown tool: ${name}` };
    } catch (error: any) {
        console.error(`[RAG] Tool execution error (${name}):`, error);
        if (logger) logger(`Error executing ${name}: ${error.message}`);
        return { error: error.message || 'Internal tool error' };
    }
}

/**
 * Process a RAG query and generate a response
 */
export async function processRAGQuery(query: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now(); // Start timer
    const debugLogs: string[] = []; // Capture activity for debugging
    const log = (msg: string) => {
        console.log(`[RAG] ${msg}`);
        debugLogs.push(msg);
    };

    try {
        log(`Processing query: "${query.query}" for role: ${query.userRole}`);

        // 1. Contextualize the query (with smart skip for simple questions)
        const t1 = Date.now();
        let effectiveQuery = query.query;
        let chatHistoryStr = '';

        // Skip contextualization for simple standalone questions
        const isSimpleQuestion = /^(how|what|where|when|who|why|can|is|are|do|does)/i.test(query.query.trim());
        const needsContext = query.sessionId && !isSimpleQuestion;

        if (needsContext) {
            const recentMessages = await prisma.message.findMany({
                where: { sessionId: query.sessionId },
                orderBy: { createdAt: 'desc' },
                take: 6,
            });

            // Convert and reverse for context
            const history = recentMessages.reverse().map(m => ({
                role: m.role,
                content: m.content
            }));

            chatHistoryStr = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');

            if (history.length > 0) {
                // Skip contextualization if query contains known UTAR acronyms
                // to prevent LLM from hallucinating wrong expansions
                // These acronyms are extracted from units.json
                const knownAcronyms = [
                    // Faculty acronyms
                    'LKC FES', 'FEGT', 'FSc', 'FAM', 'FCI', 'FAS', 'FICT',
                    // LKC FES Department acronyms (9 academic + 2 admin = 11 total)
                    'DMBE', 'DASD', 'DCL', 'DCI', 'D3E', 'DC', 'DMAS', 'DMME', 'DS',
                    'DLMSA', 'FGO',  // Admin departments
                    // FICT Department acronyms
                    'DCCT', 'DCS', 'DISE', 'DIT',
                    // FAM Department acronyms
                    'DA', 'DBPM', 'DE', 'DIB',
                    // FAS Department acronyms
                    'DAD', 'DEng', 'DJ', 'DPC', 'DPR',
                    // Other common acronyms
                    'CHST', 'CCR'
                ]
                    ;
                const hasAcronym = knownAcronyms.some(acronym =>
                    query.query.toUpperCase().includes(acronym.toUpperCase())
                );

                // CONTEXTUALIZATION DISABLED FOR PERFORMANCE (saves 20+ seconds)
                // if (!hasAcronym) {
                //     const rewritten = await contextualizeQuery(query.query, history);
                //     if (rewritten && rewritten !== query.query) {
                //         effectiveQuery = rewritten;
                //         log(`Contextualized query: "${effectiveQuery}"`);
                //     }
                // } else {
                //     log(`Skipped contextualization (query contains acronym)`);
                // }
                log(`Skipped contextualization (disabled for performance)`);
            }
        } else if (isSimpleQuestion) {
            log(`Skipped contextualization (simple standalone question)`);
        }
        log(`⏱️ Step 1 (Contextualization): ${((Date.now() - t1) / 1000).toFixed(2)}s`);

        // SMART QUERY DETECTION: Skip RAG for staff directory queries
        // These queries will use staff tools, so RAG/knowledge base is not needed
        const isStaffQuery = (
            // Pattern 1: Staff listing/search queries
            /list.*staff|who is|find.*staff|staff.*in|head of|dean of|director of|chairperson/i.test(query.query) ||
            // Pattern 2: Count queries
            (/how many|count|total|number of/i.test(query.query) && /staff/i.test(query.query)) ||
            // Pattern 3: Has department acronyms (likely staff query)
            (query.query.match(/\b(DMBE|DCI|DCL|D3E|CHST|LKC FES|FCI|FAM|FAS)\b/g)?.length || 0) > 0
        );

        let embedding: number[] = [];
        let knowledgeNotes: any[] = [];
        let relevantChunks: any[] = [];
        const accessLevels = getAccessibleLevels(query.userRole);

        if (isStaffQuery) {
            log(`⏱️ Steps 2-4 (Skipped for staff query): 0.00s`);
            log('  - Detected staff directory query, bypassing RAG for performance');
        } else {
            // 2-4. PARALLELIZED: Generate embedding + Search knowledge notes + Vector search
            const t2 = Date.now();

            [embedding, knowledgeNotes, relevantChunks] = await Promise.all([
                generateEmbedding(effectiveQuery),
                searchKnowledgeNotes(effectiveQuery, accessLevels, 3),
                // Vector search needs embedding, so we do it in a nested promise
                generateEmbedding(effectiveQuery).then(emb => searchSimilarDocuments(emb, accessLevels, 5))
            ]);

            log(`⏱️ Steps 2-4 (Parallel: Embedding + Knowledge + Vector): ${((Date.now() - t2) / 1000).toFixed(2)}s`);
            log(`  - Found ${knowledgeNotes.length} knowledge notes`);
            log(`  - Found ${relevantChunks.length} document chunks`);
        }

        // 6. Prepare context
        let baseContextStrings: string[] = [];
        if (knowledgeNotes.length > 0) {
            log(`📝 Knowledge Notes being sent to LLM:`);
            knowledgeNotes.forEach((note, idx) => {
                log(`  ${idx + 1}. "${note.title}" (${note.content.length} chars)`);
                log(`     FULL CONTENT:\n${note.content}`);
            });

            // SYSTEMIC SOLUTION: Pre-format tiered knowledge notes as markdown tables
            // LLMs naturally quote tables verbatim instead of summarizing them
            const formattedNotes = knowledgeNotes.map(note => {
                let formattedContent = note.content;

                // Detect if this is a tiered/structured note
                const hasTiers = note.content.match(/→|–/g);
                if (hasTiers && hasTiers.length >= 2) {
                    log(`🔧 Converting "${note.title}" to markdown table format`);

                    // Extract tier lines
                    const lines = note.content.split('\n');
                    const tierLines: string[] = [];
                    let currentSection = '';

                    lines.forEach(line => {
                        const trimmed = line.trim();
                        if (!trimmed) return;

                        // Detect tier patterns
                        if (trimmed.match(/^(\d+\.|Below|RM\s*\d+)/i) || trimmed.includes('→') || trimmed.includes('–')) {
                            tierLines.push(trimmed);
                        } else if (trimmed.length > 0 && !trimmed.match(/^(Training|Subject|Summary|Multiple|Annual|further)/i)) {
                            // Continuation of previous tier
                            if (tierLines.length > 0) {
                                tierLines[tierLines.length - 1] += ' ' + trimmed;
                            }
                        }
                    });

                    // Build markdown table if we found tiers
                    if (tierLines.length >= 2) {
                        let tableContent = '\n\n**COMPLETE TIER STRUCTURE (use all rows):**\n\n';
                        tableContent += '| Sponsorship Amount | Service Bond Requirement |\n';
                        tableContent += '|-------------------|-------------------------|\n';

                        tierLines.forEach(tier => {
                            // Parse tier into amount and requirement
                            const parts = tier.split(/→|–|:/);
                            if (parts.length >= 2) {
                                const amount = parts[0].replace(/^\d+\.\s*/, '').trim();
                                const requirement = parts[1].trim();
                                tableContent += `| ${amount} | ${requirement} |\n`;
                            } else if (tier.match(/below|less than|under/i)) {
                                tableContent += `| ${tier} | No service bond required |\n`;
                            }
                        });

                        formattedContent = tableContent + '\n\n' + note.content;
                    }
                }

                return `[Priority Knowledge: ${note.title}]\n${formattedContent}`;
            });

            // CRITICAL: Mark knowledge notes as PRIORITY to ensure LLM uses them first
            baseContextStrings.push(
                `🔴 PRIORITY KNOWLEDGE (USE THIS FIRST):\n\n` + formattedNotes.join('\n\n---\n\n')
            );
        }

        // SYSTEMIC SOLUTION: Filter out document chunks that overlap with knowledge notes
        // This ensures knowledge base always takes priority, regardless of topic
        if (knowledgeNotes.length > 0 && relevantChunks.length > 0) {
            const originalChunkCount = relevantChunks.length;

            // Extract key topics/keywords from knowledge note titles and content
            const knowledgeKeywords = new Set<string>();
            knowledgeNotes.forEach(note => {
                // Extract significant words from title (3+ chars)
                const titleWords = note.title.toLowerCase()
                    .split(/\s+/)
                    .filter((w: string) => w.length > 3);
                titleWords.forEach((w: string) => knowledgeKeywords.add(w));

                // Extract key phrases from content (e.g., "service bond", "sponsorship")
                const contentLower = note.content.toLowerCase();
                const keyPhrases = [
                    'service bond', 'sponsorship', 'conference', 'training',
                    'sabbatical', 'research leave', 'publication', 'rps',
                    'journal', 'impact factor', 'quartile'
                ];
                keyPhrases.forEach(phrase => {
                    if (contentLower.includes(phrase)) {
                        knowledgeKeywords.add(phrase);
                    }
                });
            });

            // Filter chunks: keep only if they DON'T overlap with knowledge topics
            relevantChunks = relevantChunks.filter(chunk => {
                const chunkText = chunk.content.toLowerCase();

                // Check if chunk discusses same topic as any knowledge note
                let overlapScore = 0;
                knowledgeKeywords.forEach(keyword => {
                    if (chunkText.includes(keyword)) {
                        overlapScore++;
                    }
                });

                // If chunk has 2+ keyword matches, it's likely covering same topic
                const hasSignificantOverlap = overlapScore >= 2;

                if (hasSignificantOverlap) {
                    log(`  ⚠️ Filtered chunk from "${chunk.metadata.originalName}" (${overlapScore} keyword matches with knowledge notes)`);
                }

                return !hasSignificantOverlap; // Keep only non-overlapping chunks
            });

            const filteredCount = originalChunkCount - relevantChunks.length;
            if (filteredCount > 0) {
                log(`✂️ Filtered ${filteredCount} overlapping document chunks to prioritize knowledge notes`);
            }
        }

        if (relevantChunks.length > 0) {
            log(`📄 Document Chunks being sent to LLM:`);
            relevantChunks.forEach((chunk, idx) => {
                const docName = chunk.metadata.originalName || chunk.metadata.filename;
                log(`  ${idx + 1}. From "${docName}" (${chunk.content.length} chars, similarity: ${chunk.similarity?.toFixed(3)})`);
                log(`     Preview: ${chunk.content.substring(0, 200).replace(/\n/g, ' ')}...`);
            });
            baseContextStrings.push(
                relevantChunks.map((chunk) => `[Source: ${chunk.metadata.originalName || chunk.metadata.filename}]\n${chunk.content}`).join('\n\n---\n\n')
            );
        }

        // Check for inventory question
        const isInventoryQuestion = /how many|list|inventory|what documents|count|uploaded/i.test(effectiveQuery);
        if (isInventoryQuestion) {
            try {
                const docs = await prisma.document.findMany({
                    where: { accessLevel: { in: accessLevels as any } },
                    select: { originalName: true, category: true, department: true }
                });
                const total = docs.length;
                const inventoryInfo = `
[SYSTEM DATABASE INVENTORY]
Total Documents Accessible: ${total}
Full List:
${docs.map(d => `- ${d.originalName} (${d.category})`).join('\n')}
`;
                baseContextStrings.push(inventoryInfo);
                log('Added inventory info to context.');
            } catch (err) { console.error(err); }
        }

        // Check for recency-based query (latest, most recent, newest)
        const isRecencyQuery = /latest|most recent|newest|last|current/i.test(effectiveQuery);
        let latestDocumentId: string | null = null;

        if (isRecencyQuery) {
            try {
                log('Detected recency query, searching for latest document...');

                // Extract category if mentioned
                const isMeetingMinute = /meeting\s*minute/i.test(effectiveQuery);
                const isPolicy = /policy/i.test(effectiveQuery);
                const isForm = /form/i.test(effectiveQuery);

                const whereClause: any = {
                    accessLevel: { in: accessLevels as any },
                    status: 'processed'
                };

                if (isMeetingMinute) whereClause.category = 'Meeting Minute';
                else if (isPolicy) whereClause.category = 'Policy';
                else if (isForm) whereClause.category = 'Form';

                const allDocs = await prisma.document.findMany({
                    where: whereClause,
                    select: { id: true, originalName: true, category: true, uploadedAt: true }
                });

                log(`Found ${allDocs.length} documents for recency check`);

                // Parse dates from filenames (YYYYMMDD format) and sort by document date
                const docsWithDates = allDocs
                    .map(doc => {
                        const dateMatch = doc.originalName.match(/(\d{8})/);
                        if (dateMatch) {
                            const dateStr = dateMatch[1];
                            const year = parseInt(dateStr.substring(0, 4));
                            const month = parseInt(dateStr.substring(4, 6));
                            const day = parseInt(dateStr.substring(6, 8));
                            const docDate = new Date(year, month - 1, day);
                            return { ...doc, docDate, dateStr };
                        }
                        return { ...doc, docDate: doc.uploadedAt, dateStr: 'Unknown' };
                    })
                    .sort((a, b) => b.docDate.getTime() - a.docDate.getTime())
                    .slice(0, 5);

                if (docsWithDates.length > 0) {
                    latestDocumentId = docsWithDates[0].id;
                    const recencyInfo = `
[MOST RECENT DOCUMENTS BY DATE]
${docsWithDates.map((d, idx) => `${idx + 1}. ${d.originalName} (${d.category}) - Date: ${d.dateStr}`).join('\n')}

**CRITICAL INSTRUCTION**: The user asked for the LATEST/MOST RECENT document. 
The #1 document above is the most recent by date: "${docsWithDates[0].originalName}"
You MUST provide a download link using this EXACT filename.
Format: [Download ${docsWithDates[0].originalName.replace('.pdf', '')}](download:${docsWithDates[0].originalName})
`;
                    baseContextStrings.push(recencyInfo);
                    log(`Latest document: ${docsWithDates[0].originalName}`);
                }
            } catch (err) {
                console.error('Error in recency detection:', err);
                log(`Error in recency detection: ${err}`);
            }
        }

        // NOW create baseContext after all special checks
        const baseContext = baseContextStrings.join('\n\n=== === ===\n\n');


        // --- TOOL PERMISSION CHECK (CACHED) ---
        const t5 = Date.now();
        let localTools = AVAILABLE_TOOLS;
        try {
            const permissions = await getCachedToolPermissions(); // ← Using cache!
            if (permissions.length > 0) {
                const allowedToolNames = new Set(
                    permissions
                        .filter((p: any) => p.allowedRoles.includes(query.userRole))
                        .map((p: any) => p.toolName)
                );
                localTools = AVAILABLE_TOOLS.filter(t => allowedToolNames.has(t.function.name));
                log(`Tools allowed for role '${query.userRole}': ${localTools.map(t => t.function.name).join(', ') || 'None'}`);
            } else {
                log('No tool permissions configured. Defaulting to ALL tools.');
            }
        } catch (e) {
            log(`Failed to fetch tool permissions, defaulting to ALL: ${e}`);
        }
        log(`⏱️ Step 5 (Tool permissions): ${((Date.now() - t5) / 1000).toFixed(2)}s`);

        const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        // Retrieve System Prompt (CACHED)
        const t6 = Date.now();
        let baseSystemPrompt = await getCachedSystemPrompt(); // ← Using cache!
        if (baseSystemPrompt) {
            log('Loaded system prompt (from cache or DB).');
        }

        if (!baseSystemPrompt) {
            baseSystemPrompt = `You are a helpful assistant for the CHST research centre at UTAR.
Guidelines:
- Current Date: ${dateStr}
- Use this date for deadlines/eligibility.
- Answer in the same language as the user.
- **General Questions**: Answer directly.
- **Policies/Forms**: Base answers on the "Context" provided.
`;
        }

        // Conditionally append tool prompts
        const hasStaffTool = localTools.some(t => t.function.name === 'utar_staff_search');
        const hasJcrTool = localTools.some(t => t.function.name === 'jcr_journal_metric');

        if (hasStaffTool && !baseSystemPrompt.includes('utar_staff_search')) {
            baseSystemPrompt += `\n\n${STAFF_SEARCH_SYSTEM_PROMPT}`;
        }

        if (hasJcrTool && !baseSystemPrompt.includes('jcr_journal_metric')) {
            baseSystemPrompt += `\n\n${JCR_SYSTEM_PROMPT}`;
        }

        // Always append strict document handling rules to prevent hallucinations
        // This runs regardless of what is in the DB prompt
        baseSystemPrompt += `
        
### 🛡️ STRICT DOCUMENT & FORM RULES (OVERRIDE)
1. **NO HALLUCINATIONS**: 
   - NEVER invent form numbers (e.g., "SL-01", "FM-XYZ") if they are not explicitly written in the retrieved context.
   - NEVER invent filenames. Only use filenames that appear in the context.

2. **DOWNLOAD LINKS (MANDATORY)**:
   - **CRITICAL**: When answering questions about policies, forms, or procedures, you MUST provide download links to relevant documents.
   - Format: \`[Download Name](download:ExactFilenameFromContext)\`
   - The filename in the link MUST match the filename in the context EXACTLY (case-insensitive).
   - Do not add "Form", "No", or numbers to the filename unless they are actually part of the file's name.
   - **Example**: If context mentions "POL-DHR-001 Policy on Sponsorship...", provide: \`[Download POL-DHR-001](download:POL-DHR-001 Policy on Sponsorship to Attend Training and Conference .pdf)\`

3. **MISSING DOCUMENTS**:
   - If a form is mentioned (e.g., "Sabbatical Application Form") but the specific PDF file is NOT in your context, 
   - DO NOT create a download link for it.
   - Instead state: "The [Form Name] is required, but I do not have the file for it available for download."

4. **PRIORITY KNOWLEDGE NOTES**:
   - **CRITICAL**: If you see "🔴 PRIORITY KNOWLEDGE" in the context, you MUST use that information FIRST.
   - Priority knowledge notes contain the most accurate and up-to-date information.
   - If there's a conflict between priority knowledge and document chunks, ALWAYS trust the priority knowledge.
   - When answering, cite the complete information from priority knowledge notes. Don't simplify or generalize tiered/structured information.

`;
        log(`⏱️ Step 6 (System prompt setup): ${((Date.now() - t6) / 1000).toFixed(2)}s`);

        const systemPrompt = `${baseSystemPrompt}
        
Guidelines (Dynamic):
- Current Date: ${dateStr}

Context from CHST policies and forms:
${(hasStaffTool || hasJcrTool) ? "Not needed - using live data from tools." : (baseContext.length > 0 ? baseContext : "No relevant policy documents found.")}

Previous Conversation:
${chatHistoryStr}
`;

        const messages: any[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: effectiveQuery }
        ];

        // 8. Execution Loop
        let runLoop = true;
        let loopCount = 0;
        let finalResponse = '';
        let totalTokens = 0;

        log('Starting LLM inference loop...');
        const t7 = Date.now();



        while (runLoop && loopCount < 5) {
            const tLoop = Date.now();

            // PERFORMANCE OPTIMIZATION: Use GPT-3.5-turbo for formatting tool results
            // CRITICAL: Only use GPT-3.5 AFTER tools are called (loopCount > 0)
            // First call (loopCount === 0) must use GPT-4 for smart tool selection

            let activeModel = await getCachedModelConfig(); // Default to GPT-4

            // Check if we're formatting results from simple tools (loop #2+)
            if (loopCount > 0) {
                // Check if previous message had only simple tool calls
                const prevMessage = messages[messages.length - 1];
                if (prevMessage?.tool_calls) {
                    const allSimpleTools = prevMessage.tool_calls.every((tc: any) =>
                        tc.function.name === 'utar_staff_search' ||
                        tc.function.name === 'utar_resolve_unit' ||
                        tc.function.name === 'utar_list_departments' ||
                        tc.function.name === 'jcr_journal_metric'
                    );

                    if (allSimpleTools) {
                        activeModel = 'gpt-3.5-turbo'; // Fast formatting for simple tool results
                        log(`Using GPT-3.5-turbo to format simple tool results (3-5x faster than GPT-4)`);
                    }
                }
            }

            const completion = await openai.chat.completions.create({
                model: activeModel,
                messages: messages,
                tools: localTools.length > 0 ? localTools : undefined, // Only pass tools if any are allowed
                tool_choice: localTools.length > 0 ? 'auto' : undefined,

                temperature: 0.7,
                max_tokens: 4000,
            });
            log(`⏱️ LLM call #${loopCount + 1}: ${((Date.now() - tLoop) / 1000).toFixed(2)}s`);

            totalTokens += completion.usage?.total_tokens || 0;
            const message = completion.choices[0].message;

            messages.push(message);

            if (message.tool_calls && message.tool_calls.length > 0) {
                log(`Model requested ${message.tool_calls.length} tool calls.`);

                for (const toolCall of message.tool_calls) {
                    const call = toolCall as any;
                    const toolName = call.function.name;
                    const toolArgs = JSON.parse(call.function.arguments);

                    log(`Executing Tool: ${toolName} with args: ${JSON.stringify(toolArgs)}`);
                    const tTool = Date.now();

                    const result = await executeToolCall(toolName, toolArgs, log); // Pass logger
                    log(`⏱️ Tool execution (${toolName}): ${((Date.now() - tTool) / 1000).toFixed(2)}s`);

                    // Log full tool result for debugging
                    log(`Tool Result (${toolName}): ${JSON.stringify(result, null, 2)}`);

                    // For staff search, prepend the count message to force LLM to see it
                    let toolResponse = JSON.stringify(result);
                    if (toolName === 'utar_staff_search' && result && typeof result === 'object') {
                        if ('message' in result) {
                            // Prepend the message to the response so LLM sees it first
                            toolResponse = `STAFF COUNT: ${result.message}\n\nFull details: ${toolResponse}`;
                        }
                    }

                    messages.push({
                        role: 'tool',
                        tool_call_id: call.id,
                        content: toolResponse
                    });
                }
            } else {
                finalResponse = message.content || '';
                runLoop = false;
                log('Received final response from LLM.');
            }
            loopCount++;
        }
        log(`⏱️ Step 7 (Total LLM inference): ${((Date.now() - t7) / 1000).toFixed(2)}s`);


        // 9. Suggestions (Optional - can be disabled for performance)
        const t8 = Date.now();
        const ENABLE_RELATED_DOCS = process.env.ENABLE_RELATED_DOCS === 'true';

        let relatedDocs: DocumentSource[] = [];

        if (ENABLE_RELATED_DOCS) {
            const referencedDocIds = relevantChunks.map(c => c.metadata.documentId).filter(Boolean);
            relatedDocs = await getRelatedDocuments({
                referencedDocIds,
                userRole: query.userRole,
                referencedChunks: relevantChunks
            });
            log(`⏱️ Step 8 (Related docs): ${((Date.now() - t8) / 1000).toFixed(2)}s - Found ${relatedDocs.length} suggestions`);
        } else {
            log(`⏱️ Step 8 (Related docs): 0.00s - Disabled for performance`);
        }


        // 10. Enrich sources
        const sourcesToEnrich: DocumentSource[] = relevantChunks.map(chunk => ({
            filename: chunk.metadata.filename,
            accessLevel: chunk.metadata.accessLevel,
            documentId: chunk.metadata.documentId,
            originalName: chunk.metadata.originalName,
            pageNumber: chunk.metadata.pageNumber,
            relevanceScore: (chunk as any).score
        }));

        // If this was a recency query, ensure the latest document is in sources
        if (isRecencyQuery && latestDocumentId) {
            try {
                // Check if latest document is already in sources
                const alreadyInSources = sourcesToEnrich.some(s => s.documentId === latestDocumentId);

                if (!alreadyInSources) {
                    // Fetch the latest document details
                    const latestDoc = await prisma.document.findUnique({
                        where: { id: latestDocumentId },
                        select: { id: true, originalName: true, filename: true, accessLevel: true }
                    });

                    if (latestDoc) {
                        sourcesToEnrich.push({
                            filename: latestDoc.filename,
                            accessLevel: latestDoc.accessLevel,
                            documentId: latestDoc.id,
                            originalName: latestDoc.originalName,
                            relevanceScore: 1.0 // Highest relevance for recency queries
                        });
                        log(`Added latest document to sources: ${latestDoc.originalName}`);
                    }
                }
            } catch (err) {
                console.error('Error adding latest doc to sources:', err);
                log(`Error adding latest doc to sources: ${err}`);
            }
        }

        const t9 = Date.now();
        const enrichedSources = await enrichSourcesWithMetadata(sourcesToEnrich);
        log(`⏱️ Step 9 (Enrich sources): ${((Date.now() - t9) / 1000).toFixed(2)}s`);

        // Log sources for debugging download links
        log(`📄 Sources available for download links:`);
        enrichedSources.forEach((src, idx) => {
            log(`  ${idx + 1}. "${src.originalName}" (filename: ${src.filename})`);
        });


        if (!finalResponse) {
            finalResponse = "I apologize, but I was unable to generate a response. This may be because I do not have permission to access the necessary tools or data to answer your question.";
        }

        // SYSTEMIC SOLUTION: Validate response completeness against knowledge notes
        // If LLM gives incomplete answer for tiered information, inject the complete structure
        if (knowledgeNotes.length > 0 && finalResponse) {
            knowledgeNotes.forEach(note => {
                const noteTitleLower = note.title.toLowerCase();
                const noteContentLower = note.content.toLowerCase();
                const responseLower = finalResponse.toLowerCase();

                // Detect if this is a tiered/structured knowledge note
                const hasTiers = note.content.match(/→|:|–|-\s*\d+\s*(year|month|day)/gi);

                if (hasTiers && hasTiers.length >= 2) {
                    // Check if response mentions this topic
                    const topicWords = noteTitleLower.split(/\s+/).filter((w: string) => w.length > 4);
                    const mentionsTopic = topicWords.some((word: string) => responseLower.includes(word));

                    if (mentionsTopic) {
                        // Count how many tiers are mentioned in the response
                        const tiersInNote = hasTiers.length;
                        let tiersInResponse = 0;

                        // Check for common tier indicators
                        if (responseLower.includes('below') || responseLower.includes('less than') || responseLower.includes('under')) tiersInResponse++;
                        if (responseLower.match(/rm\s*\d+,?\d*/gi)) {
                            tiersInResponse += (responseLower.match(/rm\s*\d+,?\d*/gi) || []).length;
                        }

                        // If response has fewer than half the tiers, it's incomplete
                        if (tiersInResponse < tiersInNote / 2) {
                            log(`⚠️ Detected incomplete response for "${note.title}" (${tiersInResponse}/${tiersInNote} tiers mentioned)`);
                            log(`🔧 Injecting complete tiered structure from knowledge note`);

                            // Extract the tiered structure from knowledge note
                            const lines = note.content.split('\n').filter((l: string) => l.trim().length > 0);
                            const tierLines = lines.filter((l: string) =>
                                l.match(/→|:|–/) ||
                                l.match(/^\d+\./) ||
                                l.match(/^-\s/) ||
                                l.match(/rm\s*\d+/i)
                            );

                            if (tierLines.length > 0) {
                                // Replace the incomplete response with complete structure
                                const completeAnswer = `Based on the policy, here is the complete breakdown:\n\n${tierLines.join('\n')}\n\n` +
                                    `For more details, please refer to the official policy document.`;

                                finalResponse = completeAnswer;
                                log(`✅ Response corrected with complete tiered structure`);
                            }
                        }
                    }
                }
            });
        }


        // Calculate elapsed time
        const endTime = Date.now();
        const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);
        log(`⏱️ Total processing time: ${elapsedSeconds} seconds`);

        return {
            answer: finalResponse,
            sources: enrichedSources,
            suggestions: relatedDocs,
            logs: debugLogs
        };

    } catch (error: any) {
        log(`Error processing RAG query: ${error.message}`);
        console.error('Error processing RAG query:', error);
        throw error;
    }
}

/**
 * Generate a streaming response for RAG query
 */
export async function* processRAGQueryStream(query: RAGQuery): AsyncGenerator<string> {
    try {
        const response = await processRAGQuery(query);
        yield response.answer;
    } catch (error) {
        console.error('Error in stream wrapper:', error);
        yield 'Sorry, an error occurred.';
    }
}

/**
 * Contextualize a query based on chat history
 */
async function contextualizeQuery(query: string, history: any[]): Promise<string> {
    if (!history || history.length === 0) return query;

    try {
        const historyText = history
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');

        const systemPrompt = `Given the following conversation and a follow-up question, rephrase the follow-up question to be a standalone question.
If the follow-up question is already standalone, return it as is.
Check for pronouns (it, they, he, she) and replace them with the entities they refer to.

IMPORTANT: Preserve acronyms and unit names EXACTLY as written. Do NOT try to expand them.
- Keep "D3E" as "D3E" (do not expand to department name)
- Keep "DMBE" as "DMBE"
- Keep "LKC FES" as "LKC FES"
- Keep "CHST" as "CHST"
The tools will handle acronym resolution correctly.`;

        const activeModel = await getCachedModelConfig();
        const completion = await openai.chat.completions.create({
            model: activeModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Chat History:\n${historyText}\n\nLatest Question: ${query}` }
            ],
            temperature: 0.1,
            max_tokens: 200,
        });

        const rewritten = completion.choices[0].message.content?.trim();
        if (rewritten) {
            return rewritten;
        }
    } catch (error) {
        console.error('Error contextualizing query:', error);
    }

    return query;
}

/**
 * Enrich document sources with metadata for download links
 */
async function enrichSourcesWithMetadata(sources: DocumentSource[]): Promise<DocumentSource[]> {
    if (sources.length === 0) return [];

    try {
        // Collect all document IDs and filenames for lookup
        const documentIds = [...new Set(sources.map(s => s.documentId).filter(Boolean))];
        const filenames = [...new Set(sources.map(s => s.filename))];

        console.log('[Enrich] Looking up by documentIds:', documentIds.length, 'and filenames:', filenames.length);

        const documents = await prisma.document.findMany({
            where: {
                OR: [
                    { id: { in: documentIds as string[] } },
                    { filename: { in: filenames } },
                    { originalName: { in: filenames } }
                ]
            },
            select: {
                id: true,
                filename: true,
                originalName: true,
                category: true,
                department: true
            }
        });

        console.log('[Enrich] Found documents:', documents.length);
        documents.forEach(doc => {
            console.log(`  - ${doc.originalName} (filename: ${doc.filename})`);
        });

        // Create maps for efficient lookup
        const docByIdMap = new Map();
        const docByFilenameMap = new Map();

        documents.forEach(doc => {
            docByIdMap.set(doc.id, doc);
            docByFilenameMap.set(doc.filename, doc);
            docByFilenameMap.set(doc.originalName, doc);
        });

        const enriched = sources.map(source => {
            // Try lookup by documentId first (most reliable)
            let doc = source.documentId ? docByIdMap.get(source.documentId) : null;

            // Fall back to filename lookup
            if (!doc) {
                doc = docByFilenameMap.get(source.filename);
            }

            if (doc) {
                console.log(`[Enrich] ✅ Matched: ${source.filename} → ${doc.originalName}`);
                return {
                    ...source,
                    documentId: doc.id,
                    originalName: doc.originalName,
                    category: doc.category,
                    department: doc.department || undefined,
                };
            }

            // Fallback: If document not found in DB, use filename as originalName
            // This ensures fuzzy matching has something to work with
            console.log(`[Enrich] ⚠️  No DB match for: ${source.filename} (documentId: ${source.documentId || 'none'}) - using filename as originalName`);
            return {
                ...source,
                originalName: source.filename, // Use filename instead of UUID from vector metadata
            };
        });

        return enriched;
    } catch (error) {
        console.error('Error enriching sources with metadata:', error);
        return sources;
    }
}

