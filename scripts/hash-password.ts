import bcrypt from 'bcryptjs';

async function hashPassword() {
    const hash = await bcrypt.hash('Canaliculus@34', 10);
    console.log('Password hash:', hash);
}

hashPassword();
