// components/ErrorNotification.jsx
import { AlertCircle, X } from "lucide-react";

const ErrorNotification = ({
  error,
  clearError,
}: {
  error: { type: string; message: string };
  clearError: () => void;
}) => {
  if (!error.type) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[5000] w-full max-w-sm side-down px-4">
      <div className="apple-card bg-white/80 dark:bg-apple-dark-surface/80 backdrop-blur-xl border border-red-500/20 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 animate-pulse">
            <AlertCircle size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-[13px] font-bold text-apple-near-black dark:text-white tracking-tight uppercase opacity-40">System Message</h4>
            <p className="text-[14px] font-medium text-apple-near-black dark:text-white leading-tight">
              {error.message}
            </p>
          </div>
          <button
            onClick={clearError}
            className="p-2 hover:bg-apple-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={16} className="opacity-40" />
          </button>
        </div>
      </div>
    </div>
  );
};


export default ErrorNotification;
