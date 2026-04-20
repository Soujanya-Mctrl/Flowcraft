import { Bug, Bot, Edit, ArrowDownToLine, Image, Code, Pin } from "lucide-react";

interface SidebarProps {
  isMovableEditorOpen: boolean;
  setIsMovableEditorOpen: (value: boolean) => void;
  isMovableExampleOpen: boolean;
  setIsMovableExampleOpen: (value: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (value: boolean) => void;
  isCanvasEditMode: boolean;
  setIsCanvasEditMode: (value: boolean) => void;
  setIsEmbedModalOpen: (value: boolean) => void;
  isSidebarSticky: boolean;
  setIsSidebarSticky: (value: boolean) => void;
}

const Sidebar = ({
  isMovableEditorOpen,
  setIsMovableEditorOpen,
  isMovableExampleOpen,
  setIsMovableExampleOpen,
  isChatOpen,
  setIsChatOpen,
  isCanvasEditMode,
  setIsCanvasEditMode,
  setIsEmbedModalOpen,
  isSidebarSticky,
  setIsSidebarSticky,
}: SidebarProps) => {
  return (
    <div className="flex flex-col gap-3 p-2 border border-border-primary bg-bg-primary rounded-container pointer-events-auto">
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-10 h-10 rounded-container bg-text-primary flex items-center justify-center mb-2">
          <Code size={18} className="text-bg-primary" />
        </div>

        <button
          className={`w-10 h-10 flex items-center justify-center rounded-pill transition-all duration-200 ${
            isMovableEditorOpen 
              ? "bg-text-primary text-bg-primary" 
              : "text-text-secondary hover:bg-bg-secondary"
          }`}
          onClick={() => setIsMovableEditorOpen(!isMovableEditorOpen)}
          title="Toggle Code Editor"
        >
          <Bug size={18} />
        </button>

        <button
          className={`w-10 h-10 flex items-center justify-center rounded-pill transition-all duration-200 ${
            isMovableExampleOpen 
              ? "bg-text-primary text-bg-primary" 
              : "text-text-secondary hover:bg-bg-secondary"
          }`}
          onClick={() => setIsMovableExampleOpen(!isMovableExampleOpen)}
          title="Toggle Examples"
        >
          <Image size={18} />
        </button>

        <button
          className={`w-10 h-10 flex items-center justify-center rounded-pill transition-all duration-200 ${
            isChatOpen 
              ? "bg-text-primary text-bg-primary" 
              : "text-text-secondary hover:bg-bg-secondary"
          }`}
          onClick={() => setIsChatOpen(!isChatOpen)}
          title="Toggle AI Chat"
        >
          <Bot size={14} />
        </button>

        <div className="w-6 h-px bg-border-primary my-1" />

        <button
          className={`w-10 h-10 flex items-center justify-center rounded-pill transition-all duration-200 ${
            isCanvasEditMode 
              ? "bg-text-primary text-bg-primary" 
              : "text-text-secondary hover:bg-bg-secondary"
          }`}
          onClick={() => setIsCanvasEditMode(!isCanvasEditMode)}
          title="Toggle Canvas Edit Mode"
        >
          <Edit size={16} />
        </button>

        <button
          className={`w-10 h-10 flex items-center justify-center rounded-pill transition-all duration-200 ${
            isSidebarSticky 
              ? "bg-text-primary text-bg-primary" 
              : "text-text-secondary hover:bg-bg-secondary"
          }`}
          onClick={() => setIsSidebarSticky(!isSidebarSticky)}
          title={isSidebarSticky ? "Unpin Sidebar" : "Pin Sidebar"}
        >
          <Pin size={16} className={isSidebarSticky ? "" : "rotate-45"} />
        </button>

        <button
          className="w-10 h-10 flex items-center justify-center rounded-pill text-text-secondary hover:bg-bg-secondary transition-all"
          onClick={() => setIsEmbedModalOpen(true)}
          title="Generate Embed Code"
        >
          <ArrowDownToLine size={18} />
        </button>
      </div>
    </div>

  );
};


export default Sidebar;
