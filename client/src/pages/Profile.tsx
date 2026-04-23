import { useEffect, useState } from "react";
import { auth } from "../components/auth/firebase.config";
import { User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { 
  Calendar, 
  Hash, 
  ChevronRight, 
  LayoutDashboard,
  Clock,
  LogOut,
  Settings,
  Grid
} from "lucide-react";
import { BACKEND_URL } from "../config";
import { motion } from "framer-motion";

interface Diagram {
  id: string;
  title: string;
  createdAt: any;
  diagramType: string;
}

interface Session {
  id: string;
  title: string;
  updatedAt: any;
  last_diagram_code?: string;
}

const ProfilePage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sessions" | "diagrams">("sessions");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
      if (u) {
        setUser(u);
        fetchUserData(u);
      } else {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchUserData = async (u: User) => {
    try {
      const token = await u.getIdToken();
      
      // Fetch Diagrams
      const diagRes = await fetch(`${BACKEND_URL}/diagrams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const diagData = await diagRes.json();
      if (diagData.success) setDiagrams(diagData.data.diagrams);

      // Fetch Sessions
      const sessRes = await fetch(`${BACKEND_URL}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sessData = await sessRes.json();
      if (sessData.success) setSessions(sessData.data.sessions);

    } catch (err) {
      console.error("Failed to fetch user data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateObj: any) => {
    if (!dateObj) return "N/A";
    const date = dateObj._seconds ? new Date(dateObj._seconds * 1000) : new Date(dateObj);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-4 gap-8"
      >
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-8 rounded-3xl border border-border-primary/50 relative overflow-hidden">
            <div className="relative flex flex-col items-center text-center">
              <img 
                src={user.photoURL || ""} 
                alt={user.displayName || "User"} 
                className="w-24 h-24 rounded-full border-2 border-accent-primary/20 p-1 mb-4"
              />
              <h1 className="text-xl font-bold font-rounded mb-1">{user.displayName}</h1>
              <p className="text-xs text-text-secondary mb-6 truncate w-full">{user.email}</p>
              
              <div className="w-full space-y-3 pt-6 border-t border-border-primary/30">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary flex items-center gap-2">
                    <Calendar size={14} /> Joined
                  </span>
                  <span className="font-medium">{formatDate(user.metadata.creationTime)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary flex items-center gap-2">
                    <Grid size={14} /> Canvases
                  </span>
                  <span className="font-medium">{sessions.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 rounded-3xl border border-border-primary/50 space-y-1">
            <button 
              onClick={() => setActiveTab("sessions")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm ${activeTab === "sessions" ? "bg-accent-primary text-bg-primary" : "hover:bg-white/5"}`}
            >
              <LayoutDashboard size={18} /> Canvases
            </button>
            <button 
              onClick={() => setActiveTab("diagrams")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm ${activeTab === "diagrams" ? "bg-accent-primary text-bg-primary" : "hover:bg-white/5"}`}
            >
              <Hash size={18} /> Individual Exports
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/5 transition-all text-sm">
              <Settings size={18} /> Settings
            </button>
            <button 
              onClick={() => auth.signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-red-500/10 text-red-500 transition-all text-sm"
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold font-rounded">
              {activeTab === "sessions" ? "Your Canvases" : "Exported Diagrams"}
            </h2>
            <button 
              onClick={() => navigate("/diagram/create")}
              className="bg-accent-primary text-bg-primary px-6 py-2 rounded-full font-medium hover:scale-105 transition-transform active:scale-95 text-sm"
            >
              New Canvas
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-48 rounded-3xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (activeTab === "sessions" ? sessions : diagrams).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {(activeTab === "sessions" ? sessions : diagrams).map((item) => (
                <motion.div 
                  key={item.id}
                  whileHover={{ y: -4 }}
                  className="glass-card p-6 rounded-3xl border border-border-primary/50 group cursor-pointer hover:border-accent-primary/30 transition-all flex flex-col justify-between"
                  onClick={() => navigate(activeTab === "sessions" ? `/diagram/create?id=${item.id}` : `/diagram/create?diagramId=${item.id}`)}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary mb-4">
                      {activeTab === "sessions" ? <LayoutDashboard size={20} /> : <Hash size={20} />}
                    </div>
                    <h4 className="font-semibold text-lg mb-1 line-clamp-2 group-hover:text-accent-primary transition-colors">
                      {item.title || "Untitled"}
                    </h4>
                    {activeTab === "sessions" && (
                      <p className="text-xs text-text-secondary opacity-70">
                        {(item as any).diagrams?.length || 0} Diagrams
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-primary/30">
                    <span className="flex items-center gap-1.5 text-xs text-text-secondary">
                      <Clock size={12} /> {formatDate(activeTab === "sessions" ? (item as any).updatedAt : (item as any).createdAt)}
                    </span>
                    <ChevronRight size={16} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-white/5 rounded-[40px] border border-dashed border-border-primary">
              <p className="text-text-secondary mb-6">No {activeTab} found.</p>
              <button 
                onClick={() => navigate("/diagram/create")}
                className="text-accent-primary hover:underline font-medium text-sm"
              >
                Start creating now →
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
