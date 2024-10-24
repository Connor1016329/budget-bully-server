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
    transactions: {
      category: any;
      detailedCategory: any;
      name: string;
    }[],
    @Body('user_id') user_id: string,
  ) {
    await this.expoService.sendUnreviewedTransactionsNotification(
      token,
      transactions,
      user_id,
    );
    return 'Notification sent';
  }

  @Post('update-webhook')
  async updateWebhook(
    @Body('access_token') access_token: string,
    @Body('webhook') webhook: string,
  ) {
    try {
      await this.plaidService.updateWebhook(access_token, webhook);
      return 'Webhook updated';
    } catch (error) {
      return error;
    }
  }

  @Post('update-item')
  async updateItem(@Body('item_id') item_id: string) {
    try {
      await this.plaidService.updateTransactions(item_id);
      return 'Item updated';
    } catch (error) {
      console.error('Error updating transactions:', error);
      return error;
    }
  }
}
