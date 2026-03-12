/**
 * Companion Registration Form Component
 * 
 * Form for registering a new AI Companion.
 * Validates requirements: 13.1, 13.2
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SystemPromptEditor } from './system-prompt-editor';
import type { Connection } from '@/lib/provider-binding/types';

export interface CompanionFormData {
  name: string;
  providerConnectionId: string;
  model: string;
  systemPrompt: string;
}

export interface CompanionRegistrationFormProps {
  connections: Connection[];
  onSubmit: (data: CompanionFormData) => Promise<void>;
  onCancel: () => void;
}

// Model options based on provider
const MODEL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  google: [
    { value: 'gemini-pro', label: 'Gemini Pro' },
    { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
  ],
  anthropic: [
    { value: 'claude-3-opus', label: 'Claude 3 Opus' },
    { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
  ],
};

export function CompanionRegistrationForm({
  connections,
  onSubmit,
  onCancel,
}: CompanionRegistrationFormProps) {
  const [formData, setFormData] = useState<CompanionFormData>({
    name: '',
    providerConnectionId: '',
    model: '',
    systemPrompt: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get selected connection to determine available models
  const selectedConnection = connections.find(
    (c) => c.id === formData.providerConnectionId
  );
  const availableModels = selectedConnection
    ? MODEL_OPTIONS[selectedConnection.provider] || []
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop event propagation
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Companion name is required');
      return;
    }
    if (!formData.providerConnectionId) {
      setError('Please select a provider connection');
      return;
    }
    if (!formData.model) {
      setError('Please select a model');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register companion');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const connectionId = e.target.value;
    setFormData((prev) => ({
      ...prev,
      providerConnectionId: connectionId,
      model: '', // Reset model when connection changes
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Companion Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Companion Name</Label>
        <Input
          id="name"
          placeholder="e.g., My Assistant"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          disabled={isSubmitting}
        />
      </div>

      {/* Provider Connection Selection */}
      <div className="space-y-2">
        <Label htmlFor="connection">Provider Connection</Label>
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No provider connections available. Please bind a provider first.
          </p>
        ) : (
          <Select
            id="connection"
            value={formData.providerConnectionId}
            onChange={handleConnectionChange}
            disabled={isSubmitting}
          >
            <option value="">Select a provider connection</option>
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.provider.toUpperCase()}
                {connection.accountId && ` (${connection.accountId})`}
              </option>
            ))}
          </Select>
        )}
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label htmlFor="model">Model</Label>
        <Select
          id="model"
          value={formData.model}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, model: e.target.value }))
          }
          disabled={isSubmitting || !formData.providerConnectionId}
        >
          <option value="">Select a model</option>
          {availableModels.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </Select>
      </div>

      {/* System Prompt */}
      <SystemPromptEditor
        value={formData.systemPrompt}
        onChange={(value) =>
          setFormData((prev) => ({ ...prev, systemPrompt: value }))
        }
        disabled={isSubmitting}
      />

      {/* Error Message */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || connections.length === 0}>
          {isSubmitting ? 'Registering...' : 'Register Companion'}
        </Button>
      </div>
    </form>
  );
}
