import React, {
  createContext,
  useContext,
  useState,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// --- 1. Global Provider (Optional but good for shared settings like delay) ---
const TooltipProviderContext = createContext<{ delayDuration: number }>({ delayDuration: 200 });

export function TooltipProvider({ children, delayDuration = 200 }: { children: ReactNode, delayDuration?: number }) {
  return (
    <TooltipProviderContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipProviderContext.Provider>
  );
}

// --- 2. Local Context ---
interface TooltipContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
}

const TooltipContext = createContext<TooltipContextValue | undefined>(undefined);

function useTooltipContext() {
  const context = useContext(TooltipContext);
  if (!context) throw new Error("Tooltip components must be used within <Tooltip>");
  return context;
}

// --- 3. Root (<Tooltip>) ---
export function Tooltip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  return (
    <TooltipContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </TooltipContext.Provider>
  );
}

// --- 4. Trigger (<TooltipTrigger>) ---
export function TooltipTrigger({ children, asChild }: { children: ReactNode, asChild?: boolean }) {
  const { setOpen, triggerRef } = useTooltipContext();
  const { delayDuration } = useContext(TooltipProviderContext);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setOpen(true), delayDuration);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      ref: (node: HTMLElement | null) => {
        triggerRef.current = node;
        // Preserve original ref if it exists
        const childRef = (child as any).ref;
        if (typeof childRef === "function") childRef(node);
        else if (childRef) (childRef as any).current = node;
      },
      onMouseEnter: (e: React.MouseEvent) => {
        handleMouseEnter();
        child.props.onMouseEnter?.(e);
      },
      onMouseLeave: (e: React.MouseEvent) => {
        handleMouseLeave();
        child.props.onMouseLeave?.(e);
      },
      onFocus: (e: React.FocusEvent) => {
        setOpen(true);
        child.props.onFocus?.(e);
      },
      onBlur: (e: React.FocusEvent) => {
        setOpen(false);
        child.props.onBlur?.(e);
      },
    });
  }

  return (
    <button
      ref={triggerRef as any}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      type="button"
    >
      {children}
    </button>
  );
}

// --- 5. Content (<TooltipContent>) ---
interface TooltipContentProps {
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  sideOffset?: number;
  className?: string;
}

export function TooltipContent({ 
  children, 
  side = "top", 
  sideOffset = 4,
  className = ""
}: TooltipContentProps) {
  const { open, triggerRef } = useTooltipContext();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState({ top: -9999, left: -9999, opacity: 0 });

  // Use layout effect to measure DOM before the browser paints
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !contentRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current!.getBoundingClientRect();
      const content = contentRef.current!.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let currentSide = side;
      let top = 0;
      let left = 0;

      // --- AUTO-FLIP LOGIC (Collision Detection) ---
      // If we ask for 'top' but it overflows the top of the screen, flip to 'bottom'
      if (currentSide === "top" && trigger.top - content.height - sideOffset < 0) {
        currentSide = "bottom";
      } 
      // If we ask for 'bottom' but it overflows the bottom of the screen, flip to 'top'
      else if (currentSide === "bottom" && trigger.bottom + content.height + sideOffset > vh) {
        currentSide = "top";
      }
      // Same for left and right
      else if (currentSide === "left" && trigger.left - content.width - sideOffset < 0) {
        currentSide = "right";
      }
      else if (currentSide === "right" && trigger.right + content.width + sideOffset > vw) {
        currentSide = "left";
      }

      // --- CALCULATE COORDS BASED ON (POSSIBLY FLIPPED) SIDE ---
      if (currentSide === "top") {
        top = trigger.top - content.height - sideOffset;
        left = trigger.left + (trigger.width / 2) - (content.width / 2);
      } else if (currentSide === "bottom") {
        top = trigger.bottom + sideOffset;
        left = trigger.left + (trigger.width / 2) - (content.width / 2);
      } else if (currentSide === "left") {
        top = trigger.top + (trigger.height / 2) - (content.height / 2);
        left = trigger.left - content.width - sideOffset;
      } else if (currentSide === "right") {
        top = trigger.top + (trigger.height / 2) - (content.height / 2);
        left = trigger.right + sideOffset;
      }

      // --- VIEWPORT CLAMPING ---
      // Prevent the tooltip from bleeding off the left or right edges of the screen
      const padding = 8; // min distance from screen edge
      if (left < padding) left = padding;
      if (left + content.width > vw - padding) left = vw - content.width - padding;

      // Add scroll offsets so it works if the page is scrolled
      setCoords({ 
        top: top + window.scrollY, 
        left: left + window.scrollX,
        opacity: 1 
      });
    };

    updatePosition();

    // Re-calculate if user scrolls or resizes the window while tooltip is open
    // 'true' uses capture phase to catch scrolls in nested scrollable div containers
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, side, sideOffset]);

  if (!open) return null;

  return createPortal(
    <div
      ref={contentRef}
      style={{
        position: "absolute",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        opacity: coords.opacity,
        // Optional: disable pointer events so the tooltip doesn't block clicks beneath it
        pointerEvents: "none", 
      }}
      className={`z-50 overflow-hidden rounded-sm bg-background-lable px-2 py-1.5 text-xs text-white animate-in fade-in zoom-in-95 ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}