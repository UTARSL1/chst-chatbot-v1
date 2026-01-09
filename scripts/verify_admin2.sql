-- Check if admin2 account exists
SELECT id, email, name, role, "isApproved", "isVerified", "createdAt"
FROM users
WHERE email = 'admin2@utar.edu.my';

-- If the account exists but password is wrong, update it with this:
-- UPDATE users
-- SET "passwordHash" = '$2b$12$JityY4ITGRc82K39hvHquOC9Ue0t9nhrZxe5Zc87onW92is9tfqq66',
--     "updatedAt" = NOW()
-- WHERE email = 'admin2@utar.edu.my';

-- If the account doesn't exist, create it with this:
-- INSERT INTO users (
--   id,
--   email,
--   "passwordHash",
--   name,
--   role,
--   "isApproved",
--   "isVerified",
--   "createdAt",
--   "updatedAt"
-- ) VALUES (
--   gen_random_uuid(),
--   'admin2@utar.edu.my',
--   '$2b$12$JityY4ITGRc82K39hvHquOC9Ue0t9nhrZxe5Zc87onW92is9tfqq66',
--   'Admin 2',
--   'chairperson',
--   true,
--   true,
--   NOW(),
--   NOW()
-- );
