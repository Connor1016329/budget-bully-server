import {
  pgTable,
  foreignKey,
  unique,
  uuid,
  text,
  doublePrecision,
  timestamp,
  varchar,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const alertType = pgEnum('alert_type', [
  'uncategorizedTransaction',
  'overBudget',
  'almostOverBudget',
  'accountNeedsAction',
]);
export const budgetCategory = pgEnum('budget_category', [
  'BANK_FEES',
  'ENTERTAINMENT',
  'FOOD_AND_DRINK',
  'GENERAL_MERCHANDISE',
  'GENERAL_SERVICES',
  'GOVERNMENT_AND_NON_PROFIT',
  'HOME_IMPROVEMENT',
  'INCOME',
  'LOAN_PAYMENTS',
  'MEDICAL',
  'PERSONAL_CARE',
  'RENT_AND_UTILITIES',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'TRANSPORTATION',
  'TRAVEL',
  'OTHER',
]);
export const categoryStatus = pgEnum('category_status', [
  'GOOD',
  'ALMOST_OVER',
  'OVER',
]);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    userId: text('user_id').notNull(),
    category: budgetCategory('category').notNull(),
    limit: doublePrecision('limit')
      .default(sql`'0'`)
      .notNull(),
    total: doublePrecision('total')
      .default(sql`'0'`)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    reason: text('reason'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    status: categoryStatus('status').default('GOOD').notNull(),
  },
  (table) => {
    return {
      categoriesUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [users.id],
        name: 'categories_user_id_fkey',
      })
        .onUpdate('cascade')
        .onDelete('cascade'),
      categoriesIdKey: unique('categories_id_key').on(table.id),
    };
  },
);

export const accounts = pgTable(
  'accounts',
  {
    id: text('id').primaryKey().notNull(),
    userId: text('user_id').notNull(),
    name: varchar('name').notNull(),
    balance: doublePrecision('balance').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      accountsUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [users.id],
        name: 'accounts_user_id_fkey',
      })
        .onUpdate('cascade')
        .onDelete('cascade'),
    };
  },
);

export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey().notNull(),
    accountId: text('account_id').notNull(),
    name: varchar('name').notNull(),
    date: text('date').notNull(),
    amount: doublePrecision('amount').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' })
      .defaultNow()
      .notNull(),
    userId: text('user_id').notNull(),
    reviewed: boolean('reviewed').default(false).notNull(),
    category: budgetCategory('category').default('OTHER').notNull(),
    detailedCategory: text('detailed_category').default('OTHER').notNull(),
  },
  (table) => {
    return {
      transactionsAccountIdAccountsIdFk: foreignKey({
        columns: [table.accountId],
        foreignColumns: [accounts.id],
        name: 'transactions_account_id_accounts_id_fk',
      }),
      transactionsUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [users.id],
        name: 'transactions_user_id_fkey',
      })
        .onUpdate('cascade')
        .onDelete('cascade'),
    };
  },
);

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    userId: text('user_id').notNull(),
    type: alertType('type').notNull(),
    message: text('message'),
    isRead: boolean('is_read').default(false).notNull(),
    target: text('target'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      alertsUserIdFkey: foreignKey({
        columns: [table.userId],
        foreignColumns: [users.id],
        name: 'alerts_user_id_fkey',
      })
        .onUpdate('cascade')
        .onDelete('cascade'),
    };
  },
);

export const users = pgTable('users', {
  id: text('id').primaryKey().notNull(),
  email: varchar('email').notNull(),
  firstName: varchar('first_name').notNull(),
  lastName: varchar('last_name').notNull(),
  linkTokenId: text('link_token_id'),
  accessToken: text('access_token'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  cursor: text('cursor'),
  itemId: text('item_id'),
});

// Export types for insertion and selection
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export type InsertAccount = typeof accounts.$inferInsert;
export type SelectAccount = typeof accounts.$inferSelect;

export type InsertTransaction = typeof transactions.$inferInsert;
export type SelectTransaction = typeof transactions.$inferSelect;

export type InsertCategory = typeof categories.$inferInsert;
export type SelectCategory = typeof categories.$inferSelect;

export type InsertAlert = typeof alerts.$inferInsert;
export type SelectAlert = typeof alerts.$inferSelect;
