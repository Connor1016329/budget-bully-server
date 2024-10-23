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
    try {
      const result = await this.databaseClient
        .update(users)
        .set(data)
        .where(eq(users.id, id));
      return result[0];
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async createUser(data: InsertUser) {
    try {
      await this.databaseClient.insert(users).values(data);
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async deleteUser(id: SelectUser['id']) {
    try {
      await this.databaseClient.delete(users).where(eq(users.id, id));
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async getUsers() {
    try {
      return await this.databaseClient.select().from(users);
    } catch (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  async getUserIdByLinkToken(
    LinkToken: SelectUser['linkTokenId'],
  ): Promise<string | null> {
    try {
      const result = await this.databaseClient
        .select({ id: users.id })
        .from(users)
        .where(eq(users.linkTokenId, LinkToken))
        .limit(1);
      return result.length > 0 ? result[0].id : null;
    } catch (error) {
      throw new Error(`Failed to get user ID by link token: ${error.message}`);
    }
  }

  async getUserPushTokenByPlaidItemId(
    plaidItemId: string,
  ): Promise<string | null> {
    try {
      const result = await this.databaseClient
        .select()
        .from(items)
        .where(eq(items.id, plaidItemId))
        .limit(1);
      return result.length > 0 ? result[0].pushToken : null;
    } catch (error) {
      throw new Error(
        `Failed to get user push token by Plaid item ID: ${error.message}`,
      );
    }
  }

  async getUserIdByAccessToken(accessToken: string) {
    try {
      const result = await this.databaseClient
        .select({ id: items.userId })
        .from(items)
        .where(eq(items.accessToken, accessToken))
        .limit(1);
      return result.length > 0 ? result[0].id : null;
    } catch (error) {
      throw new Error(
        `Failed to get user ID by access token: ${error.message}`,
      );
    }
  }

  async getAccessTokenByUserId(userId: string) {
    try {
      const result = await this.databaseClient
        .select({ accessToken: items.accessToken })
        .from(items)
        .where(eq(items.userId, userId));
      return result.length === 1 ? result[0].accessToken : null;
    } catch (error) {
      throw new Error(
        `Failed to get access token by user ID: ${error.message}`,
      );
    }
  }

  async retrieveItemByPlaidItemId(itemId: string): Promise<SelectItem | null> {
    try {
      const result = await this.databaseClient
        .select()
        .from(items)
        .where(eq(items.id, itemId));
      return result[0];
    } catch (error) {
      throw new Error(
        `Failed to retrieve item by Plaid item ID: ${error.message}`,
      );
    }
  }

  async updateCreateOrDeleteAccounts(data: InsertAccount[]) {
    // insert or update accounts
    try {
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
    } catch (error) {
      throw new Error(`Failed to update or create accounts: ${error.message}`);
    }

    // if there is an account that exists in the database but not in the data (and the userID matches), delete it
    try {
      await this.databaseClient.delete(accounts).where(
        and(
          notInArray(
            accounts.id,
            data.map((account) => account.id),
          ),
          eq(accounts.userId, data[0].userId),
        ),
      );
    } catch (error) {
      throw new Error(`Failed to delete accounts: ${error.message}`);
    }
  }

  async getCategoryStatusByUserIdAndCategory(
    userId: string,
    category: string,
  ): Promise<string | null> {
    try {
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
      return result.length > 0 ? result[0].status : null;
    } catch (error) {
      throw new Error(
        `Failed to get category status by user ID and category: ${error.message}`,
      );
    }
  }

  async createTransaction(data: InsertTransaction) {
    try {
      await this.databaseClient.insert(transactions).values(data);
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  async updateOrCreateTransaction(data: Partial<SelectTransaction>) {
    try {
      await this.databaseClient
        .insert(transactions)
        .values(data)
        .onConflictDoUpdate({
          target: [transactions.id],
          set: data,
        });
    } catch (error) {
      throw new Error(
        `Failed to update or create transaction: ${error.message}`,
      );
    }
  }

  async deleteTransaction(id: string) {
    try {
      await this.databaseClient
        .delete(transactions)
        .where(eq(transactions.id, id));
    } catch (error) {
      throw new Error(`Failed to delete transaction: ${error.message}`);
    }
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
    try {
      await this.databaseClient
        .insert(items)
        .values(data)
        .onConflictDoUpdate({
          target: [items.id],
          set: data,
        });
    } catch (error) {
      throw new Error(`Failed to update or create item: ${error.message}`);
    }
  }

  async updateItem(id: string, data: Partial<SelectItem>) {
    try {
      await this.databaseClient.update(items).set(data).where(eq(items.id, id));
    } catch (error) {
      throw new Error(`Failed to update item: ${error.message}`);
    }
  }
}
