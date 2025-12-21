-- Insert admin account
INSERT INTO users (
    id,
    email,
    "passwordHash",
    name,
    role,
    "isApproved",
    "isVerified",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'admin@utar.edu.my',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Admin',
    'chairperson',
    true,
    true,
    NOW(),
    NOW()
);

-- Insert member account
INSERT INTO users (
    id,
    email,
    "passwordHash",
    name,
    role,
    "isApproved",
    "isVerified",
    "createdAt",
    "updatedAt"
) VALUES (
    gen_random_uuid(),
    'humyc@utar.edu.my',
    '$2b$10$nCFKwywOqCZQTiOLXSgp2O99ulxBX9Ztp9gbLbFYumav6vMvfIEe2W',
    'Hu Ming Yuan Canaliculus',
    'member',
    true,
    true,
    NOW(),
    NOW()
);
