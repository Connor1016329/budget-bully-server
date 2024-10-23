import { Controller, Body, Post } from '@nestjs/common';
import { ExpoService } from '../expo/expo.service';

@Controller('tests')
export class TestsController {
  constructor(private readonly expoService: ExpoService) {}

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
}
