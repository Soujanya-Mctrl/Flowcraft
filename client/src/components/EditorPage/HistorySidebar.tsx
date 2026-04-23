import { useEffect, useState } from "react";
import { auth } from "../auth/firebase.config";
import { BACKEND_URL } from "../../config";
import { MessageSquare, Plus, Trash2, History, ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  title: string;
  updatedAt: any;
}

interface HistorySidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSelectSession: (id: string) => void;
  onNewCanvas: () => void;
  currentSessionId: string | null;
}

const HistorySidebar = ({
  isOpen,
  setIsOpen,
  onSelectSession,
  onNewCanvas,
  currentSessionId,
}: HistorySidebarProps) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  const fetchSessions = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch(`${BACKEND_URL}/sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setSessions(data.data.sessions);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this canvas?")) return;
    
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`${BACKEND_URL}/session/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  useEffect(() => {
    if (user && isOpen) {
      fetchSessions();
    }
  }, [user, isOpen, currentSessionId]);

  return (
    <div 
      className={`fixed left-0 top-[72px] bottom-0 bg-bg-primary border-r border-border-primary transition-all duration-300 z-[900] flex flex-col ${
        isOpen ? "w-72" : "w-0 -translate-x-full"
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`absolute -right-10 top-4 w-10 h-10 bg-bg-primary border border-l-0 border-border-primary rounded-r-full flex items-center justify-center hover:text-text-primary text-text-secondary transition-all ${
          isOpen ? "" : "translate-x-10"
        }`}
        title={isOpen ? "Hide History" : "Show History"}
      >
        {isOpen ? <ChevronLeft size={20} /> : <History size={20} />}
      </button>

      {isOpen && (
        <>
          <div className="p-4 border-b border-border-primary">
            <button
              onClick={onNewCanvas}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-black text-white dark:bg-white dark:text-black rounded-full font-medium hover:opacity-90 transition-all active:scale-95"
            >
              <Plus size={18} />
              <span>New Canvas</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {!user ? (
              <div className="p-8 text-center">
                <p className="text-[14px] text-text-secondary mb-4">Sign in to save your diagram history across sessions.</p>
              </div>
            ) : loading ? (
              <div className="flex justify-center p-8">
                <div className="w-5 h-5 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-[13px]">
                No saved canvases yet.
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    currentSessionId === session.id
                      ? "bg-bg-secondary text-text-primary"
                      : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
                  }`}
                >
                  <MessageSquare size={16} className="shrink-0" />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[14px] font-medium truncate pr-6">{session.title}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] opacity-50">
                        {(session as any).diagrams?.length || 0} diagrams
                      </p>
                      <span className="text-[11px] opacity-30">•</span>
                      <p className="text-[11px] opacity-50">
                        {session.updatedAt ? formatDistanceToNow(
                          session.updatedAt._seconds 
                            ? new Date(session.updatedAt._seconds * 1000) 
                            : new Date(session.updatedAt), 
                          { addSuffix: true }
                        ) : "just now"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteSession(e, session.id)}
                    className="absolute right-3 opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default HistorySidebar;
