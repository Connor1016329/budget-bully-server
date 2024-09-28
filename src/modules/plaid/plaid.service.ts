import { Inject, Injectable } from '@nestjs/common';
import {
  LinkTokenCreateRequest,
  Products,
  CountryCode,
  LinkTokenCreateResponse,
  PlaidApi,
  ItemPublicTokenExchangeRequest,
  TransactionsSyncRequest,
} from 'plaid';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PlaidService {
  constructor(
    @Inject('PlaidClient') private readonly plaidClient: PlaidApi, // Inject PlaidClient
    private readonly databaseService: DatabaseService, // Inject DatabaseService
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
      const linkTokenConfig: LinkTokenCreateRequest = {
        client_name: 'Budget Bully',
        country_codes: [CountryCode.Us],
        redirect_uri: 'https://budget-bully.com',
        webhook: 'https://mallard-possible-horse.ngrok-free.app/plaid/webhook',
        language: 'en',
        user: {
          client_user_id: 'userId',
        },
        products: [Products.Transactions],
        hosted_link: {
          completion_redirect_uri: 'https://budget-bully.com',
          is_mobile_app: true,
          url_lifetime_seconds: 900,
        },
      };
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
      });

      const transactionsResponse = await this.plaidClient.transactionsSync({
        access_token: tokenResponse.data.access_token,
      } as TransactionsSyncRequest);

      console.log('transactionsResponse', transactionsResponse);

      // Extract account names and balances
      const accounts = transactionsResponse.data.accounts.map(
        (account: any) => ({
          id: account.account_id,
          userId: userId,
          name: account.name,
          balance: account.balances.available ?? account.balances.current,
        }),
      );

      // Extract transaction details: names, dates, and amounts
      const transactions = transactionsResponse.data.added.map(
        (transaction: any) => ({
          id: transaction.transaction_id,
          userId: userId,
          accountId: transaction.account_id,
          name: transaction.name,
          date: transaction.date,
          amount: transaction.amount,
        }),
      );

      await Promise.all(
        accounts.map((account) => this.databaseService.createAccount(account)),
      );

      await Promise.all(
        transactions.map((transaction) =>
          this.databaseService.createTransaction(transaction),
        ),
      );
    } catch (error) {
      console.error('Error creating access token', error);
      return null;
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
