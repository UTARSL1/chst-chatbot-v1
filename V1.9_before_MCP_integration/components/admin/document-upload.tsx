'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

export function DocumentUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [accessLevel, setAccessLevel] = useState<string>('member');
    const [category, setCategory] = useState<string>('Policy');

    // Department state
    const [department, setDepartment] = useState<string>('CHST');
    const [customDepartment, setCustomDepartment] = useState<string>('');
    const [isCustomDepartment, setIsCustomDepartment] = useState(false);
    const [existingDepartments, setExistingDepartments] = useState<string[]>(['CHST', 'DHR', 'IPSR']);

    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch existing departments on mount
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await fetch('/api/documents');
                if (response.ok) {
                    const data = await response.json();
                    const depts = new Set<string>(['CHST', 'DHR', 'IPSR']);
                    if (data.documents) {
                        data.documents.forEach((doc: any) => {
                            if (doc.department) depts.add(doc.department);
                        });
                    }
                    // Ensure CHST is always first
                    const deptArray = Array.from(depts).filter(d => d !== 'CHST');
                    setExistingDepartments(['CHST', ...deptArray]);
                }
            } catch (error) {
                console.error('Failed to fetch departments', error);
            }
        };
        fetchDepartments();
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                setError('Please select a PDF file');
                setFile(null);
                return;
            }
            if (selectedFile.size > 10 * 1024 * 1024) { // 10MB
                setError('File size must be less than 10MB');
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError('');
            setSuccess('');
        }
    };

    const handleAddDepartment = () => {
        if (customDepartment.trim()) {
            const newDept = customDepartment.trim();
            console.log('Adding new department:', newDept);
            setExistingDepartments(prev => [...prev, newDept]);
            setDepartment(newDept);
            setIsCustomDepartment(false);
            setCustomDepartment('');
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            if (droppedFile.type !== 'application/pdf') {
                setError('Please select a PDF file');
                setFile(null);
                return;
            }
            if (droppedFile.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB');
                setFile(null);
                return;
            }
            setFile(droppedFile);
            setError('');
            setSuccess('');
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        const finalDepartment = isCustomDepartment ? customDepartment : department;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('accessLevel', accessLevel);
            formData.append('category', category);
            formData.append('department', finalDepartment);

            const response = await fetch('/api/documents', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setSuccess('Document uploaded successfully!');
            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Add new department to list if it's custom
            if (isCustomDepartment && !existingDepartments.includes(customDepartment)) {
                setExistingDepartments([...existingDepartments, customDepartment]);
                setDepartment(customDepartment);
                setIsCustomDepartment(false);
                setCustomDepartment('');
            }

            router.refresh();

            // Trigger parent component refresh
            if (onUploadSuccess) {
                onUploadSuccess();
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred during upload');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card className="bg-gray-900/50 border-white/10 backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="text-white">Upload Document</CardTitle>
                <CardDescription className="text-gray-400">
                    Upload PDF documents to the knowledge base.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleUpload} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="file" className="text-gray-200">PDF File</Label>
                        <div className="flex items-center justify-center w-full">
                            <label
                                htmlFor="file-upload"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-violet-500 bg-violet-500/20' :
                                    file ? 'border-violet-500 bg-violet-500/10' :
                                        'border-gray-700 hover:bg-gray-800'
                                    }`}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                    </svg>
                                    <p className="mb-2 text-sm text-gray-400">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">PDF (MAX. 10MB)</p>
                                </div>
                                <input
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                />
                            </label>
                        </div>
                        {file && (
                            <p className="text-sm text-violet-400">Selected: {file.name}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="department" className="text-gray-200">Department</Label>
                            <select
                                id="department"
                                value={isCustomDepartment ? 'custom' : department}
                                onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                        setIsCustomDepartment(true);
                                    } else {
                                        setIsCustomDepartment(false);
                                        setDepartment(e.target.value);
                                    }
                                }}
                                className="w-full p-2 rounded-md bg-gray-950 border border-gray-800 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                            >
                                {existingDepartments.map((dept) => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                                <option value="custom">+ Create New...</option>
                            </select>

                            {isCustomDepartment && (
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="text"
                                        value={customDepartment}
                                        onChange={(e) => setCustomDepartment(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddDepartment();
                                            }
                                        }}
                                        placeholder="Enter department..."
                                        className="flex-1 p-2 rounded-md bg-gray-950 border border-gray-800 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                        autoFocus
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleAddDepartment}
                                        disabled={!customDepartment.trim()}
                                        className="bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Add
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category" className="text-gray-200">Category</Label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full p-2 rounded-md bg-gray-950 border border-gray-800 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                            >
                                <option value="Policy">Policy</option>
                                <option value="Form">Form</option>
                                <option value="Meeting Minute">Meeting Minute</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="accessLevel" className="text-gray-200">Access Level</Label>
                        <select
                            id="accessLevel"
                            value={accessLevel}
                            onChange={(e) => setAccessLevel(e.target.value)}
                            className="w-full p-2 rounded-md bg-gray-950 border border-gray-800 text-white focus:ring-2 focus:ring-violet-500 outline-none"
                        >
                            <option value="student">Student (Public)</option>
                            <option value="member">Member</option>
                            <option value="chairperson">Chairperson Only</option>
                        </select>
                        <p className="text-xs text-gray-500">
                            Determines who can query information from this document.
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded-md">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="p-3 text-sm text-green-400 bg-green-900/20 border border-green-900/50 rounded-md">
                            {success}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={!file || uploading || (isCustomDepartment && !customDepartment.trim())}
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                    >
                        {uploading ? 'Uploading & Processing...' : 'Upload Document'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
