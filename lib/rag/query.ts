import { OpenAI } from 'openai';
import { generateEmbedding } from './embeddings';
import { searchSimilarDocuments } from './vectorStore';
import { getAccessibleLevels } from '@/lib/utils';
import { RAGQuery, RAGResponse, DocumentSource } from '@/types';
import { prisma } from '@/lib/db';
import { getRelatedDocuments } from './suggestions';
import { searchKnowledgeNotes } from './knowledgeSearch';
import { resolveUnit, searchStaff } from '@/lib/tools';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// --- UTAR Staff Search Tool Definitions ---
const STAFF_SEARCH_TOOLS = [
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
            description: 'Performs live staff lookups from the UTAR Staff Directory.',
            parameters: {
                type: 'object',
                properties: {
                    faculty: { type: 'string', description: 'Canonical faculty name from utar_resolve_unit (or "All").' },
                    department: { type: 'string', description: 'Department name (optional).' },
                    name: { type: 'string', description: 'Staff name.' },
                    expertise: { type: 'string', description: 'Research area/expertise.' }
                },
                required: ['faculty']
            }
        }
    }
];

const STAFF_SEARCH_SYSTEM_PROMPT = `
=== UTAR STAFF SEARCH TOOLS ===
You have access to two MCP tools:
1. utar_resolve_unit: converts acronyms (CCR, CHST, FSc) into official UTAR names.
2. utar_staff_search: performs live staff lookups.

WHEN TO USE:
- When the user asks about UTAR staff (names, positions, chairs, heads, deans, emails), ALWAYS use the tools.

LOGIC:
- If the query includes an acronym or unit name:
  1. FIRST call \`utar_resolve_unit\`.
  2. THEN pass the returned "canonical" name into \`utar_staff_search.faculty\`.
- Parameter mapping:
  - Unit mentioned -> faculty
  - Department mentioned -> department
  - Person name -> name
  - Research area -> expertise
- Leave unmentioned fields empty string.

AFTER RESULT:
- Choose the most relevant person, especially matching titles (Chairperson, Head, Dean, Director).
- **CRITICAL**: When presenting staff information, include ALL relevant details from the tool result:
  * Name and designation (e.g., Associate Professor)
  * **Administrative Post** (e.g., "Head of Department") - THIS IS CRUCIAL
  * Department/Faculty
  * Email address
  * Academic profile links (Google Scholar, Scopus, ORCID, personal homepage) if available
- Present this information in a natural, structured format.
- Do NOT omit the administrative post or profile links if they are present in the tool response.
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

        // Ensure Tool Instructions are present
        if (!baseSystemPrompt.includes('utar_staff_search')) {
            baseSystemPrompt += `\n\n${STAFF_SEARCH_SYSTEM_PROMPT}`;
            log('Appended staff search tool instructions.');
        }

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
                tools: STAFF_SEARCH_TOOLS,
                tool_choice: 'auto',
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
