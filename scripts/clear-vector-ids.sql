-- Clear vectorId from all Document Library entries
-- Run this in Supabase SQL Editor

UPDATE "DocumentLibraryEntry"
SET "vectorId" = NULL
WHERE "isActive" = true;
