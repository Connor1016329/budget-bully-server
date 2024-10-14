import { relations } from "drizzle-orm/relations";
import { users, categories, accounts, transactions, alerts } from "./schema";

export const categoriesRelations = relations(categories, ({one}) => ({
	user: one(users, {
		fields: [categories.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	categories: many(categories),
	accounts: many(accounts),
	transactions: many(transactions),
	alerts: many(alerts),
}));

export const accountsRelations = relations(accounts, ({one, many}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
	transactions: many(transactions),
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

export const alertsRelations = relations(alerts, ({one}) => ({
	user: one(users, {
		fields: [alerts.userId],
		references: [users.id]
	}),
}));