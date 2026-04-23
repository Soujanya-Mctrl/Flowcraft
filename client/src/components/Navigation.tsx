import { Link, Outlet, useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "./auth/firebase.config";
import { BACKEND_URL } from "../config";
import {
  BookMarked,
  LayoutDashboard,
  LogOut,
  UserCog,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { chatState, sessionIdState, sessionTitleState } from "../store/atoms";
import { useLocation } from "react-router-dom";

const Navigation = () => {
  const [user, setUser] = useState<User | null>(null);
  const setChat = useSetRecoilState<string>(chatState);
  const sessionId = useRecoilValue(sessionIdState);
  const [sessionTitle, setSessionTitle] = useRecoilState(sessionTitleState);
  const [dropdown, setDropdown] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const location = useLocation();
  const isCreatePage = location.pathname === "/diagram/create";

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user: User | null) => {
      if (user) {
        setUser(user);
        
        // Sync user profile with backend
        try {
          const token = await user.getIdToken();
          await fetch(`${BACKEND_URL}/user/sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              photoURL: user.photoURL
            })
          });
        } catch (err) {
          console.error("Failed to sync user profile:", err);
        }

        setChat(
          `## Hello ${
            user.displayName?.split(" ")[0] || "User"
          },\n\n ## I'm \`Flowcraft AI\` :) \n\nI help people in creating high-quality technical diagrams.\n\nExplain me your specifications and I will create diagrams for you instantly.`
        );
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [setChat]);



  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const signInWithGoogle = async () => {
    try {
      signInWithPopup(auth, new GoogleAuthProvider());
      setIsAuthModalOpen(false);
    } catch (e: unknown) {
      console.log(e instanceof Error ? e.message : "Auth Error");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err: unknown) {
      console.log(err instanceof Error ? err.message : "SignOut Error");
    }
  };

  // Debounced session title update
  useEffect(() => {
    if (!sessionId || !sessionTitle) return;
    
    const timeoutId = setTimeout(async () => {
      try {
        setIsSavingTitle(true);
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const headers: Record<string, string> = {
          "Content-Type": "application/json"
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        await fetch(`${BACKEND_URL}/session/${sessionId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ title: sessionTitle })
        });
      } catch (err) {
        console.error("Failed to update session title:", err);
      } finally {
        setTimeout(() => setIsSavingTitle(false), 1000);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [sessionTitle, sessionId]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[1000] p-4">
          <div className="border border-border-primary bg-bg-primary max-w-sm w-full relative p-8 rounded-lg shadow-2xl">
            <button
              className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary transition-colors"
              onClick={() => setIsAuthModalOpen(false)}
            >
              <X size={20} />
            </button>
            <h2 className="headline-lg text-[24px] mb-6">Authentication</h2>
            <button
              className="w-full flex items-center justify-center gap-3 bg-black text-white dark:bg-white dark:text-black py-3 px-6 rounded-md font-medium transition-transform active:scale-95"
              onClick={signInWithGoogle}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      )}

      {isLogoutModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[1000] p-4">
          <div className="border border-border-primary bg-bg-primary max-w-sm w-full relative p-8 rounded-lg shadow-2xl">
            <h2 className="headline-lg text-[24px] mb-2">Log Out</h2>
            <p className="text-text-secondary mb-8">Are you sure you want to sign out?</p>
            <div className="flex gap-4">
              <button
                className="flex-1 py-3 px-6 rounded-md bg-black/5 dark:bg-white/5 font-medium transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                onClick={() => setIsLogoutModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 py-3 px-6 rounded-md bg-red-500 text-white font-medium transition-transform active:scale-95"
                onClick={() => {
                  handleSignOut();
                  setIsLogoutModalOpen(false);
                }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="minimal-nav">

        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => navigate("/")}
        > 
          <div className="w-8 h-8 bg-black dark:bg-white rounded-container flex items-center justify-center">
            <span className="text-[14px] text-white dark:text-black font-bold">F</span>
          </div>
          <span className="text-[18px] font-rounded font-medium tracking-tight">Flowcraft</span>
        </div>

        {isCreatePage && sessionId && (
          <div className="flex-1 max-w-md mx-8 group/title relative">
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 text-[14px] font-medium text-text-primary placeholder:text-text-muted px-0 py-1 transition-all"
              placeholder="Untitled Canvas"
            />
            <div className="absolute bottom-0 left-0 h-[1px] bg-border-primary w-0 group-focus-within/title:w-full transition-all duration-300" />
            {isSavingTitle && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 text-[10px] text-text-muted uppercase tracking-widest animate-pulse">
                <span>Saving</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-8">
          <Link
            to="/diagram/create"
            className="text-text-secondary hover:text-text-primary transition-colors font-normal"
          >
            Create
          </Link>
          
          {!user ? (
            <button
              className="text-text-secondary hover:text-text-primary transition-colors font-normal"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Sign In
            </button>
          ) : (
            <div className="relative">
              <button 
                className="flex items-center gap-2 group"
                onClick={() => setDropdown(!dropdown)}
              >
                <img
                  src={user.photoURL || ""}
                  alt="avatar"
                  className="w-7 h-7 rounded-full border border-border-primary"
                />
              </button>
              
              {dropdown && (
                <div className="absolute right-0 mt-4 w-64 border border-border-primary bg-bg-primary p-4 shadow-xl z-[1100] rounded-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <img src={user.photoURL || ""} className="w-12 h-12 rounded-full" />
                    <div className="overflow-hidden">
                      <p className="font-semibold truncate">{user.displayName}</p>
                      <p className="text-[12px] text-text-secondary truncate">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <button 
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-[14px]"
                      onClick={() => {
                        setDropdown(false);
                        navigate("/profile");
                      }}
                    >
                      <LayoutDashboard size={16} /> Dashboard
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-[14px]"
                      onClick={() => {
                        setDropdown(false);
                        navigate("/profile");
                      }}
                    >
                      <BookMarked size={16} /> My Diagrams
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3 text-[14px]"
                      onClick={() => {
                        setDropdown(false);
                        navigate("/profile");
                      }}
                    >
                      <UserCog size={16} /> Settings
                    </button>
                    <button 
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-red-500/10 text-red-500 transition-colors flex items-center gap-3 text-[14px]"
                      onClick={() => {
                        setDropdown(false);
                        setIsLogoutModalOpen(true);
                      }}
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <button
            className="text-text-secondary hover:text-text-primary transition-colors"
            onClick={() => setIsDark((d) => !d)}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>

  );
};


export default Navigation;
