"use client";

import { Trash2, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useEffect } from 'react';
import Prism from 'prismjs';

// Import Prism themes and languages
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';

interface MessageItemProps {
  message: {
    id: string;
    sender: string;
    senderId: string;
    content: string;
    timestamp: string;
    isDeleted?: boolean;
    isAi?: boolean;
    familiarName?: string;
  };
  isOwn: boolean;
  showAvatar?: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  onDelete?: () => void;
  currentUserId?: string | null;
}

export function MessageItem({
  message,
  isOwn,
  showAvatar = true,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
  onDelete,
  currentUserId,
}: MessageItemProps) {
  // Highlight code blocks after render
  useEffect(() => {
    Prism.highlightAll();
  }, [message.content]);

  return (
    <div className={`flex gap-3 ${message.isDeleted ? 'opacity-60' : ''}`}>
      {isSelectionMode && !message.isDeleted && (
        <div className="pt-2">
          <input
            data-testid={`select-message-${message.id}`}
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelection}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="flex items-baseline gap-2">
          <span
            className={`font-bold text-sm ${
              message.isAi ? 'text-indigo-600 flex items-center gap-1' : ''
            }`}
          >
            {message.isAi && <Bot size={14} />} {message.sender}
          </span>
          <span className="text-xs text-gray-400">{message.timestamp}</span>
        </div>

        <div
          className={`p-3 rounded-lg shadow-sm max-w-lg mt-1 text-sm leading-relaxed group relative ${
            message.isDeleted
              ? 'bg-gray-100 italic text-gray-500 border border-gray-200'
              : message.isAi
              ? 'bg-indigo-50 border border-indigo-100 text-indigo-900'
              : 'bg-white'
          }`}
        >
          {message.isDeleted ? (
            <span className="text-gray-500 italic">此消息已被删除</span>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom code block renderer with Prism highlighting
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';

                    if (!inline && language) {
                      return (
                        <code className={`language-${language}`} {...props}>
                          {children}
                        </code>
                      );
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  // Add className to pre element
                  pre({ node, children, ...props }: any) {
                    // Extract language from code element
                    const codeElement = children as any;
                    const className = codeElement?.props?.className || '';
                    const match = /language-(\w+)/.exec(className);
                    const language = match ? match[1] : '';

                    if (language) {
                      return (
                        <pre className={`language-${language}`} {...props}>
                          {children}
                        </pre>
                      );
                    }

                    return <pre {...props}>{children}</pre>;
                  },
                  // Style links
                  a({ node, children, ...props }) {
                    return (
                      <a
                        {...props}
                        className="text-blue-600 hover:text-blue-800 underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    );
                  },
                  // Style images
                  img({ node, ...props }) {
                    return (
                      <img
                        {...props}
                        className="max-w-full h-auto rounded-lg my-2"
                        alt={props.alt || ''}
                      />
                    );
                  },
                  // Style lists
                  ul({ node, children, ...props }) {
                    return (
                      <ul className="list-disc list-inside my-2" {...props}>
                        {children}
                      </ul>
                    );
                  },
                  ol({ node, children, ...props }) {
                    return (
                      <ol className="list-decimal list-inside my-2" {...props}>
                        {children}
                      </ol>
                    );
                  },
                  // Style headings
                  h1({ node, children, ...props }) {
                    return (
                      <h1 className="text-xl font-bold my-2" {...props}>
                        {children}
                      </h1>
                    );
                  },
                  h2({ node, children, ...props }) {
                    return (
                      <h2 className="text-lg font-bold my-2" {...props}>
                        {children}
                      </h2>
                    );
                  },
                  h3({ node, children, ...props }) {
                    return (
                      <h3 className="text-base font-bold my-2" {...props}>
                        {children}
                      </h3>
                    );
                  },
                  // Style blockquotes
                  blockquote({ node, children, ...props }) {
                    return (
                      <blockquote
                        className="border-l-4 border-gray-300 pl-4 italic my-2"
                        {...props}
                      >
                        {children}
                      </blockquote>
                    );
                  },
                  // Style tables
                  table({ node, children, ...props }) {
                    return (
                      <table
                        className="border-collapse border border-gray-300 my-2"
                        {...props}
                      >
                        {children}
                      </table>
                    );
                  },
                  th({ node, children, ...props }) {
                    return (
                      <th
                        className="border border-gray-300 px-2 py-1 bg-gray-100 font-bold"
                        {...props}
                      >
                        {children}
                      </th>
                    );
                  },
                  td({ node, children, ...props }) {
                    return (
                      <td className="border border-gray-300 px-2 py-1" {...props}>
                        {children}
                      </td>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {!message.isDeleted &&
            !isSelectionMode &&
            onDelete &&
            message.senderId === currentUserId && (
              <button
                data-testid={`delete-message-${message.id}`}
                onClick={onDelete}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition"
              >
                <Trash2 size={14} />
              </button>
            )}
        </div>
      </div>
    </div>
  );
}
