import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const storeWorkspaces = pgTable('store_workspaces', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  storeName: text('store_name').notNull(),
  storeCode: text('store_code').notNull(),
  doorsJson: jsonb('doors_json').notNull(),
  catalogJson: jsonb('catalog_json').notNull(),
  insightsJson: jsonb('insights_json').notNull(),
  auditsJson: jsonb('audits_json').notNull(),
  settingsJson: jsonb('settings_json').notNull(),
  storesJson: jsonb('stores_json'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  planTier: text('plan_tier').notNull().default('starter'),
  billingCycle: text('billing_cycle').notNull().default('monthly'),
  doorQuota: integer('door_quota').notNull().default(2),
  storeCount: integer('store_count').notNull().default(1),
  googlePlayLinked: boolean('google_play_linked').notNull().default(true),
  status: text('status').notNull().default('active'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull(), // 'user' | 'model'
  modelUsed: text('model_used').notNull(),
  content: text('content').notNull(),
  sourcesJson: jsonb('sources_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  workspace: one(storeWorkspaces, {
    fields: [users.id],
    references: [storeWorkspaces.userId],
  }),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  chatMessages: many(chatMessages),
}));

export const storeWorkspacesRelations = relations(storeWorkspaces, ({ one }) => ({
  owner: one(users, {
    fields: [storeWorkspaces.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  subscriber: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  author: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));
