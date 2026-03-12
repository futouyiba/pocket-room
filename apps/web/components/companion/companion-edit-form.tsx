/**
 * Companion Edit Form Component
 * 
 * Form for editing an existing AI Companion configuration.
 * Validates requirements: 13.3
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { SystemPromptEditor } from './system-prompt-editor';
import type { Companion } from './companion-list';

export interface CompanionEditData {
  name: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface CompanionEditFormProps {
  companion: Companion;
  onSubmit: (data: CompanionEditData) => Promise<void>;
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

export function CompanionEditForm({
  companion,
  onSubmit,
  onCancel,
}: CompanionEditFormProps) {
  const [formData, setFormData] = useState<CompanionEditData>({
    name: companion.name,
    model: companion.model,
    systemPrompt: companion.systemPrompt || '',
    temperature: companion.temperature ?? 0.7,
    maxTokens: companion.maxTokens ?? 2000,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableModels = MODEL_OPTIONS[companion.provider] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Companion name is required');
      return;
    }
    if (!formData.model) {
      setError('Please select a model');
      return;
    }
    if (formData.temperature < 0 || formData.temperature > 2) {
      setError('Temperature must be between 0 and 2');
      return;
    }
    if (formData.maxTokens <= 0 || !Number.isInteger(formData.maxTokens)) {
      setError('Max tokens must be a positive integer');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update companion');
    } finally {
      setIsSubmitting(false);
    }
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
          required
        />
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
          disabled={isSubmitting}
        >
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

      {/* Temperature */}
      <div className="space-y-2">
        <Label htmlFor="temperature">
          Temperature: {formData.temperature.toFixed(2)}
        </Label>
        <Input
          id="temperature"
          type="number"
          min="0"
          max="2"
          step="0.1"
          value={formData.temperature}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              temperature: parseFloat(e.target.value) || 0,
            }))
          }
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Controls randomness: 0 is focused and deterministic, 2 is more creative and random.
        </p>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <Label htmlFor="maxTokens">Max Tokens</Label>
        <Input
          id="maxTokens"
          type="number"
          min="1"
          step="1"
          value={formData.maxTokens}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              maxTokens: parseInt(e.target.value) || 1,
            }))
          }
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
          Maximum number of tokens to generate in the response.
        </p>
      </div>

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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
