-- Add lastLogin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);
