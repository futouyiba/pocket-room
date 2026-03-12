/**
 * System Prompt Editor Component
 * 
 * Dedicated editor for configuring AI Companion system prompts with templates.
 * Validates requirement: 13.4
 */

'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Lightbulb, Copy } from 'lucide-react';

export interface SystemPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// System Prompt Templates
const SYSTEM_PROMPT_TEMPLATES = [
  {
    id: 'helpful-assistant',
    name: 'Helpful Assistant',
    description: 'A friendly and helpful AI assistant',
    prompt: `You are a helpful, respectful, and honest assistant. Always answer as helpfully as possible, while being safe. Your answers should not include any harmful, unethical, racist, sexist, toxic, dangerous, or illegal content. Please ensure that your responses are socially unbiased and positive in nature.

If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information.`,
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Expert code reviewer focused on quality and best practices',
    prompt: `You are an expert code reviewer with deep knowledge of software engineering best practices, design patterns, and code quality. Your role is to:

1. Review code for correctness, efficiency, and maintainability
2. Identify potential bugs, security vulnerabilities, and performance issues
3. Suggest improvements following SOLID principles and clean code practices
4. Provide constructive feedback with specific examples
5. Explain the reasoning behind your suggestions

Be thorough but concise. Focus on the most important issues first. Always be respectful and educational in your feedback.`,
  },
  {
    id: 'technical-writer',
    name: 'Technical Writer',
    description: 'Professional technical documentation specialist',
    prompt: `You are a professional technical writer specializing in clear, concise, and accurate documentation. Your role is to:

1. Create well-structured documentation that is easy to understand
2. Use clear language and avoid unnecessary jargon
3. Include relevant examples and code snippets when appropriate
4. Follow documentation best practices (headings, lists, formatting)
5. Ensure accuracy and completeness of technical information

Write for your target audience's technical level. Use active voice and present tense. Be precise and avoid ambiguity.`,
  },
  {
    id: 'brainstorming-partner',
    name: 'Brainstorming Partner',
    description: 'Creative thinking partner for ideation',
    prompt: `You are a creative brainstorming partner who helps generate and explore ideas. Your role is to:

1. Ask thought-provoking questions to stimulate creative thinking
2. Suggest diverse perspectives and alternative approaches
3. Build on ideas with "yes, and..." thinking
4. Challenge assumptions constructively
5. Help organize and prioritize ideas

Be enthusiastic and open-minded. Encourage wild ideas and unconventional thinking. Help refine rough concepts into actionable plans.`,
  },
  {
    id: 'debugging-assistant',
    name: 'Debugging Assistant',
    description: 'Systematic problem solver for debugging',
    prompt: `You are a systematic debugging assistant who helps identify and resolve software issues. Your role is to:

1. Analyze error messages and stack traces methodically
2. Ask clarifying questions to understand the problem context
3. Suggest debugging strategies and diagnostic steps
4. Identify potential root causes based on symptoms
5. Recommend solutions with clear explanations

Use a structured approach: understand the problem, reproduce it, isolate the cause, and verify the fix. Be patient and thorough.`,
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Start with a blank template',
    prompt: '',
  },
];

export function SystemPromptEditor({
  value,
  onChange,
  disabled = false,
}: SystemPromptEditorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [showTips, setShowTips] = useState(false);

  const characterCount = value.length;
  const maxCharacters = 2000; // Reasonable limit for system prompts

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    setSelectedTemplate(templateId);

    const template = SYSTEM_PROMPT_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      onChange(template.prompt);
    }
  };

  const handleCopyTemplate = () => {
    const template = SYSTEM_PROMPT_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (template && template.prompt) {
      navigator.clipboard.writeText(template.prompt);
    }
  };

  return (
    <div className="space-y-3">
      {/* Template Selection */}
      <div className="space-y-2">
        <Label htmlFor="template">System Prompt Template</Label>
        <div className="flex gap-2">
          <Select
            id="template"
            value={selectedTemplate}
            onChange={handleTemplateChange}
            disabled={disabled}
            className="flex-1"
          >
            {SYSTEM_PROMPT_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>
          {selectedTemplate !== 'custom' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyTemplate}
              disabled={disabled}
              title="Copy template to clipboard"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
        {selectedTemplate !== 'custom' && (
          <p className="text-xs text-muted-foreground">
            {SYSTEM_PROMPT_TEMPLATES.find((t) => t.id === selectedTemplate)?.description}
          </p>
        )}
      </div>

      {/* System Prompt Editor */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="systemPrompt">System Prompt</Label>
          <span className="text-xs text-muted-foreground">
            {characterCount} / {maxCharacters} characters
          </span>
        </div>
        <Textarea
          id="systemPrompt"
          placeholder="Define your companion's personality, behavior, and expertise..."
          value={value}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue.length <= maxCharacters) {
              onChange(newValue);
              // If user modifies a template, switch to custom
              if (selectedTemplate !== 'custom') {
                const template = SYSTEM_PROMPT_TEMPLATES.find((t) => t.id === selectedTemplate);
                if (template && newValue !== template.prompt) {
                  setSelectedTemplate('custom');
                }
              }
            }
          }}
          disabled={disabled}
          rows={8}
          className="font-mono text-sm"
        />
        {characterCount >= maxCharacters && (
          <p className="text-xs text-destructive">
            Character limit reached. Please shorten your prompt.
          </p>
        )}
      </div>

      {/* Tips Toggle */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowTips(!showTips)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          {showTips ? 'Hide Tips' : 'Show Tips for Writing System Prompts'}
        </Button>

        {showTips && (
          <div className="bg-muted/50 p-4 rounded-md space-y-2 text-sm">
            <p className="font-medium">Tips for Effective System Prompts:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <strong>Be specific:</strong> Clearly define the role, expertise, and behavior you want
              </li>
              <li>
                <strong>Set boundaries:</strong> Specify what the companion should and shouldn't do
              </li>
              <li>
                <strong>Define tone:</strong> Describe the communication style (formal, casual, technical, etc.)
              </li>
              <li>
                <strong>Include examples:</strong> Show the type of responses you expect
              </li>
              <li>
                <strong>Keep it focused:</strong> Avoid overly long or complex instructions
              </li>
              <li>
                <strong>Test and iterate:</strong> Refine your prompt based on actual responses
              </li>
            </ul>
            <p className="text-xs mt-3 text-muted-foreground italic">
              Note: The system prompt sets the foundation for your companion's behavior. You can always
              adjust it later based on how your companion performs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
