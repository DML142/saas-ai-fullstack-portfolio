'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

/** Renders message content as markdown with syntax-highlighted code blocks —
 * never raw HTML. Elements are styled via `components` overrides rather than
 * a `prose` plugin class, since `@tailwindcss/typography` isn't installed
 * here and pulling it in for one component isn't worth the dependency. */
export function MessageContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 leading-relaxed last:mb-0">{children}</p>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-cosmic-light underline underline-offset-2 hover:text-ink"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => <li className="mb-1">{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold text-ink">{children}</strong>
        ),
        // rehype-highlight only adds a `language-*` class to block code
        // (the <code> nested inside <pre>) — inline code has no className,
        // which is the documented way to tell them apart in react-markdown
        // v9+ (the old `inline` prop was removed).
        code: ({ className, children, ...props }) => {
          if (!className) {
            return (
              <code
                className="rounded bg-card/40 px-1 py-0.5 font-mono text-[0.85em]"
                {...props}
              >
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
        pre: ({ children }) => (
          <pre className="mb-2 overflow-x-auto rounded-lg border border-border/60 bg-card/20 p-3 text-sm last:mb-0">
            {children}
          </pre>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
