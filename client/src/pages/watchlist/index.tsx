import { useState, useRef, useEffect } from "react";
import { ChevronRight, Plus, GripVertical, Trash, Pen, Check, X, Menu } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/Dialog';
import { cn } from "../../utils/cn";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useWatchlistStore } from "../../store/useWatchlistStore";
import type { WatchlistItem } from "../../store/useWatchlistStore";

export default function Watchlist() {
  const { lists, fetchBackground, addWatchlist, syncDrafts } = useWatchlistStore();
  const location = useLocation();
  const navigate  = useNavigate();
  const [draftLists, setDraftLists] = useState<WatchlistItem[]>(lists);
  const [isEditing, setIsEditing] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isCustomColor, setIsCustomColor] = useState(false);
  const [customHex, setCustomHex] = useState("");
  const [sidebar, setSidebar] = useState(false);

  const PREDEFINED_COLORS = ["#EC4034", "#1E88E5", "#1CB36C", "#F59E0B", "#8B5CF6", "#EC4899"];
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0]);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  
  const hasChanges = JSON.stringify(lists) !== JSON.stringify(draftLists);

  useEffect(() => {
    fetchBackground();
  }, [fetchBackground]);

  useEffect(() => {
    if (!isEditing) {
      setDraftLists(lists);
    }
  }, [lists, isEditing]);

  const toggleEdit = () => {
    if (isEditing) {
      setDraftLists(lists);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    setIsEditing(false);
    await syncDrafts(draftLists);
  };

  const handleDelete = (id: string) => {
    const updated = draftLists
      .filter((list) => list.id !== id)
      .map((item, idx) => ({ ...item, index: idx }));
    setDraftLists(updated);
    if(location.pathname.includes(id)){
      navigate("/watchlist")
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    dragItem.current = index;
    setDraggingIndex(index);
    
    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (dragItem.current !== null && dragItem.current !== index) {
      dragOverItem.current = index;
      
      const clonedLists = [...draftLists];
      const draggedItemContent = clonedLists[dragItem.current];
      
      clonedLists.splice(dragItem.current, 1);
      clonedLists.splice(dragOverItem.current, 0, draggedItemContent);
      
      const updatedLists = clonedLists.map((item, idx) => ({ ...item, index: idx }));
      
      setDraftLists(updatedLists);
      dragItem.current = index;
    }
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingIndex(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;

    const finalColor = isCustomColor ? customHex : selectedColor;
    const indicator = newName.charAt(0).toUpperCase();

    await addWatchlist({
      name: newName.trim(),
      indicator: indicator,
      color: finalColor || "#1E88E5",
      index: lists.length, 
    });

    setNewName("");
    setIsCustomColor(false);
    setCustomHex("");
    setSelectedColor(PREDEFINED_COLORS[0]);
    setAddOpen(false);
  };

  const activeLists = isEditing ? draftLists : lists;

  return (
    <div className="flex relative h-[calc(100vh-44px)] w-full overflow-hidden">
      
      {/* Mobile Backdrop Overlay */}
      {sidebar && (
        <div 
          className="absolute inset-0 bg-black/50 z-40 lg:hidden transition-opacity" 
          onClick={() => setSidebar(false)}
        />
      )}

      <aside className={cn(
        "w-75 shrink-0 border-r border-background-lable h-full flex flex-col z-50 bg-background",
        "absolute lg:relative transition-transform duration-300 ease-in-out left-0 top-0",
        sidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>

        <div className="w-full p-4 flex justify-between mt-2 items-center shrink-0">
          <span className="font-medium text-foreground">Watchlists</span>
        
          <div className="flex items-center gap-2">


            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              {activeLists && activeLists.length > 0 && (
                <DialogTrigger asChild>
                  <button className="flex rounded-sm border border-background-lable px-2 py-1.5 items-center text-xs gap-1 hover:bg-background-lable hover:text-white transition-colors text-foreground cursor-pointer disabled:opacity-50">
                    <Plus className="size-4" /> <span>Add</span>
                  </button>
                </DialogTrigger>
              )}

              <DialogContent className="bg-background border-surface-border text-foreground sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Watchlist</DialogTitle>
                  <DialogDescription className="text-foreground-muted">
                    Create a new custom watchlist to track your favorite assets.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-5 py-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="name" className="text-sm font-medium text-foreground">
                        Name
                      </label>
                      <span className="text-xs text-foreground-muted">
                        {newName.length}/28
                      </span>
                    </div>
                    <input
                    autoFocus
                      id="name"
                      type="text"
                      maxLength={28}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g., High Growth Tech"
                      className="w-full rounded-sm border border-surface-border bg-background-lable px-3 py-2 text-sm text-foreground focus:border-accent-blue focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-medium text-foreground">
                      Theme Color
                    </label>
                    <div className="flex flex-wrap gap-3 items-center">
                      {PREDEFINED_COLORS.map((hex) => {
                        const isSelected = !isCustomColor && selectedColor === hex;
                        return (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => {
                              setSelectedColor(hex);
                              setIsCustomColor(false);
                            }}
                            className={cn(
                              "size-7 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                              isSelected ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" : "ring-0"
                            )}
                            style={{ backgroundColor: hex }}
                            aria-label={`Select color ${hex}`}
                          />
                        );
                      })}

                      <div className="w-px h-6 bg-surface-border mx-1"></div> 
                      <button
                        type="button"
                        onClick={() => setIsCustomColor(true)}
                        className={cn(
                          "size-7 rounded-full flex items-center justify-center bg-background-lable border border-surface-border transition-all hover:bg-surface",
                          isCustomColor ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" : ""
                        )}
                        title="Custom Color"
                      >
                        <div 
                          className="size-full rounded-full transition-transform hover:scale-110" 
                          style={{ 
                            background: "conic-gradient(from 90deg, red, yellow, lime, aqua, blue, magenta, red)" 
                          }} 
                        />
                      </button>
                    </div>
                  </div>

                  {isCustomColor && (
                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <label htmlFor="customHex" className="text-sm font-medium text-foreground">
                        Custom Hex Code
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-foreground-muted">
                          #
                        </div>
                        <input
                          id="customHex"
                          type="text"
                          maxLength={6}
                          value={customHex.replace('#', '')}
                          onChange={(e) => setCustomHex(`#${e.target.value}`)}
                          placeholder="FFFFFF"
                          className="w-full rounded-sm border border-surface-border bg-background-lable pl-7 pr-3 py-2 text-sm text-foreground focus:border-accent-blue focus:outline-none uppercase"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button
                    onClick={() => setAddOpen(false)}
                    className="rounded-sm border border-surface-border bg-transparent px-4 py-2 text-sm font-medium text-foreground hover:bg-background-lable transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || (isCustomColor && customHex.length < 4)}
                    className="rounded-sm bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            {(lists.length > 0 || isEditing) && (
              <div>
                {isEditing ? (
                  hasChanges ? (
                    <button 
                      onClick={handleSave} 
                      className="flex rounded-sm bg-blue-600 px-3 py-1.5 items-center text-xs gap-1 hover:bg-blue-500 transition-colors text-white cursor-pointer shadow-sm"
                    >
                      <Check className="size-3"/> <span>Save</span>
                    </button>
                  ) : (
                    <button 
                      onClick={toggleEdit} 
                      className="flex rounded-sm border border-background-lable px-2 py-1.5 items-center text-xs gap-1 hover:bg-background-lable hover:text-white transition-colors text-foreground cursor-pointer"
                    >
                      <X className="size-3"/> <span>Cancel</span>
                    </button>
                  )
                ) : (
                  <button 
                    onClick={toggleEdit} 
                    className="flex rounded-sm border border-background-lable px-2 py-1.5 items-center text-xs gap-1 hover:bg-background-lable hover:text-white transition-colors text-foreground cursor-pointer"
                  >
                    <Pen className="size-3"/><span className="ml-0.5">Edit</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-2 flex flex-col gap-1.5 overflow-y-auto pb-4">
          {!activeLists || activeLists.length === 0 ? (
            <div className="flex items-center justify-center flex-col py-6 text-sm text-foreground-lable">
              <span>No watchlist found</span>
              <button onClick={() => setAddOpen(true)} className="flex mt-1.5 rounded-sm border border-background-lable px-2 py-1.5 items-center text-xs gap-1 hover:bg-background-lable hover:text-white transition-colors text-foreground cursor-pointer disabled:opacity-50">
                <Plus className="size-4" /> <span>Create One</span>
              </button>
            </div>
          ) : (
            activeLists
              .sort((a: any, b: any) => a.index - b.index)
              .map((item: any, index: any) => {
                const isDragging = draggingIndex === index;

                return (
                  <div
                    key={item.id}
                    draggable={isEditing}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={cn(
                      "flex items-center gap-1 group transition-all duration-200",
                      isDragging ? "opacity-40 scale-[0.98] z-10" : "opacity-100 scale-100"
                    )}
                  >
                    {isEditing && (
                      <div className="cursor-grab active:cursor-grabbing p-1 text-foreground-muted opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center shrink-0">
                        <GripVertical className="size-4" />
                      </div>
                    )}

                    <List
                      active={location.pathname.includes(item.id)}
                      id={item.id}
                      name={item.name}
                      indicator={item.indicator}
                      color={item.color}
                      isEditing={isEditing}
                      onDelete={() => handleDelete(item.id)}
                      onItemClick={() => setSidebar(false)} // Pass prop to close sidebar on click in mobile
                    />
                  </div>
                );
              })
          )}
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto p-4 text-foreground w-full">
        <div className="lg:hidden mb-4">
          <button 
            onClick={() => setSidebar(true)} 
            className="flex rounded-sm border border-background-lable px-2 py-1.5 items-center text-xs gap-2 hover:bg-background-lable hover:text-white transition-colors text-foreground cursor-pointer"
          >
            <Menu className="size-4" /> <span>Watchlists</span>
          </button>
        </div>

        <Outlet/>
      </main>
    </div>
  );
}

const List = ({
  id,
  name,
  indicator,
  color,
  active,
  isEditing,
  onDelete,
  onItemClick
}: {
  id:string;
  name: string;
  indicator: string;
  color: string;
  active:boolean,
  isEditing: boolean;
  onDelete: () => void;
  onItemClick?: () => void; // Optional prop to handle interactions
}) => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const Component = isEditing ? "div" : "button";

  return (
    <>
      <Component
        onClick={() => {
          if (!isEditing) {
            navigate(`/watchlist/${id}`);
            onItemClick?.(); // Close mobile sidebar after navigating
          }
        }}
        className={cn(
          "flex-1 flex w-full rounded-sm items-center px-1.5 py-1.5 transition-all border border-transparent text-left",
          isEditing ? "cursor-default" : "hover:bg-background-lable cursor-pointer group",
          active && 'bg-background-lable'
        )}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <div 
            className="flex size-6 shrink-0 items-center justify-center rounded-sm text-xs font-bold border transition-colors"
            style={{ 
              color: color,
              backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
              borderColor: `color-mix(in srgb, ${color} 30%, transparent)`
            }}
          >
            {indicator}
          </div>
          
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
        </div>

        <div className="flex items-center text-foreground-muted shrink-0 ml-2 overflow-hidden">
          {isEditing ? (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              className="p-1 rounded-md cursor-pointer text-foreground-muted hover:text-red-500 hover:scale-110 transition-all duration-200"
              title="Delete Watchlist"
            >
              <Trash className="size-4" />
            </div>
          ) : (
            <ChevronRight className="size-4 transition-transform duration-300 group-hover:-translate-x-1" />
          )}
        </div>
      </Component>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-background border-surface-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Trash className="size-5" /> Delete Watchlist
            </DialogTitle>
            <DialogDescription className="text-foreground-muted pt-2">
              Are you sure you want to delete  <span>{name}</span>
              <br /><br />
              <span className="text-red-500 font-medium">
                This action cannot be undone. All entities inside this watchlist will be permanently lost.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="rounded-sm border border-surface-border bg-transparent px-4 py-2 text-sm font-medium text-foreground hover:bg-background-lable transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowDeleteDialog(false);
              }}
              className="rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Confirm Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};