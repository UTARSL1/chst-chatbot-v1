import { prisma } from '@/lib/db';
import { DocumentSource } from '@/types';
import { getAccessibleLevels } from '@/lib/utils';
import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface SuggestionParams {
    referencedDocIds: string[];
    userRole: 'student' | 'member' | 'chairperson' | 'public';
    referencedChunks: any[]; // The actual content chunks that were used
    limit?: number;
}

/**
 * Get related documents based on AI analysis of referenced policy content
 * Only suggests documents explicitly mentioned in the policies
 */
export async function getRelatedDocuments(params: SuggestionParams): Promise<DocumentSource[]> {
    const { referencedDocIds, userRole, referencedChunks, limit = 3 } = params;

    // If no documents were referenced, return empty
    if (referencedDocIds.length === 0 || referencedChunks.length === 0) {
        return [];
    }

    try {
        // Get all available documents that user can access
        const accessLevels = getAccessibleLevels(userRole);
        const allDocs = await prisma.document.findMany({
            where: {
                AND: [
                    { id: { notIn: referencedDocIds } }, // Exclude already referenced
                    { accessLevel: { in: accessLevels as any } },
                    { status: 'processed' },
                ],
            },
            select: {
                id: true,
                originalName: true,
                filename: true,
                category: true,
                department: true,
                accessLevel: true,
            },
        });

        if (allDocs.length === 0) {
            return [];
        }

        // Combine referenced chunks into context
        const policyContext = referencedChunks
            .map(chunk => chunk.content)
            .join('\n\n');

        // Create list of available documents for AI to choose from
        const availableDocsList = allDocs
            .map((doc, idx) => `${idx + 1}. ${doc.originalName} (${doc.category})`)
            .join('\n');

        // Ask GPT-4 to analyze and suggest related documents
        const prompt = `You are analyzing policy documents to suggest related forms or documents that users might need.

POLICY CONTENT:
${policyContext}

AVAILABLE DOCUMENTS:
${availableDocsList}

TASK:
Based on the policy content above, identify which documents from the available list are explicitly mentioned or directly required by the policy. 

RULES:
- ONLY suggest documents that are explicitly mentioned in the policy content
- If the policy mentions a form, report, or other document by name, suggest it
- If the policy describes a process that requires specific documents, suggest those
- DO NOT suggest documents just because they seem related - they must be mentioned or required
- Return ONLY the numbers of the suggested documents (e.g., "1, 3, 5")
- If no documents are explicitly mentioned, return "NONE"

Your response (numbers only or NONE):`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are a precise document analyzer. Only suggest documents explicitly mentioned in policies.' },
                { role: 'user', content: prompt },
            ],
            temperature: 0.1, // Low temperature for precise, consistent results
            max_tokens: 50,
        });

        const response = completion.choices[0].message.content?.trim() || 'NONE';

        // Parse the response
        if (response === 'NONE' || !response) {
            return [];
        }

        // Extract document indices
        const indices = response
            .split(',')
            .map(s => parseInt(s.trim()) - 1) // Convert to 0-indexed
            .filter(idx => !isNaN(idx) && idx >= 0 && idx < allDocs.length);

        // Get the suggested documents
        const suggestedDocs = indices
            .slice(0, limit)
            .map(idx => {
                const doc = allDocs[idx];
                return {
                    filename: doc.filename,
                    accessLevel: doc.accessLevel,
                    documentId: doc.id,
                    originalName: doc.originalName,
                    category: doc.category,
                    department: doc.department,
                };
            });

        return suggestedDocs;
    } catch (error) {
        console.error('Error getting AI-powered suggestions:', error);
        return [];
    }
}
