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
- Answer in natural language.
`;

/**
 * Execute a tool call locally (Ported for Vercel/Cloud Support)
 * Replaces external MCP server HTTP calls with direct internal function calls.
 */
async function executeToolCall(name: string, args: any): Promise<any> {
    console.log(`[RAG] Executing Internal Tool: ${name}`, args);
    try {
        if (name === 'utar_resolve_unit') {
            return resolveUnit(args.query);
        }
        if (name === 'utar_staff_search') {
            return await searchStaff(args);
        }
        return { error: `Unknown tool: ${name}` };
    } catch (error: any) {
        console.error(`[RAG] Tool execution error (${name}):`, error);
        return { error: error.message || 'Internal tool error' };
    }
}

/**
 * Process a RAG query and generate a response
 * @param query - User query with role information
 * @returns RAG response with answer and sources
 */
export async function processRAGQuery(query: RAGQuery): Promise<RAGResponse> {
    try {
        // 1. Contextualize the query using chat history
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
                effectiveQuery = await contextualizeQuery(query.query, history);
            }
        }

        console.log(`[RAG] Processing query: "${effectiveQuery}" for role: ${query.userRole}`);

        // 2. Generate embedding for relevance search
        const embedding = await generateEmbedding(effectiveQuery);

        // 3. Define access levels
        const accessLevels = getAccessibleLevels(query.userRole);

        // 4. Retrieve Priority Knowledge Notes
        const knowledgeNotes = await searchKnowledgeNotes(effectiveQuery, accessLevels, 3);

        // 5. Retrieve Document Chunks
        const relevantChunks = await searchSimilarDocuments(embedding, accessLevels, 5);

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
            } catch (err) { console.error(err); }
        }

        const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

        // Retrieve System Prompt from DB (Single Source of Truth)
        let baseSystemPrompt = '';
        try {
            const dbPrompt = await prisma.systemPrompt.findUnique({
                where: { name: 'default_rag' }
            });
            if (dbPrompt?.content) {
                baseSystemPrompt = dbPrompt.content;
            }
        } catch (e) {
            console.error('Failed to fetch system prompt from DB, using fallback', e);
        }

        // Fallback if DB is empty or failed
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

        // Ensure Tool Instructions are present (Append if missing from DB prompt)
        // This allows Admin to edit the persona without breaking the tool logic
        if (!baseSystemPrompt.includes('utar_staff_search')) {
            baseSystemPrompt += `\n\n${STAFF_SEARCH_SYSTEM_PROMPT}`;
        }

        // Construct System Prompt
        const systemPrompt = `${baseSystemPrompt}

Guidelines (Dynamic):
- Current Date: ${dateStr}

Context from CHST policies and forms:
${baseContext.length > 0 ? baseContext : "No relevant policy documents found."}

Previous Conversation:
${chatHistoryStr}
`;

        // 7. Initialize OpenAI Messages including Tool Definitions
        const messages: any[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: effectiveQuery }
        ];

        // 8. Execution Loop (to handle multiple tool calls)
        let runLoop = true;
        let loopCount = 0;
        let finalResponse = '';
        let totalTokens = 0;

        while (runLoop && loopCount < 5) {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
                tools: STAFF_SEARCH_TOOLS,
                tool_choice: 'auto', // Let model decide
                temperature: 0.7,
                max_tokens: 1000,
            });

            totalTokens += completion.usage?.total_tokens || 0;
            const message = completion.choices[0].message;

            // Add the assistant's response (or tool call request) to the conversation
            messages.push(message);

            if (message.tool_calls && message.tool_calls.length > 0) {
                console.log(`[RAG] Model requested ${message.tool_calls.length} tool calls.`);

                // Execute tools
                for (const toolCall of message.tool_calls) {
                    const call = toolCall as any;
                    const toolName = call.function.name;
                    const toolArgs = JSON.parse(call.function.arguments);

                    const result = await executeToolCall(toolName, toolArgs);

                    messages.push({
                        role: 'tool',
                        tool_call_id: call.id,
                        content: JSON.stringify(result)
                    });
                }
                // Loop continues to generate the next response with the tool outputs
            } else {
                finalResponse = message.content || '';
                runLoop = false;
            }
            loopCount++;
        }

        // 9. Suggestions (re-using old logic or simplifying)
        const relatedDocs = await getRelatedDocuments(finalResponse, relevantChunks);

        // 10. Enrich sources
        const enrichedSources = await enrichSourcesWithMetadata(
            relevantChunks.map(chunk => ({
                id: chunk.metadata.id || 'unknown',
                filename: chunk.metadata.filename,
                content: chunk.content,
                score: chunk.score
            }))
        );

        return {
            answer: finalResponse,
            sources: enrichedSources,
            suggestions: relatedDocs
        };

    } catch (error) {
        console.error('Error processing RAG query:', error);
        throw error;
    }
}

/**
 * Generate a streaming response for RAG query
 * For now, we wrap the non-streaming tool-enabled function.
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
            console.log(`[RAG] Contextualized query: "${query}" -> "${rewritten}"`);
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
            docMap.set(doc.originalName, doc); // Mapping for both cases
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
