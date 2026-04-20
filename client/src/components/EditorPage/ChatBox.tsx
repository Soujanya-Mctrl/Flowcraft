import { Sparkles, Trash2, ChevronDown, ChevronUp, Send } from "lucide-react";
import Markdown from "./Markdown";
import React, { useRef, useState, useEffect, useCallback } from "react";
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
  setIsChatOpen: _setIsChatOpen,
  models,
  diagramTypes,
  onClearChat,
  hasExistingDiagram,
  zIndex = 1000,
  onFocus,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [mode, setMode] = useState<"conversation" | "enhancement">("conversation");
  const [collapsed, setCollapsed] = useState(false);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      className={`border border-border-primary bg-bg-primary flex flex-col w-[450px] overflow-hidden rounded-container shadow-2xl shadow-black/10 transition-all duration-200 ${collapsed ? "h-auto" : "h-[650px]"}`}
    >
      {/* Minimal Header */}
      <div
        className="drag-handle cursor-move px-6 py-4 flex justify-between items-center bg-bg-primary border-b border-border-primary select-none"
        onMouseDown={onMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-container bg-bg-secondary flex items-center justify-center border border-border-primary">
            <Sparkles size={14} className="text-text-primary" />
          </div>
          <span className="text-[15px] font-rounded font-medium text-text-primary">Architect</span>
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
          <div className="flex p-1 bg-bg-secondary border-b border-border-primary gap-1">
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

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 bg-bg-primary">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] px-4 py-3 text-[14px] leading-relaxed rounded-container ${
                message.role === "user"
                  ? "bg-text-primary text-bg-primary"
                  : "bg-bg-secondary text-text-primary border border-border-primary"
              }`}
            >
              {message.role === "user" ? (
                <p className="m-0 whitespace-pre-wrap">{message.content}</p>
              ) : (
                <Markdown markdownString={message.content} />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Integrated Input Area */}
      <div className="p-4 border-t border-border-primary bg-bg-primary">
        <div className="relative border border-border-primary rounded-container bg-bg-primary focus-within:border-text-primary overflow-hidden group">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === "conversation" ? "Describe your system..." : "Modify diagram..."}
            rows={2}
            className="w-full px-4 pt-3 pb-2 text-[14px] text-text-primary outline-none placeholder:text-text-muted resize-none bg-transparent"
          />
          
          <div className="flex items-center justify-between px-2 py-1.5 bg-bg-secondary border-t border-border-primary">
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