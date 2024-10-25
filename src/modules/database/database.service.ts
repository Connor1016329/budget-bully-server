import { Inject, Injectable } from '@nestjs/common';
import {
  accounts,
  categories,
  InsertAccount,
  InsertTransaction,
  InsertUser,
  items,
  SelectAccount,
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
      const userTransactions = await this.databaseClient
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId));

      return userTransactions;
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

  async setSuggestedLimits(
    userId: string,
    transactions: InsertTransaction[],
    accounts: SelectAccount[],
  ) {
    // Calculate the average income of the last 5 months
    const calculateMonthlyIncome = () => {
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
      fiveMonthsAgo.setDate(1);

      const incomeTransactions = transactions
        .filter((transaction) => {
          const account = accounts.find(
            (acc) => acc.id === transaction.accountId,
          );
          return account?.type === 'depository' && transaction.amount > 0;
        })
        .filter((transaction) => new Date(transaction.date) >= fiveMonthsAgo);

      if (incomeTransactions.length === 0) return 0;

      const totalIncome = incomeTransactions.reduce(
        (acc, transaction) => acc + transaction.amount,
        0,
      );
      return totalIncome / 5; // Average over 5 months
    };

    const averageMonthlyIncome = calculateMonthlyIncome();
    console.log('Average Monthly Income:', averageMonthlyIncome);

    // use 50 30 20 rule to set limits
    // 50% Needs: Covers essential expenses like housing, groceries, transportation, health insurance.
    // 30% Wants: Discretionary spending on things like hobbies, dining out, entertainment.
    // 20% Savings: Includes retirement contributions, emergency fund, and debt repayment.

    // group categories by 50 30 20 rule
    const needsCategories = [
      'BANK_FEES',
      'GROCERIES',
      'INSURANCE',
      'RENT_AND_UTILITIES',
      'TRANSPORTATION',
    ];
    const wantsCategories = [
      'EATING_OUT',
      'ENTERTAINMENT',
      'SUBSCRIPTIONS',
      'PERSONAL_CARE',
      'GENERAL_SERVICES',
      'GENERAL_MERCHANDISE',
      'TRAVEL',
    ];
    const savingsCategories = ['SAVINGS', 'LOAN_PAYMENTS'];

    const calculateCategoryPercentages = (
      categories: string[],
      transactions: InsertTransaction[],
    ) => {
      const categoryTotals = categories.reduce(
        (acc, category) => {
          acc[category] = 0;
          return acc;
        },
        {} as Record<string, number>,
      );

      const filteredTransactions = transactions.filter((t) =>
        categories.includes(t.category),
      );

      filteredTransactions.forEach((transaction) => {
        categoryTotals[transaction.category] += Math.abs(transaction.amount);
      });

      const totalSpent = Object.values(categoryTotals).reduce(
        (sum, amount) => sum + amount,
        0,
      );

      return categories.reduce(
        (acc, category) => {
          acc[category] =
            totalSpent > 0 ? categoryTotals[category] / totalSpent : 0;
          return acc;
        },
        {} as Record<string, number>,
      );
    };

    const needsPercentages = calculateCategoryPercentages(
      needsCategories,
      transactions,
    );
    const wantsPercentages = calculateCategoryPercentages(
      wantsCategories,
      transactions,
    );
    const savingsPercentages = calculateCategoryPercentages(
      savingsCategories,
      transactions,
    );

    console.log('Needs Percentages:', needsPercentages);
    console.log('Wants Percentages:', wantsPercentages);
    console.log('Savings Percentages:', savingsPercentages);

    // Now we use these percentages to set individual category limits
    const setCategoryLimits = (
      percentages: Record<string, number>,
      totalLimit: number,
    ) => {
      return Object.entries(percentages).reduce(
        (acc, [category, percentage]) => {
          acc[category] = totalLimit * percentage;
          return acc;
        },
        {} as Record<string, number>,
      );
    };

    const needsCategoryLimits = setCategoryLimits(
      needsPercentages,
      averageMonthlyIncome * 0.5,
    );
    const wantsCategoryLimits = setCategoryLimits(
      wantsPercentages,
      averageMonthlyIncome * 0.3,
    );
    const savingsCategoryLimits = setCategoryLimits(
      savingsPercentages,
      averageMonthlyIncome * 0.2,
    );

    console.log('Needs Category Limits:', needsCategoryLimits);
    console.log('Wants Category Limits:', wantsCategoryLimits);
    console.log('Savings Category Limits:', savingsCategoryLimits);

    const allCategories = {
      ...needsCategoryLimits,
      ...wantsCategoryLimits,
      ...savingsCategoryLimits,
    };

    const categoryLimits = [
      ...Object.entries(allCategories).map(([category, limit]) => ({
        category,
        limit,
      })),
      { category: 'INCOME', limit: averageMonthlyIncome * -1 },
    ];

    const categoryLimitsTotal = categoryLimits.reduce(
      (acc, limit) => acc + limit.limit,
      0,
    );

    console.log('Category Limits Total:', categoryLimitsTotal);

    await Promise.all([
      ...categoryLimits.map((categoryLimit) =>
        this.updateCategoryLimits(userId, categoryLimit),
      ),
    ]);

    // Here you would typically save these limits to your database
    // For example:
    // await this.saveCategoryLimits(userId, { ...needsCategoryLimits, ...wantsCategoryLimits, ...savingsCategoryLimits });
  }

  async updateCategoryLimits(
    userId: string,
    categoryLimit: { category: string; limit: number },
  ) {
    try {
      await this.databaseClient
        .update(categories)
        .set({ limit: categoryLimit.limit })
        .where(
          and(
            eq(categories.userId, userId),
            eq(categories.category, categoryLimit.category),
          ),
        );
    } catch (error) {
      throw new Error(`Failed to update category limits: ${error.message}`);
    }
  }
}
