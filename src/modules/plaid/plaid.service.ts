import { Inject, Injectable } from '@nestjs/common';
import {
  LinkTokenCreateRequest,
  Products,
  CountryCode,
  LinkTokenCreateResponse,
  PlaidApi,
  ItemPublicTokenExchangeRequest,
  AccountsGetRequest,
  TransactionsSyncResponse,
  AccountBase,
  DepositoryAccountSubtype,
  CreditAccountSubtype,
} from 'plaid';
import { DatabaseService } from '../database/database.service';
import { ExpoService } from '../expo/expo.service';
@Injectable()
export class PlaidService {
  constructor(
    @Inject('PlaidClient') private readonly plaidClient: PlaidApi, // Inject PlaidClient
    private readonly databaseService: DatabaseService, // Inject DatabaseService
    private readonly expoService: ExpoService,
  ) {}

  /**
   * Creates a link token for a user.
   * @param userId - The ID of the user.
   * @returns A promise that resolves to the link token response or null if an error occurs.
   */
  async createLinkToken(
    userId: string,
  ): Promise<LinkTokenCreateResponse | null> {
    try {
      const accessToken: string | null =
        await this.databaseService.getAccessTokenByUserId(userId);

      const webhook = process.env.PORT
        ? 'https://api.budget-bully.com/plaid/webhook'
        : 'https://mallard-possible-horse.ngrok-free.app/plaid/webhook';

      const linkTokenConfig: LinkTokenCreateRequest = {
        client_name: 'Budget Bully',
        country_codes: [CountryCode.Us],
        redirect_uri: 'https://budget-bully.com',
        account_filters: {
          depository: {
            account_subtypes: [
              DepositoryAccountSubtype.Checking,
              DepositoryAccountSubtype.Savings,
            ],
          },
          credit: {
            account_subtypes: [CreditAccountSubtype.CreditCard],
          },
        },
        webhook: webhook,
        language: 'en',
        user: {
          client_user_id: userId,
        },
        products: [Products.Transactions],
        hosted_link: {
          completion_redirect_uri: 'https://budget-bully.com',
          is_mobile_app: true,
          url_lifetime_seconds: 900,
        },
      };

      if (accessToken && accessToken.trim() !== '') {
        linkTokenConfig.access_token = accessToken;
        linkTokenConfig.update = { account_selection_enabled: true };
      }

      const tokenResponse =
        await this.plaidClient.linkTokenCreate(linkTokenConfig);

      // Save the link token to the database
      await this.databaseService.updateUser(userId, {
        linkTokenId: tokenResponse.data.link_token,
      });

      return tokenResponse.data;
    } catch (error) {
      console.error('Error creating link token', error);
      return null;
    }
  }

  /**
   * Exchanges a public token for an access token and adds the users accounts and transactions to the database.
   * @param link_token - The link token.
   * @param public_token - The public token.
   */
  async exchangePublicToken(link_token: string, public_token: string) {
    try {
      const [userId, tokenResponse] = await Promise.all([
        this.databaseService.getUserIdByLinkToken(link_token),
        this.plaidClient.itemPublicTokenExchange({
          public_token: public_token,
        } as ItemPublicTokenExchangeRequest),
      ]);

      // Save the access token to the database
      await this.databaseService.updateUser(userId, {
        accessToken: tokenResponse.data.access_token,
        itemId: tokenResponse.data.item_id,
      });

      console.log(`Updated user ${userId} with access token and item ID`);

      this.updateTransactions(tokenResponse.data.item_id);
    } catch (error) {
      console.error('Error creating access token', error);
      return null;
    }
  }

  /**
   * Updates the database with all transactions associated with an Item.
   * @param itemId - The ID of the item.
   * @returns A promise that resolves to an array of transactions or null if an error occurs.
   */
  async fetchTransactionUpdates(itemId: string) {
    const item = await this.databaseService.retrieveItemByPlaidItemId(itemId);

    if (!item) {
      console.error(`No item found for Plaid item ID: ${itemId}`);
      throw new Error(`Item not found for ID: ${itemId}`);
    }

    const { accessToken, cursor: lastCursor, id: userId } = item;

    if (!accessToken) {
      console.error(`Access token is missing for item ID: ${itemId}`);
      throw new Error(`Access token missing for item ID: ${itemId}`);
    }

    let cursor = lastCursor;

    // New transaction updates since "cursor"
    let added: TransactionsSyncResponse['added'] = [];
    let modified: TransactionsSyncResponse['modified'] = [];
    // Removed transaction ids
    let removed: TransactionsSyncResponse['removed'] = [];
    let hasMore = true;

    const batchSize = 100;
    try {
      // Iterate through each page of new transaction updates for item
      while (hasMore) {
        const request = {
          access_token: accessToken,
          cursor: cursor,
          count: batchSize,
        };
        const response = await this.plaidClient.transactionsSync(request);
        const data = response.data as TransactionsSyncResponse;

        // Add this page of results
        added = added.concat(data.added);
        modified = modified.concat(data.modified);
        removed = removed.concat(data.removed);
        hasMore = data.has_more;
        // Update cursor to the next cursor
        cursor = data.next_cursor;
      }
    } catch (err) {
      console.error(`Error fetching transactions: ${err.message}`);
      cursor = lastCursor;
    }
    return { added, modified, removed, cursor, accessToken, userId };
  }

  /**
   * Handles the fetching and storing of new, modified, or removed transactions
   *
   * @param {string} plaidItemId the Plaid ID for the item.
   */
  async updateTransactions(plaidItemId: string) {
    // Fetch new transactions from plaid api.
    const { added, modified, removed, cursor, userId, accessToken } =
      await this.fetchTransactionUpdates(plaidItemId);

    const response = await this.plaidClient.accountsGet({
      access_token: accessToken,
    } as AccountsGetRequest);

    const accounts = response.data.accounts.map((account: AccountBase) => ({
      id: account.account_id,
      userId: userId,
      name: account.name,
      balance: account.balances.available ?? account.balances.current,
    }));

    const transactionData = added.concat(modified);

    // Extract transaction details: names, dates, and amounts
    const transactions = transactionData.map((transaction: any) => ({
      id: transaction.transaction_id,
      userId: userId,
      accountId: transaction.account_id,
      name: transaction.name,
      date: transaction.authorized_date || transaction.date,
      amount: transaction.amount,
      reviewed: new Date(transaction.date).getMonth() !== new Date().getMonth(),
      category: transaction.personal_finance_category.primary,
      detailedCategory: transaction.personal_finance_category.detailed,
    }));

    await this.databaseService.updateCreateOrDeleteAccounts(accounts);

    await Promise.all([
      ...transactions.map((transaction) =>
        this.databaseService.updateOrCreateTransaction(transaction),
      ),
      ...removed.map((transaction) =>
        this.databaseService.deleteTransaction(transaction.transaction_id),
      ),
    ]);

    await this.databaseService.updateUser(userId, {
      cursor: cursor,
    });

    // if any transactions are unreviewed, get the users push_token and call fireNotification
    const unreviewedTransactions = transactions.filter(
      (transaction) => !transaction.reviewed,
    );
    if (unreviewedTransactions.length > 0) {
      const pushToken =
        await this.databaseService.getUserPushTokenByPlaidItemId(plaidItemId);
      if (pushToken) {
        await this.expoService.sendNotification(
          pushToken,
          'Unreviewed Transactions',
          'You have unreviewed transactions.',
        );
      }
    }
  }

  async deleteUser(id: string) {
    const accessToken = await this.databaseService.getAccessTokenByUserId(id);
    if (accessToken) {
      console.log('plaid removing item');
      const response = await this.plaidClient.itemRemove({
        access_token: accessToken,
      });
      console.log(response.data);
    }
  }

  /**
   * Gets all users.
   * @returns A promise that resolves to an array of users or null if an error occurs.
   */
  async getusers() {
    try {
      return await this.databaseService.getUsers();
    } catch (error) {
      console.error('Error fetching users', error);
      return null;
    }
  }
}
