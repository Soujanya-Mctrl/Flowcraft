import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  code: string;
}

/**
 * A minimalist, robust Mermaid renderer.
 * Purely renders the SVG without extra UI controls.
 */
const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code }) => {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code) return;

      try {
        setError(null);
        
        // Clean the code
        let cleanCode = code.trim();
        // Remove markdown wrappers if any
        cleanCode = cleanCode.replace(/^```mermaid\n?/, "").replace(/\n?```$/, "");
        
        if (!cleanCode) return;

        // Initialize mermaid only once
        if (!isInitialized.current) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "base",
            securityLevel: "loose",
            fontFamily: "Inter, sans-serif",
            themeVariables: {
              primaryColor: "#f8fafc",
              primaryTextColor: "#1e293b",
              primaryBorderColor: "#e2e8f0",
              lineColor: "#64748b",
              secondaryColor: "#ffffff",
              tertiaryColor: "#f1f5f9",
              mainBkg: "#f8fafc",
              nodeBorder: "#e2e8f0",
              clusterBkg: "#f1f5f9",
              clusterBorder: "#e2e8f0",
              defaultLinkColor: "#64748b",
              titleColor: "#0f172a",
              edgeLabelBackground: "#ffffff",
            },
          });
          isInitialized.current = true;
        }

        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        const { svg: renderedSvg } = await mermaid.render(id, cleanCode);
        setSvg(renderedSvg);
      } catch (err: unknown) {
        console.error("[MermaidRenderer] Failed to render:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      }
    };

    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-text-primary uppercase tracking-wider">Syntax Error</p>
          <p className="text-[11px] text-text-muted max-w-md line-clamp-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-8 h-8 border-2 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin" />
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Rendering...</span>
      </div>
    );
  }

  return (
    <div 
      className="w-full flex justify-center py-2"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default MermaidRenderer;
