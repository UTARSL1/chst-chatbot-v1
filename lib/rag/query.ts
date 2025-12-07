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

            const filteredHistory = recentMessages.filter((msg, index) => {
                if (index === 0 && msg.role === 'user' && msg.content === query.query) return false;
                return true;
            }).reverse();

            if (filteredHistory.length > 0) {
                effectiveQuery = await contextualizeQuery(query.query, filteredHistory);
                chatHistoryStr = filteredHistory
                    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                    .join('\n');
            }
        }

        // 2. Generate embedding for the query
        const queryEmbedding = await generateEmbedding(effectiveQuery);

        // 3. Get accessible document levels based on user role
        const accessLevels = getAccessibleLevels(query.userRole);

        // 4. Search Priority Knowledge Base first
        const knowledgeNotes = await searchKnowledgeNotes(
            effectiveQuery,
            accessLevels,
            3
        );

        // 5. Search for similar documents
        const relevantChunks = await searchSimilarDocuments(
            queryEmbedding,
            accessLevels,
            5
        );

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

        // Construct System Prompt
        const systemPrompt = `You are a helpful assistant for the CHST research centre at UTAR.
        
Guidelines:
- Current Date: ${dateStr}
- Use this date for deadlines/eligibility.
- Answer in the same language as the user.
- **General Questions**: Answer directly.
- **Policies/Forms**: Base answers on the "Context" provided below.
${STAFF_SEARCH_SYSTEM_PROMPT}

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
                    const toolName = toolCall.function.name;
                    const toolArgs = JSON.parse(toolCall.function.arguments);

                    const result = await executeToolCall(toolName, toolArgs);

                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result)
                    });
                }
                // Loop continues to generate the next response with the tool outputs
            } else {
                // No tool calls, we have the final text answer
                finalResponse = message.content || "Sorry, I could not generate a response.";
                runLoop = false;
            }
            loopCount++;
        }

        // 9. Prepare sources for frontend (Standard RAG)
        const sources: DocumentSource[] = relevantChunks.map((chunk) => ({
            filename: chunk.metadata.filename,
            originalName: chunk.metadata.originalName,
            accessLevel: chunk.metadata.accessLevel,
        }));
        const uniqueSources = sources.filter(
            (source, index, self) => index === self.findIndex((s) => s.filename === source.filename)
        );
        const enrichedSources = await enrichSourcesWithMetadata(uniqueSources);

        // Related documents
        const referencedDocIds = enrichedSources.filter(s => s.documentId).map(s => s.documentId!);
        const suggestions = await getRelatedDocuments({
            referencedDocIds,
            userRole: query.userRole,
            referencedChunks: relevantChunks,
            limit: 5,
        });

        return {
            answer: finalResponse,
            sources: enrichedSources,
            suggestions,
            tokensUsed: totalTokens,
        };

    } catch (error) {
        console.error('Error processing RAG query:', error);
        throw new Error('Failed to process query');
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

        const systemPrompt = `Given a chat history and the latest user question which might reference context in the chat history, formulate a standalone question which can be understood without the chat history. Do NOT answer the question, just reformulate it if needed and otherwise return it as is.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
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
                department: true,
            },
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
