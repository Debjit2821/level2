import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Loader2, X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ==========================================
// TOAST NOTIFICATIONS SYSTEM
// ==========================================

export type ToastType = "success" | "warning" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (type: ToastType, title: string, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (type: ToastType, title: string, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
      {/* Toast Render Panel */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-emerald-400" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-400" />,
    error: <AlertCircle className="h-5 w-5 text-rose-500" />,
    info: <Info className="h-5 w-5 text-cyan-400" />,
  };

  const borderColors = {
    success: "border-emerald-500/20 bg-emerald-950/20 shadow-emerald-500/5",
    warning: "border-amber-500/20 bg-amber-950/20 shadow-amber-500/5",
    error: "border-rose-500/20 bg-rose-950/20 shadow-rose-500/5",
    info: "border-cyan-500/20 bg-cyan-950/20 shadow-cyan-500/5",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-lg animate-in slide-in-from-bottom-5 duration-300",
        borderColors[toast.type]
      )}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-grow min-w-0">
        <h4 className="font-semibold text-sm text-foreground">{toast.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 break-words">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground p-0.5 rounded-lg hover:bg-white/5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ==========================================
// CORE UI ELEMENTS
// ==========================================

// --- BUTTONS ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-xl transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none gap-2";
  
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/25 border border-indigo-500/30",
    secondary: "bg-white/10 hover:bg-white/15 text-foreground border border-white/10 hover:border-white/20 backdrop-blur-md",
    outline: "bg-transparent hover:bg-white/5 text-foreground border border-white/15 hover:border-white/25",
    danger: "bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/20 shadow-lg shadow-rose-600/10",
    ghost: "bg-transparent hover:bg-white/5 text-foreground",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base rounded-2xl",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-current" />}
      {!isLoading && leftIcon && <span className="inline-block">{leftIcon}</span>}
      {children}
    </button>
  );
}

// --- CARDS ---
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-[#0c0d12]/60 backdrop-blur-xl shadow-xl shadow-black/20",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0 border-t border-white/[0.05] mt-6", className)} {...props} />;
}

// --- INPUTS & TEXTAREA ---
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-xl border border-white/10 bg-[#0d0e12]/60 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-indigo-500/50 focus-visible:ring-1 focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-white/10 bg-[#0d0e12]/60 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-indigo-500/50 focus-visible:ring-1 focus-visible:ring-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className
      )}
      {...props}
    />
  );
}

// --- BADGES ---
export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "success" | "warning" | "error" | "info";
}) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors select-none";
  
  const variants = {
    default: "bg-white/15 border-transparent text-foreground",
    secondary: "bg-white/5 border-white/10 text-muted-foreground",
    success: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    warning: "bg-amber-500/10 border-amber-500/25 text-amber-400",
    error: "bg-rose-500/10 border-rose-500/25 text-rose-400",
    info: "bg-cyan-500/10 border-cyan-500/25 text-cyan-400",
  };

  return <span className={cn(base, variants[variant], className)} {...props} />;
}

// --- TABS SYSTEM ---
interface TabsContextType {
  activeTab: string;
  setActiveTab: (val: string) => void;
}
const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

export function Tabs({
  defaultValue,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { defaultValue: string }) {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-xl bg-white/[0.04] p-1 text-muted-foreground border border-white/[0.06]",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be inside Tabs");
  const isActive = context.activeTab === value;

  return (
    <button
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 select-none",
        isActive
          ? "bg-white/10 text-foreground border border-white/5 shadow-sm"
          : "hover:text-foreground hover:bg-white/[0.02]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be inside Tabs");
  const isActive = context.activeTab === value;

  if (!isActive) return null;
  return (
    <div
      className={cn(
        "mt-4 ring-offset-background focus-visible:outline-none animate-in fade-in duration-300",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// --- DIALOG / MODAL ---
interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#06070a]/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />
      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0c0d12]/95 backdrop-blur-xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-lg p-1 hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- TABLE ---
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/[0.06]">
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-white/[0.02] border-b border-white/[0.06]", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-white/[0.04]", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("hover:bg-white/[0.01] transition-colors", className)} {...props} />;
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-4 py-3 font-semibold text-muted-foreground", className)} {...props} />;
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-4 text-foreground", className)} {...props} />;
}

// --- SKELETON LOADERS ---
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-xl bg-white/[0.06]", className)} {...props} />;
}
