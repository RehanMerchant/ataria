import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useId,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// --- 1. Global Menubar Context ---
interface MenubarContextValue {
  activeMenu: string | null;
  setActiveMenu: (id: string | null) => void;
}

const MenubarContext = createContext<MenubarContextValue | undefined>(undefined);

function useMenubarContext() {
  const ctx = useContext(MenubarContext);
  if (!ctx) throw new Error("Must be used within <Menubar>");
  return ctx;
}

// --- 2. Local Menu Context ---
interface MenuContextValue {
  menuId: string;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
}

const MenuContext = createContext<MenuContextValue | undefined>(undefined);

function useMenuContext() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("Must be used within <MenubarMenu>");
  return ctx;
}

// --- 3. Menubar Root ---
export function Menubar({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Handle click outside & Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveMenu(null);
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If click is outside any menubar element, close it
      if (!target.closest("[data-menubar-element]")) {
        setActiveMenu(null);
      }
    };

    if (activeMenu) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMenu]);

  return (
    <MenubarContext.Provider value={{ activeMenu, setActiveMenu }}>
      <div
        data-menubar-element="true"
        className={`flex h-10 items-center space-x-1 rounded-md border bg-white p-1 shadow-sm ${className}`}
      >
        {children}
      </div>
    </MenubarContext.Provider>
  );
}

// --- 4. Individual Menu Wrapper ---
export function MenubarMenu({ children }: { children: ReactNode }) {
  const menuId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);

  return (
    <MenuContext.Provider value={{ menuId, triggerRef }}>
      {children}
    </MenuContext.Provider>
  );
}

// --- 5. Menubar Trigger ---
export function MenubarTrigger({ children, className = "", asChild }: { children: ReactNode; className?: string; asChild?: boolean }) {
  const { activeMenu, setActiveMenu } = useMenubarContext();
  const { menuId, triggerRef } = useMenuContext();
  const isOpen = activeMenu === menuId;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); // Prevent focus stealing
    setActiveMenu(isOpen ? null : menuId);
  };

  const handlePointerEnter = () => {
    // If ANY menu is open, hovering this one makes it the active one
    if (activeMenu !== null && activeMenu !== menuId) {
      setActiveMenu(menuId);
    }
  };

  const combinedClassName = `flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-none transition-colors focus:bg-gray-100 focus:text-gray-900 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-900 hover:bg-gray-100 ${className}`;

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    return React.cloneElement(child, {
      ref: triggerRef,
      "data-state": isOpen ? "open" : "closed",
      "data-menubar-element": "true",
      onPointerDown: (e: any) => {
        handlePointerDown(e);
        child.props.onPointerDown?.(e);
      },
      onPointerEnter: (e: any) => {
        handlePointerEnter();
        child.props.onPointerEnter?.(e);
      },
      className: `${combinedClassName} ${child.props.className || ""}`,
    });
  }

  return (
    <button
      ref={triggerRef as any}
      data-state={isOpen ? "open" : "closed"}
      data-menubar-element="true"
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      className={combinedClassName}
    >
      {children}
    </button>
  );
}

// --- 6. Menubar Content (Portal) ---
interface MenubarContentProps {
  children: ReactNode;
  align?: "start" | "center" | "end";
  alignOffset?: number;
  className?: string;
}

export function MenubarContent({ children, align = "start", alignOffset = 0, className = "" }: MenubarContentProps) {
  const { activeMenu } = useMenubarContext();
  const { menuId, triggerRef } = useMenuContext();
  const contentRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: -9999, left: -9999, opacity: 0 });

  const isOpen = activeMenu === menuId;

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || !contentRef.current) return;

    const updatePosition = () => {
      const trigger = triggerRef.current!.getBoundingClientRect();
      const content = contentRef.current!.getBoundingClientRect();
      const vw = window.innerWidth;

      const top = trigger.bottom + 4; // 4px gap below trigger
      let left = 0;

      // Alignment logic
      if (align === "start") {
        left = trigger.left + alignOffset;
      } else if (align === "center") {
        left = trigger.left + trigger.width / 2 - content.width / 2 + alignOffset;
      } else {
        left = trigger.right - content.width + alignOffset;
      }

      // Viewport clamping (keep it on screen)
      if (left < 8) left = 8;
      if (left + content.width > vw - 8) left = vw - content.width - 8;

      setCoords({
        top: top + window.scrollY,
        left: left + window.scrollX,
        opacity: 1,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [isOpen, align, alignOffset]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={contentRef}
      data-menubar-element="true"
      style={{
        position: "absolute",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        opacity: coords.opacity,
      }}
      // Uses the 'animate-in fade-in' keyframes you added previously
      className={`z-50 min-w-[12rem] overflow-hidden rounded-md border bg-white p-1 shadow-md animate-in fade-in zoom-in-95 ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}

// --- 7. Utility Components (Items, Separators) ---
export function MenubarItem({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const { setActiveMenu } = useMenubarContext();

  return (
    <div
      onClick={() => {
        onClick?.();
        setActiveMenu(null); // Close menu on click
      }}
      className={`relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${className}`}
    >
      {children}
    </div>
  );
}

export function MenubarSeparator() {
  return <div className="-mx-1 my-1 h-px bg-gray-200" />;
}

export function MenubarShortcut({ children }: { children: ReactNode }) {
  return <span className="ml-auto text-xs tracking-widest text-gray-400">{children}</span>;
}