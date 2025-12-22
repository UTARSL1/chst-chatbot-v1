export type StorageBucket = 'departments' | 'document-types' | 'knowledge-documents';

export interface FileUploadResponse {
    success: boolean;
    url?: string;
    path?: string;
    error?: string;
}

export interface FileDeleteResponse {
    success: boolean;
    error?: string;
}

export interface FileMetadata {
    name: string;
    size: number;
    type: string;
    lastModified: number;
}

export interface StorageError {
    message: string;
    statusCode?: number;
}
