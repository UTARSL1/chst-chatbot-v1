import { supabaseAdmin } from './client';

export type StorageBucket = 'departments' | 'document-types' | 'knowledge-documents';

interface UploadResult {
    success: boolean;
    url?: string;
    error?: string;
    path?: string;
}

interface DeleteResult {
    success: boolean;
    error?: string;
}

/**
 * Upload a file to Supabase Storage
 * @param bucket - The storage bucket name
 * @param file - The file to upload (File or Buffer)
 * @param path - The path within the bucket (e.g., 'icons/dept-123.png')
 * @returns Upload result with public URL
 */
export async function uploadFile(
    bucket: StorageBucket,
    file: File | Buffer,
    path: string
): Promise<UploadResult> {
    try {
        // Convert File to ArrayBuffer if needed
        let fileData: ArrayBuffer | Buffer;
        let contentType: string;

        if (file instanceof File) {
            fileData = await file.arrayBuffer();
            contentType = file.type;
        } else {
            fileData = file;
            contentType = 'application/octet-stream';
        }

        // Upload to Supabase
        const { data, error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(path, fileData, {
                contentType,
                upsert: true, // Overwrite if exists
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return { success: false, error: error.message };
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(data.path);

        return {
            success: true,
            url: urlData.publicUrl,
            path: data.path,
        };
    } catch (error) {
        console.error('Upload error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The file path to delete
 * @returns Delete result
 */
export async function deleteFile(
    bucket: StorageBucket,
    path: string
): Promise<DeleteResult> {
    try {
        const { error } = await supabaseAdmin.storage
            .from(bucket)
            .remove([path]);

        if (error) {
            console.error('Supabase delete error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Delete error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get public URL for a file
 * @param bucket - The storage bucket name
 * @param path - The file path
 * @returns Public URL
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

/**
 * Extract file path from Supabase URL
 * @param url - The full Supabase URL
 * @param bucket - The storage bucket name
 * @returns File path within the bucket
 */
export function extractPathFromUrl(url: string, bucket: StorageBucket): string | null {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
        return pathParts[1] || null;
    } catch {
        return null;
    }
}

/**
 * Validate file for upload
 * @param file - The file to validate
 * @param maxSizeMB - Maximum file size in MB (default: 5)
 * @param allowedTypes - Allowed MIME types
 * @returns Validation result
 */
export function validateFile(
    file: File,
    maxSizeMB: number = 5,
    allowedTypes: string[] = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
): { valid: boolean; error?: string } {
    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return {
            valid: false,
            error: `File size exceeds ${maxSizeMB}MB limit`,
        };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        };
    }

    return { valid: true };
}

/**
 * Generate a unique file path
 * @param prefix - Prefix for the file (e.g., 'icons', 'images')
 * @param id - Entity ID
 * @param filename - Original filename
 * @returns Unique file path
 */
export function generateFilePath(prefix: string, id: string, filename: string): string {
    const ext = filename.split('.').pop();
    const timestamp = Date.now();
    return `${prefix}/${id}-${timestamp}.${ext}`;
}
