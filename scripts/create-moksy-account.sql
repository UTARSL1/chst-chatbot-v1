-- Create test account for moksy@utar.edu.my
-- Password: password123
-- Role: member (RC member)
-- Status: approved and verified

INSERT INTO "users" (
    id,
    email,
    "passwordHash",
    name,
    role,
    "isApproved",
    "isVerified",
    "createdAt",
    "updatedAt"
)
VALUES (
    gen_random_uuid(),
    'moksy@utar.edu.my',
    '$2b$10$BuxZ4otK8RqxkMAL.AyCMOU5aXZA7iV7.AjJazo2DP/bdWg/.C2va',
    'Mok Siew Ying',
    'member',
    true,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
    "passwordHash" = EXCLUDED."passwordHash",
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    "isApproved" = EXCLUDED."isApproved",
    "isVerified" = EXCLUDED."isVerified",
    "updatedAt" = NOW();
