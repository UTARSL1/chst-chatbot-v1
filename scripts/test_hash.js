const bcrypt = require('bcryptjs');

async function testPassword() {
    const password = 'utar123';

    // Generate hash
    const hash = await bcrypt.hash(password, 12);
    console.log('Generated hash:', hash);

    // Verify it works
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash verification:', isValid ? 'SUCCESS' : 'FAILED');

    // Test against the hash we provided earlier
    const oldHash = '$2b$12$JityY4ITGRc82K39hvHquOC9Ue0t9nhrZxe5Zc87onW92is9tfqq66';
    const isOldValid = await bcrypt.compare(password, oldHash);
    console.log('Old hash verification:', isOldValid ? 'SUCCESS' : 'FAILED');
}

testPassword();
