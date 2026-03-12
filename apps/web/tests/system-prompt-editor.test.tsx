/**
 * System Prompt Editor Tests
 * 
 * Unit tests for the System Prompt Editor component.
 * Validates requirement: 13.4
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SystemPromptEditor } from '@/components/companion/system-prompt-editor';

describe('SystemPromptEditor', () => {
  describe('Template Selection', () => {
    it('should render template selector with all templates', () => {
      const onChange = vi.fn();
      
      render(<SystemPromptEditor value="" onChange={onChange} />);
      
      expect(screen.getByLabelText(/system prompt template/i)).toBeInTheDocument();
      
      const templateSelect = screen.getByLabelText(/system prompt template/i) as HTMLSelectElement;
      const options = Array.from(templateSelect.options).map(opt => opt.text);
      
      expect(options).toContain('Helpful Assistant');
      expect(options).toContain('Code Reviewer');
      expect(options).toContain('Technical Writer');
      expect(options).toContain('Brainstorming Partner');
      expect(options).toContain('Debugging Assistant');
      expect(options).toContain('Custom');
    });

    it('should apply template when selected', () => {
      const onChange = vi.fn();
      
      render(<SystemPromptEditor value="" onChange={onChange} />);
      
      const templateSelect = screen.getByLabelText(/system prompt template/i);
      fireEvent.change(templateSelect, { target: { value: 'helpful-assistant' } });
      
      expect(onChange).toHaveBeenCalled();
      const calledValue = onChange.mock.calls[0][0];
      expect(calledValue).toContain('helpful');
      expect(calledValue).toContain('respectful');
    });

    it('should show template description when selected', () => {
      const onChange = vi.fn();
      
      render(<SystemPromptEditor value="" onChange={onChange} />);
      
      const templateSelect = screen.getByLabelText(/system prompt template/i);
      fireEvent.change(templateSelect, { target: { value: 'code-reviewer' } });
      
      expect(screen.getByText(/expert code reviewer/i)).toBeInTheDocument();
    });
  });

  describe('Character Count', () => {
    it('should display character count', () => {
      const onChange = vi.fn();
      const testValue = 'Test prompt';
      
      render(<SystemPromptEditor value={testValue} onChange={onChange} />);
      
      expect(screen.getByText(`${testValue.length} / 2000 characters`)).toBeInTheDocument();
    });

    it('should update character count when text changes', () => {
      const onChange = vi.fn();
      
      render(<SystemPromptEditor value="" onChange={onChange} />);
      
      const textarea = screen.getByLabelText(/^system prompt$/i);
      fireEvent.change(textarea, { target: { value: 'New prompt text' } });
      
      expect(onChange).toHaveBeenCalledWith('New prompt text');
    });

    it('should prevent input beyond character limit', () => {
      const onChange = vi.fn();
      const longText = 'a'.repeat(2001);
      
      render(<SystemPromptEditor value="" onChange={onChange} />);
      
      const textarea = screen.getByLabelText(/^system prompt$/i);
      fireEvent.change(textarea, { target: { value: longText } });
      
      // onChange should not be called because text exceeds limit
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should show warning when character limit reached', () => {
      const onChange = vi.fn();
      const maxText = 'a'.repeat(2000);
      
      render(<SystemPromptEditor value={maxText} onChange={onChange} />);
      
      expect(screen.getByText(/character limit reached/i)).toBeInTheDocument();
    });
  });

  describe('Tips Section', () => {
    it('should show tips button', () => {
      const onChange = vi.fn();
      
      render(<SystemPromptEditor value="" onChange={onChange} />);
      
      expect(screen.getByRole('button', { name: /show tips/i })).toBeInTheDocument();
    });

    it('should toggle tips visibility when button clicked', () => {
      const onChange = vi.fn();
      
      render(<SystemPromptEditor value="" onChange={onChange} />);
      
      const tipsButton = screen.getByRole('button', { name: /show tips/i });
      
      // Tips should not be visible initially
      expect(screen.queryByText(/be specific/i)).not.toBeInTheDocument();
      
      // Click to show tips
      fireEvent.click(tipsButton);
      expect(screen.getByText(/be specific/i)).toBeInTheDocument();
      expect(screen.getByText(/set boundaries/i)).toBeInTheDocument();
      
      // Click to hide tips
      fireEvent.click(tipsButton);
      expect(screen.queryByText(/be specific/i)).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable all inputs when disabled prop is true', () => {
      const onChange = vi.fn();
      
      render(<SystemPromptEditor value="" onChange={onChange} disabled={true} />);
      
      const templateSelect = screen.getByLabelText(/system prompt template/i);
      const textarea = screen.getByLabelText(/^system prompt$/i);
      
      expect(templateSelect).toBeDisabled();
      expect(textarea).toBeDisabled();
    });
  });

  describe('Custom Template Switching', () => {
    it('should switch to custom when user modifies template text', () => {
      const onChange = vi.fn();
      
      render(<SystemPromptEditor value="" onChange={onChange} />);
      
      // Select a template
      const templateSelect = screen.getByLabelText(/system prompt template/i) as HTMLSelectElement;
      fireEvent.change(templateSelect, { target: { value: 'helpful-assistant' } });
      
      // Get the template value that was set
      const templateValue = onChange.mock.calls[0][0];
      
      // Clear the mock
      onChange.mockClear();
      
      // Modify the text
      const textarea = screen.getByLabelText(/^system prompt$/i);
      fireEvent.change(textarea, { target: { value: templateValue + ' modified' } });
      
      // Should switch to custom
      expect(templateSelect.value).toBe('custom');
    });
  });
});
