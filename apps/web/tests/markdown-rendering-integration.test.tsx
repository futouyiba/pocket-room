/**
 * Markdown Rendering Integration Tests
 * 
 * Integration tests to verify Markdown rendering and code highlighting work correctly
 * in the context of the Room page.
 * 
 * **Validates: Requirements 8.2, 8.3**
 * - 需求 8.2: THE Message SHALL 支持 Markdown 语法渲染
 * - 需求 8.3: THE Message SHALL 支持代码块语法高亮显示
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageItem } from '@/components/rooms/message-item';

describe('Markdown Rendering Integration', () => {
  describe('Complex Markdown Content - 需求 8.2', () => {
    it('should render a message with mixed Markdown elements', () => {
      const complexMessage = {
        id: 'msg-complex',
        sender: 'Alice',
        senderId: 'user-alice',
        content: `# Project Update

Here's what we've accomplished:

- **Backend API**: Completed all endpoints
- *Frontend UI*: 80% done
- Testing: In progress

Check out the [documentation](https://example.com/docs) for more details.

> Remember: Quality over speed!`,
        timestamp: '2:30 PM',
      };

      const { container } = render(
        <MessageItem message={complexMessage} isOwn={false} />
      );

      // Check heading
      expect(container.querySelector('h1')).toBeInTheDocument();
      expect(container.querySelector('h1')?.textContent).toBe('Project Update');

      // Check list
      const listItems = container.querySelectorAll('li');
      expect(listItems.length).toBeGreaterThan(0);

      // Check bold
      expect(container.querySelector('strong')).toBeInTheDocument();

      // Check italic
      expect(container.querySelector('em')).toBeInTheDocument();

      // Check link
      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.getAttribute('href')).toBe('https://example.com/docs');

      // Check blockquote
      expect(container.querySelector('blockquote')).toBeInTheDocument();
    });

    it('should render a message with a table', () => {
      const tableMessage = {
        id: 'msg-table',
        sender: 'Bob',
        senderId: 'user-bob',
        content: `| Feature | Status | Priority |
|---------|--------|----------|
| Auth    | Done   | High     |
| Chat    | WIP    | High     |
| Search  | Todo   | Medium   |`,
        timestamp: '3:00 PM',
      };

      const { container } = render(
        <MessageItem message={tableMessage} isOwn={false} />
      );

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();

      const headers = container.querySelectorAll('th');
      expect(headers).toHaveLength(3);
      expect(headers[0].textContent).toBe('Feature');
      expect(headers[1].textContent).toBe('Status');
      expect(headers[2].textContent).toBe('Priority');

      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(3);
    });
  });

  describe('Code Highlighting Integration - 需求 8.3', () => {
    it('should render a message with multiple code blocks in different languages', () => {
      const multiCodeMessage = {
        id: 'msg-multicode',
        sender: 'Charlie',
        senderId: 'user-charlie',
        content: `Here's the implementation:

**JavaScript:**
\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

**Python:**
\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\`

**SQL:**
\`\`\`sql
SELECT * FROM users WHERE active = true;
\`\`\``,
        timestamp: '3:30 PM',
      };

      const { container } = render(
        <MessageItem message={multiCodeMessage} isOwn={false} />
      );

      const codeBlocks = container.querySelectorAll('pre');
      expect(codeBlocks).toHaveLength(3);

      // Check JavaScript block
      expect(codeBlocks[0].className).toContain('language-javascript');

      // Check Python block
      expect(codeBlocks[1].className).toContain('language-python');

      // Check SQL block
      expect(codeBlocks[2].className).toContain('language-sql');
    });

    it('should render inline code within Markdown text', () => {
      const inlineCodeMessage = {
        id: 'msg-inline',
        sender: 'Dave',
        senderId: 'user-dave',
        content: 'Use the `useState` hook to manage state, and `useEffect` for side effects.',
        timestamp: '4:00 PM',
      };

      const { container } = render(
        <MessageItem message={inlineCodeMessage} isOwn={false} />
      );

      const inlineCodes = container.querySelectorAll('code');
      expect(inlineCodes.length).toBeGreaterThanOrEqual(2);
    });

    it('should render code block with syntax highlighting for TypeScript', () => {
      const tsMessage = {
        id: 'msg-ts',
        sender: 'Eve',
        senderId: 'user-eve',
        content: `\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = {
  id: '123',
  name: 'Alice',
  email: 'alice@example.com'
};
\`\`\``,
        timestamp: '4:30 PM',
      };

      const { container } = render(
        <MessageItem message={tsMessage} isOwn={false} />
      );

      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
      expect(pre?.className).toContain('language-typescript');

      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code?.className).toContain('language-typescript');
    });
  });

  describe('Real-world Message Scenarios', () => {
    it('should render a technical discussion message with code and explanations', () => {
      const technicalMessage = {
        id: 'msg-tech',
        sender: 'Frank',
        senderId: 'user-frank',
        content: `I found the bug! The issue is in the authentication middleware:

\`\`\`javascript
// Before (buggy)
if (token = null) {
  return res.status(401).json({ error: 'Unauthorized' });
}

// After (fixed)
if (token === null) {
  return res.status(401).json({ error: 'Unauthorized' });
}
\`\`\`

The problem was using assignment (\`=\`) instead of comparison (\`===\`).

**Impact:**
- All requests were being rejected
- Users couldn't log in

**Fix deployed:** ✅`,
        timestamp: '5:00 PM',
      };

      const { container } = render(
        <MessageItem message={technicalMessage} isOwn={false} />
      );

      // Check code block
      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
      expect(pre?.className).toContain('language-javascript');

      // Check inline code
      const inlineCodes = container.querySelectorAll('p code');
      expect(inlineCodes.length).toBeGreaterThan(0);

      // Check bold text
      expect(container.querySelector('strong')).toBeInTheDocument();

      // Check list
      expect(container.querySelector('ul')).toBeInTheDocument();
    });

    it('should render a message with links and images', () => {
      const mediaMessage = {
        id: 'msg-media',
        sender: 'Grace',
        senderId: 'user-grace',
        content: `Check out this diagram:

![Architecture Diagram](https://example.com/diagram.png)

More details in the [design doc](https://example.com/design).`,
        timestamp: '5:30 PM',
      };

      const { container } = render(
        <MessageItem message={mediaMessage} isOwn={false} />
      );

      // Check image
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute('src')).toBe('https://example.com/diagram.png');
      expect(img?.getAttribute('alt')).toBe('Architecture Diagram');

      // Check link
      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.getAttribute('href')).toBe('https://example.com/design');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message content', () => {
      const emptyMessage = {
        id: 'msg-empty',
        sender: 'Henry',
        senderId: 'user-henry',
        content: '',
        timestamp: '6:00 PM',
      };

      const { container } = render(
        <MessageItem message={emptyMessage} isOwn={false} />
      );

      expect(container).toBeInTheDocument();
    });

    it('should handle message with only whitespace', () => {
      const whitespaceMessage = {
        id: 'msg-whitespace',
        sender: 'Ivy',
        senderId: 'user-ivy',
        content: '   \n\n   ',
        timestamp: '6:30 PM',
      };

      const { container } = render(
        <MessageItem message={whitespaceMessage} isOwn={false} />
      );

      expect(container).toBeInTheDocument();
    });

    it('should handle message with special characters', () => {
      const specialCharsMessage = {
        id: 'msg-special',
        sender: 'Jack',
        senderId: 'user-jack',
        content: 'Special chars: < > & " \' `',
        timestamp: '7:00 PM',
      };

      const { container } = render(
        <MessageItem message={specialCharsMessage} isOwn={false} />
      );

      expect(container).toBeInTheDocument();
      expect(container.textContent).toContain('Special chars');
    });

    it('should handle very long code blocks', () => {
      const longCodeMessage = {
        id: 'msg-longcode',
        sender: 'Kate',
        senderId: 'user-kate',
        content: `\`\`\`javascript
${Array(50).fill('console.log("Line");').join('\n')}
\`\`\``,
        timestamp: '7:30 PM',
      };

      const { container } = render(
        <MessageItem message={longCodeMessage} isOwn={false} />
      );

      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
      expect(pre?.className).toContain('language-javascript');
    });
  });
});
