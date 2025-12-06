
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Trash2, Plus, GripVertical } from 'lucide-react';

interface PopularQuestion {
    id: string;
    question: string;
    roles: string[];
    isActive: boolean;
    order: number;
}

const ALL_ROLES = ['student', 'member', 'public', 'chairperson'];

export default function PopularQuestionsAdmin() {
    const [questions, setQuestions] = useState<PopularQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        question: '',
        roles: [] as string[],
        isActive: true
    });

    useEffect(() => {
        loadQuestions();
    }, []);

    const loadQuestions = async () => {
        try {
            const res = await fetch('/api/admin/popular-questions');
            const data = await res.json();
            if (Array.isArray(data)) {
                setQuestions(data);
            }
        } catch (error) {
            console.error('Failed to load questions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (question?: PopularQuestion) => {
        if (question) {
            setEditingId(question.id);
            setFormData({
                question: question.question,
                roles: question.roles,
                isActive: question.isActive
            });
        } else {
            setEditingId(null);
            setFormData({
                question: '',
                roles: ['student', 'member', 'public', 'chairperson'], // Default all selected
                isActive: true
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.question.trim()) return alert('Question text is required');
        if (formData.roles.length === 0) return alert('At least one role must be selected');

        try {
            const method = editingId ? 'PATCH' : 'POST';
            const body = editingId ? { ...formData, id: editingId } : formData;

            const res = await fetch('/api/admin/popular-questions', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setIsDialogOpen(false);
                loadQuestions();
            } else {
                alert('Failed to save');
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error saving');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this question?')) return;

        try {
            const res = await fetch(`/api/admin/popular-questions?id=${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                loadQuestions();
            } else {
                alert('Failed to delete');
            }
        } catch (error) {
            alert('Error deleting');
        }
    };

    const toggleRole = (role: string) => {
        setFormData(prev => {
            const newRoles = prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role];
            return { ...prev, roles: newRoles };
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Popular Questions</h1>
                    <p className="text-gray-400">Manage common questions displayed to users based on their role.</p>
                </div>
                <Button onClick={() => handleOpenDialog()} className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                </Button>
            </div>

            <Card className="bg-gray-900/50 border-white/10 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-white">Questions List</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <p className="text-gray-400">Loading...</p>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No questions added yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {questions.map((q) => (
                                <div key={q.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg group">
                                    <div className="flex-1">
                                        <p className="font-medium text-white text-lg">{q.question}</p>
                                        <div className="flex gap-2 mt-2">
                                            {q.roles.map(role => (
                                                <span key={role} className={`text-xs px-2 py-0.5 rounded uppercase font-bold
                                                    ${role === 'student' ? 'bg-blue-500/20 text-blue-300' :
                                                        role === 'chairperson' ? 'bg-purple-500/20 text-purple-300' :
                                                            role === 'member' ? 'bg-green-500/20 text-green-300' :
                                                                'bg-gray-500/20 text-gray-300'}`}>
                                                    {role}
                                                </span>
                                            ))}
                                            {!q.isActive && (
                                                <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={() => handleOpenDialog(q)}>
                                            <Pencil className="w-4 h-4 text-blue-400" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/20" onClick={() => handleDelete(q.id)}>
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 text-white">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Edit Question' : 'New Question'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Question Text</label>
                            <Input
                                value={formData.question}
                                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                placeholder="e.g., How to apply for leave?"
                                className="bg-slate-950 border-slate-800 focus:border-violet-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Visible To Roles</label>
                            <div className="grid grid-cols-2 gap-2">
                                {ALL_ROLES.map(role => (
                                    <div key={role} className="flex items-center space-x-2 border border-slate-800 p-2 rounded hover:bg-slate-800/50">
                                        <Checkbox
                                            id={`role-${role}`}
                                            checked={formData.roles.includes(role)}
                                            onCheckedChange={() => toggleRole(role)}
                                            className="border-slate-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                                        />
                                        <label
                                            htmlFor={`role-${role}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer w-full"
                                        >
                                            {role}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="isActive"
                                checked={formData.isActive}
                                onCheckedChange={(c) => setFormData({ ...formData, isActive: c as boolean })}
                                className="border-slate-600 data-[state=checked]:bg-green-600"
                            />
                            <label htmlFor="isActive" className="text-sm text-gray-300">Active (Visible to users)</label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-slate-700 hover:bg-slate-800 text-gray-300">Cancel</Button>
                        <Button onClick={handleSave} className="bg-violet-600 hover:bg-violet-700 text-white">Save Question</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
