import { Body, Controller, Post } from '@nestjs/common';
import { PlaidService } from './plaid.service';

@Controller('plaid/webhook')
export class PlaidWebhookController {
  constructor(private readonly plaidService: PlaidService) {}

  @Post()
  webhook(@Body() body: any) {
    const { webhook_type, webhook_code, status, link_token, public_tokens } =
      body;

    // if (webhook_code !== 'EVENTS') {
    //   console.log('Webhook received', body);
    // }

    console.log('Webhook received', body);
    if (
      webhook_type === 'LINK' &&
      webhook_code === 'SESSION_FINISHED' &&
      status === 'success'
    ) {
      this.plaidService.exchangePublicToken(link_token, public_tokens[0]);
    }

    return { statusCode: 200, message: 'Webhook received' };
  }
}
