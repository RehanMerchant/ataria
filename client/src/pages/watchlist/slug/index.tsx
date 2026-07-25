import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWatchlistStore } from "../../../store/useWatchlistStore";
import { Plus, GripVertical, Trash, Pen, Check, X, Search, Loader2, Grid, List } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "../../../components/ui/Dialog";
import { cn } from "../../../utils/cn";
import { api } from "../../../api/axios";
import type { WatchlistEntity } from "../../../store/useWatchlistStore";

// --- IMPORT THE CUSTOM HOOK ---
import { useMarketData } from "../../../hooks/useMarketData";
import Heatmap from "../../../containers/watchlist/Heatmap";

const WatchlistPage = () => {
  const { slug } = useParams();

  const {
    lists,
    fetchBackground,
    addEntity,
    syncEntities,
    isFetching
  } = useWatchlistStore();

  const activeWatchlist = lists.find((list) => list.id === slug);

  // --- LOCAL STATE ---
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftEntities, setDraftEntities] = useState<WatchlistEntity[]>([]);
  const [entityToDelete, setEntityToDelete] = useState<WatchlistEntity | null>(null);

  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WatchlistEntity[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // --- DRAG & DROP REFS ---
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Heatmap
  const [isHeatmap, setIsHeatmap] = useState(false)

  const activeEntities = isEditing ? draftEntities : (activeWatchlist?.entities || []);
  const navigate = useNavigate();
  const hasChanges = JSON.stringify(activeWatchlist?.entities) !== JSON.stringify(draftEntities);

  const subscriptionPayload = useMemo(() => {
    return activeEntities.map(e => ({ isin: e.isin, segment: e.segment }));
  }, [activeEntities]);

  // Hook handles REST fallback vs WebSocket streaming automatically
  const { livePrices, isMarketOpen } = useMarketData(subscriptionPayload);

  // =================================================================

  useEffect(() => {
    fetchBackground();
  }, [fetchBackground]);

  useEffect(() => {
    if (activeWatchlist && !isEditing) {
      setDraftEntities(activeWatchlist.entities);
    }
  }, [activeWatchlist, isEditing]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await api.get(`/instruments/search?query=${debouncedQuery}`);
        setSearchResults(response.data.data || []);
      } catch (error) {
        console.error("Failed to fetch instruments", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  useEffect(() => {
    if (!isDialogOpen) {
      setSearchQuery("");
      setDebouncedQuery("");
      setSearchResults([]);
    }
  }, [isDialogOpen]);

  const toggleEdit = () => {
    if (isEditing) {
      setDraftEntities(activeWatchlist?.entities || []);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!activeWatchlist) return;
    setIsEditing(false);
    await syncEntities(activeWatchlist.id, draftEntities);
  };

  const handleDeleteEntityLocally = () => {
    if (!entityToDelete) return;
    const updated = draftEntities.filter((e) => e.isin !== entityToDelete.isin);
    setDraftEntities(updated);
    setEntityToDelete(null);
  };

  const handleSelectSearchResult = async (entity: WatchlistEntity) => {
    if (!activeWatchlist) return;
    await addEntity(activeWatchlist.id, entity);
    setIsDialogOpen(false);
  };

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
    dragItem.current = index;
    setDraggingIndex(index);

    const img = new Image();
    img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>, index: number) => {
    e.preventDefault();
    if (dragItem.current !== null && dragItem.current !== index) {
      dragOverItem.current = index;

      const cloned = [...draftEntities];
      const draggedItemContent = cloned[dragItem.current];

      cloned.splice(dragItem.current, 1);
      cloned.splice(dragOverItem.current, 0, draggedItemContent);

      setDraftEntities(cloned);
      dragItem.current = index;
    }
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingIndex(null);
  };

  if (!activeWatchlist && isFetching) {
    return <div className="p-4 text-foreground-muted text-sm">Loading watchlist...</div>;
  }

  if (!activeWatchlist) {
    return <div className="p-4 text-red-500 text-sm">Watchlist not found.</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto relative h-full flex flex-col">
      {/* HEADER */}
      <div className="flex justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-medium flex items-center gap-2 text-foreground">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: activeWatchlist.color }}
            ></span>
            {activeWatchlist.name}
          </h1>

          {/* Global Market Status Indicator */}
          {isMarketOpen === false && (
            <span className="px-2 py-1 rounded text-[10px] tracking-wide font-semibold bg-red-800/30 text-red-50">
              MARKET CLOSED
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(activeWatchlist.entities.length > 0 && !isEditing) && (
            <button
              onClick={() => setIsDialogOpen(true)}
              className="flex rounded-sm border border-background-lable px-2 py-1.5 items-center text-xs gap-1 hover:bg-background-lable hover:text-white transition-colors text-foreground cursor-pointer disabled:opacity-50"
            >
              <Plus className="size-4" /> <span>Add</span>
            </button>
          )}

          {((activeWatchlist.entities.length > 0 || isEditing) && !isHeatmap) && (
            <div>
              {isEditing ? (
                hasChanges ? (
                  <button
                    onClick={handleSave}
                    className="flex rounded-sm bg-blue-600 px-3 py-1.5 items-center text-xs gap-1 hover:bg-blue-500 transition-colors text-white cursor-pointer shadow-sm"
                  >
                    <Check className="size-3" /> <span>Save</span>
                  </button>
                ) : (
                  <button
                    onClick={toggleEdit}
                    className="flex rounded-sm border border-background-lable px-2 py-1.5 items-center text-xs gap-1 hover:bg-background-lable hover:text-white transition-colors text-foreground cursor-pointer"
                  >
                    <X className="size-3" /> <span>Cancel</span>
                  </button>
                )
              ) : (
                <button
                  onClick={toggleEdit}
                  className="flex rounded-sm border border-background-lable px-2 py-1.5 items-center text-xs gap-1 hover:bg-background-lable hover:text-white transition-colors text-foreground cursor-pointer"
                >
                  <Pen className="size-3" /><span className="ml-0.5">Edit</span>
                </button>
              )}
            </div>
          )}
          <div>
            <button
              onClick={() => { setIsHeatmap(!isHeatmap) }}
              className="flex rounded-sm border border-background-lable px-2 py-1.5 items-center text-xs gap-1 hover:bg-background-lable hover:text-white transition-colors text-foreground cursor-pointer disabled:opacity-50"
            > {isHeatmap ? <List className="size-4" /> : <Grid className="size-4" />}

            </button>
          </div>
        </div>
      </div>
      {isHeatmap ? <Heatmap activeEntities={activeEntities} /> : <div className="mt-2 overflow-hidden flex-1 px-2">
        {activeEntities.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center h-full text-foreground-muted">
            <span className="text-sm">No entities added yet.</span>

            <button
              onClick={() => setIsDialogOpen(true)}
              className="flex mt-2 rounded-sm border border-background-lable px-2 py-1.5 items-center text-xs gap-1 hover:bg-background-lable hover:text-white transition-colors text-foreground cursor-pointer"
            >
              <Plus className="size-4" /> <span>Add Entities</span>
            </button>

          </div>
        ) : (
          <div className="flex flex-col mt-4">
            {activeEntities.map((entity, index) => {
              const isDragging = draggingIndex === index;
              const instrumentKey = `${entity.segment}|${entity.isin}`;

              // We strictly only need ltpc data now
              const tick = livePrices[instrumentKey];
              const ltpcData = tick?.ltpc;

              // Calculate percent change if both LTP and CP exist
              let pctChange = null;
              let isPositive = false;
              if (ltpcData?.ltp && ltpcData?.cp) {
                pctChange = ((ltpcData.ltp - ltpcData.cp) / ltpcData.cp) * 100;
                isPositive = pctChange >= 0;
              }

              return (
                <div className="flex items-center">
                <button
                  onClick={()=>{navigate(`/instrument/${entity.isin}`)}}
                  key={entity.isin}
                  draggable={isEditing}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={cn(
                    "flex items-center cursor-pointer flex-1 gap-2 px-2 py-2 rounded-sm group border border-transparent transition-all duration-200",
                    isEditing ? "bg-background" : "hover:bg-background-lable hover:border-surface-border",
                    isDragging ? "opacity-40 scale-[0.98] z-10" : "opacity-100 scale-100"
                  )}
                >
                  {/* Drag Handle */}
                  {isEditing && (
                    <div className="cursor-grab active:cursor-grabbing p-1 text-foreground-muted opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center shrink-0">
                      <GripVertical className="size-4" />
                    </div>
                  )}
                  <div className="w-full flex justify-start">
                    <div className="flex flex-col text-left">
                    <div className="font-medium text-sm text-foreground">{entity.trading_symbol}</div>
                      <div className="text-xs font-semibold text-foreground">{entity.exchange}</div>
                    </div>
                              
                  
                  </div>

                  {/* LIVE / STATIC DATA DISPLAY */}
                  <div className="flex flex-col items-end">
                    {ltpcData ? (
                      <>
                        <span className={cn(
                          "text-sm font-semibold tracking-tight transition-colors",
                          isMarketOpen === false ? "text-foreground" : (isPositive ? "text-green-500" : "text-red-500")
                        )}>
                          ₹{ltpcData.ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {pctChange !== null && (
                          <span className={cn(
                            "text-xs transition-colors",
                            isMarketOpen === false ? "text-foreground-muted" : (isPositive ? "text-green-500/80" : "text-red-500/80")
                          )}>
                            {isPositive ? "+" : ""}{pctChange.toFixed(2)}%
                          </span>
                        )}
                      </>
                    ) : (
                      <span className={cn(
                        "text-xs text-foreground-muted",
                        isMarketOpen === true ? "animate-pulse" : ""
                      )}>
                        {isMarketOpen === null ? "Loading..." : "--"}
                      </span>
                    )}
                  </div>

                  {/* Delete / Remove Action */}
        
                </button>
                          <div className="text-right flex items-center h-full pl-2">
                    {isEditing && (
                      <button
                        onClick={() => setEntityToDelete(entity)}
                        className="p-1 rounded-md cursor-pointer text-foreground-muted hover:text-red-500 hover:scale-110 transition-all duration-200"
                        title="Remove Entity"
                      >
                        <Trash className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            
          </div>
        )}
      </div>}


      {/* --- ADD ENTITY DIALOG --- */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-background border-surface-border text-foreground sm:max-w-md overflow-hidden flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Add to {activeWatchlist.name}</DialogTitle>
            <DialogDescription className="text-foreground-muted">
              Search for entities to add them to your watchlist.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground-muted" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search eg. Reliance..."
                className="w-full rounded-sm border border-surface-border bg-background-lable pl-9 pr-3 py-2 text-sm text-foreground focus:border-accent-blue focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* SEARCH RESULTS AREA */}
          <div className="flex-1 overflow-y-auto max-h-75 mt-2 mb-2 pr-1">
            {isSearching ? (
              <div className="flex items-center justify-center h-full text-foreground-muted gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <div className="flex flex-col gap-1">
                {searchResults.map((result) => (
                  <button
                    key={result.isin}
                    onClick={() => handleSelectSearchResult(result)}
                    className="flex flex-col w-full text-left p-2 rounded-sm border border-transparent hover:border-surface-border hover:bg-background-lable transition-colors group cursor-pointer"
                  >
                    <span className="font-medium text-sm text-foreground group-hover:text-blue-500 transition-colors">
                      {result.name}
                    </span>
                    <span className="text-xs text-foreground-muted mt-0.5 font-medium">
                      {result.segment}
                    </span>
                  </button>
                ))}
              </div>
            ) : searchQuery.trim().length > 0 && !isSearching ? (
              <div className="flex items-center justify-center h-fit text-foreground-muted text-sm">
                No instruments found.
              </div>
            ) : (
              <div className="flex items-center justify-center h-fit text-foreground-muted text-sm opacity-50">
                Search Equities from NSE and BSE
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-surface-border/50">
            <button
              onClick={() => setIsDialogOpen(false)}
              className="rounded-sm border border-surface-border bg-transparent px-4 py-2 text-sm font-medium text-foreground hover:bg-background-lable transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      <Dialog open={!!entityToDelete} onOpenChange={(open) => !open && setEntityToDelete(null)}>
        <DialogContent className="bg-background border-surface-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Trash className="size-5" /> Remove Entity
            </DialogTitle>
            <DialogDescription className="text-foreground-muted pt-2">
              Are you sure you want to remove <span>{entityToDelete?.trading_symbol}</span> from <span>{activeWatchlist.name}</span>?
              <br /><br />
              <span className="text-red-500 font-medium">
                You will still need to click "Save" to apply this change.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setEntityToDelete(null)}
              className="rounded-sm border border-surface-border bg-transparent px-4 py-2 text-sm font-medium text-foreground hover:bg-background-lable transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteEntityLocally}
              className="rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              Remove
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WatchlistPage;