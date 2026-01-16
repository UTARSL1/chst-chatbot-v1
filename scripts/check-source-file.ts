import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const entry = await prisma.documentLibraryEntry.findFirst({
        where: { isActive: true }
    });
    console.log('Sample Entry:', {
        title: entry?.title,
        sourceFile: entry?.sourceFile
    });
}

main().finally(() => prisma.$disconnect());
