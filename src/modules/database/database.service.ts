import { Inject, Injectable } from '@nestjs/common';
import {
  accounts,
  InsertAccount,
  InsertTransaction,
  InsertUser,
  SelectUser,
  transactions,
  users,
} from './schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class DatabaseService {
  constructor(
    @Inject('DatabaseClient') private readonly databaseClient: any, // Inject the database client
  ) {}
  async updateUser(
    id: SelectUser['id'],
    data: Partial<Omit<SelectUser, 'id'>>,
  ) {
    console.log('updating user: ', id, ' with data: ', data);
    await this.databaseClient.update(users).set(data).where(eq(users.id, id));
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

  async createAccount(data: InsertAccount) {
    await this.databaseClient.insert(accounts).values(data);
  }

  async createTransaction(data: InsertTransaction) {
    await this.databaseClient.insert(transactions).values(data);
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
}
