-- Add jcr_search_by_category tool permission
INSERT INTO tool_permissions (id, "toolName", description, "allowedRoles", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid(),
    'jcr_search_by_category',
    'Search for journals by JCR category (e.g., ARTIFICIAL INTELLIGENCE, ONCOLOGY). Returns journals sorted by JIF.',
    ARRAY['chairperson', 'member', 'student', 'public'],
    NOW(),
    NOW()
)
ON CONFLICT ("toolName") DO UPDATE SET
    description = EXCLUDED.description,
    "allowedRoles" = EXCLUDED."allowedRoles",
    "updatedAt" = NOW();
