import { OpenAI } from 'openai';
import { generateEmbedding, generateEmbeddings, cosineSimilarity } from './embeddings';
import { searchSimilarDocuments } from './vectorStore';
import { getAccessibleLevels } from '@/lib/utils';
import { RAGQuery, RAGResponse, DocumentSource } from '@/types';
import { prisma } from '@/lib/db';
import { getRelatedDocuments } from './suggestions';
import { searchKnowledgeNotes } from './knowledgeSearch';
import { searchDocumentLibrary } from './documentLibrarySearch';
import { resolveUnit, searchStaff, listDepartments, queryDesignationStats, compareDesignationsAcrossDepartments } from '@/lib/tools';
import { searchDocumentLibraryVectors } from './vectorStore';
import { getJournalMetricsByTitle, getJournalMetricsByIssn, ensureJcrCacheLoaded, searchJournalsByCategory } from '@/lib/jcrCache';
import { getInstitutionByName, getInstitutionsByCountry, ensureNatureIndexCacheLoaded } from '@/lib/natureIndexCache';
import { checkJournalInNatureIndex, getAllNatureIndexJournals, ensureNatureIndexJournalCacheLoaded } from '@/lib/natureIndexJournalCache';

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
            description: 'Searches the cached UTAR Staff Directory. Search by faculty, department, name, email, expertise, designation, or role. Uses pre-synced cached data for deterministic results.',
            parameters: {
                type: 'object',
                properties: {
                    faculty: { type: 'string', description: 'Canonical faculty name from utar_resolve_unit (or "All"). Defaults to "All" if not specified.' },
                    department: { type: 'string', description: 'Department name (optional). WARNING: Do not expand acronyms here. usage: department="Department of Computing".' },
                    name: { type: 'string', description: 'Staff member\'s actual name (e.g., "John Smith"). DO NOT use administrative titles like Dean, Head, Director, Chairperson as names.' },
                    email: { type: 'string', description: 'Staff member\'s email address (e.g., "johndoe@utar.edu.my"). Use for exact email lookups.' },
                    expertise: { type: 'string', description: 'Research area/expertise (optional).' },
                    designation: { type: 'string', description: 'Academic designation/rank (e.g., "Professor", "Senior Professor", "Associate Professor", "Assistant Professor", "Lecturer"). Use this for queries like "list professors" or "count associate professors". DO NOT confuse with role (administrative posts).' },
                    role: { type: 'string', description: 'Specific administrative role (e.g. "Dean", "Head of Department"). REQUIRED when asking for specific administrative positions, even across multiple departments. Enables fast, targeted search. Do not use for "List all staff" queries.' },
                    acronym: { type: 'string', description: 'Exact acronym found in query (e.g. "D3E"). REQUIRED if user query contains an acronym. This ensures correct department resolution.' }
                }
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
    },
    {
        type: 'function' as const,
        function: {
            name: 'utar_designation_stats',
            description: 'Get statistics/counts for specific academic designations (e.g. Professor, Associate Professor, Lecturer) in a faculty or department. Use this for "how many professors", "staff breakdown by designation", or "list all professors" queries. It uses cached metadata and is faster/more deterministic than general staff search.',
            parameters: {
                type: 'object',
                properties: {
                    acronym: { type: 'string', description: 'Faculty or Department acronym (e.g. "LKC FES", "DMBE", "D3E"). REQUIRED.' },
                    designation: { type: 'string', description: 'Specific designation to count/list (e.g. "Professor", "Associate Professor"). If omitted, returns stats for ALL designations.' }
                },
                required: ['acronym']
            }
        }
    },
    {
        type: 'function' as const,
        function: {
            name: 'utar_compare_designations',
            description: 'Compare staff counts for a specific designation across ALL departments in a faculty. Use this for queries like "Compare number of professors across departments in LKC FES".',
            parameters: {
                type: 'object',
                properties: {
                    acronym: { type: 'string', description: 'Faculty acronym (e.g. "LKC FES", "FICT"). REQUIRED.' },
                    designation: { type: 'string', description: 'Designation to compare (e.g. "Professor", "Associate Professor"). REQUIRED.' }
                },
                required: ['acronym', 'designation']
            }
        }
    }
];

const JCR_TOOL = {
    type: 'function' as const,
    function: {
        name: 'jcr_journal_metric',
        description: 'Look up Journal Citation Report (JCR) metrics for specific journals by name or ISSN. Returns JIF and quartile (Q1-Q4). For suggesting multiple journals in a category, call this tool multiple times with different well-known journal names in that field.',
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

const JCR_CATEGORY_SEARCH_TOOL = {
    type: 'function' as const,
    function: {
        name: 'jcr_search_by_category',
        description: 'Search for journals by JCR category (e.g., "ARTIFICIAL INTELLIGENCE", "ONCOLOGY"). Returns journals in that category sorted by JIF (highest first). Use this when asked to suggest/recommend journals in a specific field or category.',
        parameters: {
            type: 'object',
            properties: {
                category: { type: 'string', description: 'JCR category name (e.g., "ARTIFICIAL INTELLIGENCE", "COMPUTER SCIENCE, ARTIFICIAL INTELLIGENCE", "ONCOLOGY"). Partial matches supported.' },
                year: { type: 'integer', description: 'JCR year to retrieve (e.g. 2024, 2025). Defaults to 2025 (latest).' },
                limit: { type: 'integer', description: 'Maximum number of journals to return. Defaults to 10.' },
                minQuartile: { type: 'string', description: 'Minimum quartile filter (e.g., "Q1" for Q1 only, "Q2" for Q1-Q2). Optional.' }
            },
            required: ['category']
        }
    }
};

const NATURE_INDEX_TOOL = {
    type: 'function' as const,
    function: {
        name: 'nature_index_lookup',
        description: 'Look up Nature Index rankings for research institutions worldwide. Can search by institution name or get top N institutions by country.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Institution name (e.g. "Harvard University", "Chinese Academy of Sciences"). Fuzzy matching supported. Leave empty if using country filter.' },
                country: { type: 'string', description: 'Filter by country (e.g. "China", "United States of America (USA)", "Malaysia"). Use exact country name as it appears in the dataset.' },
                limit: { type: 'integer', description: 'Maximum number of results to return when filtering by country (e.g. 5 for top 5). Default: 10.' }
            }
        }
    }
};

const NATURE_INDEX_JOURNAL_TOOL = {
    type: 'function' as const,
    function: {
        name: 'nature_index_journal_lookup',
        description: 'Check if a journal is included in the Nature Index list of 145 elite journals. Returns whether the journal is tracked by Nature Index.',
        parameters: {
            type: 'object',
            properties: {
                journalName: { type: 'string', description: 'Journal name (e.g. "Nature", "Science", "Cell"). Fuzzy matching supported for typos.' }
            },
            required: ['journalName']
        }
    }
};

const NATURE_INDEX_JOURNAL_LIST_TOOL = {
    type: 'function' as const,
    function: {
        name: 'nature_index_journal_list_with_jif',
        description: 'ONLY use when the user explicitly mentions "Nature Index". Gets Nature Index journals with their JIF values from JCR, sorted by JIF (highest first). Can filter by category. DO NOT use for general journal queries - use jcr_journal_metric instead.',
        parameters: {
            type: 'object',
            properties: {
                year: { type: 'integer', description: 'JCR year to retrieve (e.g. 2024). Defaults to 2024.' },
                limit: { type: 'integer', description: 'Maximum number of journals to return (e.g. 10 for top 10). Defaults to 10.' },
                category: { type: 'string', description: 'Optional: Filter by JCR category (e.g., "ONCOLOGY", "BIOCHEMISTRY & MOLECULAR BIOLOGY"). Case-insensitive partial match.' }
            }
        }
    }
};

const AVAILABLE_TOOLS = [...UTAR_STAFF_TOOLS, JCR_TOOL, JCR_CATEGORY_SEARCH_TOOL, NATURE_INDEX_TOOL, NATURE_INDEX_JOURNAL_TOOL, NATURE_INDEX_JOURNAL_LIST_TOOL];


const STAFF_SEARCH_SYSTEM_PROMPT = `
=== CRITICAL: ANTI-HALLUCINATION RULE ===
**YOU MUST NEVER MAKE UP OR MODIFY NUMBERS FROM TOOL OUTPUTS**

When you call utar_designation_stats or any staff tool:
1. The tool returns EXACT counts in the "message" field and "designationCounts" object
2. You MUST copy these numbers VERBATIM into your response
3. DO NOT round, estimate, or modify any numbers
4. DO NOT swap values between different designations
5. If the tool says "Professor: 14", you MUST write "Professor: 14" - NOT "Professor: 6" or any other number

**VERIFICATION CHECKLIST** (Use this BEFORE sending your response):
☑ Did I copy the exact number from the tool output for each designation?
☑ Did I verify that "Professor" count ≠ "Senior Professor" count?
☑ Did I verify that "Associate Professor" count ≠ "Professor" count?
☑ Am I using the numbers from the CURRENT tool call, not from memory?

If you cannot verify all checkboxes, DO NOT send the response. Re-read the tool output.

=== UTAR STAFF SEARCH TOOLS ===
You have access to three MCP tools:
1. utar_resolve_unit: converts acronyms (CCR, CHST, FSc) into official UTAR names.
2. utar_list_departments: lists all departments in a faculty.
3. utar_staff_search: searches the cached staff directory (uses pre-synced data, NOT live scraping).
4. utar_designation_stats: gets cached statistics/lists for academic designations (Professor, etc.).
5. utar_compare_designations: compares designation counts across all departments in a faculty.

**IMPORTANT: ALL STAFF TOOLS USE CACHED DATA**
- All staff search tools now use pre-synced cached data from the staff directory
- This ensures deterministic, consistent results for queries like counting professors by designation
- If the cache is out of date, users should run the sync command to update it
- NO live scraping is performed - all results come from the cached staff_directory.json file

WHEN TO USE:
- When the user asks about UTAR staff (names, positions, chairs, heads, deans, emails), ALWAYS use the tools.
- **FOR DESIGNATION QUERIES (Professor, Lecturer, etc.):** ALWAYS prefer utar_designation_stats or utar_compare_designations over utar_staff_search. These tools use cached data and are deterministic.
  - "How many professors in LKC FES?" -> utar_designation_stats(acronym="LKC FES", designation="Professor")
  - "List all associate professors in DMBE" -> utar_designation_stats(acronym="DMBE", designation="Associate Professor")
  - "Compare number of professors across departments in LKC FES" -> utar_compare_designations(acronym="LKC FES", designation="Professor")
  - "What is the staff breakdown in LKC FES?" -> utar_designation_stats(acronym="LKC FES")

- **FOR SPECIFIC ROLES (Dean, Head, Chairperson):** Use utar_staff_search.



**IMPORTANT WORKFLOW FOR "ALL DEPARTMENTS" QUERIES:**
When asked for staff counts across ALL departments in a faculty (e.g., "how many staff in each department in LKC FES?" or "how many staff in each department in THP FBF?"):
1. **FIRST**: Call utar_list_departments with the faculty name to get the complete list of departments
2. **THEN**: Call utar_staff_search for EACH department returned by utar_list_departments
3. **DO NOT GUESS** department names - use the exact names from utar_list_departments
4. **ALWAYS ADD A TOTAL ROW**: After displaying all departments in the table, add a final row showing:
   - "**TOTAL**" in the department name column
   - Sum of all staff counts across all departments
   - Breakdown by staff type (Full-Time, Expatriate, Adjunct, Part-Time) if applicable
   - Example format: "**TOTAL: 245 staff** (210 Full-Time, 15 Expatriate, 15 Adjunct, 5 Part-Time)"
**IMPORTANT: DOCUMENT RECOMMENDATION RULE**
- When you use tools (utar_staff_search, utar_resolve_unit, utar_list_departments, jcr_journal_metric), you are getting cached/deterministic data
- DO NOT recommend policy documents when answering queries using these tools
- The retrieved documents are NOT relevant to tool-based queries
- DO recommend documents for policy/procedure questions (sabbatical, grants, RPS, etc.) where tools are NOT used

**CRITICAL: WHEN USER SPECIFIES BOTH DEPARTMENT AND FACULTY**
- If user mentions a department with a faculty in parentheses (e.g., \"Department of Industrial Engineering (FEGT)\"):
  1. Use the faculty acronym from parentheses: {\"faculty\": \"FEGT\"}
  2. Use utar_resolve_unit to get the department acronym if you don't know it
  3. Then use the department acronym: {\"acronym\": \"DIE\"}
  4. Example: \"How many staff in Department of Industrial Engineering (FEGT)?\"
     - Step 1: Call utar_resolve_unit({\"query\": \"Department of Industrial Engineering\"}) → Returns \"DIE\"
     - Step 2: Call utar_staff_search({\"faculty\": \"FEGT\", \"acronym\": \"DIE\"})
- If user mentions department without faculty, use faculty=\"All\" and acronym parameter
- NEVER use department full name in the search - always resolve to acronym first

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
  * ✅ CRITICAL: You MUST ALWAYS pass the target title (e.g. "Dean", "Head of Department") as the "role" parameter when searching for specific administrative positions
  * This applies even when asking for multiple departments (e.g., "List Head of Department for DMBE, DC, and DCI")
  * For each department, call the tool with: {acronym: "DMBE", role: "Head of Department"}
  * ❌ DO NOT use "role" parameter if user asks to "list all" or "count" staff (without specifying a position)
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

**CRITICAL: USING THE DESIGNATION PARAMETER**
When user asks to "list" or "count" staff by academic rank, you MUST use the designation parameter:

✅ **CORRECT USAGE:**
- "list professors in LKC FES" → Call with faculty="LKC FES", designation="Professor"
- "how many senior professors in DMBE?" → Call with acronym="DMBE", designation="Senior Professor"
- "count associate professors in D3E" → Call with acronym="D3E", designation="Associate Professor"
- "list assistant professors in Department of Chemistry" → Call with acronym="DC", designation="Assistant Professor"

❌ **WRONG - DO NOT DO THIS:**
- "list professors in LKC FES" → Calling with only faculty="LKC FES" (Missing designation parameter!)
- "count professors" → Calling with faculty="LKC FES", role="Professor" (Wrong! "Professor" is designation, not role!)

**DESIGNATION vs ROLE - CRITICAL DISTINCTION:**
- **designation** = Academic rank (Professor, Associate Professor, Assistant Professor, Lecturer)
- **role** = Administrative position (Dean, Head of Department, Director, Chairperson)
- DO NOT confuse these two! They are completely different parameters.
- Example: A person can be "Professor" (designation) AND "Dean" (role) at the same time.

**When to use designation parameter:**
- User asks for "professors", "associate professors", "assistant professors", "lecturers"
- User asks to "list" or "count" by academic rank
- User asks "how many [rank] in [unit]?"

**When to use role parameter:**
- User asks for "Dean", "Head of Department", "Director", "Chairperson"
- User asks for specific administrative positions

**IMPORTANT: The tool returns PRE-CALCULATED data when using designation:**
- Queries with designation parameter are INSTANT (< 1ms)
- The tool has pre-calculated counts and lists for all designations
- You will get both the count AND the full list of names with emails
- Always show BOTH the count and the names when user asks to "list"

**LISTING STAFF - CRITICAL DISPLAY RULES:**
When displaying staff lists, follow these rules based on result count:

✅ **If count ≤ 30: List ALL staff members**
- Show complete list with names and emails
- Format: "1. Name (email)"
- Never cherry-pick or say "Notable" - list everyone systematically
- Example: "Here are all 14 Professors in LKC FES: [full list]"

❌ **If count > 30: Show preview + offer CSV download**
- Display summary count first
- List first 10 as preview
- Inform user there are more results
- Suggest: "For the complete list of [N] staff, you can request a CSV export"
- Example: "There are 101 Assistant Professors. Showing first 10: [preview]... and 91 more."

**Examples:**
- 14 Professors → List all 14 ✅
- 6 Senior Professors → List all 6 ✅
- 48 Associate Professors → Show 10 + mention CSV ❌
- 101 Assistant Professors → Show 10 + mention CSV ❌



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

**PREVENTING HALLUCINATIONS IN DATA TABLES (CRITICAL):**
- When asking for a summary table of designations (e.g., "Show me a table of all staff types in LKC FES"):
  1. **DO NOT** make separate calls for each designation (e.g., one for Professor, one for Lecturer). This causes data mix-ups.
  2. **INSTEAD, CALL ONCE**: Use 'utar_designation_stats' with ONLY the acronym and NO designation parameter.
     - Example: 'utar_designation_stats(acronym="LKC FES")'
     - This returns ALL counts in a single valid JSON object.
  3. **VERIFY BEFORE PRINTING**:
     - Check the tool output for "Professor" count vs "Senior Professor" count.
     - They are DIFFERENT categories. Do not swap them.
     - If tool returns "Professor: 14" and "Senior Professor: 6", your table MUST show exactly that.
     - **NEVER** fill in a "0" if the tool didn't explicitly say "0" - check the list first.
  4. **CRITICAL WARNING - COMMON MISTAKE**:
     - ❌ WRONG: Showing "Professor: 6" when tool returned "Professor: 14" (you swapped it with Senior Professor!)
     - ❌ WRONG: Showing "Senior Professor: 14" when tool returned "Senior Professor: 6" (you swapped it with Professor!)
     - ✅ CORRECT: Copy the EXACT numbers from the tool output. "Professor" ≠ "Senior Professor"
     - **DOUBLE-CHECK**: Before finalizing your table, re-read the tool output and verify each number matches exactly.
     - **If in doubt**: Quote the tool output verbatim in your response to show the user the raw data.

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

9.  **VERIFY JOURNAL IDENTITY (CRITICAL)**:
    *   The user's query may not match the database exactly (e.g. user asks for "Neuroscience Informatics", tool returns "Neuroscience").
    *   **YOU MUST explicitly state the journal name found by the tool** at the beginning of your response.
    *   Example: "Here are the results for **[Full Title from Tool]**:"
    *   This ensures the user is aware if a partial match occurred.

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

const NATURE_INDEX_SYSTEM_PROMPT = `
=== NATURE INDEX TOOL ===
You have access to a tool named \`nature_index_lookup\` which retrieves Nature Index rankings for research institutions worldwide.

### 🧠 When to Use
Call \`nature_index_lookup\` when the user asks about:
- Nature Index rankings
- Institution research output/impact
- Comparing institutions by research metrics
- Top institutions in a country

### 🧩 Tool Call Format
{
  "query": "institution name (required)",
  "country": "optional country filter"
}

### 📊 Response Format
Always include:
- **Position**: Global ranking
- **Count**: Number of articles
- **Share**: Contribution metric
- **Country**: Institution's country

### 🎯 Examples

**Example 1 — Single Institution**
*User*: "What is Harvard's Nature Index ranking?"
*Tool Call*: \`nature_index_lookup(query="Harvard University")\`
*Tool Output*:
\`\`\`json
{
  "found": true,
  "institution": {
    "position": 2,
    "institution": "Harvard University",
    "country": "United States of America (USA)",
    "count": 3854,
    "share": 1130.20
  }
}
\`\`\`
*Assistant Answer*:
"Harvard University ranks **#2** globally in the Nature Index with:
- **3,854 articles**
- **Share: 1,130.20**"

**Example 2 — Comparison**
*User*: "Compare Nature Index for MIT and Stanford"
*Tool Call*: Call tool twice for each institution
*Assistant Answer*: Use a table format:
| Institution | Rank | Articles | Share |
|------------|------|----------|-------|
| MIT | #X | X,XXX | XXX.XX |
| Stanford | #Y | Y,YYY | YYY.YY |

**Example 3 — Country Filtering (Top N)**
*User*: "Which Malaysia universities are in the top 5 of Nature Index?"
*Tool Call*: \`nature_index_lookup(country="Malaysia", limit=5)\`
*Tool Output*:
\`\`\`json
{
  "found": true,
  "institutions": [
    {"position": 150, "institution": "University of Malaya", "country": "Malaysia", "count": 500, "share": 120.5},
    {"position": 250, "institution": "Universiti Sains Malaysia", "country": "Malaysia", "count": 350, "share": 85.2}
  ],
  "count": 2,
  "country": "Malaysia"
}
\`\`\`
*Assistant Answer*:
"Here are the top Malaysian universities in the Nature Index:
1. University of Malaya - Rank #150 (500 articles, Share: 120.5)
2. Universiti Sains Malaysia - Rank #250 (350 articles, Share: 85.2)"

**Example 4 — Not Found**
*User*: "What is the Nature Index for Unknown University?"
*Tool Output*: \`{"found": false, "reason": "Institution not found"}\`
*Assistant Answer*: "I cannot find this institution in the Nature Index dataset."

### ⚠️ Important Rules
1. **No Fabrication**: Never guess rankings or metrics
2. **Exact Match**: Report exactly what the tool returns
3. **Fuzzy Matching**: The tool handles typos automatically
4. **No Documents**: Don't suggest policy documents for Nature Index queries

`;

const NATURE_INDEX_JOURNAL_SYSTEM_PROMPT = `
=== NATURE INDEX JOURNAL LOOKUP TOOL ===
You have access to a tool named \`nature_index_journal_lookup\` which checks if a journal is included in the Nature Index list of 145 elite journals.

### 🧠 When to Use
Call \`nature_index_journal_lookup\` when the user asks:
- "Is [journal name] in the Nature Index?"
- "Is [journal name] tracked by Nature Index?"
- "Does Nature Index include [journal name]?"
- "Is [journal name] a Nature Index journal?"

### 🧩 Tool Call Format
{
  "journalName": "journal name (required)"
}

### 📊 Response Format
The tool returns:
- **found**: true/false
- **matchedName**: Exact journal name from the database (if found)
- **confidence**: Match confidence score (0-1)

### 🎯 Examples

**Example 1 — Journal Found**
*User*: "Is Nature in the Nature Index?"
*Tool Call*: \`nature_index_journal_lookup(journalName="Nature")\`
*Tool Output*:
\`\`\`json
{
  "found": true,
  "matchedName": "Nature",
  "confidence": 1.0
}
\`\`\`
*Assistant Answer*:
"Yes, **Nature** is included in the Nature Index list of 145 elite journals."

**Example 2 — Fuzzy Match**
*User*: "Is Plos Biology tracked?"
*Tool Call*: \`nature_index_journal_lookup(journalName="Plos Biology")\`
*Tool Output*:
\`\`\`json
{
  "found": true,
  "matchedName": "PLOS Biology",
  "confidence": 0.95
}
\`\`\`
*Assistant Answer*:
"Yes, **PLOS Biology** is included in the Nature Index."

**Example 3 — Not Found**
*User*: "Is Random Journal in Nature Index?"
*Tool Output*: \`{"found": false}\`
*Assistant Answer*:
"No, this journal is not included in the Nature Index list of 145 elite journals."

### ⚠️ Important Rules
1. **No Fabrication**: Only report what the tool returns
2. **Fuzzy Matching**: The tool handles typos automatically
3. **Binary Result**: Journals are either included or not - there's no ranking among the 145 journals
4. **No Documents**: Don't suggest policy documents for journal lookup queries

`;

const NATURE_INDEX_JOURNAL_RANKING_SYSTEM_PROMPT = `
=== NATURE INDEX JOURNALS RANKED BY JIF TOOL ===
You have access to a tool named \`nature_index_journal_list_with_jif\` which retrieves ALL 145 Nature Index journals with their JIF values and ranks them.

### 🧠 When to Use
**CRITICAL: ONLY use this tool when the user EXPLICITLY mentions "Nature Index" in their query.**

Call \`nature_index_journal_list_with_jif\` when the user asks to:
- **Rank** Nature Index journals by JIF/Impact Factor
- **List top N** Nature Index journals by JIF
- **Compare** Nature Index journals by impact factor
- Get the **highest JIF** journals in Nature Index
- Filter Nature Index journals by category (e.g., "Q1 Nature Index journals in ONCOLOGY")

**DO NOT use this tool for:**
- General journal queries (e.g., "suggest Q1 journals in ONCOLOGY") → Use \`jcr_journal_metric\` instead
- Queries that don't mention "Nature Index"


### 🧩 Tool Call Format
{
  "year": 2024,      // JCR year (optional, defaults to 2024)
  "limit": 10,       // Number of journals to return (optional, defaults to 10)
  "category": "ONCOLOGY"  // Filter by JCR category (optional, case-insensitive)
}

### 📊 Response Format
The tool returns journals **already sorted by JIF (highest first)**. You do NOT need to sort them yourself.

Always include:
- **Rank**: Position in the list (1 = highest JIF)
- **Journal Name**: Full journal name
- **JIF**: Impact Factor value
- **Quartile**: Q1-Q4 classification

### 🎯 Examples

**Example 1 — Top 10 by JIF**
*User*: "List top 10 Nature Index journals by JIF for 2024"
*Tool Call*: \`nature_index_journal_list_with_jif(year=2024, limit=10)\`
*Tool Output*:
\`\`\`json
{
  "found": true,
  "year": 2024,
  "journals": [
    {"journalName": "CA-A CANCER JOURNAL FOR CLINICIANS", "jifValue": 232.4, "jifQuartile": "Q1"},
    {"journalName": "NATURE REVIEWS MOLECULAR CELL BIOLOGY", "jifValue": 90.2, "jifQuartile": "Q1"},
    {"journalName": "THE LANCET", "jifValue": 88.5, "jifQuartile": "Q1"},
    ...
  ]
}
\`\`\`
*Assistant Answer*:
"Here are the top 10 Nature Index journals ranked by Journal Impact Factor (JIF) for 2024:

| Rank | Journal | JIF | Quartile |
|------|---------|-----|----------|
| 1 | CA-A CANCER JOURNAL FOR CLINICIANS | 232.4 | Q1 |
| 2 | NATURE REVIEWS MOLECULAR CELL BIOLOGY | 90.2 | Q1 |
| 3 | THE LANCET | 88.5 | Q1 |
..."

**Example 2 — Top 5 by JIF**
*User*: "What are the 5 highest impact factor journals in Nature Index?"
*Tool Call*: \`nature_index_journal_list_with_jif(year=2024, limit=5)\`

### ⚠️ Critical Rules
1. **Use This Tool for Ranking**: When user asks to rank/list Nature Index journals by JIF, ALWAYS use this tool
2. **DO NOT Guess Journals**: Never manually select journals like "Nature", "Science", "Cell" - use the tool
3. **Results Are Pre-Sorted**: The tool returns journals sorted by JIF (highest first) - present them in that order
4. **Table Format**: Use a table to display rankings clearly
5. **No Documents**: Don't suggest policy documents for journal ranking queries

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
            const hasEmail = args.email && args.email.trim().length > 0;
            const hasExpertise = args.expertise && args.expertise.trim().length > 0;
            const hasAcronym = args.acronym && args.acronym.trim().length > 0;

            // Reject if searching ALL of UTAR (no faculty specified) UNLESS:
            // - Searching by name, email, or expertise (allowed to search all of UTAR)
            // - Searching by acronym (tool will auto-detect faculty from lookup table)
            if ((faculty === 'All' || !faculty) && !hasName && !hasEmail && !hasExpertise && !hasAcronym) {
                const errorMsg = "Query too broad: Cannot search all staff across UTAR. Please specify a faculty (e.g., 'Lee Kong Chian Faculty of Engineering and Science') or department (e.g., 'Department of Mechatronics and Biomedical Engineering').";
                if (logger) logger(`[VALIDATION REJECTED]${errorMsg}`);
                return {
                    error: errorMsg,
                    validationFailed: true,
                    suggestion: "Please narrow your search to a specific faculty or department. Example: 'list professors in LKC FES' or 'who is the dean of Faculty of Science'"
                };
            }

            // Allow department='All' to search entire faculty (needed for Deans, etc.)
            const searchType = hasEmail ? `email: ${args.email} ` : hasName ? `name: ${args.name} ` : hasExpertise ? `expertise: ${args.expertise} ` : 'faculty-wide';
            if (logger) logger(`[VALIDATION PASSED] Staff search for faculty '${faculty}'(${searchType})`);

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
                        if (logger) logger(`[AUTO - CORRECTION] Detected department name "${args.department}" → Setting acronym = "${acronym}"`);
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
        if (name === 'utar_designation_stats') {
            if (logger) logger(`[utar_designation_stats] Getting stats for ${args.acronym}, designation: ${args.designation || 'All'}`);
            const result = queryDesignationStats(args, logger);

            // Log the exact counts to help prevent hallucinations
            if (result && result.designationCounts) {
                const counts = result.designationCounts;
                if (logger) {
                    logger(`[utar_designation_stats] EXACT COUNTS RETURNED:`);
                    logger(`  - Senior Professor: ${counts['Senior Professor'] || 0}`);
                    logger(`  - Professor: ${counts['Professor'] || 0}`);
                    logger(`  - Associate Professor: ${counts['Associate Professor'] || 0}`);
                    logger(`  - Assistant Professor: ${counts['Assistant Professor'] || 0}`);
                    logger(`  - Lecturer: ${counts['Lecturer'] || 0}`);
                    logger(`[WARNING] DO NOT swap Professor (${counts['Professor'] || 0}) with Senior Professor (${counts['Senior Professor'] || 0})!`);
                }
            }

            return result;
        }
        if (name === 'utar_compare_designations') {
            if (logger) logger(`[utar_compare_designations] Comparing ${args.designation} in ${args.acronym}`);
            return compareDesignationsAcrossDepartments(args, logger);
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
        if (name === 'jcr_search_by_category') {
            // Ensure data is loaded
            await ensureJcrCacheLoaded();

            if (!args.category) {
                return { found: false, error: 'Category is required' };
            }

            const year = args.year || 2025;
            const limit = args.limit || 10;
            const minQuartile = args.minQuartile;

            if (logger) logger(`[jcr_search_by_category] Searching category: "${args.category}", year: ${year}, limit: ${limit}${minQuartile ? `, min quartile: ${minQuartile}` : ''}`);

            return await searchJournalsByCategory(args.category, year, limit, minQuartile);
        }
        if (name === 'nature_index_lookup') {
            // Ensure data is loaded
            await ensureNatureIndexCacheLoaded();

            // Case 1: Country filter (get top N institutions by country)
            if (args.country && !args.query) {
                const limit = args.limit || 10;
                const institutions = getInstitutionsByCountry(args.country, limit);

                if (institutions.length === 0) {
                    return {
                        found: false,
                        reason: `No institutions found for country: ${args.country}. Please check the country name.`
                    };
                }

                return {
                    found: true,
                    institutions: institutions,
                    count: institutions.length,
                    country: args.country
                };
            }

            // Case 2: Institution name lookup
            if (args.query) {
                return getInstitutionByName(args.query);
            }

            return { found: false, error: 'Please provide either an institution name (query) or a country filter' };
        }
        if (name === 'nature_index_journal_list_with_jif') {
            // Ensure both caches are loaded
            await ensureNatureIndexJournalCacheLoaded();
            await ensureJcrCacheLoaded();

            const year = args.year || 2024;
            const limit = args.limit || 10;
            const categoryFilter = args.category ? args.category.toLowerCase().trim() : null;

            if (logger) logger(`[nature_index_journal_list_with_jif] Getting Nature Index journals with JIF for year ${year}, limit ${limit}${categoryFilter ? `, category filter: "${categoryFilter}"` : ''}`);

            // Get all Nature Index journals
            const natureIndexJournals = getAllNatureIndexJournals();

            if (natureIndexJournals.length === 0) {
                return { found: false, error: 'No Nature Index journals found in cache' };
            }

            // Look up JIF for each journal
            const journalsWithJif: Array<{
                journalName: string;
                jifValue: number | null;
                jifQuartile: string | null;
                categories: string[];
            }> = [];

            for (const journal of natureIndexJournals) {
                const jcrResult = getJournalMetricsByTitle(journal.journalName, [year]);

                if (jcrResult.found && jcrResult.metrics && jcrResult.metrics.length > 0) {
                    const metric = jcrResult.metrics[0];
                    const categories = metric.categories.map(c => c.category);

                    // Apply category filter if specified
                    if (categoryFilter) {
                        const hasMatchingCategory = categories.some(cat =>
                            cat.toLowerCase().includes(categoryFilter)
                        );
                        if (!hasMatchingCategory) {
                            continue; // Skip this journal if it doesn't match the category filter
                        }
                    }

                    journalsWithJif.push({
                        journalName: journal.journalName,
                        jifValue: metric.jifValue,
                        jifQuartile: metric.bestQuartile,
                        categories: categories
                    });
                } else if (!categoryFilter) {
                    // Only include journals without JCR data if no category filter is specified
                    journalsWithJif.push({
                        journalName: journal.journalName,
                        jifValue: null,
                        jifQuartile: null,
                        categories: []
                    });
                }
            }

            // Sort by JIF (highest first), null values go to the end
            journalsWithJif.sort((a, b) => {
                if (a.jifValue === null && b.jifValue === null) return 0;
                if (a.jifValue === null) return 1;
                if (b.jifValue === null) return -1;
                return b.jifValue - a.jifValue;
            });

            // Limit results
            const topJournals = journalsWithJif.slice(0, limit);

            if (logger) logger(`[nature_index_journal_list_with_jif] Returning top ${topJournals.length} journals${categoryFilter ? ` in category "${categoryFilter}"` : ''}`);

            return {
                found: true,
                year,
                totalNatureIndexJournals: natureIndexJournals.length,
                journalsWithJif: topJournals.length,
                journalsWithoutJif: journalsWithJif.filter(j => j.jifValue === null).length,
                journals: topJournals
            };
        }
        if (name === 'nature_index_journal_lookup') {
            // Ensure data is loaded
            await ensureNatureIndexJournalCacheLoaded();

            if (!args.journalName) {
                return { found: false, error: 'Journal name is required' };
            }

            return checkJournalInNatureIndex(args.journalName);
        }
        return { error: `Unknown tool: ${name} ` };
    } catch (error: any) {
        console.error(`[RAG] Tool execution error(${name}): `, error);
        if (logger) logger(`Error executing ${name}: ${error.message} `);
        return { error: error.message || 'Internal tool error' };
    }
}

/**
 * Process a RAG query and generate a response
 */
export async function processRAGQuery(query: RAGQuery, onChunk?: (token: string) => void): Promise<RAGResponse> {
    const startTime = Date.now(); // Start timer
    const debugLogs: string[] = []; // Capture activity for debugging
    const log = (msg: string) => {
        console.log(`[RAG] ${msg} `);
        debugLogs.push(msg);
    };

    try {
        log(`Processing query: "${query.query}" for role: ${query.userRole} `);

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

            chatHistoryStr = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content} `).join('\n');

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
                //     log(`Skipped contextualization(query contains acronym)`);
                // }
                log(`Skipped contextualization(disabled for performance)`);
            }
        } else if (isSimpleQuestion) {
            log(`Skipped contextualization(simple standalone question)`);
        }
        log(`⏱️ Step 1(Contextualization): ${((Date.now() - t1) / 1000).toFixed(2)} s`);

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
        let documentLibraryEntries: any[] = []; // Document Library entries (Keyword)
        let documentLibraryVectors: any[] = []; // Document Library entries (Vector)
        const accessLevels = getAccessibleLevels(query.userRole);

        if (isStaffQuery) {
            log(`⏱️ Steps 2 - 4(Skipped for staff query): 0.00s`);
            log('  - Detected staff directory query, bypassing RAG for performance');
        } else {
            // 2. INTENT CLASSIFICATION (Fast regex-based)
            const t2 = Date.now();
            const { classifyQueryIntent, shouldSuppressKnowledgeNotes } = await import('./intentClassification');
            const intentResult = classifyQueryIntent(effectiveQuery);

            log(`🎯 Intent Classification: ${intentResult.intent.toUpperCase()} `);
            log(`   Confidence: ${intentResult.confidence} `);
            log(`   Reasoning: ${intentResult.reasoning} `);
            if (intentResult.matchedPatterns.length > 0) {
                log(`   Matched patterns: ${intentResult.matchedPatterns.join(', ')} `);
            }

            // Check if we should suppress knowledge notes
            const toolNames = AVAILABLE_TOOLS.map(t => t.function.name);
            const suppressionDecision = shouldSuppressKnowledgeNotes(
                intentResult.intent,
                intentResult.confidence,
                toolNames
            );

            log(`📋 Knowledge Note Suppression: ${suppressionDecision.suppress ? 'YES' : 'NO'} `);
            log(`   Reason: ${suppressionDecision.reason} `);
            log(`   Available tools: ${toolNames.join(', ')} `);

            // 3-4. PARALLELIZED: Generate embedding + Search knowledge notes + Vector search
            // 3-4. PARALLELIZED: Generate embedding + Search knowledge notes + Vector search
            const t3 = Date.now();

            // Optimization: Generate embedding once and reuse
            const embeddingPromise = generateEmbedding(effectiveQuery);

            [embedding, knowledgeNotes, relevantChunks, documentLibraryEntries, documentLibraryVectors] = await Promise.all([
                embeddingPromise,
                // Conditionally skip knowledge note search for data queries with tools
                suppressionDecision.suppress
                    ? Promise.resolve([])  // Skip knowledge notes
                    : searchKnowledgeNotes(effectiveQuery, accessLevels, 3),
                // Vector search needs embedding
                embeddingPromise.then(emb => searchSimilarDocuments(emb, accessLevels, 5)),
                // Document Library: Hybrid Search (Keyword + Vector)
                searchDocumentLibrary(effectiveQuery, accessLevels, 3),
                embeddingPromise.then(emb => searchDocumentLibraryVectors(emb, accessLevels, 3))
            ]);

            // ---------------------------------------------------------
            // 5. SEMANTIC FILTERING (Cleanup Keyword Search Noise)
            // ---------------------------------------------------------
            if (knowledgeNotes.length > 0) {
                try {
                    const titles = knowledgeNotes.map(n => n.title);
                    const titleEmbeddings = await generateEmbeddings(titles);

                    const filteredNotes = knowledgeNotes.filter((note, index) => {
                        const sim = cosineSimilarity(embedding, titleEmbeddings[index]);
                        return sim > 0.75; // Threshold for relevant topic
                    });

                    if (filteredNotes.length < knowledgeNotes.length) {
                        log(`  ✂️ Filtered ${knowledgeNotes.length - filteredNotes.length} irrelevant knowledge notes (Semantic < 0.75)`);
                        knowledgeNotes = filteredNotes;
                    }
                } catch (err) {
                    console.error("Semantic filtering for Knowledge Notes failed:", err);
                }
            }

            // Merge Vector results into Document Library Entries (deduplicating by ID)
            // This ensures we get both exact keyword matches and semantic matches
            if (documentLibraryVectors && documentLibraryVectors.length > 0) {
                const existingIds = new Set(documentLibraryEntries.map((e: any) => e.id));
                let newFromVector = 0;

                documentLibraryVectors.forEach((vec: any) => {
                    const docId = vec.metadata.documentLibraryId;
                    if (docId && !existingIds.has(docId)) {
                        // Map flat metadata back to structural entry format
                        documentLibraryEntries.push({
                            id: docId,
                            documentTitle: vec.metadata.documentTitle,
                            title: vec.metadata.title,
                            content: vec.metadata.content,
                            department: vec.metadata.department,
                            documentType: vec.metadata.documentType,
                            sourceFile: vec.metadata.sourceFile, // CRITICAL: For download links
                            // Source: vector
                        });
                        existingIds.add(docId);
                        newFromVector++;
                    }
                });
                if (newFromVector > 0) {
                    log(`  + Merged ${newFromVector} semantic results from Document Library`);
                }
            }

            // Semantic Filtering for Document Library (same as Knowledge Notes)
            // Filter out entries where documentTitle doesn't semantically match the query
            if (documentLibraryEntries.length > 0) {
                try {
                    const titles = documentLibraryEntries.map((e: any) => e.documentTitle || e.title);
                    const titleEmbeddings = await generateEmbeddings(titles);

                    const filteredEntries = documentLibraryEntries.filter((entry: any, index: number) => {
                        const sim = cosineSimilarity(embedding, titleEmbeddings[index]);
                        return sim > 0.70; // Slightly lower threshold than Knowledge Notes (0.75)
                    });

                    if (filteredEntries.length < documentLibraryEntries.length) {
                        log(`  ✂️ Filtered ${documentLibraryEntries.length - filteredEntries.length} irrelevant Document Library entries (Semantic < 0.70)`);
                        documentLibraryEntries = filteredEntries;
                    }
                } catch (err) {
                    console.error("Semantic filtering for Document Library failed:", err);
                }
            }

            log(`⏱️ Step 2(Intent Classification): ${((t3 - t2) / 1000).toFixed(2)} s`);
            log(`⏱️ Steps 3 - 4(Parallel: Embedding + Knowledge + Vector): ${((Date.now() - t3) / 1000).toFixed(2)} s`);
            log(`  - Found ${knowledgeNotes.length} knowledge notes${suppressionDecision.suppress ? ' (suppressed)' : ''} `);
            log(`  - Found ${relevantChunks.length} document chunks`);
            log(`  - Found ${documentLibraryEntries.length} Document Library entries (Hybrid)`);
        }

        // 6. Prepare context
        let baseContextStrings: string[] = [];
        const formattedContentMap = new Map<string, string>(); // Store for response validation

        if (knowledgeNotes.length > 0) {
            log(`📝 Knowledge Notes being sent to LLM: `);
            knowledgeNotes.forEach((note, idx) => {
                log(`  ${idx + 1}."${note.title}"(${note.content.length} chars)`);
                log(`     FULL CONTENT: \n${note.content} `);
            });

            // SYSTEMIC SOLUTION: Format knowledge notes based on admin-selected formatType
            // This respects the admin's choice from the UI instead of auto-detecting
            const formattedNotes = knowledgeNotes.map(note => {
                let formattedContent = note.content;
                const formatType = (note as any).formatType || 'auto';

                log(`🔧 Formatting "${note.title}" as: ${formatType} `);

                switch (formatType) {
                    case 'table':
                        // Convert to markdown table for tiered data
                        formattedContent = convertToTable(note.content);
                        break;

                    case 'quote':
                        // Wrap in block quote
                        formattedContent = `> ${note.content.split('\n').join('\n> ')} `;
                        break;

                    case 'code':
                        // Wrap in code block
                        formattedContent = `\`\`\`\n${note.content}\n\`\`\``;
                        break;

                    case 'list':
                        // Convert to bullet list
                        const lines = note.content.split('\n').filter((l: string) => l.trim().length > 0);
                        formattedContent = lines.map((l: string) => `- ${l.trim()}`).join('\n');
                        break;

                    case 'auto':
                        // Auto-detect: check for tiers
                        const hasTiers = note.content.match(/→|–/g);
                        if (hasTiers && hasTiers.length >= 2) {
                            formattedContent = convertToTable(note.content);
                        }
                        // Otherwise keep as-is
                        break;

                    case 'prose':
                    default:
                        // No formatting, use as-is
                        break;
                }

                // Store formatted content for later reuse
                formattedContentMap.set(note.title, formattedContent);

                // Add linked documents info if available
                let linkedDocsInfo = '';
                if ((note as any).linkedDocuments && Array.isArray((note as any).linkedDocuments) && (note as any).linkedDocuments.length > 0) {
                    const docNames = (note as any).linkedDocuments.map((doc: any) => doc.originalName).join(', ');
                    linkedDocsInfo = `\n\n**Related Documents:** ${docNames}`;
                }

                return `[Priority Knowledge: ${note.title}]${linkedDocsInfo}\n${formattedContent}`;
            });

            baseContextStrings.push(...formattedNotes);
        }

        // Add Document Library entries to context
        if (documentLibraryEntries.length > 0) {
            log(`📝 Document Library entries being sent to LLM: `);
            documentLibraryEntries.forEach((entry, idx) => {
                log(`  ${idx + 1}."${entry.documentTitle} - ${entry.title}"`);
                log(`     FULL CONTENT: \n${entry.content} `);
            });

            const formattedDocEntries = documentLibraryEntries.map(entry => {
                // Return formatted entry with metadata
                // Tables are already in markdown format in the content
                return `[Document: ${entry.documentTitle || ''} - ${entry.title}]\n(Department: ${entry.department || 'N/A'}, Type: ${entry.documentType || 'N/A'})\n\n${entry.content}`;
            });

            baseContextStrings.push(...formattedDocEntries);
        }

        if (relevantChunks.length > 0) {
            // Helper function was moved to module scope
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
        const hasNatureIndexTool = localTools.some(t => t.function.name === 'nature_index_lookup');
        const hasNatureIndexJournalTool = localTools.some(t => t.function.name === 'nature_index_journal_lookup');

        if (hasStaffTool && !baseSystemPrompt.includes('utar_staff_search')) {
            baseSystemPrompt += `\n\n${STAFF_SEARCH_SYSTEM_PROMPT}`;
        }

        if (hasJcrTool && !baseSystemPrompt.includes('jcr_journal_metric')) {
            baseSystemPrompt += `\n\n${JCR_SYSTEM_PROMPT}`;
        }

        if (hasNatureIndexTool && !baseSystemPrompt.includes('nature_index_lookup')) {
            baseSystemPrompt += `\n\n${NATURE_INDEX_SYSTEM_PROMPT}`;
        }

        if (hasNatureIndexJournalTool && !baseSystemPrompt.includes('nature_index_journal_lookup')) {
            baseSystemPrompt += `\n\n${NATURE_INDEX_JOURNAL_SYSTEM_PROMPT}`;
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

4. **MARKDOWN TABLE OUTPUT (MANDATORY)**:
   - **CRITICAL**: If the context contains a markdown table (with pipe symbols), you MUST copy and paste the ENTIRE table exactly as shown.
   - DO NOT convert tables to numbered lists, bullet points, or plain text.
   - DO NOT summarize or reformat table data.
   - PRESERVE the exact table structure with all rows and columns.
   - If you see a table in the context, your response MUST include that same table in markdown format.
   - **SPECIAL RULE**: If you see "**COMPLETE TIER STRUCTURE (use all rows):**" followed by a table, you MUST output that EXACT table in your response. Do not convert it to a list.

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
${baseContext.length > 0 ? baseContext : "No relevant policy documents found."}

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

            let message;

            if (onChunk) {
                // STREAMING MODE
                const stream = await openai.chat.completions.create({
                    model: activeModel,
                    messages: messages,
                    tools: localTools.length > 0 ? localTools : undefined,
                    tool_choice: localTools.length > 0 ? 'auto' : undefined,
                    temperature: 0.7,
                    max_tokens: 4000,
                    stream: true,
                });

                let fullContent = '';
                const toolCallsMap = new Map<number, any>();

                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta;
                    if (!delta) continue;

                    // Stream content if available
                    if (delta.content) {
                        fullContent += delta.content;
                        onChunk(delta.content);
                    }

                    // Accumulate tool calls
                    if (delta.tool_calls) {
                        for (const tc of delta.tool_calls) {
                            if (!toolCallsMap.has(tc.index)) {
                                toolCallsMap.set(tc.index, {
                                    id: tc.id,
                                    type: tc.type,
                                    function: { ...tc.function, arguments: '' }
                                });
                            }

                            const existing = toolCallsMap.get(tc.index);
                            if (tc.function?.name) existing.function.name = tc.function.name;
                            if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                        }
                    }
                }

                // Construct message object compatible with ChatCompletionMessage
                message = {
                    role: 'assistant',
                    content: fullContent || null,
                    tool_calls: toolCallsMap.size > 0 ? Array.from(toolCallsMap.values()) : undefined
                };

                log(`⏱️ LLM streaming finished (#${loopCount + 1}): ${((Date.now() - tLoop) / 1000).toFixed(2)}s`);

            } else {
                // NON-STREAMING MODE
                const completion = await openai.chat.completions.create({
                    model: activeModel,
                    messages: messages,
                    tools: localTools.length > 0 ? localTools : undefined,
                    tool_choice: localTools.length > 0 ? 'auto' : undefined,

                    temperature: 0.7,
                    max_tokens: 4000,
                });
                log(`⏱️ LLM call #${loopCount + 1}: ${((Date.now() - tLoop) / 1000).toFixed(2)}s`);

                totalTokens += completion.usage?.total_tokens || 0;
                message = completion.choices[0].message;
            }

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

        // DISABLED: Add linked documents from knowledge notes to sources
        // REASON: This was too aggressive - it added documents even when the Knowledge Note
        // wasn't actually used in the LLM's response, causing source pollution.
        // The LLM should cite what it actually uses via the response parsing logic.
        /*
        if (knowledgeNotes.length > 0) {
            log(`Processing ${knowledgeNotes.length} knowledge notes for linked documents...`);
            knowledgeNotes.forEach((note: any) => {
                log(`  📋 Knowledge note: "${note.title}"`);

                if (note.linkedDocuments && Array.isArray(note.linkedDocuments)) {
                    log(`     Adding ${note.linkedDocuments.length} linked documents`);
                    note.linkedDocuments.forEach((doc: any) => {
                        // Check if document is already in sources
                        const alreadyInSources = sourcesToEnrich.some(s => s.documentId === doc.id);
                        if (!alreadyInSources) {
                            sourcesToEnrich.push({
                                filename: doc.filename,
                                accessLevel: doc.accessLevel || 'member',
                                documentId: doc.id,
                                originalName: doc.originalName,
                                relevanceScore: 0.9
                            });
                            log(`       ✅ Added: ${doc.originalName}`);
                        }
                    });
                }
            });
        }
        */

        // Add Document Library entries as references (Traceability)
        // Deduplicate by documentTitle to avoid showing same PDF multiple times
        // CRITICAL FIX: Use normal relevance score (0.7) to allow content-based filtering
        // Frontend will only show documents that are mentioned in the LLM's response
        if (documentLibraryEntries.length > 0) {
            log(`Processing ${documentLibraryEntries.length} Document Library entries for references...`);
            const seenDocTitles = new Set<string>();

            documentLibraryEntries.forEach((entry: any) => {
                if (entry.sourceFile && entry.documentTitle) {
                    // Skip if we've already added this document
                    if (seenDocTitles.has(entry.documentTitle)) {
                        return;
                    }

                    const alreadyInSources = sourcesToEnrich.some(s => s.documentId === entry.id);
                    if (!alreadyInSources) {
                        // Ensure filename has .pdf extension for download
                        const filename = entry.sourceFile.endsWith('.pdf')
                            ? entry.sourceFile
                            : `${entry.sourceFile}.pdf`;

                        // Use documentTitle (e.g. "QP-IPSR-PSU-003...") as the display name
                        const originalName = entry.documentTitle || entry.title;

                        sourcesToEnrich.push({
                            filename: filename,
                            // Use entry access level? usually stored as array. Take first or default.
                            accessLevel: (entry.accessLevel && entry.accessLevel[0]) ? entry.accessLevel[0] : 'member',
                            documentId: entry.id,
                            originalName: originalName,
                            relevanceScore: 0.7
                        });
                        seenDocTitles.add(entry.documentTitle);
                        log(`       ✅ Added Document Library Reference: ${originalName}`);
                    }
                }
            });
        }

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

                // FIRST: Check if the note content was actually used in the response
                // Extract unique phrases (3+ words) from note content
                const contentPhrases = noteContentLower
                    .split(/[.!?\n]+/)
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.split(/\s+/).length >= 3)
                    .slice(0, 5); // Check first 5 phrases

                // Check if any significant phrase from the note appears in response
                const noteWasUsed = contentPhrases.some((phrase: string) => {
                    // For phrases, check if at least 60% of words appear in response
                    const words = phrase.split(/\s+/).filter((w: string) => w.length > 3);
                    if (words.length === 0) return false;
                    const matchCount = words.filter((w: string) => responseLower.includes(w)).length;
                    return (matchCount / words.length) >= 0.6;
                });

                // Skip tier validation if note wasn't actually used
                if (!noteWasUsed) {
                    return;
                }

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
                                // Use the formatted content that was already generated
                                const formattedContent = formattedContentMap.get(note.title);
                                if (formattedContent) {
                                    const completeAnswer = `Based on the policy, here is the complete breakdown:\n\n${formattedContent}\n\nFor more details, please refer to the official policy document.`;
                                    finalResponse = completeAnswer;
                                    log(`✅ Response corrected with complete formatted structure`);
                                } else {
                                    // Fallback to plain text if formatted content not found
                                    const completeAnswer = `Based on the policy, here is the complete breakdown:\n\n${tierLines.join('\n')}\n\n` +
                                        `For more details, please refer to the official policy document.`;
                                    finalResponse = completeAnswer;
                                    log(`✅ Response corrected with complete tiered structure`);
                                }
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
            console.log(`[Enrich] ⚠️  No DB match for: ${source.filename} (documentId: ${source.documentId || 'none'}) - using filename or existing name`);
            return {
                ...source,
                originalName: source.originalName || source.filename, // Use existing name if available, otherwise filename
            };
        });

        return enriched;
    } catch (error) {
        console.error('Error enriching sources with metadata:', error);
        return sources;
    }
}

// Helper function to convert content to markdown table
function convertToTable(content: string): string {
    const lines = content.split('\n');
    const tierLines: string[] = [];

    lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Detect tier patterns (including -> arrows)
        if (trimmed.match(/^(\d+\.|Below|RM\s*\d+)/i) || trimmed.includes('→') || trimmed.includes('–') || trimmed.includes('->')) {
            tierLines.push(trimmed);
        } else if (trimmed.length > 0 && !trimmed.match(/^(Training|Subject|Summary|Multiple|Annual|further|Service bond)/i)) {
            // Continuation of previous tier
            if (tierLines.length > 0) {
                tierLines[tierLines.length - 1] += ' ' + trimmed;
            }
        }
    });

    // Build markdown table if we found tiers
    if (tierLines.length >= 2) {
        let tableContent = '\n\n**COMPLETE TIER STRUCTURE (use all rows):**\n\n';
        tableContent += '| Tier | Requirement |\n';
        tableContent += '|------|-------------|\n';

        tierLines.forEach((tier: string) => {
            // Parse tier into parts (handle both → and ->)
            const parts = tier.split(/→|–|->|:/);
            if (parts.length >= 2) {
                const left = parts[0].replace(/^\d+\.\s*/, '').trim();
                const right = parts[1].trim();
                tableContent += `| ${left} | ${right} |\n`;
            } else {
                tableContent += `| ${tier} | - |\n`;
            }
        });

        // Return ONLY the table, not the original content (to avoid duplication)
        return tableContent;
    }

    return content;
}

