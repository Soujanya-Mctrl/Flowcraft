import { Sparkles, Trash2, ChevronDown, ChevronUp, Send } from "lucide-react";
import Markdown from "./Markdown";
import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { ChatMessage } from "../../types";

interface ModelOption {
  name: string;
  description: string;
  model: string;
}

interface DiagramTypeOption {
  name: string;
  value: string;
  description: string;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  prompt: string;
  setPrompt: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  diagramType: string;
  setDiagramType: (v: string) => void;
  isAIGeneratingDiagram: boolean;
  onGenerate: () => void;
  onEnhance: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (v: boolean) => void;
  models: ModelOption[];
  diagramTypes: DiagramTypeOption[];
  onClearChat: () => void;
  hasExistingDiagram: boolean;
  zIndex?: number;
  onFocus?: () => void;
}

const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  prompt,
  setPrompt,
  model,
  setModel,
  diagramType,
  setDiagramType,
  isAIGeneratingDiagram,
  onGenerate,
  onEnhance,
  isChatOpen,
  models,
  diagramTypes,
  onClearChat,
  hasExistingDiagram,
  zIndex = 1000,
  onFocus,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const renderedMessages = useMemo(() => messages.map((message, index) => {
    const isLatestMessage = index === messages.length - 1;
    const isAssistant = message.role === "assistant";
    const isTyping = isLatestMessage && isAssistant && isAIGeneratingDiagram;
    
    const displayContent = typeof message.content === 'string' 
      ? message.content 
      : JSON.stringify(message.content, null, 2);

    return (
      <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[90%] px-4 py-3 text-[14px] leading-relaxed rounded-xl ${
            message.role === "user"
              ? "bg-text-primary text-bg-primary shadow-sm"
              : "bg-bg-primary text-text-primary border border-border-primary"
          }`}
        >
          {message.role === "user" ? (
            <p className="m-0 whitespace-pre-wrap">{displayContent}</p>
          ) : (
            <Markdown 
              markdownString={displayContent} 
              isTyping={isTyping} 
            />
          )}
        </div>
      </div>
    );
  }), [messages, isAIGeneratingDiagram]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [mode, setMode] = useState<"conversation" | "enhancement">("conversation");
  const [collapsed, setCollapsed] = useState(false);


  // Optimized scrolling
  useEffect(() => {
    const scrollContainer = messagesEndRef.current?.parentElement;
    if (!scrollContainer) return;

    const scrollToBottom = () => {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      });
    };

    // Observe content changes
    const observer = new MutationObserver(() => {
      const threshold = 150;
      const isNearBottom = 
        scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < threshold;
      
      if (isNearBottom) {
        scrollToBottom();
      }
    });

    observer.observe(scrollContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Initial scroll
    scrollToBottom();

    return () => observer.disconnect();
  }, [messages]);

  const onMouseDown = (e: React.MouseEvent) => {
    onFocus?.();
    setDragging(true);
    const box = boxRef.current;
    if (box) {
      const rect = box.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    });
  }, [dragging]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, onMouseMove, onMouseUp]);


  if (!isChatOpen) return null;

  const handleSubmit = () => {
    if (!prompt.trim() || isAIGeneratingDiagram) return;
    if (mode === "conversation") onGenerate();
    else onEnhance();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      ref={boxRef}
      style={{
        position: "fixed",
        left: position.x || undefined,
        top: position.y || undefined,
        right: position.x === 0 ? 32 : undefined,
        bottom: position.y === 0 ? 32 : undefined,
        zIndex: zIndex,
      }}
      onMouseDown={() => onFocus?.()}
      className={`border border-border-primary bg-bg-primary flex flex-col overflow-hidden rounded-container shadow-2xl shadow-black/10 transition-shadow duration-200 ${
        collapsed 
          ? "!h-auto !w-[450px] resize-none" 
          : "w-[450px] h-[650px] min-w-[320px] min-h-[400px] max-w-[80vw] max-h-[90vh] resize"
      }`}
    >
      {/* Minimal Header */}
      <div
        className="drag-handle shrink-0 cursor-move px-6 py-4 flex justify-between items-center bg-bg-primary border-b border-border-primary select-none"
        onMouseDown={onMouseDown}
      >
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-text-primary flex items-center justify-center shadow-lg shadow-text-primary/10">
                <Sparkles size={16} className="text-bg-primary" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent-blue rounded-full border-2 border-bg-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-black uppercase tracking-widest text-text-primary leading-none">Architect</span>
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter mt-1 opacity-70">Neural Diagram Engine</span>
            </div>
          </div>
        <div className="flex items-center gap-1">
          <button
            className="p-2 hover:bg-bg-secondary rounded-full transition-colors text-text-secondary hover:text-text-primary"
            onClick={onClearChat}
            title="Clear Chat"
          >
            <Trash2 size={16} />
          </button>
          <div className="w-px h-4 bg-border-primary mx-1" />
          <button
            className="p-2 hover:bg-bg-secondary rounded-full transition-colors text-text-secondary hover:text-text-primary"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand" : "Minimize"}
          >
            {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Generate / Enhance Tabs */}
          <div className="flex shrink-0 p-1 bg-bg-primary border-b border-border-primary gap-1">
            <button
              onClick={() => setMode("conversation")}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-pill ${
                mode === "conversation"
                  ? "bg-text-primary/10 text-text-primary border border-border-secondary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Generate
            </button>
            <button
              onClick={() => hasExistingDiagram && setMode("enhancement")}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-pill ${
                mode === "enhancement"
                  ? "bg-text-primary/10 text-text-primary border border-border-secondary"
                  : hasExistingDiagram
                  ? "text-text-muted hover:text-text-primary"
                  : "text-text-muted opacity-30 cursor-not-allowed"
              }`}
              disabled={!hasExistingDiagram}
            >
              Enhance
            </button>
          </div>

      <div 
        className="flex-1 overflow-y-auto px-6 py-8 space-y-6 bg-bg-primary"
        style={{ overflowAnchor: "auto" }}
      >
        {renderedMessages}
        <div ref={messagesEndRef} />
      </div>

      {/* Integrated Input Area */}
      <div className="shrink-0 p-4 border-t border-border-primary bg-bg-primary">
        <div className="relative border border-border-primary rounded-xl bg-bg-primary focus-within:border-black dark:focus-within:border-white overflow-hidden group flex flex-col">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === "conversation" ? "Describe your system..." : "Modify diagram..."}
            rows={2}
            className="w-full px-4 pt-3 pb-2 text-[14px] text-text-primary outline-none placeholder:text-text-muted resize-none bg-transparent"
          />
          
          <div className="flex shrink-0 items-center justify-between pl-2 pr-4 py-1.5 bg-bg-primary border-t border-border-primary">
            <div className="flex items-center gap-1 flex-1 min-w-0 pr-2">

              <div className="relative flex-shrink-0">
                <select
                  className="appearance-none bg-bg-primary border border-border-primary rounded-pill px-2 py-1 pr-6 text-[10px] font-black uppercase tracking-wider text-text-secondary hover:text-text-primary outline-none cursor-pointer transition-colors"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {models.map((m) => <option key={m.model} value={m.model}>{m.name}</option>)}
                </select>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                  <ChevronDown size={11} />
                </div>
              </div>

              <div className="relative flex-shrink-0">
                <select
                  className="appearance-none bg-bg-primary border border-border-primary rounded-pill px-2 py-1 pr-6 text-[10px] font-black uppercase tracking-wider text-text-secondary hover:text-text-primary outline-none cursor-pointer transition-colors"
                  value={diagramType}
                  onChange={(e) => setDiagramType(e.target.value)}
                >
                  {diagramTypes.map((t) => <option key={t.value} value={t.value}>{t.name}</option>)}
                </select>
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                  <ChevronDown size={11} />
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isAIGeneratingDiagram || !prompt.trim()}
              className={`flex-shrink-0 w-8 h-8 rounded-pill flex items-center justify-center transition-all ${
                isAIGeneratingDiagram || !prompt.trim()
                  ? "bg-bg-secondary text-text-muted cursor-not-allowed border border-border-primary"
                  : "bg-text-primary text-bg-primary hover:opacity-90 active:scale-[0.98]"
              }`}
            >
              {isAIGeneratingDiagram ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
          </div>
        </div>
      </>)}
    </div>


  );
};



export default ChatBox;