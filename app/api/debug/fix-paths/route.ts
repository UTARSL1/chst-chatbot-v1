import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // Only allow chairpersons
        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Find all documents
        const documents = await prisma.document.findMany();

        const updates = [];
        const errors = [];

        for (const doc of documents) {
            // Check if filePath contains local Windows path
            if (doc.filePath.includes(':\\') || doc.filePath.includes('documents\\')) {
                // Extract the relative path part
                // Expected format: ...\documents\CATEGORY\FILENAME.pdf
                // We want: CATEGORY/FILENAME.pdf

                // Split by backslash
                const parts = doc.filePath.split('\\');

                // Find the index of 'documents'
                const docIndex = parts.lastIndexOf('documents');

                if (docIndex !== -1 && docIndex + 2 < parts.length) {
                    const category = parts[docIndex + 1];
                    const filename = parts[docIndex + 2];

                    // Construct new relative path
                    const newPath = `${category}/${filename}`;

                    // Update database
                    try {
                        await prisma.document.update({
                            where: { id: doc.id },
                            data: { filePath: newPath }
                        });

                        updates.push({
                            id: doc.id,
                            oldPath: doc.filePath,
                            newPath: newPath
                        });
                    } catch (err: any) {
                        errors.push({ id: doc.id, error: err.message });
                    }
                } else {
                    // Fallback: try to match by filename if path parsing fails
                    // If the path ends with the filename, and we know the category/accessLevel
                    if (doc.filePath.endsWith(doc.filename)) {
                        // Use accessLevel as category if available, or try to guess
                        const category = doc.accessLevel || 'member';
                        const newPath = `${category}/${doc.filename}`;

                        try {
                            await prisma.document.update({
                                where: { id: doc.id },
                                data: { filePath: newPath }
                            });

                            updates.push({
                                id: doc.id,
                                oldPath: doc.filePath,
                                newPath: newPath,
                                method: 'fallback'
                            });
                        } catch (err: any) {
                            errors.push({ id: doc.id, error: err.message });
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            totalDocuments: documents.length,
            updatedCount: updates.length,
            updates,
            errors
        });
    } catch (error: any) {
        return NextResponse.json({
            error: 'Failed to fix paths',
            details: error.message
        }, { status: 500 });
    }
}
