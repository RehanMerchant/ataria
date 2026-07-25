import type { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync.js';
import { AppError } from '../utils/AppError.js';
import { db } from '../db/index.js';
import { watchlists } from '../db/schema.js';
import { and, eq, notInArray, asc } from 'drizzle-orm';

// --- GET: Fetch all watchlists for the logged-in user ---
export const getWatchlists = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;

  if (!userId) {
    return next(new AppError('User not authenticated', 401));
  }

  const userWatchlists = await db
    .select()
    .from(watchlists)
    .where(eq(watchlists.userId, userId))
    .orderBy(asc(watchlists.index));

  res.status(200).json(userWatchlists); // Notice we return the array directly to match your Zustand frontend expectation
});

// --- POST: Create a new watchlist ---
export const createWatchlist = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const { name, indicator, color, index } = req.body;

  if (!userId) return next(new AppError('User not authenticated', 401));

  if (!name || !indicator || !color || index === undefined) {
    return next(new AppError('Please provide name, indicator, color, and index', 400));
  }

  const newWatchlist = await db.insert(watchlists).values({
    userId,
    name,
    indicator,
    color,
    index,
    entities: [], // Defaults to empty array based on schema, explicitly setting it here
  }).returning();

  // Return the newly created item directly so the frontend can replace the temp ID
  res.status(201).json(newWatchlist[0]);
});

// --- PUT: Bulk Sync Drafts (Handles reordering and deletions) ---
export const syncWatchlists = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const draftLists = req.body;

  if (!userId) return next(new AppError('User not authenticated', 401));

  if (!Array.isArray(draftLists)) {
    return next(new AppError('Invalid payload format. Expected an array of watchlists.', 400));
  }

  // Extract all IDs that the user wants to keep
  // Filter out any temporary IDs just in case they accidentally made it to the backend
  const idsToKeep = draftLists
    .map(list => list.id)
    .filter(id => id && !id.startsWith('temp_')); 

  // Run bulk operations inside a transaction to guarantee data integrity
  await db.transaction(async (tx) => {
    
    // 1. Delete any watchlists that belong to the user but are NOT in the incoming array
    if (idsToKeep.length > 0) {
      await tx
        .delete(watchlists)
        .where(
          and(
            eq(watchlists.userId, userId),
            notInArray(watchlists.id, idsToKeep)
          )
        );
    } else {
      // If array is completely empty, the user deleted all their watchlists
      await tx
        .delete(watchlists)
        .where(eq(watchlists.userId, userId));
    }

    // 2. Loop through the array and update the indices (and potentially name/color if they edited them)
    for (const item of draftLists) {
      if (item.id && !item.id.startsWith('temp_')) {
        await tx
          .update(watchlists)
          .set({
            index: item.index,
            name: item.name,
            indicator: item.indicator,
            color: item.color,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(watchlists.id, item.id),
              eq(watchlists.userId, userId) // Security check: Ensure they own this watchlist
            )
          );
      }
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Watchlists synced successfully'
  });
});

// --- DELETE: Delete a specific watchlist by ID ---
export const deleteWatchlist = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!userId) return next(new AppError('User not authenticated', 401));
  if (!id) return next(new AppError('Watchlist ID is required', 400));

  const deletedList = await db
    .delete(watchlists)
    .where(
      and(
        eq(watchlists.id, id),
        eq(watchlists.userId, userId) // Ensure user only deletes their own list
      )
    )
    .returning();

  if (!deletedList.length) {
    return next(new AppError('Watchlist not found or you do not have permission to delete it', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Watchlist deleted successfully'
  });
});

export const addEntityToWatchlist = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const rawWatchlistId = req.params.id;
  const watchlistId = Array.isArray(rawWatchlistId) ? rawWatchlistId[0] : rawWatchlistId;
  const { name, segment, exchange, isin, trading_symbol } = req.body;

  if (!userId) return next(new AppError('User not authenticated', 401));
  if (!watchlistId) return next(new AppError('Watchlist ID is required', 400));

  // 1. Validate the incoming payload based on your WatchlistEntity type
  if (!name || !segment || !exchange || !isin || !trading_symbol) {
    return next(new AppError('Please provide name, segment, exchange, isin, and trading_symbol', 400));
  }

  // 2. Fetch the existing watchlist to ensure the user owns it and to get current entities
  const existingList = await db
    .select({ entities: watchlists.entities })
    .from(watchlists)
    .where(
      and(
        eq(watchlists.id, watchlistId),
        eq(watchlists.userId, userId)
      )
    )
    .limit(1);

  if (!existingList.length) {
    return next(new AppError('Watchlist not found or you do not have permission', 404));
  }

  const currentEntities = existingList[0]?.entities ?? [];

  // 3. Prevent duplicate entries (checking by ISIN)
  const isDuplicate = currentEntities.some(entity => entity.isin === isin);
  if (isDuplicate) {
    return next(new AppError('This instrument is already in the watchlist', 400));
  }

  // 4. Append the new entity
  const newEntity = { name, segment, exchange, isin, trading_symbol };
  const updatedEntities = [...currentEntities, newEntity];

  // 5. Update the row in the database
  const updatedList = await db
    .update(watchlists)
    .set({
      entities: updatedEntities,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(watchlists.id, watchlistId),
        eq(watchlists.userId, userId)
      )
    )
    .returning();

  res.status(200).json({
    status: 'success',
    message: 'Entity added to watchlist',
    data: updatedList[0] // Return the updated watchlist to the frontend
  });
});

// --- DELETE: Remove an entity from a specific watchlist ---
export const removeEntityFromWatchlist = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const rawWatchlistId = req.params.id;
  const watchlistId = Array.isArray(rawWatchlistId) ? rawWatchlistId[0] : rawWatchlistId;
  const rawIsinToRemove = req.params.isin;
  const isinToRemove = Array.isArray(rawIsinToRemove) ? rawIsinToRemove[0] : rawIsinToRemove; // We will pass ISIN in the URL

  if (!userId) return next(new AppError('User not authenticated', 401));
  if (!watchlistId || !isinToRemove) return next(new AppError('Watchlist ID and ISIN are required', 400));

  // 1. Fetch the existing watchlist
  const existingList = await db
    .select({ entities: watchlists.entities })
    .from(watchlists)
    .where(
      and(
        eq(watchlists.id, watchlistId),
        eq(watchlists.userId, userId)
      )
    )
    .limit(1);

  if (!existingList.length) {
    return next(new AppError('Watchlist not found', 404));
  }

  const currentEntities = existingList[0]?.entities || [];

  // 2. Filter out the entity by its ISIN
  const updatedEntities = currentEntities.filter(entity => entity.isin !== isinToRemove);

  // 3. Update the database
  const updatedList = await db
    .update(watchlists)
    .set({
      entities: updatedEntities,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(watchlists.id, watchlistId),
        eq(watchlists.userId, userId)
      )
    )
    .returning();

  res.status(200).json({
    status: 'success',
    message: 'Entity removed from watchlist',
    data: updatedList[0]
  });
});


export const syncWatchlistEntities = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const watchlistId = req.params.id;
  const { entities } = req.body; // Expecting the newly ordered array of entities

  if (!userId) return next(new AppError('User not authenticated', 401));
  if (typeof watchlistId !== 'string') return next(new AppError('Invalid watchlist ID', 400));
  if (!Array.isArray(entities)) return next(new AppError('Invalid payload format. Expected an array.', 400));

  const updatedList = await db
    .update(watchlists)
    .set({
      entities: entities, // Overwrite the JSONB column with the new array
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(watchlists.id, watchlistId),
        eq(watchlists.userId, userId)
      )
    )
    .returning();

  if (!updatedList.length) {
    return next(new AppError('Watchlist not found or you do not have permission', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Entities synced successfully',
    data: updatedList[0]
  });
});