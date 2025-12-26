'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, HelpCircle } from 'lucide-react';

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
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<PopularQuestion | null>(null);

    // Form state
    const [newQuestion, setNewQuestion] = useState({
        question: '',
        roles: ['student', 'member', 'public', 'chairperson'],
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

    const handleAddQuestion = async () => {
        if (!newQuestion.question.trim()) return alert('Question text is required');
        if (newQuestion.roles.length === 0) return alert('At least one role must be selected');

        try {
            const res = await fetch('/api/admin/popular-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newQuestion)
            });

            if (res.ok) {
                setShowAddModal(false);
                setNewQuestion({
                    question: '',
                    roles: ['student', 'member', 'public', 'chairperson'],
                    isActive: true
                });
                loadQuestions();
            } else {
                alert('Failed to save');
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error saving');
        }
    };

    const handleEditQuestion = async () => {
        if (!editingQuestion || !editingQuestion.question.trim()) {
            alert('Question text is required');
            return;
        }
        if (editingQuestion.roles.length === 0) {
            alert('At least one role must be selected');
            return;
        }

        try {
            const res = await fetch('/api/admin/popular-questions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingQuestion)
            });

            if (res.ok) {
                setEditingQuestion(null);
                loadQuestions();
            } else {
                alert('Failed to update');
            }
        } catch (error) {
            console.error('Error updating:', error);
            alert('Error updating');
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

    const toggleRole = (role: string, isEditing: boolean) => {
        if (isEditing && editingQuestion) {
            const newRoles = editingQuestion.roles.includes(role)
                ? editingQuestion.roles.filter(r => r !== role)
                : [...editingQuestion.roles, role];
            setEditingQuestion({ ...editingQuestion, roles: newRoles });
        } else {
            const newRoles = newQuestion.roles.includes(role)
                ? newQuestion.roles.filter(r => r !== role)
                : [...newQuestion.roles, role];
            setNewQuestion({ ...newQuestion, roles: newRoles });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Quick Start Questions</h1>
                    <p className="text-gray-400">Manage common questions displayed to users based on their role.</p>
                </div>
                <Button onClick={() => setShowAddModal(true)} variant="gradient">
                    + Add Question
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
                                <div key={q.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-full bg-violet-500/20 text-violet-400">
                                            <HelpCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-white">{q.question}</h3>
                                            <div className="flex gap-2 mt-2">
                                                {q.roles.map(role => (
                                                    <span key={role} className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 capitalize">
                                                        {role}
                                                    </span>
                                                ))}
                                                {!q.isActive && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="icon" variant="ghost" onClick={() => setEditingQuestion(q)}>
                                            <Pencil className="w-4 h-4 text-amber-400" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => handleDelete(q.id)}>
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-white mb-4">New Question</h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Question Text</label>
                                <Input
                                    value={newQuestion.question}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                                    placeholder="e.g., How to apply for leave?"
                                    className="bg-gray-800 border-gray-700 text-white focus:border-violet-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Visible To Roles</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ALL_ROLES.map(role => (
                                        <label key={role} className="flex items-center gap-2 text-gray-300 cursor-pointer p-2 rounded hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={newQuestion.roles.includes(role)}
                                                onChange={() => toggleRole(role, false)}
                                                className="rounded bg-gray-800 border-gray-700 text-violet-600 focus:ring-violet-600"
                                            />
                                            <span className="capitalize text-sm">{role}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newQuestion.isActive}
                                        onChange={(e) => setNewQuestion({ ...newQuestion, isActive: e.target.checked })}
                                        className="rounded bg-gray-800 border-gray-700 text-green-600 focus:ring-green-600"
                                    />
                                    <span className="text-sm">Active (Visible to users)</span>
                                </label>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <Button onClick={handleAddQuestion} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                                    Save Question
                                </Button>
                                <Button onClick={() => setShowAddModal(false)} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingQuestion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-900 border border-white/10 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h2 className="text-xl font-bold text-white mb-4">Edit Question</h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Question Text</label>
                                <Input
                                    value={editingQuestion.question}
                                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                                    className="bg-gray-800 border-gray-700 text-white focus:border-violet-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Visible To Roles</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ALL_ROLES.map(role => (
                                        <label key={role} className="flex items-center gap-2 text-gray-300 cursor-pointer p-2 rounded hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={editingQuestion.roles.includes(role)}
                                                onChange={() => toggleRole(role, true)}
                                                className="rounded bg-gray-800 border-gray-700 text-violet-600 focus:ring-violet-600"
                                            />
                                            <span className="capitalize text-sm">{role}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={editingQuestion.isActive}
                                        onChange={(e) => setEditingQuestion({ ...editingQuestion, isActive: e.target.checked })}
                                        className="rounded bg-gray-800 border-gray-700 text-green-600 focus:ring-green-600"
                                    />
                                    <span className="text-sm">Active (Visible to users)</span>
                                </label>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <Button onClick={handleEditQuestion} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                                    Save Changes
                                </Button>
                                <Button onClick={() => setEditingQuestion(null)} variant="outline" className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800">
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
