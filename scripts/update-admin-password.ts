import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@utar.edu.my';
    const newPassword = 'YourNewPassword123!'; // CHANGE THIS

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
        where: { email },
        data: { passwordHash: hashedPassword },
    });

    console.log('\n✅ Admin password updated!');
    console.log('=====================================');
    console.log(`Email: ${email}`);
    console.log(`New Password: ${newPassword}`);
    console.log('=====================================\n');
}

main()
    .catch((e) => {
        console.error('Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
