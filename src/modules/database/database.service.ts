import { Inject, Injectable } from '@nestjs/common';
import {
  accounts,
  categories,
  InsertAccount,
  InsertTransaction,
  InsertUser,
  items,
  SelectItem,
  SelectTransaction,
  SelectUser,
  transactions,
  users,
} from './schema';
import { and, eq, notInArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject('DatabaseClient') private readonly databaseClient: any, // Inject the database client
  ) {}

  async updateUser(
    id: SelectUser['id'],
    data: Partial<Omit<SelectUser, 'id'>>,
  ): Promise<SelectUser> {
    const result = await this.databaseClient
      .update(users)
      .set(data)
      .where(eq(users.id, id));
    return result[0];
  }

  async createUser(data: InsertUser) {
    await this.databaseClient.insert(users).values(data);
  }

  async deleteUser(id: SelectUser['id']) {
    await this.databaseClient.delete(users).where(eq(users.id, id));
  }

  async getUsers() {
    return await this.databaseClient.select().from(users);
  }

  async getUserIdByLinkToken(
    LinkToken: SelectUser['linkTokenId'],
  ): Promise<string | null> {
    const result = await this.databaseClient
      .select({ id: users.id })
      .from(users)
      .where(eq(users.linkTokenId, LinkToken))
      .limit(1);
    if (result.length > 0) {
      return result[0].id; // Return the first record
    } else {
      return null; // No matching record found
    }
  }

  async getUserPushTokenByPlaidItemId(
    plaidItemId: string,
  ): Promise<string | null> {
    const result = await this.databaseClient
      .select()
      .from(items)
      .where(eq(items.id, plaidItemId))
      .limit(1);
    if (result.length > 0) {
      return result[0].pushToken; // Return the first record
    } else {
      return null; // No matching record found
    }
  }

  async getUserIdByAccessToken(accessToken: string) {
    const result = await this.databaseClient
      .select({ id: items.userId })
      .from(items)
      .where(eq(items.accessToken, accessToken))
      .limit(1);
    if (result.length > 0) {
      return result[0].id; // Return the first record
    } else {
      return null; // No matching record found
    }
  }

  async getAccessTokenByUserId(userId: string) {
    const result = await this.databaseClient
      .select({ accessToken: items.accessToken })
      .from(items)
      .where(eq(items.userId, userId));
    if (result.length === 1) {
      return result[0].accessToken;
    } else {
      return null;
    }
  }

  async retrieveItemByPlaidItemId(itemId: string): Promise<SelectItem | null> {
    const result = await this.databaseClient
      .select()
      .from(items)
      .where(eq(items.id, itemId));
    return result[0];
  }

  async updateCreateOrDeleteAccounts(data: InsertAccount[]) {
    // insert or update accounts
    await this.databaseClient
      .insert(accounts)
      .values(data)
      .onConflictDoUpdate({
        target: [accounts.id],
        set: {
          name: sql`excluded.name`,
          balance: sql`excluded.balance`,
          updated_at: new Date(),
        },
      });

    // if there is an account that exists in the database but not in the data (and the userID matches), delete it
    await this.databaseClient.delete(accounts).where(
      and(
        notInArray(
          accounts.id,
          data.map((account) => account.id),
        ),
        eq(accounts.userId, data[0].userId),
      ),
    );
  }

  async getCategoryStatusByUserIdAndCategory(
    userId: string,
    category: string,
  ): Promise<string | null> {
    const result = await this.databaseClient
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.category, category as any),
        ),
      )
      .limit(1);
    return result[0].status;
  }

  async createTransaction(data: InsertTransaction) {
    await this.databaseClient.insert(transactions).values(data);
  }

  async updateOrCreateTransaction(data: Partial<SelectTransaction>) {
    await this.databaseClient
      .insert(transactions)
      .values(data)
      .onConflictDoUpdate({
        target: [transactions.id],
        set: data,
      });
  }

  async deleteTransaction(id: string) {
    await this.databaseClient
      .delete(transactions)
      .where(eq(transactions.id, id));
  }

  async getTransactionsByUserId(userId: string) {
    try {
      const transactions = await this.databaseClient
        .select('transactions')
        .join('accounts', 'transactions.account_id', 'accounts.id')
        .join('users', 'accounts.user_id', 'users.id')
        .where('users.id', userId)
        .execute();

      return transactions;
    } catch (error) {
      console.error('Error fetching transactions for user', error);
      throw new Error('Failed to retrieve transactions');
    }
  }

  async updateOrCreateItem(id: string, data: Partial<SelectItem>) {
    await this.databaseClient
      .insert(items)
      .values(data)
      .onConflictDoUpdate({
        target: [items.id],
        set: data,
      });
  }

  async updateItem(id: string, data: Partial<SelectItem>) {
    await this.databaseClient.update(items).set(data).where(eq(items.id, id));
  }
}
