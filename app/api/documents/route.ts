import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase/client';
import { extractTextFromPDF } from '@/lib/rag/pdfProcessor';
import { chunkText, cleanText, generateEmbeddings } from '@/lib/rag/embeddings';
import { storeDocumentChunks, deleteDocumentVectors } from '@/lib/rag/vectorStore';


export const maxDuration = 60; // Set max duration to 60 seconds for Vercel
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Only chairperson can upload documents
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized. Only chairpersons can upload documents.' },
                { status: 403 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const accessLevel = formData.get('accessLevel') as string;
        const category = (formData.get('category') as string) || 'policy';
        const department = (formData.get('department') as string) || 'General';

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        if (!accessLevel || !['student', 'member', 'chairperson'].includes(accessLevel)) {
            return NextResponse.json(
                { error: 'Invalid access level' },
                { status: 400 }
            );
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'Only PDF files are allowed' },
                { status: 400 }
            );
        }

        // Validate file size (10MB max)
        const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760');
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File size exceeds 10MB limit' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const fileId = uuidv4();
        const filename = `${fileId}.pdf`;
        const originalName = file.name;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Supabase Storage
        const storagePath = `${accessLevel}/${filename}`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from('documents')
            .upload(storagePath, buffer, {
                contentType: 'application/pdf',
                upsert: false,
            });

        if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            return NextResponse.json(
                { error: 'Failed to upload file to storage' },
                { status: 500 }
            );
        }

        // Create document record in database
        const document = await prisma.document.create({
            data: {
                filename,
                originalName,
                accessLevel: accessLevel as any,
                category,
                department,
                filePath: storagePath, // Store Supabase path (e.g., 'category/filename.pdf')
                fileSize: file.size,
                status: 'processing',
                uploadedById: session.user.id,
            },
        });

        // Process document synchronously (wait for completion)
        // In Vercel/Serverless, async background tasks are often killed if the response is returned.
        try {
            await processDocument(document.id, buffer, filename, originalName, accessLevel as any);
        } catch (error) {
            console.error('Error processing document:', error);

            // Update document status to failed
            await prisma.document.update({
                where: { id: document.id },
                data: { status: 'failed' },
            });

            // Return error to user so they know processing failed
            return NextResponse.json(
                {
                    success: false,
                    error: 'File uploaded but processing failed. Please try again.',
                    details: error instanceof Error ? error.message : String(error)
                },
                { status: 500 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                document: {
                    id: document.id,
                    filename: document.originalName,
                    accessLevel: document.accessLevel,
                    status: 'processed', // We know it's processed now
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'An error occurred during upload' },
            { status: 500 }
        );
    }
}

/**
 * Process document: extract text, generate embeddings, store in vector DB
 */
async function processDocument(
    documentId: string,
    fileBuffer: Buffer,
    filename: string,
    originalName: string,
    accessLevel: 'student' | 'member' | 'chairperson'
) {
    try {
        // 1. Extract text from PDF (using buffer directly)
        const rawText = await extractTextFromPDF(fileBuffer);
        const cleanedText = cleanText(rawText);

        // 2. Chunk text
        const chunks = chunkText(cleanedText, 500, 50);

        // 3. Generate embeddings for all chunks
        const embeddings = await generateEmbeddings(chunks);

        // 4. Store in vector database
        const chunkData = chunks.map((content, index) => ({
            content,
            embedding: embeddings[index],
        }));

        const vectorIds = await storeDocumentChunks(
            chunkData,
            documentId,
            filename,
            originalName,
            accessLevel
        );

        // 5. Update document status
        await prisma.document.update({
            where: { id: documentId },
            data: {
                status: 'processed',
                processedAt: new Date(),
                vectorIds: vectorIds,
                chunkCount: chunks.length,
            },
        });

        console.log(`Document ${documentId} processed successfully`);
    } catch (error) {
        console.error(`Error processing document ${documentId}:`, error);
        throw error;
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get all documents (chairperson sees all, others see based on role)
        const documents = await prisma.document.findMany({
            where:
                session.user.role === 'chairperson'
                    ? {}
                    : {
                        accessLevel: {
                            in: session.user.role === 'member'
                                ? ['student', 'member']
                                : ['student'],
                        },
                    },
            include: {
                uploadedBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                uploadedAt: 'desc',
            },
        });

        return NextResponse.json({ documents }, { status: 200 });
    } catch (error) {
        console.error('Get documents error:', error);
        return NextResponse.json(
            { error: 'An error occurred while fetching documents' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Only chairperson can delete documents
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json(
                { error: 'Unauthorized. Only chairpersons can delete documents.' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Document ID is required' },
                { status: 400 }
            );
        }

        // Get document to find file path and vector IDs
        const document = await prisma.document.findUnique({
            where: { id },
        });

        if (!document) {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        // 1. Delete from Pinecone FIRST (strict mode - must succeed)
        const vectorIds = document.vectorIds as string[];
        if (vectorIds && vectorIds.length > 0) {
            console.log(`[Delete] Attempting to delete ${vectorIds.length} vectors for document: ${document.originalName}`);
            try {
                await deleteDocumentVectors(document.vectorIds as string[]);
                console.log(`[Delete] ✅ Successfully deleted ${vectorIds.length} vectors from Pinecone`);
            } catch (error) {
                console.error(`[Delete] ❌ CRITICAL: Failed to delete vectors for ${document.originalName}:`, error);
                // STRICT MODE: Fail the entire deletion to prevent orphaned vectors
                return NextResponse.json(
                    {
                        error: 'Failed to delete document vectors from Pinecone. Document not deleted to maintain data consistency.',
                        details: error instanceof Error ? error.message : String(error)
                    },
                    { status: 500 }
                );
            }
        }

        // 2. Delete file from Supabase Storage
        try {
            console.log(`[Delete] Deleting file from Supabase: ${document.filePath}`);
            const { data, error } = await supabaseAdmin.storage
                .from('documents')
                .remove([document.filePath]);

            if (error) {
                console.error('[Delete] ⚠️ Error deleting from Supabase Storage:', error);
                // Continue - file might already be gone, and vectors are already deleted
            } else {
                console.log('[Delete] ✅ File deleted from Supabase');
            }
        } catch (error) {
            console.error('[Delete] ⚠️ Error deleting file:', error);
            // Continue - file might already be gone, and vectors are already deleted
        }

        // 3. Delete from database (only after vectors are confirmed deleted)
        console.log(`[Delete] Deleting database record for: ${document.originalName}`);
        await prisma.document.delete({
            where: { id },
        });
        console.log('[Delete] ✅ Database record deleted');

        return NextResponse.json(
            { success: true, message: 'Document deleted successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Delete document error:', error);
        return NextResponse.json(
            { error: 'An error occurred while deleting the document' },
            { status: 500 }
        );
    }
}
