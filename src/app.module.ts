import { Module } from '@nestjs/common';
import { PlaidModule } from './modules/plaid/plaid.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './modules/database/database.module';
import { AuthService } from './modules/auth/auth.service';
import { DatabaseService } from './modules/database/database.service';
import { PlaidService } from './modules/plaid/plaid.service';
import { ClerkController } from './modules/auth/webhook.controller';
import { PlaidController } from './modules/plaid/plaid.controller';
import { PlaidWebhookController } from './modules/plaid/webhook.controller';
import { ClerkService } from './modules/auth/clerk.service';

@Module({
  controllers: [ClerkController, PlaidController, PlaidWebhookController],
  providers: [AuthService, DatabaseService, PlaidService, ClerkService],
  imports: [AuthModule, DatabaseModule, PlaidModule],
})
export class AppModule {}
