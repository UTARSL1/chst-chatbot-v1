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
                    .map((chunk) => `[Source: ${chunk.metadata.filename}]\n${chunk.content}`)
                    .join('\n\n---\n\n');
                contextParts.push(docContext);
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
- If asked about deadlines or dates from policies, be precise and cite the source

CRITICAL - Form References:
- ONLY mention forms that are explicitly stated in the provided context by name or form number
- DO NOT suggest or mention forms that are not explicitly written in the policy text
- When mentioning a form, simply state its name and form number (e.g., "the APPLICATION FOR SABBATICAL LEAVE form (FM-DHR-TD-017)")
- DO NOT wrap form names in brackets like [Download...] - this creates confusion
- Instead, tell users that download links for referenced documents will appear in the "Referenced Documents" section below your response
- Example: "I've included the APPLICATION FOR SABBATICAL LEAVE form below for you to download."
- If no specific forms are mentioned in the context, do not make up or suggest forms

CITATION REQUIREMENT:
- When answering based on a document (especially meeting minutes or policies), explicitly cite the source document name.
- Example: "According to [Document Name]..." or "...as stated in [Document Name]."
- NEVER refer to documents as "Document 1", "Document 2", etc. Always use the actual filename or title.
- This ensures the correct documents are highlighted for the user.`;
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
            accessLevel: chunk.metadata.accessLevel,
        }));

        // Remove duplicate sources
        const uniqueSources = sources.filter(
            (source, index, self) =>
                index === self.findIndex((s) => s.filename === source.filename)
        );

        // Enrich sources with metadata for download links
        const enrichedSources = await enrichSourcesWithMetadata(uniqueSources);

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

        // Create a map for quick lookup - map both UUID filename and originalName to the doc
        const docMap = new Map();
        documents.forEach(doc => {
            docMap.set(doc.filename, doc);
            docMap.set(doc.originalName, doc);
        });

        // Enrich sources with metadata
        return sources.map(source => {
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
- Maintain a professional and helpful tone`;

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
