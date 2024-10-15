import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClerkController } from './webhook.controller';
import { ClerkService } from './clerk.service';
import { DatabaseModule } from '../database/database.module';
import { PlaidService } from '../plaid/plaid.service';
import { PlaidModule } from '../plaid/plaid.module';

@Module({
  imports: [DatabaseModule, PlaidModule],
  controllers: [ClerkController],
  providers: [AuthService, ClerkService, PlaidService],
})
export class AuthModule {}
