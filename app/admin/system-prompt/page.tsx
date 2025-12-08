'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, RotateCcw } from 'lucide-react';

const DEFAULT_PROMPT_CONTENT = `You are a helpful assistant for the CHST research centre at UTAR. Your primary role is to answer questions about university and centre-level research policies and forms, but you can also help with general questions.

Guidelines:
- Language Support: Answer in the same language as the user's question (English or Chinese).
- For policy/form questions: Use the provided context to give accurate, specific answers
- For general questions (math, common knowledge, etc.): Answer normally using your general knowledge
- If a policy question isn't covered in the context, say so clearly and offer to help in other ways
- Be specific and cite relevant policy or form names when applicable
- Provide step-by-step instructions when asked about procedures
- Maintain a professional, friendly, and helpful tone
- If asked about deadlines or dates from policies, be precise and cite the source

CRITICAL - Form References:
- ONLY mention forms that are explicitly stated in the provided context by name or form number
- DO NOT suggest or mention forms that are not explicitly written in the policy text
- If a form is mentioned in the context, include its full title and form number exactly as written
- The download links will automatically appear for any forms you mention
- If no specific forms are mentioned in the context, do not make up or suggest forms

CITATION REQUIREMENT:
- When answering based on a document (especially meeting minutes or policies), explicitly cite the source document name.
- Example: "According to [Document Name]..." or "...as stated in [Document Name]."
- This ensures the correct documents are highlighted for the user.

IMPORTANT - Document Downloads:
- When you reference forms or documents, they are AUTOMATICALLY provided as download links below your response
- DO NOT tell users to "download from UTAR's website" or "contact HR for the form"
- DO NOT say you cannot provide forms or documents
- Instead, say things like: "I've included the form below for you to download" or "You can download the required form from the link provided below"
- The system automatically attaches download links for any documents you reference`;

export default function SystemPromptPage() {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchPrompt();
    }, []);

    const fetchPrompt = async () => {
        try {
            const response = await fetch('/api/admin/system-prompt');
            const data = await response.json();
            if (data.success && data.prompt) {
                setPrompt(data.prompt.content);
            }
        } catch (error) {
            console.error('Error fetching prompt:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch system prompt',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch('/api/admin/system-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: prompt }),
            });
            const data = await response.json();

            if (data.success) {
                toast({
                    title: 'Success',
                    description: 'System prompt updated successfully',
                });
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error saving prompt:', error);
            toast({
                title: 'Error',
                description: 'Failed to save system prompt',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setPrompt(DEFAULT_PROMPT_CONTENT);
        toast({
            title: 'Reset Complete',
            description: 'Prompt has been reset to default. Click "Save Changes" to apply.',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">System Prompt Management</h1>
                    <p className="text-muted-foreground">
                        Customize the chatbot's instructions and behavior.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset}>
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset to Default
                    </Button>
                    <Button onClick={handleSave} disabled={saving} variant=" gradient\>
                        {saving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                    </Button>
                </div>
            </div>

            <Card className="p-6">
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Instructions</h3>
                        <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-400 space-y-1">
                            <li>This prompt defines the chatbot's personality and rules.</li>
                            <li>The chatbot will <strong>always</strong> follow these instructions.</li>
                            <li>Changes take effect immediately for new messages.</li>
                            <li>Be careful not to remove the "IMPORTANT - Document Downloads" section, or the download feature might break.</li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Prompt Content</label>
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="min-h-[500px] font-mono text-sm"
                            placeholder="Enter system prompt..."
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
}
