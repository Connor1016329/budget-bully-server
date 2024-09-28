import {
  pgTable,
  foreignKey,
  text,
  varchar,
  doublePrecision,
  timestamp,
  boolean,
  unique,
  uuid,
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
  'Housing',
  'Entertainment',
  'Eating Out',
  'Insurance',
  'Other',
  'Uncategorized',
  'Savings',
  'Debt payment',
  'Subscriptions',
]);

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
      accountsUserIdUsersIdFk: foreignKey({
        columns: [table.userId],
        foreignColumns: [users.id],
        name: 'accounts_user_id_users_id_fk',
      }),
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
    category: budgetCategory('category').default('Uncategorized').notNull(),
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
});
