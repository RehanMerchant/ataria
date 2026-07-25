import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// --- Context ---
interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

function useDialogContext() {
  const context = useContext(DialogContext);
  if (!context) throw new Error("Dialog components must be used within <Dialog>");
  return context;
}

// --- Root ---
interface DialogProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Dialog({ children, open: controlledOpen, onOpenChange }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

// --- Trigger ---
export function DialogTrigger({ children, asChild }: { children: ReactNode, asChild?: boolean }) {
  const { setOpen } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    // Typed to avoid `any` in TypeScript
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        setOpen(true);
      },
    });
  }

  return (
    <button onClick={() => setOpen(true)} type="button">
      {children}
    </button>
  );
}

// --- Content & Portal ---
export function DialogContent({ children, className = "" }: { children: ReactNode, className?: string }) {
  const { open, setOpen } = useDialogContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Handle Scroll Locking & Escape Key
  useEffect(() => {
    if (!open) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPadding = document.body.style.paddingRight;

    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPadding;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen]);

  if (!open || !mounted) return null;

  return createPortal(
    // 1. Flexbox Wrapper: This guarantees perfect centering natively.
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      {/* 2. Overlay: Made 'absolute' so it fills the flex wrapper */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm fade-in"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      
      {/* 3. Dialog Box: Made 'relative' so it flows naturally in the center of the flex container */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-50 w-full max-w-lg gap-4 rounded-sm bg-background border border-background-lable p-6 shadow-sm sm:max-w-md animate-in ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
        
        {/* Default Close X */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>,
    document.body
  );
}

// --- Sub-components for Layout ---
export function DialogHeader({ children, className = "" }: { children: ReactNode, className?: string }) {
  return <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}>{children}</div>;
}

export function DialogTitle({ children, className = "" }: { children: ReactNode, className?: string }) {
  return <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>{children}</h2>;
}

export function DialogDescription({ children, className = "" }: { children: ReactNode, className?: string }) {
  return <p className={`text-sm text-gray-500 ${className}`}>{children}</p>;
}

export function DialogFooter({ children, className = "" }: { children: ReactNode, className?: string }) {
  return <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}>{children}</div>;
}

// --- Close Button Wrapper ---
export function DialogClose({ children, asChild }: { children: ReactNode, asChild?: boolean }) {
  const { setOpen } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        setOpen(false);
      },
    });
  }

  return <button onClick={() => setOpen(false)}>{children}</button>;
}