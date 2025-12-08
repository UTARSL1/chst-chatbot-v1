import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const doc = await prisma.document.findFirst();
    console.log('Document:', doc);
}
main().catch(console.error).finally(() => prisma.$disconnect());
