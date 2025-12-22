'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
    label: string;
    accept?: string;
    maxSizeMB?: number;
    onFileSelect: (file: File | null) => void;
    currentUrl?: string;
    disabled?: boolean;
}

export default function FileUpload({
    label,
    accept = 'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp',
    maxSizeMB = 5,
    onFileSelect,
    currentUrl,
    disabled = false,
}: FileUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentUrl || null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): boolean => {
        // Check file size
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            setError(`File size exceeds ${maxSizeMB}MB limit`);
            return false;
        }

        // Check file type
        const allowedTypes = accept.split(',');
        if (!allowedTypes.includes(file.type)) {
            setError(`Invalid file type. Allowed: ${accept}`);
            return false;
        }

        setError(null);
        return true;
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (validateFile(file)) {
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            onFileSelect(file);
        } else {
            onFileSelect(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (!file) return;

        if (validateFile(file)) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            onFileSelect(file);

            // Update file input
            if (fileInputRef.current) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInputRef.current.files = dataTransfer.files;
            }
        } else {
            onFileSelect(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleRemove = () => {
        setPreview(null);
        setError(null);
        onFileSelect(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
                {label}
            </label>

            {/* Preview */}
            {preview && (
                <div className="relative inline-block">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-slate-700"
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={disabled}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 disabled:opacity-50"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Upload Area */}
            {!preview && (
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`
                        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                        transition-colors
                        ${isDragging
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-slate-700 hover:border-slate-600'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !disabled && fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={accept}
                        onChange={handleFileChange}
                        disabled={disabled}
                        className="hidden"
                    />

                    <div className="flex flex-col items-center gap-2">
                        {isDragging ? (
                            <Upload className="w-8 h-8 text-blue-400" />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                        )}
                        <div className="text-sm text-slate-400">
                            <span className="text-blue-400 hover:text-blue-300">
                                Click to upload
                            </span>
                            {' or drag and drop'}
                        </div>
                        <div className="text-xs text-slate-500">
                            PNG, JPG, SVG, WebP (max {maxSizeMB}MB)
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}
        </div>
    );
}
