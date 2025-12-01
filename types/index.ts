// User types
export type UserRole = 'student' | 'member' | 'chairperson' | 'public';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isApproved: boolean;
    createdAt: Date;
}

// Chat types
export interface ChatSession {
    id: string;
    userId: string;
    title?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Message {
    id: string;
    sessionId: string;
    userId: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: DocumentSource[];
    createdAt: Date;
}

export interface DocumentSource {
    filename: string;
    accessLevel: string;
    relevanceScore?: number;
    pageNumber?: number;
    documentId?: string;
    originalName?: string;
    category?: string;
    department?: string;
}

// Document types
export type AccessLevel = 'student' | 'member' | 'chairperson';

export interface Document {
    id: string;
    filename: string;
    originalName: string;
    accessLevel: AccessLevel;
    filePath: string;
    fileSize: number;
    status: 'processing' | 'processed' | 'failed';
    uploadedById: string;
    uploadedAt: Date;
    processedAt?: Date;
    vectorIds?: string[];
    chunkCount?: number;
}

// Auth types
export interface SignupFormData {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    chairpersonCode?: string;
}

export interface SigninFormData {
    email: string;
    password: string;
    rememberMe?: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// RAG types
export interface RAGQuery {
    query: string;
    userRole: UserRole;
    sessionId?: string;
}

export interface RAGResponse {
    answer: string;
    sources: DocumentSource[];
    suggestions?: DocumentSource[];
    tokensUsed?: number;
}

export interface DocumentChunk {
    id: string;
    content: string;
    metadata: {
        documentId: string;
        filename: string;
        accessLevel: AccessLevel;
        chunkIndex: number;
        pageNumber?: number;
    };
}
