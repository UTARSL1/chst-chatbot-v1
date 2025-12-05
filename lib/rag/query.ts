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
        // 1. Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query.query);

        // 2. Get accessible document levels based on user role
        const accessLevels = getAccessibleLevels(query.userRole);

        // 3. Search Priority Knowledge Base first
        const knowledgeNotes = await searchKnowledgeNotes(
            query.query,
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
        const isInventoryQuestion = /how many|list|inventory|what documents|count|uploaded/i.test(query.query);

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

            userPrompt = query.query;
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

User Question: ${query.query}

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
        const isDownloadRequest = downloadKeywords.test(query.query);

        if (isDownloadRequest) {
            console.log('[RAG] Detected potential download request:', query.query);

            // Try to extract document names from the query
            // Look for quoted text or capitalized phrases that might be document names
            const potentialDocNames: string[] = [];

            // Extract quoted text
            const quotedMatches = query.query.match(/"([^"]+)"|'([^']+)'/g);
            if (quotedMatches) {
                quotedMatches.forEach(match => {
                    potentialDocNames.push(match.replace(/['"]/g, ''));
                });
            }

            // Also search for any documents mentioned in the inventory context
            if (isInventoryQuestion) {
                // Get all accessible documents
                const allDocs = await prisma.document.findMany({
                    where: {
                        accessLevel: { in: accessLevels as any },
                        status: 'processed'
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

                // Check if any document name appears in the query
                const queryLower = query.query.toLowerCase();
                allDocs.forEach(doc => {
                    const nameLower = doc.originalName.toLowerCase();
                    const filenameLower = doc.filename.toLowerCase();

                    // Check if filename (UUID) is mentioned
                    if (queryLower.includes(filenameLower.replace('.pdf', ''))) {
                        potentialDocNames.push(doc.originalName);
                        potentialDocNames.push(doc.filename);
                        return;
                    }

                    // Check for partial matches (at least 3 consecutive words or 50% of the name)
                    const nameWords = nameLower.split(/\s+/);
                    const queryWords = queryLower.split(/\s+/);

                    // Check if significant portion of document name appears in query
                    let matchCount = 0;
                    nameWords.forEach(word => {
                        if (word.length > 3 && queryWords.some(qw => qw.includes(word) || word.includes(qw))) {
                            matchCount++;
                        }
                    });

                    if (matchCount >= Math.min(3, nameWords.length * 0.5)) {
                        potentialDocNames.push(doc.originalName);
                    }
                });
            } else {
                // Not an inventory question, but still a download request
                // Search all accessible documents for matches
                const allDocs = await prisma.document.findMany({
                    where: {
                        accessLevel: { in: accessLevels as any },
                        status: 'processed'
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

                const queryLower = query.query.toLowerCase();
                allDocs.forEach(doc => {
                    const nameLower = doc.originalName.toLowerCase();
                    const filenameLower = doc.filename.toLowerCase();

                    // Check if filename (UUID) is mentioned - exact match
                    if (queryLower.includes(filenameLower.replace('.pdf', ''))) {
                        potentialDocNames.push(doc.originalName);
                        potentialDocNames.push(doc.filename);
                        console.log('[RAG] Found document by UUID filename:', doc.filename);
                        return;
                    }

                    // Check for originalName matches
                    const nameWords = nameLower.split(/\s+/);
                    const queryWords = queryLower.split(/\s+/);

                    let matchCount = 0;
                    nameWords.forEach(word => {
                        if (word.length > 3 && queryWords.some(qw => qw.includes(word) || word.includes(qw))) {
                            matchCount++;
                        }
                    });

                    if (matchCount >= Math.min(2, nameWords.length * 0.3)) {
                        potentialDocNames.push(doc.originalName);
                        console.log('[RAG] Found potential document by name:', doc.originalName);
                    }
                });
            }

            // Search for these documents in the database
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
        // 1. Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query.query);

        // 2. Get accessible document levels based on user role
        const accessLevels = getAccessibleLevels(query.userRole);

        // 3. Search Priority Knowledge Base first
        const knowledgeNotes = await searchKnowledgeNotes(
            query.query,
            accessLevels,
            3
        );

        // 4. Search for similar documents
        const relevantChunks = await searchSimilarDocuments(
            queryEmbedding,
            accessLevels,
            5
        );

        // 5. Prepare context and system prompt
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

            userPrompt = query.query;
        } else {
            // Build context from knowledge notes and documents
            let contextParts: string[] = [];

            // Add knowledge notes first (highest priority)
            if (knowledgeNotes.length > 0) {
                const knowledgeContext = knowledgeNotes
                    .map((note) => `[Priority Knowledge: ${note.title}]\\n${note.content}`)
                    .join('\\n\\n---\\n\\n');
                contextParts.push(knowledgeContext);
            }

            // Add document chunks
            if (relevantChunks.length > 0) {
                const docContext = relevantChunks
                    .map((chunk, index) => `[Document ${index + 1}: ${chunk.metadata.filename}]\\n${chunk.content}`)
                    .join('\\n\\n---\\n\\n');
                contextParts.push(docContext);
            }

            const context = contextParts.join('\\n\\n=== === ===\\n\\n');

            systemPrompt = `You are a helpful assistant for the CHST research centre at UTAR. Your role is to answer questions about university and centre-level research policies and forms based on the provided context.

Guidelines:
- PRIORITY KNOWLEDGE: If "Priority Knowledge" entries are provided in the context, use them as the PRIMARY source of truth
- Use information from the provided context to answer questions
- If the context doesn't contain enough information, say so clearly
- Be specific and cite the relevant policy or form name
- Provide step-by-step instructions when asked about procedures
- If asked about deadlines or dates, be precise
- Maintain a professional and helpful tone
- **STRICT RULE**: If you want to provide a download link, use this EXACT format: [Download Document Name](download:DocumentNameWithoutSpaces)
- **CRITICAL**: ONLY provide a download link if the document is explicitly listed in the "Context" provided above.
- Example: [Download Policy on Research Leave](download:PolicyOnResearchLeave)
- **CRITICAL SYNTAX NOTE**: 
  1. Do NOT put a space between the square brackets [] and parentheses ().
  2. **REMOVE ALL SPACES** from the document name in the URL part (inside the parentheses).
  - CORRECT: [Download Link](download:MyFileName)
  - WRONG: [Download Link] (download:My File Name) - Space in link URL breaks it!
  - WRONG: [Download Link](download:My File Name) - Space in link URL breaks it!`;

            userPrompt = `Context from CHST policies and forms:

${context}

---

User Question: ${query.query}

Please provide a helpful and accurate answer based on the context above.`;
        }

        // 6. Generate streaming response using GPT-4o
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

        // 7. Yield chunks as they arrive
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
