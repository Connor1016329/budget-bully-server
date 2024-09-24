import { Controller, Body, Post, Get } from '@nestjs/common';
import { PlaidService } from './plaid.service';

@Controller('plaid')
export class PlaidController {
  constructor(private readonly plaidService: PlaidService) {}

  @Post()
  CreateLinkToken(@Body() body: any) {
    const { client_user_id, redirect_uri } = body;
    console.log('userId', client_user_id);
    console.log('completion_redirect_uri', redirect_uri);
    return this.plaidService.createLinkToken(client_user_id, redirect_uri);
  }

  @Get()
  getusers() {
    return this.plaidService.getusers();
  }
}
