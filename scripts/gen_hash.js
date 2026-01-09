const bcrypt = require('bcryptjs');

bcrypt.hash('utar123', 10).then(hash => {
    console.log('Full hash:');
    console.log(hash);
    console.log('\nHash length:', hash.length);
    console.log('\nSQL UPDATE command:');
    console.log(`UPDATE users SET "passwordHash" = '${hash}', "updatedAt" = NOW() WHERE email = 'admin2@utar.edu.my';`);
});
