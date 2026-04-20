import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";

const Redirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // This is a placeholder for actual redirect logic
    // For now, we'll just show the premium loading state
    const timer = setTimeout(() => {
      // In a real app, logic would go here to find the actual diagram
      // navigate(`/diagram/view/${id}`); 
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-apple-gray dark:bg-apple-black flex flex-col pt-20">
      <Navigation />
      <div className="flex-1 flex flex-col items-center justify-center p-8 scale-in">
        <div className="w-16 h-16 border-4 border-apple-blue border-t-transparent rounded-full animate-spin mb-8 shadow-2xl shadow-apple-blue/20"></div>
        <h1 className="text-[32px] font-semibold tracking-apple-display text-apple-near-black dark:text-white">
          Redirecting
        </h1>
        <p className="mt-4 text-[17px] opacity-40 font-medium max-w-xs text-center">
          We're locating your blueprint. One moment while we prepare the workspace.
        </p>
      </div>
    </div>
  );
};

export default Redirect;
