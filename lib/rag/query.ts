import { OpenAI } from 'openai';
import { generateEmbedding } from './embeddings';
import { searchSimilarDocuments } from './vectorStore';
import { getAccessibleLevels } from '@/lib/utils';
import { RAGQuery, RAGResponse, DocumentSource } from '@/types';

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

        // 3. Search for similar documents
        const relevantChunks = await searchSimilarDocuments(
            queryEmbedding,
            accessLevels,
            5 // Top 5 most relevant chunks
        );

        // 4. Prepare context and system prompt
        let systemPrompt: string;
        let userPrompt: string;

        if (relevantChunks.length === 0) {
            // No documents found - allow general conversation
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
            // Documents found - use RAG context
            const context = relevantChunks
                .map((chunk, index) => `[Document ${index + 1}: ${chunk.metadata.filename}]\n${chunk.content}`)
                .join('\n\n---\n\n');

            systemPrompt = `You are a helpful assistant for the CHST research centre at UTAR. Your role is to answer questions about university and centre-level research policies and forms based on the provided context.

Guidelines:
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

Please provide a helpful and accurate answer based on the context above. If the context doesn't contain the information needed to answer the question, please say so.`;
        }

        // 5. Generate response using GPT-4
        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
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

        return {
            answer,
            sources: uniqueSources,
            tokensUsed: completion.usage?.total_tokens,
        };
    } catch (error) {
        console.error('Error processing RAG query:', error);
        throw new Error('Failed to process query');
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

        // 3. Search for similar documents
        const relevantChunks = await searchSimilarDocuments(
            queryEmbedding,
            accessLevels,
            5
        );

        // 4. Prepare context and system prompt
        let systemPrompt: string;
        let userPrompt: string;

        if (relevantChunks.length === 0) {
            // No documents found - allow general conversation
            systemPrompt = `You are a helpful assistant for the CHST research centre at UTAR. 

You help users with questions about university and centre-level research policies and forms.

Important:
- Currently, there are no policy documents uploaded to the system yet
- You can still greet users, answer general questions, and have conversations
- For policy-specific questions, politely explain that documents haven't been uploaded yet
- Be friendly, professional, and helpful`;

            userPrompt = query.query;
        } else {
            // Documents found - use RAG context
            const context = relevantChunks
                .map((chunk, index) => `[Document ${index + 1}: ${chunk.metadata.filename}]\n${chunk.content}`)
                .join('\n\n---\n\n');

            systemPrompt = `You are a helpful assistant for the CHST research centre at UTAR. Your role is to answer questions about university and centre-level research policies and forms based on the provided context.

Guidelines:
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

        // 5. Generate streaming response using GPT-4
        const stream = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 1000,
            stream: true,
        });

        // 6. Yield chunks as they arrive
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
