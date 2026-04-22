import React, { useState } from "react";
import { Copy } from "lucide-react";
import MermaidRenderer from "./MermaidRenderer";
import { useSetRecoilState } from "recoil";
import { codeState } from "../../store/atoms";

interface DiagramPreviewProps {
  codeContent: string;
  isTypingComplete: boolean;
}

const DiagramPreview: React.FC<DiagramPreviewProps> = ({ codeContent, isTypingComplete }) => {
  const [isVisual, setIsVisual] = useState(true);
  const setCode = useSetRecoilState(codeState);

  return (
    <div className="flex flex-col gap-0 my-8 rounded-2xl overflow-hidden border border-border-primary bg-bg-primary shadow-sm transition-all duration-300">
      {/* Refined Header - Non-overlapping */}
      <div className="flex flex-row items-center justify-between px-6 py-4 bg-bg-primary dark:bg-zinc-900 border-b border-border-primary flex-wrap gap-y-4">
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-text-primary leading-tight truncate">
            {isVisual ? "Visual Preview" : "Mermaid Source"}
          </span>
        </div>
        
        <div className="flex items-center gap-3 ml-auto">
          {/* Refined Toggle */}
          <div className="flex p-1 bg-bg-primary dark:bg-zinc-800 border border-border-primary rounded-xl overflow-hidden">
            <button
              onClick={() => setIsVisual(true)}
              className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 rounded-lg ${isVisual ? "bg-black dark:bg-white text-white dark:text-black shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              Visual
            </button>
            <button
              onClick={() => setIsVisual(false)}
              className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all duration-200 rounded-lg ${!isVisual ? "bg-black dark:bg-white text-white dark:text-black shadow-sm" : "text-text-secondary hover:text-text-primary"}`}
            >
              Code
            </button>
          </div>

          <button
            onClick={() => {
              setCode(codeContent);
              // Simple visual feedback
              const btn = document.activeElement as HTMLButtonElement;
              if (btn) {
                const originalContent = btn.innerHTML;
                btn.innerHTML = "SYNCED!";
                setTimeout(() => { if (btn) btn.innerHTML = originalContent; }, 2000);
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-[9px] font-bold uppercase tracking-[0.1em] hover:opacity-90 active:scale-[0.95] transition-all shadow-sm"
          >
            <Copy size={12} />
            Sync
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative">
        {isVisual ? (
          <div className="bg-bg-primary p-8 min-h-[200px] flex justify-center items-center overflow-x-auto">
            {isTypingComplete ? (
              <MermaidRenderer code={codeContent} />
            ) : (
              <div className="flex flex-col items-center gap-4 py-12">
                 <div className="w-10 h-10 border-2 border-text-primary/10 border-t-text-primary rounded-full animate-spin" />
                 <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-black">Assembling Neural Map...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#1e1e1e] p-6 overflow-x-auto text-sm">
            <pre className="text-gray-300 font-mono m-0">
              <code>{codeContent}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagramPreview;
