import { OpenAI } from 'openai';
import { generateEmbedding } from './embeddings';
import { searchSimilarDocuments } from './vectorStore';
import { getAccessibleLevels } from '@/lib/utils';
import { RAGQuery, RAGResponse, DocumentSource } from '@/types';
import { prisma } from '@/lib/db';
import { getRelatedDocuments } from './suggestions';
import { searchKnowledgeNotes } from './knowledgeSearch';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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
            // Fetch recent chat history
            // We take 6 because the latest one is likely the current user message (already saved in DB)
            const recentMessages = await prisma.message.findMany({
                where: { sessionId: query.sessionId },
                orderBy: { createdAt: 'desc' },
                take: 6,
            });

            // Filter out the current message (if it exists in the history) to get just the *prior* context
            // We assume the most recent message with role 'user' and matching content is the current one
            // A simple heuristic is to skip the first message if it matches the current query
            const historyMessages = recentMessages.filter((msg, index) => {
                if (index === 0 && msg.role === 'user' && msg.content === query.query) return false;
                return true;
            }).reverse();

            if (historyMessages.length > 0) {
                effectiveQuery = await contextualizeQuery(query.query, historyMessages);

                // Format history for the final prompts to maintain conversational flow
                chatHistoryStr = historyMessages
                    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                    .join('\n');
            }
        }

        // 2. Generate embedding for the query (using the contextualized query)
        const queryEmbedding = await generateEmbedding(effectiveQuery);

        // 2. Get accessible document levels based on user role
        const accessLevels = getAccessibleLevels(query.userRole);

        // 3. Search Priority Knowledge Base first
        const knowledgeNotes = await searchKnowledgeNotes(
            effectiveQuery,
            accessLevels,
            3 // Top 3 most relevant knowledge notes
        );

        // 4. Search for similar documents
        const relevantChunks = await searchSimilarDocuments(
            queryEmbedding,
            accessLevels,
            5 // Top 5 most relevant chunks
        );

        // 5. Prepare context and system prompt
        let systemPrompt: string;
        let userPrompt: string;

        // Check for inventory/metadata questions early (used later for download detection)
        // Check for inventory/metadata questions early (using original or effective query)
        const isInventoryQuestion = /how many|list|inventory|what documents|count|uploaded/i.test(effectiveQuery);

        if (knowledgeNotes.length === 0 && relevantChunks.length === 0) {
            // No documents or knowledge notes found - allow general conversation
            systemPrompt = `You are a helpful assistant for the CHST research centre at UTAR. 
            
You help users with questions about university and centre-level research policies and forms.

Important:
- Currently, there are no policy documents uploaded to the system yet
- You can still greet users, answer general questions, and have conversations
- For policy-specific questions, politely explain that documents haven't been uploaded yet
- Be friendly, professional, and helpful
- If asked about specific policies, suggest they contact the administrator or wait for documents to be uploaded`;

            userPrompt = `Previous Conversation:\n${chatHistoryStr}\n\nUser Question: ${effectiveQuery}`;
        } else {
            // Build context from knowledge notes (higher priority) and documents
            let contextParts: string[] = [];

            // Add knowledge notes first (highest priority)
            if (knowledgeNotes.length > 0) {
                const knowledgeContext = knowledgeNotes
                    .map((note) => `[Priority Knowledge: ${note.title}]\n${note.content}`)
                    .join('\n\n---\n\n');
                contextParts.push(knowledgeContext);
            }

            // Add document chunks
            if (relevantChunks.length > 0) {
                const docContext = relevantChunks
                    .map((chunk) => `[Source: ${chunk.metadata.originalName || chunk.metadata.filename}]\n${chunk.content}`)
                    .join('\n\n---\n\n');
                contextParts.push(docContext);
            }

            // [NEW] Check for inventory/metadata questions and inject DB stats
            if (isInventoryQuestion) {
                try {
                    const docs = await prisma.document.findMany({
                        where: {
                            accessLevel: { in: accessLevels as any }
                        },
                        select: {
                            originalName: true,
                            category: true,
                            department: true
                        }
                    });

                    const total = docs.length;

                    const byCategory = docs.reduce((acc, doc) => {
                        const cat = doc.category || 'Uncategorized';
                        acc[cat] = (acc[cat] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);

                    const byDepartment = docs.reduce((acc, doc) => {
                        const dept = doc.department || 'General';
                        acc[dept] = (acc[dept] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);

                    const inventoryInfo = `
[SYSTEM DATABASE INVENTORY]
Total Documents Accessible: ${total}

Breakdown by Category:
${Object.entries(byCategory).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}

Breakdown by Department:
${Object.entries(byDepartment).map(([dept, count]) => `- ${dept}: ${count}`).join('\n')}

Full List of Accessible Documents:
${docs.map(d => `- ${d.originalName} (${d.category} | ${d.department || 'General'})`).join('\n')}
`;
                    contextParts.push(inventoryInfo);
                    console.log('[RAG] Injected inventory context');
                } catch (err) {
                    console.error('Error fetching inventory:', err);
                }
            }

            const context = contextParts.join('\n\n=== === ===\n\n');

            // Fetch custom system prompt from database
            const dbPrompt = await prisma.systemPrompt.findUnique({
                where: { name: 'default_rag' },
            });

            if (dbPrompt && dbPrompt.isActive) {
                // Use custom prompt from database
                systemPrompt = dbPrompt.content;
            } else {
                // Use default prompt
                systemPrompt = `You are a helpful assistant for the CHST research centre at UTAR. Your primary role is to answer questions about university and centre-level research policies and forms, but you can also help with general questions.

Guidelines:
- Language Support: Answer in the same language as the user's question (English or Chinese).
- PRIORITY KNOWLEDGE: If "Priority Knowledge" entries are provided in the context, use them as the PRIMARY source of truth and prioritize them over regular documents
- For policy/form questions: Use the provided context to give accurate, specific answers
- For general questions (math, common knowledge, etc.): Answer normally using your general knowledge
- If a policy question isn't covered in the context, say so clearly and offer to help in other ways
- Be specific and cite relevant policy or form names when applicable
- Provide step-by-step instructions when asked about procedures
- Maintain a professional, friendly, and helpful tone
- When answering based on a document (especially meeting minutes or policies), explicitly cite the source document name.
- Example: "According to [Document Name]..." or "...as stated in [Document Name]."
- NEVER refer to documents as "Document 1", "Document 2", etc. Always use the actual filename or title.
- This ensures the correct documents are highlighted for the user.

CRITICAL - POLICY & FORM RELATIONSHIPS:
- Questions often involve a Policy that dictates a Procedure using a Form.
- Always check if the context links a Policy to a specific Form (e.g., "Sabbatical Policy" mentions "Sabbatical Application Form").
- Address the valid workflow: Policy -> Procedure -> Form.
- Explicitly mention: "This is governed by [Policy Name], which requires completing [Form Name]."
- If the policy mentions a required form, look for it in the context and provide a download link if available.

CRITICAL - Form References:
- ONLY mention forms that are explicitly stated in the provided context by name or form number
- DO NOT suggest or mention forms that are not explicitly written in the policy text
- When mentioning a form, simply state its name and form number (e.g., "the APPLICATION FOR SABBATICAL LEAVE form (FM-DHR-TD-017)")
- **STRICT RULE**: If you want to provide a download link, use this EXACT format: [Download Document Name](download:DocumentNameWithoutSpaces)
- **CRITICAL**: ONLY provide a download link if the document is explicitly listed in the "Context" provided above.
- If the document is NOT in the context, do NOT offer a download link. Instead, say "I couldn't find that document in the database."
- Example: [Download Policy on Research Leave](download:PolicyOnResearchLeave)
- **CRITICAL SYNTAX NOTE**: 
  1. Do NOT put a space between the square brackets [] and parentheses ().
  2. **REMOVE ALL SPACES** from the document name in the URL part (inside the parentheses).
  - CORRECT: [Download Link](download:MyFileName)
  - WRONG: [Download Link] (download:My File Name) - Space in link URL breaks it!
  - WRONG: [Download Link](download:My File Name) - Space in link URL breaks it!
- Do NOT use http/https links for documents.
- The system will detect this format and convert it into a working download button.
- If no specific forms are mentioned in the context, do not make up or suggest forms
- **INVENTORY LISTS**: When listing documents from the "System Database Inventory", do NOT generate download links for them unless the user specifically asked to download them. Just list their names.
- Do NOT claim to "provide" documents if you are only listing their names from the inventory. State that these are the documents *available* in the system.`;
            }

            userPrompt = `Context from CHST policies and forms:

${context}

---

Previous Conversation:
${chatHistoryStr}

User Question: ${effectiveQuery}

Please provide a helpful and accurate answer based on the context above. If the context doesn't contain the information needed to answer the question, please say so.`;
        }

        // 5. Generate response using GPT-4o
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7, // Higher temperature for more natural conversation
            max_tokens: 1000,
        });

        const answer = completion.choices[0].message.content || 'Sorry, I could not generate a response.';

        // 6. Prepare sources
        const sources: DocumentSource[] = relevantChunks.map((chunk) => ({
            filename: chunk.metadata.filename,
            originalName: chunk.metadata.originalName,
            accessLevel: chunk.metadata.accessLevel,
        }));

        // Remove duplicate sources
        const uniqueSources = sources.filter(
            (source, index, self) =>
                index === self.findIndex((s) => s.filename === source.filename)
        );

        // Enrich sources with metadata for download links
        let enrichedSources = await enrichSourcesWithMetadata(uniqueSources);

        // [NEW] Detect if user is explicitly asking for a document download
        // and add that document to sources if found
        const downloadKeywords = /download|get|provide|give me|send me|show me|need|want/i;
        const isDownloadRequest = downloadKeywords.test(effectiveQuery);

        if (isDownloadRequest) {
            console.log('[RAG] Detected potential download request:', query.query);

            // Try to extract document names from the query
            const potentialDocNames: string[] = [];
            const queryLower = query.query.toLowerCase();

            // 1. Extract quoted text
            const quotedMatches = query.query.match(/"([^"]+)"|'([^']+)'/g);
            if (quotedMatches) {
                quotedMatches.forEach(match => {
                    potentialDocNames.push(match.replace(/['"]/g, ''));
                });
            }

            // 2. Fuzzy search all accessible documents to find matches
            // We want to be lenient here to ensure we find what the user is asking for
            const allDocs = await prisma.document.findMany({
                where: {
                    accessLevel: { in: accessLevels as any },
                    status: 'processed'
                },
                select: {
                    id: true,
                    filename: true,
                    originalName: true,
                }
            });

            allDocs.forEach(doc => {
                const nameLower = doc.originalName.toLowerCase();
                const filenameLower = doc.filename.toLowerCase();

                // Exact UUID match
                if (queryLower.includes(filenameLower.replace('.pdf', ''))) {
                    potentialDocNames.push(doc.originalName);
                    return;
                }

                // Keyword match logic
                // Filter out common words to focus on unique terms
                const commonWords = ['application', 'form', 'policy', 'request', 'leave', 'for', 'the', 'download', 'document', 'file'];
                const nameWords = nameLower.split(/\s+/).filter(w => w.length > 3 && !commonWords.includes(w));
                const queryWords = queryLower.split(/\s+/).filter(w => w.length > 3);

                // If the document has unique words (like "sabbatical", "research", "grant"), 
                // and the query contains them, it's a match.

                // If query contains specific unique words from the document title
                const hasStrongMatch = nameWords.some(word => queryLower.includes(word));

                // Or if significant overlap
                let matchCount = 0;
                nameWords.forEach(word => {
                    if (queryWords.some(qw => qw.includes(word) || word.includes(qw))) {
                        matchCount++;
                    }
                });

                // Threshold: If we have a strong unique word match, or multiple partial matches
                if (hasStrongMatch || matchCount >= 2) {
                    potentialDocNames.push(doc.originalName);
                    console.log(`[RAG] Matched document '${doc.originalName}' via fuzzy search`);
                }
            });

            // 3. Fetch full metadata for identified documents and add to sources
            if (potentialDocNames.length > 0) {
                console.log('[RAG] Searching for potential documents:', potentialDocNames);

                const requestedDocs = await prisma.document.findMany({
                    where: {
                        AND: [
                            { accessLevel: { in: accessLevels as any } },
                            { status: 'processed' },
                            {
                                OR: potentialDocNames.map(name => ({
                                    originalName: { contains: name, mode: 'insensitive' as any }
                                }))
                            }
                        ]
                    },
                    select: {
                        id: true,
                        filename: true,
                        originalName: true,
                        category: true,
                        department: true,
                        accessLevel: true,
                    }
                });

                console.log('[RAG] Found requested documents:', requestedDocs.map(d => d.originalName));

                // Add these documents to enriched sources if not already present
                requestedDocs.forEach(doc => {
                    const alreadyInSources = enrichedSources.some(s => s.documentId === doc.id);
                    if (!alreadyInSources) {
                        enrichedSources.push({
                            filename: doc.filename,
                            originalName: doc.originalName,
                            accessLevel: doc.accessLevel,
                            documentId: doc.id,
                            category: doc.category,
                            department: doc.department || undefined,
                        });
                    }
                });
            }
        }

        // Get related document suggestions
        const referencedDocIds = enrichedSources
            .filter(s => s.documentId)
            .map(s => s.documentId!);

        const suggestions = await getRelatedDocuments({
            referencedDocIds,
            userRole: query.userRole,
            referencedChunks: relevantChunks,
            limit: 5,
        });

        return {
            answer,
            sources: enrichedSources,
            suggestions,
            tokensUsed: completion.usage?.total_tokens,
        };
    } catch (error) {
        console.error('Error processing RAG query:', error);
        throw new Error('Failed to process query');
    }
}

/**
 * Enrich document sources with metadata for download links
 * @param sources - Array of document sources
 * @returns Enriched sources with document metadata
 */
async function enrichSourcesWithMetadata(sources: DocumentSource[]): Promise<DocumentSource[]> {
    if (sources.length === 0) return [];

    try {
        // Get unique filenames
        const filenames = [...new Set(sources.map(s => s.filename))];
        console.log('[RAG] Looking up documents for filenames:', filenames);

        // Fetch document metadata from database
        // Search in both filename (UUID) and originalName fields
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

        console.log('[RAG] Found matching documents in DB:', documents.map(d => ({ id: d.id, filename: d.filename, originalName: d.originalName })));

        // Create a map for quick lookup - map both UUID filename and originalName to the doc
        const docMap = new Map();
        documents.forEach(doc => {
            docMap.set(doc.filename, doc);
            docMap.set(doc.originalName, doc);
        });

        // Enrich sources with metadata
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
            console.log('[RAG] WARNING: Could not find DB record for source file:', source.filename);
            return source;
        });

        return enriched;
    } catch (error) {
        console.error('Error enriching sources with metadata:', error);
        return sources; // Return original sources if enrichment fails
    }
}

/**
 * Generate a streaming response for RAG query
 * @param query - User query with role information
 * @returns Async generator for streaming response
 */
export async function* processRAGQueryStream(query: RAGQuery): AsyncGenerator<string> {
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

            // Filter out the current message (heuristic: skip first if it matches)
            const historyMessages = recentMessages.filter((msg, index) => {
                if (index === 0 && msg.role === 'user' && msg.content === query.query) return false;
                return true;
            }).reverse();

            if (historyMessages.length > 0) {
                effectiveQuery = await contextualizeQuery(query.query, historyMessages);
                chatHistoryStr = historyMessages
                    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                    .join('\n');
            }
        }

        // 2. Generate embedding for the query (using contextualized query)
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

        // 6. Prepare context and system prompt
        let systemPrompt: string;
        let userPrompt: string;

        if (knowledgeNotes.length === 0 && relevantChunks.length === 0) {
            // No documents or knowledge notes found - allow general conversation
            systemPrompt = `You are a helpful assistant for the CHST research centre at UTAR. 
            
You help users with questions about university and centre-level research policies and forms.

Important:
- Currently, there are no policy documents uploaded to the system yet
- You can still greet users, answer general questions, and have conversations
- For policy-specific questions, politely explain that documents haven't been uploaded yet
- Be friendly, professional, and helpful`;

            userPrompt = `Previous Conversation:\n${chatHistoryStr}\n\nUser Question: ${effectiveQuery}`;
        } else {
            // Build context from knowledge notes and documents
            let contextParts: string[] = [];

            // Add knowledge notes first (highest priority)
            if (knowledgeNotes.length > 0) {
                const knowledgeContext = knowledgeNotes
                    .map((note) => `[Priority Knowledge: ${note.title}]\n${note.content}`)
                    .join('\n\n---\n\n');
                contextParts.push(knowledgeContext);
            }

            // Add document chunks
            if (relevantChunks.length > 0) {
                const docContext = relevantChunks
                    .map((chunk, index) => `[Document ${index + 1}: ${chunk.metadata.filename}]\n${chunk.content}`)
                    .join('\n\n---\n\n');
                contextParts.push(docContext);
            }

            const context = contextParts.join('\n\n=== === ===\n\n');

            systemPrompt = `You are a helpful assistant for the CHST research centre at UTAR. Your role is to answer questions about university and centre-level research policies and forms based on the provided context.

Guidelines:
- PRIORITY KNOWLEDGE: If "Priority Knowledge" entries are provided in the context, use them as the PRIMARY source of truth
- Use information from the provided context to answer questions
- If the context doesn't contain enough information, say so clearly
- Be specific and cite the relevant policy or form name
- Provide step-by-step instructions when asked about procedures
- If asked about deadlines or dates, be precise
- Maintain a professional and helpful tone
- **POLICY & FORM RELATIONSHIPS**:
  - Questions often involve a Policy that dictates a Procedure using a Form.
  - Always check if the context links a Policy to a specific Form.
  - Address the valid workflow: Policy -> Procedure -> Form.
  - Explicitly mention: "This is governed by [Policy Name], which requires completing [Form Name]."
- **STRICT RULE**: If you want to provide a download link, use this EXACT format: [Download Display Name](download:ExactSourceFilename)
- **CRITICAL**: The \`ExactSourceFilename\` inside the parentheses MUST be the exact filename listed in the \`[Source: ...]\` header of the context where you found the information.
- Do NOT use a descriptive title for the link target; use the actual file name from the Source header.
- Example:
  - Context: \`[Source: POL-001_Travel_Policy.pdf] ... content ...\`
  - Correct Response: \`[Download Travel Policy](download:POL-001_Travel_Policy.pdf)\`
  - Incorrect: \`[Download Travel Policy](download:TravelPolicy)\`
- **CRITICAL SYNTAX NOTE**: 
  1. Do NOT put a space between the square brackets [] and parentheses ().
  2. **REMOVE ALL SPACES** from the document name in the URL part (inside the parentheses).
  - CORRECT: [Download Link](download:MyFileName)
  - WRONG: [Download Link] (download:My File Name) - Space in link URL breaks it!
  - WRONG: [Download Link](download:My File Name) - Space in link URL breaks it!`;

            userPrompt = `Context from CHST policies and forms:

${context}

---

Previous Conversation:
${chatHistoryStr}

User Question: ${effectiveQuery}

Please provide a helpful and accurate answer based on the context above.`;
        }

        // 7. Generate streaming response using GPT-4o
        const stream = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 1000,
            stream: true,
        });

        // 8. Yield chunks as they arrive
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                yield content;
            }
        }
    } catch (error) {
        console.error('Error processing RAG query stream:', error);
        yield 'Sorry, an error occurred while processing your question.';
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
