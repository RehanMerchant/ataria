import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../api/axios"; 

// --- Types ---
export interface WatchlistEntity {
  instrument_key: any;
  name: string;
  segment: string;
  exchange: string;
  isin: string;
  trading_symbol: string;
}

export interface WatchlistItem {
  id: string;
  name: string;
  indicator: string;
  color: string;
  index: number;
  entities: WatchlistEntity[];
}

interface WatchlistState {
  lists: WatchlistItem[];
  isFetching: boolean;
  
  // Actions
  fetchBackground: () => Promise<void>;
  addWatchlist: (item: Omit<WatchlistItem, "id" | "entities">) => Promise<void>;
  syncDrafts: (draftLists: WatchlistItem[]) => Promise<void>;
  deleteWatchlist: (id: string) => Promise<void>;
  
  // Entity Actions
  addEntity: (watchlistId: string, entity: WatchlistEntity) => Promise<void>;
  removeEntity: (watchlistId: string, isin: string) => Promise<void>;
  syncEntities: (watchlistId: string, updatedEntities: WatchlistEntity[]) => Promise<void>;

}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      lists: [], 
      isFetching: false,

      // --- WATCHLIST COLLECTION OPERATIONS ---
      fetchBackground: async () => {
        set({ isFetching: true });
        try {
          const response = await api.get("/watchlist"); 
          const freshData: WatchlistItem[] = response.data; 
          
          const currentData = get().lists;

          if (JSON.stringify(freshData) !== JSON.stringify(currentData)) {
            if (freshData && Array.isArray(freshData)) {
                set({ lists: freshData });
            }
          }
        } catch (error) {
          console.error("Failed to fetch watchlists", error);
        } finally {
          set({ isFetching: false });
        }
      },

      addWatchlist: async (newItemData) => {
        const tempId = `temp_${Date.now()}`;
        const tempItem = { ...newItemData, id: tempId, entities: [] } as WatchlistItem;
        
        set((state) => ({ lists: [...state.lists, tempItem] }));

        try {
          const response = await api.post("/watchlist", newItemData);
          const confirmedItem = response.data; 
          
          set((state) => ({
            lists: state.lists.map(item => item.id === tempId ? confirmedItem : item)
          }));
        } catch (error) {
          set((state) => ({ lists: state.lists.filter(item => item.id !== tempId) }));
          console.error("Failed to add watchlist", error);
        }
      },

      syncDrafts: async (draftLists) => {
        const previousLists = get().lists;
        set({ lists: draftLists });

        try {
          await api.put("/watchlist", draftLists);
        } catch (error) {
          set({ lists: previousLists });
          console.error("Failed to sync drafts.", error);
        }
      },

      deleteWatchlist: async (id) => {
        const previousLists = get().lists;
        set((state) => ({ lists: state.lists.filter((list) => list.id !== id) }));

        try {
          await api.delete(`/watchlist/${id}`);
        } catch (error) {
          set({ lists: previousLists });
          console.error(`Failed to delete watchlist`, error);
        }
      },

      // --- ENTITY OPERATIONS ---
      addEntity: async (watchlistId, newEntity) => {
        const previousLists = get().lists;

        // 1. Optimistic Update
        set((state) => ({
          lists: state.lists.map(list => {
            if (list.id === watchlistId) {
               // Avoid duplicating in UI if clicked twice quickly
               if (list.entities.some(e => e.isin === newEntity.isin)) return list; 
               return { ...list, entities: [...list.entities, newEntity] };
            }
            return list;
          })
        }));

        try {
          // 2. Sync with Backend
          const response = await api.post(`/watchlist/${watchlistId}/entities`, newEntity);
          const updatedList = response.data.data; // Assuming backend returns { data: WatchlistItem }

          // 3. Confirm with server state
          set((state) => ({
            lists: state.lists.map(list => list.id === watchlistId ? updatedList : list)
          }));
        } catch (error) {
          // 4. Rollback
          set({ lists: previousLists });
          console.error("Failed to add entity", error);
        }
      },

      removeEntity: async (watchlistId, isinToRemove) => {
        const previousLists = get().lists;

        // 1. Optimistic Update
        set((state) => ({
          lists: state.lists.map(list => {
            if (list.id === watchlistId) {
               return { ...list, entities: list.entities.filter(e => e.isin !== isinToRemove) };
            }
            return list;
          })
        }));

        try {
          // 2. Sync with Backend
          const response = await api.delete(`/watchlist/${watchlistId}/entities/${isinToRemove}`);
          const updatedList = response.data.data;

          // 3. Confirm with server state
          set((state) => ({
            lists: state.lists.map(list => list.id === watchlistId ? updatedList : list)
          }));
        } catch (error) {
           // 4. Rollback
           set({ lists: previousLists });
           console.error("Failed to remove entity", error);
        }
      },


// Add this to your store actions inside create(...)
syncEntities: async (watchlistId, updatedEntities) => {
  const previousLists = get().lists;

  // 1. Optimistic Update
  set((state) => ({
    lists: state.lists.map(list => {
      if (list.id === watchlistId) {
        return { ...list, entities: updatedEntities };
      }
      return list;
    })
  }));

  try {
    // 2. Sync with Backend
    const response = await api.put(`/watchlist/${watchlistId}/entities`, { entities: updatedEntities });
    const confirmedList = response.data.data;

    // 3. Update with confirmed server state
    set((state) => ({
      lists: state.lists.map(list => list.id === watchlistId ? confirmedList : list)
    }));
  } catch (error) {
    // 4. Rollback
    set({ lists: previousLists });
    console.error("Failed to sync entities", error);
  }
}
      
    }),
    {
      name: "watchlist-storage",
      partialize: (state) => ({ lists: state.lists }), 
    }
  )



  

);

