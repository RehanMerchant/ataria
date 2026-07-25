import { pgTable, serial, varchar, timestamp, integer, uniqueIndex, uuid, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- TYPES ---
// Define the shape of the objects stored in the entities JSONB array
export type WatchlistEntity = {
  name: string;
  segment: string;
  exchange: string;
  isin: string;
  trading_symbol: string;
};

// --- USERS ---
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }), 
  emailVerified: timestamp('email_verified'), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- OAUTH ACCOUNTS ---
export const oauthAccounts = pgTable('oauth_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    providerUnique: uniqueIndex('oauth_provider_unique').on(table.provider, table.providerAccountId),
  };
});

// --- WATCHLISTS ---
export const watchlists = pgTable('watchlists', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  indicator: varchar('indicator', { length: 5 }).notNull(),
  color: varchar('color', { length: 20 }).notNull(),
  index: integer('index').notNull(),
  entities: jsonb('entities').$type<WatchlistEntity[]>().default([]).notNull(), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- RELATIONS ---
export const usersRelations = relations(users, ({ many }) => ({
  oauthAccounts: many(oauthAccounts),
  watchlists: many(watchlists),
}));

export const watchlistsRelations = relations(watchlists, ({ one }) => ({
  user: one(users, {
    fields: [watchlists.userId],
    references: [users.id],
  }),
}));