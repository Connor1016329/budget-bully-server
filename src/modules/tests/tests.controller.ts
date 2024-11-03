import { Controller, Body, Post } from '@nestjs/common';
import { ExpoService } from '../expo/expo.service';
import { PlaidService } from '../plaid/plaid.service';
@Controller('tests')
export class TestsController {
  constructor(
    private readonly expoService: ExpoService,
    private readonly plaidService: PlaidService,
  ) {}

  @Post('send-notification')
  async sendNotification(
    @Body('token') token: string,
    @Body('transactions')
    @Body('password') password: string,
    transactions: {
      category: any;
      detailedCategory: any;
      name: string;
    }[],
    @Body('user_id') user_id: string,
  ) {
    if (password === 'Cln1758!!') {
      await this.expoService.sendUnreviewedTransactionsNotification(
        token,
        transactions,
        user_id,
      );
      return 'Notification sent';
    } else {
      return 'Invalid password';
    }
  }

  @Post('update-webhook')
  async updateWebhook(
    @Body('access_token') access_token: string,
    @Body('webhook') webhook: string,
    @Body('password') password: string,
  ) {
    if (password === 'Cln1758!!') {
      try {
      await this.plaidService.updateWebhook(access_token, webhook);
      return 'Webhook updated';
    } catch (error) {
        return error;
      }
    } else {
      return 'Invalid password';
    }
  }

  @Post('update-item')
  async updateItem(@Body('item_id') item_id: string, @Body('password') password: string) {
    if (password === 'Cln1758!!') {
      try {
        await this.plaidService.updateTransactions(item_id);
      return 'Item updated';
    } catch (error) {
      console.error('Error updating transactions:', error);
      return error;
      }
    } else {
      return 'Invalid password';
    }
  }
}
