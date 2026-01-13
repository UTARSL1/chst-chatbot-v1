'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Cpu } from 'lucide-react';

interface ModelConfig {
    id: string;
    modelName: string;
    displayName: string;
    description: string;
    isActive: boolean;
}

export default function ModelConfigPage() {
    const [models, setModels] = useState<ModelConfig[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
            const response = await fetch('/api/admin/model-config');
            const data = await response.json();
            if (data.success && data.models) {
                setModels(data.models);
                const active = data.models.find((m: ModelConfig) => m.isActive);
                if (active) {
                    setSelectedModel(active.modelName);
                }
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch model configuration',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedModel) {
            toast({
                title: 'Error',
                description: 'Please select a model',
                variant: 'destructive',
            });
            return;
        }

        setSaving(true);
        try {
            const response = await fetch('/api/admin/model-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelName: selectedModel }),
            });
            const data = await response.json();

            if (data.success) {
                setModels(data.models);
                toast({
                    title: 'Success',
                    description: 'AI model updated successfully. Changes will take effect immediately.',
                });
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error saving model config:', error);
            toast({
                title: 'Error',
                description: 'Failed to update model configuration',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const activeModel = models.find(m => m.isActive);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#3B82F6] font-['Orbitron',sans-serif] uppercase tracking-[0.1em]">MODEL CONFIGURATION</h1>
                    <p className="text-[#94A3B8] font-['JetBrains_Mono',monospace] text-sm">
                        // SELECT_OPENAI_MODEL_FOR_CHATBOT_RESPONSES
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving || selectedModel === activeModel?.modelName} className="bg-[#3B82F6] hover:bg-[#2563EB] font-['Orbitron',sans-serif] uppercase tracking-wide text-sm">
                    {saving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    SAVE
                </Button>
            </div>

            <Card className="p-6">
                <div className="space-y-6">
                    {/* Current Active Model */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                            <Cpu className="w-5 h-5 text-[#3B82F6]" />
                            <h3 className="font-semibold text-[#3B82F6] font-['Orbitron',sans-serif] uppercase tracking-wide">Current Active Model</h3>
                        </div>
                        <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                            {activeModel?.displayName || 'None'}
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                            {activeModel?.description}
                        </p>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium font-['Orbitron',sans-serif] uppercase tracking-wide">Select AI Model</label>

                        <div className="space-y-3">
                            {models.map((model) => (
                                <div
                                    key={model.id}
                                    onClick={() => setSelectedModel(model.modelName)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedModel === model.modelName
                                        ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                                        : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-lg font-['Orbitron',sans-serif]">{model.displayName}</h4>
                                                {model.isActive && (
                                                    <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1 font-mono">
                                                {model.modelName}
                                            </p>
                                            <p className="text-sm text-gray-300 mt-2">
                                                {model.description}
                                            </p>
                                        </div>
                                        <div className="ml-4">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedModel === model.modelName
                                                ? 'border-[#3B82F6]'
                                                : 'border-gray-600'
                                                }`}>
                                                {selectedModel === model.modelName && (
                                                    <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Cost Warning */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">💡 Cost Considerations</h3>
                        <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                            <li><strong>GPT-4O</strong>: Highest quality, ~10x cost of GPT-4O-mini</li>
                            <li><strong>GPT-4O Mini</strong>: Best balance of cost and performance (recommended)</li>
                            <li><strong>GPT-3.5 Turbo</strong>: Most affordable, lower quality responses</li>
                        </ul>
                    </div>

                    {/* Usage Info */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                        <h3 className="font-semibold text-gray-300 mb-2">ℹ️ Model Usage</h3>
                        <p className="text-sm text-gray-400">
                            The selected model will be used for:
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-400 space-y-1 mt-2 ml-2">
                            <li>Main chatbot responses</li>
                            <li>Query contextualization (understanding follow-up questions)</li>
                            <li>Related document suggestions</li>
                        </ul>
                        <p className="text-sm text-gray-400 mt-3">
                            Changes take effect immediately for new chat messages.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}
