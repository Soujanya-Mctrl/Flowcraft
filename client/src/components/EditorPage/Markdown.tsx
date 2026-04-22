import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import DiagramPreview from "./DiagramPreview";
import { Copy } from "lucide-react";
import { useSetRecoilState } from "recoil";
import { codeState } from "../../store/atoms";

interface MarkdownProps {
  markdownString: string;
  isTyping?: boolean;
}

const Markdown: React.FC<MarkdownProps> = ({ markdownString, isTyping = false }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(!isTyping);
  const setCode = useSetRecoilState(codeState);


  // Handle [object Object] safety
  const safeMarkdown = useMemo(() => {
    if (typeof markdownString !== "string") {
      try {
        return JSON.stringify(markdownString, null, 2);
      } catch {
        return "Error: Message content is not a string.";
      }
    }
    return markdownString;
  }, [markdownString]);

  // Pre-process markdown to handle <think> tags and fix common formatting issues
  const processedMarkdown = useMemo(() => {
    let text = safeMarkdown;
    
    // Convert <think> tags to a styled div
    text = text.replace(
      /<think>([\s\S]*?)<\/think>/gi,
      (_, content) => `<div class="thinking-block">${content}</div>`
    );

    // Fix: Remove excessive leading spaces that cause accidental indented code blocks
    // but preserve them inside actual code blocks (which use backticks)
    const lines = text.split('\n');
    let isInCodeBlock = false;
    const cleanedLines = lines.map(line => {
      if (line.trim().startsWith('```')) {
        isInCodeBlock = !isInCodeBlock;
        return line;
      }
      if (isInCodeBlock) return line;
      
      // If not in code block, trim leading spaces if there are 4 or more (to prevent indented code blocks)
      // but keep normal indentation if any
      if (line.startsWith('    ')) {
        return line.trimStart();
      }
      return line;
    });

    return cleanedLines.join('\n');
  }, [safeMarkdown]);

  // Display text immediately to prevent layout jitter
  useEffect(() => {
    setDisplayedText(processedMarkdown);
    // If not typing, complete immediately. If typing, wait a tiny bit for the diagram.
    if (!isTyping) {
      setIsTypingComplete(true);
    } else {
      const timer = setTimeout(() => setIsTypingComplete(true), 500);
      return () => clearTimeout(timer);
    }
  }, [processedMarkdown, isTyping]);

  return (
    <div 
      className="markdown-content prose prose-sm max-w-none text-text-primary text-left break-words"
      style={{ "--tw-prose-pre-bg": "var(--bg-primary)" } as React.CSSProperties}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          div: ({ className, children, ...props }) => {
            if (className === "thinking-block") {
              return (
                <div className="my-4 p-4 rounded-xl border-l-4 border-accent-primary bg-bg-primary italic text-text-tertiary text-sm">
                  <div className="flex items-center gap-2 mb-2 not-italic font-semibold text-xs uppercase tracking-wider text-accent-primary">
                    Thinking Process
                  </div>
                  {children}
                </div>
              );
            }
            return <div className={className} {...props}>{children}</div>;
          },
          code({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const codeContent = String(children).replace(/\n$/, "");

            if (!inline && language === "mermaid") {
              return <DiagramPreview codeContent={codeContent} isTypingComplete={isTypingComplete} />;
            }

            if (!inline && language) {
              return (
                <div className="group relative my-4 rounded-xl overflow-hidden border border-border-primary">
                  <div className="flex items-center justify-between px-4 py-1.5 bg-bg-secondary border-b border-border-primary">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                      {language}
                    </span>
                    <button
                      onClick={() => {
                        setCode(codeContent);
                      }}
                      className="flex items-center gap-1 text-[10px] font-medium text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <Copy size={12} />
                      Try This
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={language}
                    PreTag="div"
                    className="!m-0 !bg-bg-primary"
                    customStyle={{
                      fontSize: "12px",
                      lineHeight: "1.6",
                      padding: "1rem",
                    }}
                  >
                    {codeContent}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code
                className={`${className} px-1.5 py-0.5 rounded bg-bg-primary border border-border-primary text-accent-primary font-mono text-[0.9em] whitespace-nowrap`}
                {...props}
              >
                {String(children).replace(/^`|`$/g, '')}
              </code>
            );
          },
          // Enhance other elements
          h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-4 text-text-primary">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold mt-5 mb-3 text-text-primary border-b border-border-primary pb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-md font-bold mt-4 mb-2 text-text-primary">{children}</h3>,
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-text-secondary">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-text-secondary">{children}</ul>,
          li: ({ children }) => <li className="marker:text-accent-primary">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-border-primary pl-4 italic my-4 text-text-tertiary">
              {children}
            </blockquote>
          ),
        }}
      >
        {displayedText}
      </ReactMarkdown>
      {!isTypingComplete && (
        <span className="inline-block w-1.5 h-4 ml-1 bg-accent-primary animate-pulse align-middle" />
      )}
    </div>
  );
};

export default Markdown;
