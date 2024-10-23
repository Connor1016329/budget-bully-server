import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { PlaidService } from './plaid.service';
import { clerkClient } from '@clerk/clerk-sdk-node';

@Controller('plaid')
export class PlaidController {
  constructor(private readonly plaidService: PlaidService) {}

  @Get()
  async createLinkToken(@Req() request: Request) {
    const token = request.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Token not found. User must sign in.');
    }
    try {
      const verifiedToken = await clerkClient.verifyToken(token);

      // Use the verified token to get the user ID
      const userId = verifiedToken.sub;

      // Use the PlaidService to create the link token
      const linkToken = await this.plaidService.createLinkToken(userId);

      return { linkToken };
    } catch (error) {
      console.error('Error creating link token: ', error);
      throw new Error(`Failed to create link token: ${error.message}`);
    }
  }
}
