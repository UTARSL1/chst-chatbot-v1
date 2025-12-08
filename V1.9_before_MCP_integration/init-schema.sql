-- Create enums
CREATE TYPE "UserRole" AS ENUM ('student', 'member', 'chairperson', 'public');
CREATE TYPE "AccessLevel" AS ENUM ('student', 'member', 'chairperson');

-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS "chat_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chat_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create documents table
CREATE TABLE IF NOT EXISTS "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "accessLevel" "AccessLevel" NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "vectorIds" JSONB,
    "chunkCount" INTEGER,
    CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create signup_codes table
CREATE TABLE IF NOT EXISTS "signup_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "chat_sessions_userId_idx" ON "chat_sessions"("userId");
CREATE INDEX IF NOT EXISTS "chat_sessions_createdAt_idx" ON "chat_sessions"("createdAt");
CREATE INDEX IF NOT EXISTS "messages_sessionId_idx" ON "messages"("sessionId");
CREATE INDEX IF NOT EXISTS "messages_userId_idx" ON "messages"("userId");
CREATE INDEX IF NOT EXISTS "messages_createdAt_idx" ON "messages"("createdAt");
CREATE INDEX IF NOT EXISTS "documents_accessLevel_idx" ON "documents"("accessLevel");
CREATE INDEX IF NOT EXISTS "documents_status_idx" ON "documents"("status");
CREATE INDEX IF NOT EXISTS "documents_uploadedById_idx" ON "documents"("uploadedById");
CREATE INDEX IF NOT EXISTS "signup_codes_code_idx" ON "signup_codes"("code");
CREATE INDEX IF NOT EXISTS "signup_codes_isUsed_idx" ON "signup_codes"("isUsed");
