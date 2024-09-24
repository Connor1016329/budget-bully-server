import {
  doublePrecision,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

// Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: varchar('email').notNull().unique(),
  firstName: varchar('first_name').notNull(),
  lastName: varchar('last_name').notNull(),
  link_token_id: text('link_token_id'),
  access_token: text('access_token'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: varchar('name').notNull(),
  balance: doublePrecision('balance').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey().notNull(),
  userId: text('user_id'),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  name: varchar('name').notNull(),
  date: text('date').notNull(),
  amount: text('amount').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Export types for insertion and selection
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type InsertAccount = typeof accounts.$inferInsert;
export type SelectAccount = typeof accounts.$inferSelect;

export type InsertTransaction = typeof transactions.$inferInsert;
export type SelectTransaction = typeof transactions.$inferSelect;
