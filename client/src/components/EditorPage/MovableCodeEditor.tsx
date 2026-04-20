import React, { useRef, useState, useEffect, useCallback } from "react";
import { Undo, Redo, Copy, Check, X } from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { basicLight } from "@uiw/codemirror-theme-basic";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { foldByIndent, mermaid as mermaidLang } from "codemirror-lang-mermaid";
import { syntaxHighlighting } from "@codemirror/language";
import { myHighlightStyle } from "../../pages/Diagram/theme";

interface MovableCodeEditorProps {
  code: string;
  setCode: (v: string) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleCopy: () => void;
  copiedToClipboard: boolean;
  history: string[];
  redoStack: string[];
  isDark: boolean;
  zIndex?: number;
  onFocus?: () => void;
}

const MovableCodeEditor: React.FC<MovableCodeEditorProps> = ({
  code,
  setCode,
  isOpen,
  setIsOpen,
  handleUndo,
  handleRedo,
  handleCopy,
  copiedToClipboard,
  history,
  redoStack,
  isDark,
  zIndex = 500,
  onFocus,
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 40, y: 120 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

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


  if (!isOpen) return null;

  return (
    <div
      ref={boxRef}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        zIndex: zIndex,
      }}
      onMouseDown={() => onFocus?.()}
      className="border border-border-primary bg-bg-primary flex flex-col h-[500px] w-[500px] overflow-hidden rounded-container"
    >
      {/* Minimal Header */}
      <div
        className="drag-handle cursor-move w-full flex justify-between items-center py-2.5 px-6 bg-bg-primary border-b border-border-primary select-none"
        onMouseDown={onMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black tracking-[0.2em] opacity-40 uppercase text-text-primary">Editor</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            disabled={history.length <= 1}
            className={`p-2 rounded-pill transition-colors ${
              history.length > 1 ? "hover:bg-bg-secondary opacity-100" : "opacity-20 cursor-not-allowed"
            }`}
            onClick={handleUndo}
            title="Undo"
          >
            <Undo size={14} />
          </button>
          <button
            disabled={redoStack.length === 0}
            className={`p-2 rounded-pill transition-colors ${
              redoStack.length > 0 ? "hover:bg-bg-secondary opacity-100" : "opacity-20 cursor-not-allowed"
            }`}
            onClick={handleRedo}
            title="Redo"
          >
            <Redo size={14} />
          </button>
          <div className="w-px h-3 bg-border-primary mx-1" />
          <button
            className="p-2 hover:bg-bg-secondary rounded-pill transition-all"
            onClick={handleCopy}
            title="Copy Code"
          >
            {copiedToClipboard ? <Check size={14} className="text-text-primary" /> : <Copy size={14} />}
          </button>
          <button
            className="ml-2 p-2 hover:bg-bg-secondary rounded-pill transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <X size={16} />
          </button>
        </div>
      </div>


      <div className="flex-1 bg-white dark:bg-apple-black/40 overflow-hidden">
        <CodeMirror
          value={code}
          height="100%"
          width="100%"
          className="h-full text-[14px]"
          extensions={[
            mermaidLang(),
            syntaxHighlighting(myHighlightStyle),
            foldByIndent(),
          ]}
          theme={isDark ? dracula : basicLight}
          onChange={setCode}
        />
      </div>
    </div>
  );
};


export default MovableCodeEditor;