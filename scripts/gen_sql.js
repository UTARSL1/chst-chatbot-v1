const bcrypt = require('bcryptjs');
const fs = require('fs');

bcrypt.hash('utar123', 10).then(hash => {
    const sql = `UPDATE users SET "passwordHash" = '${hash}', "updatedAt" = NOW() WHERE email = 'admin2@utar.edu.my';`;

    fs.writeFileSync('update_admin2.sql', sql);
    console.log('Hash generated and saved to update_admin2.sql');
    console.log('Hash:', hash);
});
