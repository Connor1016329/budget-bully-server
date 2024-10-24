import { relations } from "drizzle-orm/relations";
import { users, items, accounts, transactions, categories, alerts } from "./schema";

export const itemsRelations = relations(items, ({one}) => ({
	user: one(users, {
		fields: [items.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	items: many(items),
	transactions: many(transactions),
	categories: many(categories),
	accounts: many(accounts),
	alerts: many(alerts),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
	account: one(accounts, {
		fields: [transactions.accountId],
		references: [accounts.id]
	}),
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one, many}) => ({
	transactions: many(transactions),
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const categoriesRelations = relations(categories, ({one}) => ({
	user: one(users, {
		fields: [categories.userId],
		references: [users.id]
	}),
}));

export const alertsRelations = relations(alerts, ({one}) => ({
	user: one(users, {
		fields: [alerts.userId],
		references: [users.id]
	}),
}));