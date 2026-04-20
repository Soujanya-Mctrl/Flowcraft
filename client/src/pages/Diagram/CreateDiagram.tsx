import { useState, useEffect, useRef, useCallback } from "react";

import mermaid from "mermaid";
import Panzoom from "@panzoom/panzoom";
import {
  Check,
  Plus,
  Minus,
  Copy,
  Sparkles,
  X,
} from "lucide-react";
import { default_code } from "./default_mermaid_code";
import { v4 as uuidv4 } from "uuid";
import { BACKEND_URL } from "../../config";
import { useRecoilState } from "recoil";
import { chatState, codeState, conversationHistoryState, DEFAULT_WELCOME_MESSAGE } from "../../store/atoms";
import { ChatMessage } from "../../types";
import Sidebar from "../../components/EditorPage/SideBar";
import ErrorNotification from "../../components/EditorPage/ErrorNotification";
import ChatBox from "../../components/EditorPage/ChatBox";
import MovableCodeEditor from "../../components/EditorPage/MovableCodeEditor";
import MovableExampleSection from "../../components/EditorPage/MovableExampleSection";

// Types for better type safety
interface ApiResponse {
  success?: boolean;
  data?: {
    diagram?: string;
    title?: string;
  };
  message?: string;
  error?: string;
  // Legacy V1 fields for backward compatibility
  chat?: string;
  title?: string;
}

interface ErrorState {
  type: "render" | "api" | "clipboard" | "download" | null;
  message: string;
}

interface Model {
  name: string;
  description: string;
  model: string;
}

interface DiagramType {
  name: string;
  value: string;
  description: string;
}

const MermaidEditor = () => {
  const [code, setCode] = useRecoilState<string>(codeState);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [chat, setChat] = useRecoilState<string>(chatState);
  const [conversationHistory, setConversationHistory] = useRecoilState<ChatMessage[]>(conversationHistoryState);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([default_code]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [imageTitle, setimageTitle] = useState("Flowcraft_" + uuidv4());
  const [, setIsDark] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(
    "llama-3.3-70b-versatile"
  );
  const [diagramType, setDiagramType] = useState("auto");
  const [isCanvasEditMode, setIsCanvasEditMode] = useState(false);
  interface SelectedElement {
    element: HTMLElement;
    type: "text" | "shape";
    index: number;
  }

  const [selectedElement, setSelectedElement] =
    useState<SelectedElement | null>(null);
  const [editableText, setEditableText] = useState("");

  // Error state
  const [error, setError] = useState<ErrorState>({ type: null, message: "" });

  // Modals
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isMovableEditorOpen, setIsMovableEditorOpen] = useState(true);
  const [isMovableExampleOpen, setIsMovableExampleOpen] = useState(true);

  // Loading states
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAIGeneratingDiagram, setIsAIGeneratingDiagram] = useState(false);
  const [isAIGeneratingTitle, setIsAIGeneratingTitle] = useState(false);
  const [isSidebarSticky, setIsSidebarSticky] = useState(() => {
    return localStorage.getItem("sidebar_sticky") === "true";
  });

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("sidebar_sticky", isSidebarSticky.toString());
  }, [isSidebarSticky]);

  // Window Z-Index management
  const [windowZIndices, setWindowZIndices] = useState({
    editor: 1000,
    examples: 1000,
    chat: 1001,
  });

  const bringToFront = useCallback((windowId: keyof typeof windowZIndices) => {
    setWindowZIndices(prev => {
      const currentZ = prev[windowId];
      const maxZ = Math.max(...Object.values(prev));
      if (currentZ === maxZ && Object.values(prev).filter(z => z === maxZ).length === 1) return prev;
      return { ...prev, [windowId]: maxZ + 1 };
    });
  }, []);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<ReturnType<typeof Panzoom> | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Embedding state
  // 1. Add branding state (add to your existing useState declarations)
  const [includeBranding, setIncludeBranding] = useState(true);
  const [brandingPosition] = useState("bottom-right"); // "bottom-right", "bottom-left", "top-right", "top-left"
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [embedCode, setEmbedCode] = useState("");
  const [embedDescription] = useState("");
  const [embedType, setEmbedType] = useState("download"); // "markdown", "html", "svg"

  const models: Model[] = [
    {
      name: "Llama 3.1 [8B]",
      description: "Fast and efficient",
      model: "llama-3.1-8b-instant",
    },
    {
      name: "Llama 3.3 [70B]",
      description: "",
      model: "llama-3.3-70b-versatile",
    },
    {
      name: "DeepSeek R1 [70B]",
      description: "",
      model: "deepseek-r1-distill-llama-70b",
    },
    {
      name: "Kimi K2 [70B]",
      description: "",
      model: "moonshotai/kimi-k2-instruct",
    },
  ];

  const diagramTypes: DiagramType[] = [
    {
      name: "Auto-detect",
      value: "auto",
      description: "AI will automatically choose the best diagram type"
    },
    {
      name: "Flowchart",
      value: "flowchart",
      description: "For processes, workflows, decision trees, system flows"
    },
    {
      name: "Sequence Diagram",
      value: "sequence",
      description: "For interactions between actors over time, API calls, user journeys"
    },
    {
      name: "Class Diagram",
      value: "class",
      description: "For object-oriented structures, database schemas"
    },
    {
      name: "State Diagram",
      value: "state",
      description: "For system states and transitions"
    },
    {
      name: "Entity Relationship",
      value: "er",
      description: "For database relationships and data models"
    },
    {
      name: "Gantt Chart",
      value: "gantt",
      description: "For project timelines and scheduling"
    },
    {
      name: "Pie Chart",
      value: "pie",
      description: "For data distribution and percentages"
    },
    {
      name: "User Journey",
      value: "journey",
      description: "For user experience flows"
    },
    {
      name: "Mindmap",
      value: "mindmap",
      description: "For hierarchical information and brainstorming"
    },
    {
      name: "Timeline",
      value: "timeline",
      description: "For chronological events"
    },
    {
      name: "Git Graph",
      value: "gitgraph",
      description: "For version control workflows and branching strategies"
    },
    {
      name: "C4 Diagram",
      value: "c4",
      description: "For system architecture contexts"
    }
  ];

  // Error handling utility
  const showError = useCallback((type: ErrorState["type"], message: string) => {
    setError({ type, message });
    setTimeout(() => setError({ type: null, message: "" }), 5000);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError({ type: null, message: "" });
  }, []);

  // Conversation management helpers
  const addUserMessage = useCallback((content: string) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setConversationHistory((prev) => [...prev, newMessage]);
  }, [setConversationHistory]);

  const addAssistantMessage = useCallback((content: string) => {
    const newMessage: ChatMessage = {
      id: uuidv4(),
      role: "assistant",
      content,
      timestamp: new Date(),
    };
    setConversationHistory((prev) => [...prev, newMessage]);
  }, [setConversationHistory]);

  const clearConversationHistory = useCallback(() => {
    setConversationHistory([DEFAULT_WELCOME_MESSAGE]);
  }, [setConversationHistory]);

  /**
   * Extracts Mermaid code from a markdown string.
   * Looks for content between ```mermaid and ``` tags.
   */
  const extractMermaidCode = useCallback((text: string): string => {
    if (!text) return "";

    // 1. Try to match standardized mermaid code blocks (best case)
    const mermaidRegex = /```(?:mermaid)?\n?([\s\S]*?)```/i;
    const match = text.match(mermaidRegex);

    if (match && match[1]) {
      return match[1].trim();
    }

    // 2. Fallback: Search for the FIRST occurrence of a valid mermaid keyword
    // This allows us to ignore "### Title" or "Here is your diagram:" text
    const mermaidKeywords = [
      "graph TD", "graph LR", "graph ", "flowchart TD", "flowchart LR", "flowchart ",
      "sequenceDiagram", "classDiagram", "stateDiagram-v2", "erDiagram", 
      "gantt", "pie", "journey", "mindmap", "timeline", "gitGraph", "C4Context"
    ];

    const lowerText = text.toLowerCase();
    let firstKeywordIndex = -1;
    let selectedKeyword = "";

    for (const kw of mermaidKeywords) {
      const idx = lowerText.indexOf(kw.toLowerCase());
      if (idx !== -1 && (firstKeywordIndex === -1 || idx < firstKeywordIndex)) {
        firstKeywordIndex = idx;
        selectedKeyword = kw;
      }
    }

    if (firstKeywordIndex !== -1) {
      // Return everything from the first keyword onwards
      return text.substring(firstKeywordIndex).trim();
    }

    // 3. Last resort fallback
    return text.trim();
  }, []);

  /**
   * Sanitizes Mermaid code to fix common AI-generated syntax errors.
   */
  const sanitizeMermaidCode = useCallback((code: string): string => {
    if (!code) return "";

    let sanitized = code;

    // 1. Fix common mismatched node brackets [ ... } -> [ ... ]
    // These often appear when Llama tries to be creative with node shapes
    sanitized = sanitized.replace(/\[([^\]]*?)\}/g, "[$1]"); // [ ... }
    sanitized = sanitized.replace(/\{([^\}]*?)\]/g, "{$1}"); // { ... ]
    sanitized = sanitized.replace(/\(([^)]*?)\]/g, "($1)"); // ( ... ]
    sanitized = sanitized.replace(/\[([^\]]*?)\)/g, "[$1]"); // [ ... )
    
    // 2. Fix improperly closed double brackets ((...)) or {{...}}
    sanitized = sanitized.replace(/\(\(([^)]*?)\)/g, "(($1))");
    sanitized = sanitized.replace(/\{\{([^\}]*?)\}/g, "{{$1}}");

    // 3. Ensure each line doesn't start with accidental markdown symbols
    let lines = sanitized.split("\n").map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("###") || trimmed.startsWith("**")) return "";
      return line;
    }).filter(Boolean);

    // 4. Handle erDiagram hyphens and invalid keywords
    if (sanitized.toLowerCase().includes("erdiagram")) {
      lines = lines.map(line => {
        let cleanLine = line;
        
        // Remove "class " keyword (common AI hallucination in ER diagrams)
        // Look for "class " followed by an identifier and start of block or relationship
        cleanLine = cleanLine.replace(/\bclass\s+(\w+)/g, "$1");
        
        // Only replace hyphens in words, not in relationship lines like "--" or ".."
        // We look for alphanumeric-alphanumeric patterns
        return cleanLine.replace(/(\w+)-(\w+)/g, "$1_$2");
      });
    }

    return lines.join("\n");
  }, []);

  // 2. Add function to make SVG elements editable
  const makeElementsEditable = useCallback(() => {
    if (!diagramRef.current) return;

    const svgElement = diagramRef.current.querySelector("svg");
    if (!svgElement) return;

    // Remove any existing event listeners by cloning elements
    const clonedSvg = svgElement.cloneNode(true);
    if (svgElement.parentNode) {
      svgElement.parentNode.replaceChild(clonedSvg, svgElement);
    }

    if (!isCanvasEditMode) return;

    // Make text elements editable only in edit mode
    const textElements = (clonedSvg as Element).querySelectorAll("text, tspan");
    textElements.forEach((textEl, index) => {
      (textEl as HTMLElement).style.cursor = "pointer";
      textEl.addEventListener("click", (e) => {
        if (!isCanvasEditMode) return; // Double check
        e.stopPropagation();
        setSelectedElement({
          element: textEl as HTMLElement,
          type: "text",
          index,
        });
        setEditableText(textEl.textContent || "");
      });
    });

    // Make shape elements selectable for repositioning only in edit mode
    const shapeElements = (clonedSvg as Element).querySelectorAll(
      "rect, circle, ellipse, polygon, path"
    );
    shapeElements.forEach((shapeEl, index) => {
      (shapeEl as HTMLElement).style.cursor = "move";
      let isDragging = false;
      let startX: number, startY: number, startTransform: string;

      const handleMouseDown = (e: MouseEvent) => {
        if (!isCanvasEditMode) return; // Check edit mode
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;

        const transform = shapeEl.getAttribute("transform") || "";
        startTransform = transform;

        setSelectedElement({
          element: shapeEl as HTMLElement,
          type: "shape",
          index,
        });
      };

      const handleMouseMove = (e: { clientX: number; clientY: number }) => {
        if (!isDragging || !isCanvasEditMode) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        let newTransform = startTransform;
        if (newTransform.includes("translate")) {
          // Update existing translate
          newTransform = newTransform.replace(
            /translate\([^)]*\)/,
            `translate(${deltaX}, ${deltaY})`
          );
        } else {
          // Add new translate
          newTransform = `translate(${deltaX}, ${deltaY}) ${newTransform}`;
        }

        shapeEl.setAttribute("transform", newTransform);
      };

      const handleMouseUp = () => {
        isDragging = false;
      };

      shapeEl.addEventListener(
        "mousedown",
        handleMouseDown as (e: Event) => void
      );
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    });
  }, [isCanvasEditMode]);

  // 3. Update the renderDiagram function to include editability
  const renderDiagram = useCallback(async () => {
    if (!diagramRef.current) return;

    // Safety guard: Don't attempt to render empty code
    if (!code || !code.trim()) {
      diagramRef.current.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; opacity: 0.3;">
          <p>Describe a diagram to get started...</p>
        </div>
      `;
      setLoading(false);
      return;
    }

    try {
      // Store zoom and pan state
      const currentZoom = panzoomRef.current?.getScale() || 1;
      const currentPan = panzoomRef.current?.getPan() || { x: 0, y: 0 };

      const { svg } = await mermaid.render("generatedDiagram", code);
      diagramRef.current.innerHTML = svg;

      // Always call makeElementsEditable - it will handle the mode check internally
      setTimeout(() => {
        makeElementsEditable();
      }, 100);

      // Restore zoom and pan with error handling
      setTimeout(() => {
        try {
          if (panzoomRef.current) {
            panzoomRef.current.zoom(currentZoom);
            panzoomRef.current.pan(currentPan.x, currentPan.y);
          }
        } catch (err) {
          console.warn("Failed to restore zoom/pan:", err);
        }
      }, 100);

      clearError();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      diagramRef.current.innerHTML = `
      <div style="color: red; padding: 20px; text-align: center; font-family: monospace;">
        <p><strong>Error rendering diagram:</strong></p>
        <p>${errorMessage}</p>
        <p style="margin-top: 10px; font-size: 0.9em;">Please check your Mermaid syntax</p>
      </div>
    `;
      showError("render", `Diagram rendering failed: ${errorMessage}`);
      console.error("Render error:", error);
    } finally {
      setLoading(false);
    }
  }, [code, showError, clearError, makeElementsEditable]);


  // Initialize mermaid and panzoom
  useEffect(() => {
    try {
      mermaid.initialize({ startOnLoad: false });

      if (containerRef.current && !panzoomRef.current) {
        panzoomRef.current = Panzoom(containerRef.current, {
          maxScale: 10,
          minScale: 0.1,
          contain: "outside",
        });

        const handleWheel = (e: WheelEvent) => {
          try {
            panzoomRef.current?.zoomWithWheel(e);
          } catch {
            // Silently skip if it fails, not critical
          }
        };

        const container = containerRef.current;
        container.addEventListener("wheel", handleWheel);
        
        return () => {
          container.removeEventListener("wheel", handleWheel);
        };
      }
    } catch (error: unknown) {
      showError("render", "Failed to initialize diagram editor");
      console.error("Initialization error:", error);
    }
  }, [showError]);

  // Debounced diagram rendering
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setLoading(true);
    timerRef.current = setTimeout(() => {
      renderDiagram();
    }, 300); // Increased debounce time for better performance

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [code, renderDiagram]);

  // Load saved data from localStorage
  useEffect(() => {
    try {
      const savedCode = localStorage.getItem("mermaid_code");
      if (savedCode) {
        setCode(savedCode);
        setHistory([savedCode]);
      }
    } catch (err) {
      console.warn("Failed to load saved data:", err);
      showError("render", "Failed to load saved data");
    }
  }, [setCode, setChat, showError]);

  // Copy to clipboard with error handling
  const copyToClipboard = useCallback(async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard API not supported");
      }

      await navigator.clipboard.writeText(code);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      showError(
        "clipboard",
        "Failed to copy to clipboard. Please try selecting and copying manually."
      );
    }
  }, [code, showError]);


  // Add effect to re-apply editability when mode changes
  useEffect(() => {
    makeElementsEditable();
  }, [isCanvasEditMode, makeElementsEditable]);

  // 4. Add function to handle text editing
  const handleTextEdit = useCallback(
    (newText: string | null) => {
      if (!selectedElement || selectedElement.type !== "text") return;

      const textElement = selectedElement.element;
      textElement.textContent = newText;

      // Update the Mermaid code to reflect changes
      // This is a simplified approach - you might need more sophisticated parsing
      const oldText = editableText;
      const newCode = code.replace(oldText, newText || "");
      setCode(newCode);
      localStorage.setItem("mermaid_code", newCode);

      setSelectedElement(null);
      setEditableText("");
    },
    [selectedElement, editableText, code, setCode]
  );

  // Undo functionality
  const handleUndo = useCallback(() => {
    try {
      if (history.length > 1) {
        setRedoStack((prevRedo) => [history[history.length - 1], ...prevRedo]);
        setHistory((prevHistory) => {
          const newHistory = prevHistory.slice(0, -1);
          const newCode = newHistory[newHistory.length - 1];
          setCode(newCode);
          localStorage.setItem("mermaid_code", newCode);
          return newHistory;
        });
      }
    } catch (err) {
      console.error("Undo failed:", err);
      showError("render", "Undo operation failed");
    }
  }, [history, setCode, showError]);

  // Redo functionality
  const handleRedo = useCallback(() => {
    try {
      if (redoStack.length > 0) {
        const nextCode = redoStack[0];
        setHistory((prevHistory) => [...prevHistory, nextCode]);
        setCode(nextCode);
        localStorage.setItem("mermaid_code", nextCode);
        setRedoStack((prevRedo) => prevRedo.slice(1));
      }
    } catch (err) {
      console.error("Redo failed:", err);
      showError("render", "Redo operation failed");
    }
  }, [redoStack, setCode, showError]);

  // Download SVG with comprehensive error handling
  const handleDownloadSVG = useCallback(async () => {
    try {
      if (!diagramRef.current) {
        throw new Error("No diagram container found");
      }

      const svgElement = diagramRef.current.querySelector("svg");
      if (!svgElement) {
        throw new Error(
          "No valid diagram to download. Please ensure your diagram renders correctly."
        );
      }

      setIsDownloading(true);

      const svgContent = new XMLSerializer().serializeToString(svgElement);
      if (!svgContent || svgContent.length < 100) {
        throw new Error("Generated SVG appears to be invalid or empty");
      }

      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${imageTitle || "diagram"}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown download error";
      console.error("Download failed:", err);
      showError("download", errorMessage);
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  }, [imageTitle, showError]);

  // API call wrapper with proper error handling
  const makeApiCall = useCallback(
    async (
      endpoint: string,
      body: object,
      errorContext: string
    ): Promise<ApiResponse> => {
      try {
        if (!BACKEND_URL) {
          throw new Error("Backend URL is not configured");
        }

        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP ${response.status}: ${errorText || response.statusText}`
          );
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown API error";
        console.error(`${errorContext} failed:`, err);
        showError("api", `${errorContext} failed: ${errorMessage}`);
        throw err;
      }
    },
    [showError]
  );

  // Generate AI diagram with error handling
  const generateAIDiagram = useCallback(async () => {
    if (!prompt.trim()) {
      showError("api", "Please enter a prompt to generate a diagram");
      return;
    }

    try {
      setIsAIGeneratingDiagram(true);
      
      // Add user message to conversation
      addUserMessage(prompt);

      const response = await makeApiCall(
        "/diagram/generate",
        { prompt, model, diagramType },
        "Diagram generation"
      );

      // API returns { success, data: { diagram, title }, message }
      if (response.data?.diagram) {
        const fullResponse = response.data.diagram;
        let extractedCode = extractMermaidCode(fullResponse);
        extractedCode = sanitizeMermaidCode(extractedCode);
        
        setChat(fullResponse);
        setCode(extractedCode);
        localStorage.setItem("mermaid_code", extractedCode);
        
        // Add AI response to conversation
        addAssistantMessage(fullResponse);

        if (response.data.title) {
          setimageTitle(response.data.title);
        }
      } else {
        throw new Error("No diagram code was generated by the AI");
      }
      
      // Clear prompt after successful generation
      setPrompt("");
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to generate diagram";
      showError("api", errorMessage);
    } finally {
      setIsAIGeneratingDiagram(false);
    }
  }, [prompt, model, diagramType, makeApiCall, setChat, addUserMessage, addAssistantMessage, showError, setPrompt]);

  // Enhance diagram with error handling
  const enhanceTheDiagram = useCallback(async () => {
    if (!prompt.trim()) {
      showError("api", "Please enter instructions to enhance the diagram");
      return;
    }

    if (!code.trim()) {
      showError("api", "No diagram code found to enhance");
      return;
    }

    try {
      setIsAIGeneratingDiagram(true);
      
      // Add user message to conversation
      addUserMessage(prompt);

      const response = await makeApiCall(
        "/diagram/enhance",
        { diagram: code, chat, prompt, model, diagramType },
        "Diagram enhancement"
      );

      // API returns { success, data: { diagram, title }, message }
      if (response.data?.diagram) {
        const fullResponse = response.data.diagram;
        let extractedCode = extractMermaidCode(fullResponse);
        extractedCode = sanitizeMermaidCode(extractedCode);
        
        setChat(fullResponse);
        setCode(extractedCode);
        localStorage.setItem("mermaid_code", extractedCode);
        
        // Add AI response to conversation
        addAssistantMessage(fullResponse);

        if (response.data.title) {
          setimageTitle(response.data.title);
        }
      } else {
        throw new Error("No enhanced diagram was generated");
      }
      
      // Clear prompt after successful enhancement
      setPrompt("");
    } catch (err: any) {
      const errorMessage = err?.message || "Failed to enhance diagram";
      showError("api", errorMessage);
    } finally {
      setIsAIGeneratingDiagram(false);
    }
  }, [prompt, code, chat, model, diagramType, makeApiCall, setChat, addUserMessage, addAssistantMessage, showError, setPrompt]);

  // Generate AI title with error handling
  const generateAItitleWithDiagrams = useCallback(async () => {
    if (!code.trim()) {
      showError("api", "No diagram found to generate title from");
      return;
    }

    try {
      setIsAIGeneratingTitle(true);

      const response = await makeApiCall(
        "/diagram/title",
        { diagram: code, model },
        "Title generation"
      );

      // API returns { success, data: { title }, message }
      if (response.data?.title) {
        setimageTitle(response.data.title);
      } else {
        throw new Error("No title was generated");
      }
    } catch {
      showError("api", "Failed to generate title");
    } finally {
      setIsAIGeneratingTitle(false);
    }
  }, [code, model, makeApiCall, showError]);

  // 2. Create function to add branding to SVG
  const addBrandingToSVG = useCallback(
    (svgContent: string) => {
      if (!includeBranding) return svgContent;

      try {
        // Parse the SVG to add branding
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
        const svgElement = svgDoc.querySelector("svg");

        if (!svgElement) return svgContent;

        // Get SVG dimensions with fallbacks
        const viewBox = svgElement.getAttribute("viewBox");
        const width = svgElement.getAttribute("width") || "800";
        const height = svgElement.getAttribute("height") || "600";

        let svgWidth = parseInt(width) || 800;
        let svgHeight = parseInt(height) || 600;

        // If viewBox exists, use those dimensions
        if (viewBox) {
          const viewBoxValues = viewBox.split(" ");
          svgWidth = parseInt(viewBoxValues[2]) || svgWidth;
          svgHeight = parseInt(viewBoxValues[3]) || svgHeight;
        }

        // Ensure minimum dimensions to prevent overflow
        svgWidth = Math.max(svgWidth, 200);
        svgHeight = Math.max(svgHeight, 100);

        // Create branding group
        const brandingGroup = svgDoc.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );
        brandingGroup.setAttribute("class", "flowcraft-branding");

        // Calculate position based on brandingPosition with responsive padding
        let x, y, textAnchor;
        const padding = Math.max(10, Math.min(svgWidth * 0.02, 20)); // Responsive padding between 10-20px
        const fontSize = Math.max(8, Math.min(svgWidth * 0.015, 12)); // Responsive font size between 8-12px
        const textWidth = fontSize * 12; // Approximate text width
        const textHeight = fontSize + 4;

        switch (brandingPosition) {
          case "bottom-right":
            x = svgWidth - padding;
            y = svgHeight - padding;
            textAnchor = "end";
            break;
          case "bottom-left":
            x = padding;
            y = svgHeight - padding;
            textAnchor = "start";
            break;
          case "top-right":
            x = svgWidth - padding;
            y = padding + textHeight;
            textAnchor = "end";
            break;
          case "top-left":
            x = padding;
            y = padding + textHeight;
            textAnchor = "start";
            break;
          default:
            x = svgWidth - padding;
            y = svgHeight - padding;
            textAnchor = "end";
        }

        // Ensure text doesn't go outside bounds
        if (textAnchor === "start") {
          x = Math.max(padding, x);
          x = Math.min(svgWidth - textWidth - padding, x);
        } else {
          x = Math.min(svgWidth - padding, x);
          x = Math.max(textWidth + padding, x);
        }

        y = Math.max(textHeight + padding, y);
        y = Math.min(svgHeight - padding, y);

        // Create background rectangle for better visibility with responsive dimensions
        const bgRect = svgDoc.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        const bgWidth = textWidth + 10;
        const bgHeight = textHeight + 4;
        const bgX = textAnchor === "end" ? x - bgWidth : x - 5;
        const bgY = y - textHeight;

        bgRect.setAttribute("x", Math.max(0, bgX).toString());
        bgRect.setAttribute("y", Math.max(0, bgY).toString());
        bgRect.setAttribute(
          "width",
          Math.min(bgWidth, svgWidth - Math.max(0, bgX)).toString()
        );
        bgRect.setAttribute(
          "height",
          Math.min(bgHeight, svgHeight - Math.max(0, bgY)).toString()
        );
        bgRect.setAttribute("fill", "rgba(255, 255, 255, 0.9)");
        bgRect.setAttribute("stroke", "rgba(0, 0, 0, 0.1)");
        bgRect.setAttribute("stroke-width", "1");
        bgRect.setAttribute("rx", "3");

        // Create the branding text with responsive font size
        const brandingText = svgDoc.createElementNS(
          "http://www.w3.org/2000/svg",
          "text"
        );
        brandingText.setAttribute("x", x.toString());
        brandingText.setAttribute("y", y.toString());
        brandingText.setAttribute("font-family", "Arial, sans-serif");
        brandingText.setAttribute("font-size", fontSize.toString());
        brandingText.setAttribute("fill", "#666");
        brandingText.setAttribute("text-anchor", textAnchor);
        brandingText.textContent = "Created with flowcraft.ai";

        // Create clickable link
        const linkElement = svgDoc.createElementNS(
          "http://www.w3.org/1999/xlink",
          "a"
        );
        linkElement.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          "https://flowcraft.ai"
        );
        linkElement.setAttribute("target", "_blank");
        linkElement.setAttribute(
          "title",
          "Create your own diagrams at flowcraft.ai"
        );

        // Assemble the branding
        linkElement.appendChild(bgRect);
        linkElement.appendChild(brandingText);
        brandingGroup.appendChild(linkElement);

        // Add branding to SVG
        svgElement.appendChild(brandingGroup);

        // Return the modified SVG
        return new XMLSerializer().serializeToString(svgElement);
      } catch {
        console.warn("Failed to add branding");
        return svgContent; // Return original if branding fails
      }
    },
    [includeBranding, brandingPosition]
  );

  // Fixed generateEmbedCode function - removed 'code' from dependencies
  const generateEmbedCode = useCallback(async () => {
    try {
      if (!diagramRef.current) {
        throw new Error("No diagram available");
      }

      const svgElement = diagramRef.current.querySelector("svg");
      if (!svgElement) {
        throw new Error("No valid diagram found");
      }

      // Skip code generation for download type
      if (embedType === "download") {
        return;
      }

      // Get SVG content and add branding
      const originalSvgContent = new XMLSerializer().serializeToString(
        svgElement
      );
      const brandedSvgContent = addBrandingToSVG(originalSvgContent);

      // Generate different embed formats
      let generatedCode = "";

      switch (embedType) {
        case "markdown":
          generatedCode = `# ${imageTitle || "Diagram"}
  
  ${embedDescription ? `${embedDescription}\n\n` : ""}
  
  ![${
    imageTitle || "Diagram"
  }](data:image/svg+xml;charset=utf-8,${encodeURIComponent(brandedSvgContent)})
  
  ---
  *Created with [flowcraft.ai](https://flowcraft.ai) - Free Mermaid Diagram Editor*`;
          break;

        case "html":
          generatedCode = `<!-- Embeddable HTML -->
  <div class="diagram-embed" style="text-align: center; margin: 20px 0;">
    ${imageTitle ? `<h3>${imageTitle}</h3>` : ""}
    ${embedDescription ? `<p>${embedDescription}</p>` : ""}
    <div style="display: inline-block; border: 1px solid #ddd; padding: 10px; border-radius: 8px;">
      ${brandedSvgContent}
    </div>
    <p style="font-size: 12px; color: #666; margin-top: 10px;">
      Created with <a href="https://flowcraft.ai" target="_blank" style="color: #0066cc;">flowcraft.ai</a>
    </p>
  </div>`;
          break;

        case "svg":
          generatedCode = brandedSvgContent;
          break;

        default:
          generatedCode = brandedSvgContent;
      }

      setEmbedCode(generatedCode);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate embed code";
      showError("api", errorMessage);
    }
  }, [embedType, imageTitle, embedDescription, showError, addBrandingToSVG]);

  // function to generate embed code when type or title changes
  const copyEmbedToClipboard = useCallback(async () => {
    try {
      if (!embedCode) {
        throw new Error("No embed code available");
      }

      await navigator.clipboard.writeText(embedCode);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch {
      showError("clipboard", "Failed to copy embed code");
    }
  }, [embedCode, showError]);

  const [isDarkMode] = useState(
    localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
  );

  useEffect(() => {
    const handler = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    window.addEventListener("storage", handler);
    const observer = new MutationObserver(handler);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      window.removeEventListener("storage", handler);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex gap-4 p-4 items-stretch h-[calc(100vh-64px)] relative overflow-hidden">
      <ErrorNotification
        error={{ ...error, type: error.type || "" }}
        clearError={clearError}
      />

      {/* Sidebar - Conditional Rendering (Sticky vs Hover) */}
      {isSidebarSticky ? (
        <div className="flex items-center z-[500] slide-in-left">
          <Sidebar
            isMovableEditorOpen={isMovableEditorOpen}
            setIsMovableEditorOpen={setIsMovableEditorOpen}
            isMovableExampleOpen={isMovableExampleOpen}
            setIsMovableExampleOpen={setIsMovableExampleOpen}
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
            isCanvasEditMode={isCanvasEditMode}
            setIsCanvasEditMode={setIsCanvasEditMode}
            setIsEmbedModalOpen={setIsEmbedModalOpen}
            isSidebarSticky={isSidebarSticky}
            setIsSidebarSticky={setIsSidebarSticky}
          />
        </div>
      ) : (
        <div className="absolute left-0 top-0 h-full w-20 group z-[500] pointer-events-none">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-4 group-hover:translate-x-0 pointer-events-auto">
            <Sidebar
              isMovableEditorOpen={isMovableEditorOpen}
              setIsMovableEditorOpen={setIsMovableEditorOpen}
              isMovableExampleOpen={isMovableExampleOpen}
              setIsMovableExampleOpen={setIsMovableExampleOpen}
              isChatOpen={isChatOpen}
              setIsChatOpen={setIsChatOpen}
              isCanvasEditMode={isCanvasEditMode}
              setIsCanvasEditMode={setIsCanvasEditMode}
              setIsEmbedModalOpen={setIsEmbedModalOpen}
              isSidebarSticky={isSidebarSticky}
              setIsSidebarSticky={setIsSidebarSticky}
            />
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 w-full overflow-hidden relative bg-white dark:bg-apple-black">
        {isCanvasEditMode && (
          <div className="absolute top-6 left-6 bg-text-primary text-bg-primary px-4 py-1.5 rounded-pill text-[13px] font-medium z-[400] border border-border-primary">
            Canvas Edit Mode
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/40 backdrop-blur-sm z-[300]">
            <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-pill animate-spin"></div>
          </div>
        )}

        <div
          ref={containerRef}
          className={`h-full w-full flex justify-center items-center relative transition-opacity duration-500 ${
            loading ? "opacity-20" : "opacity-100"
          } ${isCanvasEditMode ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        >
          <div ref={diagramRef} className="transform scale-90"></div>
        </div>

        {/* Zoom & Pan Controls */}
        <div className="absolute bottom-10 left-10 flex flex-col items-center gap-1 bg-bg-secondary/80 backdrop-blur-xl border border-border-primary p-1 rounded-pill z-[400]">
          <button
            className="w-10 h-10 flex items-center justify-center rounded-pill hover:bg-bg-primary transition-colors"
            onClick={() => panzoomRef.current?.zoomIn()}
          >
            <Plus size={18} />
          </button>
          <div className="w-4 h-px bg-border-primary" />
          <button
            className="w-10 h-10 flex items-center justify-center rounded-pill hover:bg-bg-primary transition-colors"
            onClick={() => panzoomRef.current?.zoomOut()}
          >
            <Minus size={18} />
          </button>
        </div>

        {/* Chat Box */}
        <ChatBox
          messages={conversationHistory}
          prompt={prompt}
          setPrompt={setPrompt}
          model={model}
          setModel={setModel}
          diagramType={diagramType}
          setDiagramType={setDiagramType}
          isAIGeneratingDiagram={isAIGeneratingDiagram}
          onGenerate={generateAIDiagram}
          onEnhance={enhanceTheDiagram}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          models={models}
          diagramTypes={diagramTypes}
          onClearChat={clearConversationHistory}
          hasExistingDiagram={!!code && code.trim().length > 0}
          zIndex={windowZIndices.chat}
          onFocus={() => bringToFront("chat")}
        />

        <MovableCodeEditor
          code={code}
          setCode={setCode}
          isOpen={isMovableEditorOpen}
          setIsOpen={setIsMovableEditorOpen}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
          handleCopy={copyToClipboard}
          copiedToClipboard={copiedToClipboard}
          history={history}
          redoStack={redoStack}
          isDark={isDarkMode}
          zIndex={windowZIndices.editor}
          onFocus={() => bringToFront("editor")}
        />
        <MovableExampleSection
          isOpen={isMovableExampleOpen}
          setIsOpen={setIsMovableExampleOpen}
          zIndex={windowZIndices.examples}
          onFocus={() => bringToFront("examples")}
        />
      </div>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-apple-black/40 backdrop-blur-md z-[2000] p-4">
          <div className="apple-card max-w-md w-full relative scale-in dark:bg-apple-dark-surface/90">
            <button
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-apple-gray dark:hover:bg-white/10 transition-colors"
              onClick={() => setIsSettingsModalOpen(false)}
            >
              <X size={20} />
            </button>

            <h2 className="text-[24px] font-semibold tracking-apple-display mb-8">Settings</h2>

            <div className="space-y-8">
              <div>
                <label className="text-[11px] font-bold opacity-40 uppercase tracking-widest mb-3 block text-apple-near-black dark:text-white">Access Control</label>
                <div className="flex bg-apple-gray dark:bg-white/5 p-1 rounded-apple">
                  <button className="flex-1 py-2 px-4 rounded-apple text-[13px] font-medium opacity-20 cursor-not-allowed">
                    Private
                  </button>
                  <button className="flex-1 py-2 px-4 rounded-apple text-[13px] font-medium bg-white dark:bg-apple-dark-surface shadow-sm">
                    Public
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold opacity-40 uppercase tracking-widest mb-3 block text-apple-near-black dark:text-white">Diagram Identity</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageTitle}
                    className="input-apple flex-1 py-2"
                    onChange={(e) => setimageTitle(e.target.value)}
                    placeholder="Enter title"
                  />
                  <button
                    className="btn-apple-primary px-6"
                    onClick={() => {
                      showError(null, "Settings saved locally");
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold opacity-40 uppercase tracking-widest mb-3 block text-apple-near-black dark:text-white">Share URL</label>
                <div className="flex items-center gap-3 bg-apple-gray dark:bg-white/5 p-4 rounded-apple overflow-hidden">
                  <code className="text-[13px] opacity-60 truncate flex-1">{window.location.href}</code>
                  <button
                    className="p-2 hover:bg-apple-black/5 dark:hover:bg-white/10 rounded-apple transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      showError(null, "Copied to clipboard");
                    }}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Add text editing modal (insert after other modals)  */}
      {selectedElement && selectedElement.type === "text" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg relative max-w-md">
            <button
              className="absolute top-2 right-2 bg-black rounded hover:bg-gray-800 transition-colors"
              onClick={() => {
                setSelectedElement(null);
                setEditableText("");
              }}
              title="Close"
            >
              <X size={20} color="#fff" />
            </button>

            <h2 className="text-xl mb-4 font-black">Edit Text</h2>

            <div className="flex flex-col gap-4">
              <textarea
                value={editableText}
                onChange={(e) => setEditableText(e.target.value)}
                className="border p-2 rounded resize-none"
                rows={3}
                placeholder="Enter new text"
              />

              <div className="flex gap-2 justify-end">
                <button
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                  onClick={() => {
                    setSelectedElement(null);
                    setEditableText("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors"
                  onClick={() => handleTextEdit(editableText)}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embed & Download Modal */}
      {isEmbedModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-apple-black/40 backdrop-blur-md z-[2000] p-4">
          <div className="apple-card max-w-5xl w-full relative scale-in dark:bg-apple-dark-surface/95 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-8 py-5 border-b border-apple-black/5 dark:border-white/5 flex justify-between items-center bg-apple-black text-white">
              <h2 className="text-[20px] font-semibold tracking-apple-display">Export Blueprint</h2>
              <button
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                onClick={() => setIsEmbedModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 lg:grid lg:grid-cols-2 lg:gap-12">
              <div className="space-y-10">
                <div>
                  <label className="text-[11px] font-bold opacity-40 uppercase tracking-widest mb-4 block">Format</label>
                  <div className="flex flex-wrap gap-2">
                    {["download", "markdown", "html", "svg"].map(type => (
                      <button
                        key={type}
                        className={`px-5 py-2.5 rounded-apple text-[13px] font-medium transition-all ${
                          embedType === type 
                            ? "bg-apple-blue text-white shadow-lg shadow-apple-blue/20" 
                            : "bg-apple-gray dark:bg-white/5 hover:bg-apple-black/5 dark:hover:bg-white/10"
                        }`}
                        onClick={() => setEmbedType(type)}
                      >
                        {type === "download" ? "SVG File" : type.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold opacity-40 uppercase tracking-widest mb-4 block">Details</label>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={imageTitle}
                        onChange={(e) => setimageTitle(e.target.value)}
                        className="input-apple flex-1"
                        placeholder="Blueprint name"
                      />
                      <button
                        className="p-3 bg-apple-black dark:bg-white text-white dark:text-apple-black rounded-apple hover:scale-105 active:scale-95 transition-transform"
                        onClick={generateAItitleWithDiagrams}
                        disabled={isAIGeneratingTitle}
                      >
                        {isAIGeneratingTitle ? <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full" /> : <Sparkles size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-apple border border-apple-black/5 dark:border-white/5 bg-apple-gray/30 dark:bg-white/5">
                  <input
                    type="checkbox"
                    id="branding"
                    checked={includeBranding}
                    onChange={(e) => setIncludeBranding(e.target.checked)}
                    className="w-4 h-4 accent-apple-blue"
                  />
                  <div>
                    <label htmlFor="branding" className="text-[14px] font-medium block">Flowcraft Branding</label>
                    <p className="text-[12px] opacity-40">Include minimalist "Created with Flowcraft AI" signature.</p>
                  </div>
                </div>

                <div>
                   <button
                    className={`btn-apple-primary w-full py-4 text-[17px] ${isDownloading ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={embedType === "download" ? handleDownloadSVG : generateEmbedCode}
                    disabled={isDownloading}
                  >
                    {isDownloading ? "Processing..." : embedType === "download" ? "Download SVG" : "Generate Code"}
                  </button>
                </div>
              </div>

              <div className="mt-12 lg:mt-0 space-y-8">
                <div>
                  <label className="text-[11px] font-bold opacity-40 uppercase tracking-widest mb-4 block">Visual Preview</label>
                  <div className="apple-card bg-apple-gray dark:bg-apple-black/40 p-6 flex items-center justify-center min-h-[300px]">
                    {diagramRef.current?.innerHTML ? (
                      <div 
                        className="max-w-full overflow-hidden"
                        dangerouslySetInnerHTML={{
                          __html: includeBranding
                            ? addBrandingToSVG(diagramRef.current.innerHTML)
                            : diagramRef.current.innerHTML,
                        }}
                      />
                    ) : (
                      <p className="opacity-20 text-[13px]">No blueprint available</p>
                    )}
                  </div>
                </div>

                {embedCode && embedType !== "download" && (
                  <div className="side-up">
                    <label className="text-[11px] font-bold opacity-40 uppercase tracking-widest mb-4 block">Generated Code</label>
                    <div className="relative">
                      <textarea
                        value={embedCode.replace(/\s+/g, " ").trim()}
                        readOnly
                        className="input-apple w-full h-32 font-mono text-[11px] py-4 bg-white dark:bg-apple-black"
                      />
                      <button 
                        className="absolute bottom-4 right-4 p-2 bg-apple-blue text-white rounded-apple shadow-lg"
                        onClick={copyEmbedToClipboard}
                      >
                        {copiedToClipboard ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MermaidEditor;
