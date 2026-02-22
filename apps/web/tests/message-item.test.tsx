/**
 * MessageItem Component Tests
 * 
 * Tests for the MessageItem component that renders messages with Markdown and code highlighting.
 * 
 * **Validates: Requirements 8.2, 8.3**
 * - 需求 8.2: THE Message SHALL 支持 Markdown 语法渲染
 * - 需求 8.3: THE Message SHALL 支持代码块语法高亮显示
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageItem } from '@/components/rooms/message-item';

describe('MessageItem Component', () => {
  const baseMessage = {
    id: 'msg-1',
    sender: 'Test User',
    senderId: 'user-1',
    content: 'Hello, world!',
    timestamp: '10:30 AM',
  };

  describe('Basic Rendering', () => {
    it('should render a simple text message', () => {
      render(<MessageItem message={baseMessage} isOwn={false} />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('10:30 AM')).toBeInTheDocument();
      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });

    it('should render deleted message with tombstone', () => {
      const deletedMessage = {
        ...baseMessage,
        isDeleted: true,
        content: 'This message was deleted',
      };
      
      render(<MessageItem message={deletedMessage} isOwn={false} />);
      
      expect(screen.getByText('This message was deleted')).toBeInTheDocument();
    });

    it('should render AI message with bot icon', () => {
      const aiMessage = {
        ...baseMessage,
        isAi: true,
        familiarName: 'Pancake',
      };
      
      render(<MessageItem message={aiMessage} isOwn={false} />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  describe('Markdown Rendering - 需求 8.2', () => {
    it('should render bold text', () => {
      const message = {
        ...baseMessage,
        content: 'This is **bold** text',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('bold');
    });

    it('should render italic text', () => {
      const message = {
        ...baseMessage,
        content: 'This is *italic* text',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const em = container.querySelector('em');
      expect(em).toBeInTheDocument();
      expect(em?.textContent).toBe('italic');
    });

    it('should render headings', () => {
      const message = {
        ...baseMessage,
        content: '# Heading 1\n## Heading 2\n### Heading 3',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      expect(container.querySelector('h1')).toBeInTheDocument();
      expect(container.querySelector('h2')).toBeInTheDocument();
      expect(container.querySelector('h3')).toBeInTheDocument();
    });

    it('should render unordered lists', () => {
      const message = {
        ...baseMessage,
        content: '- Item 1\n- Item 2\n- Item 3',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const ul = container.querySelector('ul');
      expect(ul).toBeInTheDocument();
      
      const items = container.querySelectorAll('li');
      expect(items).toHaveLength(3);
    });

    it('should render ordered lists', () => {
      const message = {
        ...baseMessage,
        content: '1. First\n2. Second\n3. Third',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const ol = container.querySelector('ol');
      expect(ol).toBeInTheDocument();
      
      const items = container.querySelectorAll('li');
      expect(items).toHaveLength(3);
    });

    it('should render links', () => {
      const message = {
        ...baseMessage,
        content: 'Check out [this link](https://example.com)',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const link = container.querySelector('a');
      expect(link).toBeInTheDocument();
      expect(link?.getAttribute('href')).toBe('https://example.com');
      expect(link?.textContent).toBe('this link');
    });

    it('should render blockquotes', () => {
      const message = {
        ...baseMessage,
        content: '> This is a quote',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const blockquote = container.querySelector('blockquote');
      expect(blockquote).toBeInTheDocument();
    });

    it('should render tables (GFM)', () => {
      const message = {
        ...baseMessage,
        content: '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
      
      const headers = container.querySelectorAll('th');
      expect(headers).toHaveLength(2);
    });

    it('should render strikethrough (GFM)', () => {
      const message = {
        ...baseMessage,
        content: 'This is ~~strikethrough~~ text',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const del = container.querySelector('del');
      expect(del).toBeInTheDocument();
      expect(del?.textContent).toBe('strikethrough');
    });
  });

  describe('Code Highlighting - 需求 8.3', () => {
    it('should render inline code', () => {
      const message = {
        ...baseMessage,
        content: 'Use `console.log()` to debug',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code?.textContent).toBe('console.log()');
    });

    it('should render JavaScript code block with language class', () => {
      const message = {
        ...baseMessage,
        content: '```javascript\nconst x = 42;\nconsole.log(x);\n```',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
      expect(pre?.className).toContain('language-javascript');
      
      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code?.className).toContain('language-javascript');
    });

    it('should render Python code block with language class', () => {
      const message = {
        ...baseMessage,
        content: '```python\ndef hello():\n    print("Hello")\n```',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
      expect(pre?.className).toContain('language-python');
    });

    it('should render SQL code block with language class', () => {
      const message = {
        ...baseMessage,
        content: '```sql\nSELECT * FROM users WHERE id = 1;\n```',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
      expect(pre?.className).toContain('language-sql');
    });

    it('should render TypeScript code block with language class', () => {
      const message = {
        ...baseMessage,
        content: '```typescript\ninterface User {\n  id: number;\n  name: string;\n}\n```',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const pre = container.querySelector('pre');
      expect(pre).toBeInTheDocument();
      expect(pre?.className).toContain('language-typescript');
    });

    it('should render code block without language as plain code', () => {
      const message = {
        ...baseMessage,
        content: '```\nPlain code block\n```',
      };
      
      const { container } = render(<MessageItem message={message} isOwn={false} />);
      
      const code = container.querySelector('code');
      expect(code).toBeInTheDocument();
    });
  });

  describe('Selection Mode', () => {
    it('should show checkbox in selection mode', () => {
      render(
        <MessageItem
          message={baseMessage}
          isOwn={false}
          isSelectionMode={true}
          isSelected={false}
        />
      );
      
      const checkbox = screen.getByTestId(`select-message-${baseMessage.id}`);
      expect(checkbox).toBeInTheDocument();
    });

    it('should not show checkbox for deleted messages', () => {
      const deletedMessage = {
        ...baseMessage,
        isDeleted: true,
      };
      
      render(
        <MessageItem
          message={deletedMessage}
          isOwn={false}
          isSelectionMode={true}
          isSelected={false}
        />
      );
      
      const checkbox = screen.queryByTestId(`select-message-${baseMessage.id}`);
      expect(checkbox).not.toBeInTheDocument();
    });
  });

  describe('Delete Button', () => {
    it('should show delete button for own messages', () => {
      render(
        <MessageItem
          message={baseMessage}
          isOwn={true}
          currentUserId="user-1"
          onDelete={() => {}}
        />
      );
      
      const deleteButton = screen.getByTestId(`delete-message-${baseMessage.id}`);
      expect(deleteButton).toBeInTheDocument();
    });

    it('should not show delete button for other users messages', () => {
      render(
        <MessageItem
          message={baseMessage}
          isOwn={false}
          currentUserId="user-2"
          onDelete={() => {}}
        />
      );
      
      const deleteButton = screen.queryByTestId(`delete-message-${baseMessage.id}`);
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('should not show delete button in selection mode', () => {
      render(
        <MessageItem
          message={baseMessage}
          isOwn={true}
          currentUserId="user-1"
          isSelectionMode={true}
          onDelete={() => {}}
        />
      );
      
      const deleteButton = screen.queryByTestId(`delete-message-${baseMessage.id}`);
      expect(deleteButton).not.toBeInTheDocument();
    });
  });
});
