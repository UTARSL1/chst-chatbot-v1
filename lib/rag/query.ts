import { OpenAI } from 'openai';
import { generateEmbedding } from './embeddings';
import { searchSimilarDocuments } from './vectorStore';
import { getAccessibleLevels } from '@/lib/utils';
import { RAGQuery, RAGResponse, DocumentSource } from '@/types';
import { prisma } from '@/lib/db';
import { getRelatedDocuments } from './suggestions';
import { searchKnowledgeNotes } from './knowledgeSearch';
import { resolveUnit, searchStaff } from '@/lib/tools';
import { getJournalMetricsByTitle, getJournalMetricsByIssn, ensureJcrCacheLoaded } from '@/lib/jcrCache';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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
                    department: { type: 'string', description: 'Department name (optional).' },
                    name: { type: 'string', description: 'Staff member\'s actual name (e.g., "John Smith"). DO NOT use administrative titles like Dean, Head, Director, Chairperson as names.' },
                    expertise: { type: 'string', description: 'Research area/expertise (optional).' }
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
You have access to two MCP tools:
1. utar_resolve_unit: converts acronyms (CCR, CHST, FSc) into official UTAR names.
2. utar_staff_search: performs live staff lookups.

WHEN TO USE:
- When the user asks about UTAR staff (names, positions, chairs, heads, deans, emails), ALWAYS use the tools.

**CRITICAL: ADMINISTRATIVE TITLES ARE NOT NAMES**
- Words like "Dean", "Deputy Dean", "Head", "Director", "Chairperson", "Chair" are ADMINISTRATIVE POSITIONS, NOT people's names.
- When user asks "who is the Dean of LKCFES" or "who is the Chairperson of CCSN":
  * DO NOT pass "Dean" or "Chairperson" as the "name" parameter
  * Instead, search by faculty/department only (leave name empty)
  * The tool will return staff with their administrative posts
  * Then YOU filter/select the person whose administrativePost matches what user asked for

LOGIC:
- If the query includes an acronym or unit name:
  1. FIRST call \`utar_resolve_unit\`.
  2. THEN pass the returned "canonical" name into \`utar_staff_search.faculty\`.
- Parameter mapping:
  - Unit mentioned -> faculty
  - Department mentioned -> department
  - **Actual person name** (e.g., "Dr. John Smith") -> name
  - Administrative title (Dean, Head, Chair) -> **DO NOT use in "name" field, search by faculty/dept only**
  - Research area -> expertise
- Leave unmentioned fields as empty string.
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
            return await searchStaff(args, logger);
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
    const debugLogs: string[] = []; // Capture activity for debugging
    const log = (msg: string) => {
        console.log(`[RAG] ${msg}`);
        debugLogs.push(msg);
    };

    try {
        log(`Processing query: "${query.query}" for role: ${query.userRole}`);

        // 1. Contextualize the query
        let effectiveQuery = query.query;
        let chatHistoryStr = '';

        if (query.sessionId) {
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
                const rewritten = await contextualizeQuery(query.query, history);
                if (rewritten && rewritten !== query.query) {
                    effectiveQuery = rewritten;
                    log(`Contextualized query: "${effectiveQuery}"`);
                }
            }
        }

        // 2. Generate embedding
        const embedding = await generateEmbedding(effectiveQuery);
        log('Generated query embedding.');

        // 3. Define access levels
        const accessLevels = getAccessibleLevels(query.userRole);

        // 4. Retrieve Priority Knowledge Notes
        const knowledgeNotes = await searchKnowledgeNotes(effectiveQuery, accessLevels, 3);
        log(`Found ${knowledgeNotes.length} knowledge notes.`);

        // 5. Retrieve Document Chunks
        const relevantChunks = await searchSimilarDocuments(embedding, accessLevels, 5);
        log(`Found ${relevantChunks.length} relevant document chunks.`);

        // 6. Prepare context
        let baseContextStrings: string[] = [];
        if (knowledgeNotes.length > 0) {
            baseContextStrings.push(
                knowledgeNotes.map((note) => `[Priority Knowledge: ${note.title}]\n${note.content}`).join('\n\n---\n\n')
            );
        }
        if (relevantChunks.length > 0) {
            baseContextStrings.push(
                relevantChunks.map((chunk) => `[Source: ${chunk.metadata.originalName || chunk.metadata.filename}]\n${chunk.content}`).join('\n\n---\n\n')
            );
        }

        const baseContext = baseContextStrings.join('\n\n=== === ===\n\n');

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


        // --- TOOL PERMISSION CHECK ---
        let localTools = AVAILABLE_TOOLS;
        try {
            const permissions = await prisma.toolPermission.findMany();
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

        const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        // Retrieve System Prompt from DB
        let baseSystemPrompt = '';
        try {
            const dbPrompt = await prisma.systemPrompt.findUnique({
                where: { name: 'default_rag' }
            });
            if (dbPrompt?.content) {
                baseSystemPrompt = dbPrompt.content;
                log('Loaded system prompt from database.');
            }
        } catch (e) {
            log('Failed to fetch system prompt from DB, using fallback.');
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
        log(`System Prompt configured. Staff Tool: ${hasStaffTool}, JCR Tool: ${hasJcrTool}`);

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




        while (runLoop && loopCount < 5) {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
                tools: localTools.length > 0 ? localTools : undefined, // Only pass tools if any are allowed
                tool_choice: localTools.length > 0 ? 'auto' : undefined,

                temperature: 0.7,
                max_tokens: 1000,
            });

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

                    const result = await executeToolCall(toolName, toolArgs, log); // Pass logger

                    log(`Tool Result (${toolName}): ${JSON.stringify(result).substring(0, 100)}...`);

                    messages.push({
                        role: 'tool',
                        tool_call_id: call.id,
                        content: JSON.stringify(result)
                    });
                }
            } else {
                finalResponse = message.content || '';
                runLoop = false;
                log('Received final response from LLM.');
            }
            loopCount++;
        }

        // 9. Suggestions
        const referencedDocIds = relevantChunks.map(c => c.metadata.documentId).filter(Boolean);
        const relatedDocs = await getRelatedDocuments({
            referencedDocIds,
            userRole: query.userRole,
            referencedChunks: relevantChunks
        });

        // 10. Enrich sources
        const sourcesToEnrich: DocumentSource[] = relevantChunks.map(chunk => ({
            filename: chunk.metadata.filename,
            accessLevel: chunk.metadata.accessLevel,
            documentId: chunk.metadata.documentId,
            originalName: chunk.metadata.originalName,
            pageNumber: chunk.metadata.pageNumber,
            relevanceScore: (chunk as any).score
        }));

        const enrichedSources = await enrichSourcesWithMetadata(sourcesToEnrich);

        if (!finalResponse) {
            finalResponse = "I apologize, but I was unable to generate a response. This may be because I do not have permission to access the necessary tools or data to answer your question.";
        }

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
Check for pronouns (it, they, he, she) and replace them with the entities they refer to.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
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
        const filenames = [...new Set(sources.map(s => s.filename))];
        const documents = await prisma.document.findMany({
            where: {
                OR: [
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

        const docMap = new Map();
        documents.forEach(doc => {
            docMap.set(doc.filename, doc);
            docMap.set(doc.originalName, doc);
        });

        const enriched = sources.map(source => {
            const doc = docMap.get(source.filename);
            if (doc) {
                return {
                    ...source,
                    documentId: doc.id,
                    originalName: doc.originalName,
                    category: doc.category,
                    department: doc.department || undefined,
                };
            }
            return source;
        });

        return enriched;
    } catch (error) {
        console.error('Error enriching sources with metadata:', error);
        return sources;
    }
}
