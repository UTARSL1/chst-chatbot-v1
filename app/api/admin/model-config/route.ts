import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { invalidateRAGCaches } from '@/lib/rag/query';

// Available models with metadata
const AVAILABLE_MODELS = [
    {
        modelName: 'gpt-4o',
        displayName: 'GPT-4O',
        description: 'Most capable model with superior reasoning, coding, and multilingual abilities. Best for complex queries and high-quality responses. ~10x cost of GPT-4O-mini.',
    },
    {
        modelName: 'gpt-4o-mini',
        displayName: 'GPT-4O Mini',
        description: 'Affordable and intelligent small model for fast, lightweight tasks. Good balance of cost and performance. Recommended for most use cases.',
    },
    {
        modelName: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        description: 'Fast and inexpensive model for simple tasks. Lower quality than GPT-4 models but very cost-effective.',
    },
];

/**
 * GET /api/admin/model-config
 * Fetch all available models and current active model
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Get all model configs
        const models = await prisma.modelConfig.findMany({
            orderBy: { createdAt: 'asc' },
        });

        // If no models exist, seed them
        if (models.length === 0) {
            const seededModels = await Promise.all(
                AVAILABLE_MODELS.map((model, index) =>
                    prisma.modelConfig.create({
                        data: {
                            ...model,
                            isActive: index === 0, // First model (gpt-4o) is active by default
                            updatedBy: session.user.id,
                        },
                    })
                )
            );
            return NextResponse.json({ success: true, models: seededModels });
        }

        return NextResponse.json({ success: true, models });
    } catch (error) {
        console.error('Error fetching model config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch model configuration' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/model-config
 * Update active model
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'chairperson') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { modelName } = await request.json();

        if (!modelName) {
            return NextResponse.json(
                { error: 'Model name is required' },
                { status: 400 }
            );
        }

        // Verify model exists
        const model = await prisma.modelConfig.findUnique({
            where: { modelName },
        });

        if (!model) {
            return NextResponse.json(
                { error: 'Invalid model name' },
                { status: 400 }
            );
        }

        // Update all models: set the selected one to active, others to inactive
        await prisma.$transaction([
            // Deactivate all models
            prisma.modelConfig.updateMany({
                where: {},
                data: { isActive: false },
            }),
            // Activate the selected model
            prisma.modelConfig.update({
                where: { modelName },
                data: {
                    isActive: true,
                    updatedBy: session.user.id,
                },
            }),
        ]);

        // Invalidate cache so changes take effect immediately
        invalidateRAGCaches();

        const updatedModels = await prisma.modelConfig.findMany({
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({ success: true, models: updatedModels });
    } catch (error) {
        console.error('Error updating model config:', error);
        return NextResponse.json(
            { error: 'Failed to update model configuration' },
            { status: 500 }
        );
    }
}
