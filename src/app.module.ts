import { Module } from '@nestjs/common';
import { PlaidModule } from './modules/plaid/plaid.module';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './modules/database/database.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuthService } from './modules/auth/auth.service';
import { DatabaseService } from './modules/database/database.service';
import { PlaidService } from './modules/plaid/plaid.service';
import { SyncService } from './modules/sync/sync.service';
import { ClerkController } from './modules/auth/webhook.controller';
import { AuthController } from './modules/auth/auth.controller';
import { PlaidController } from './modules/plaid/plaid.controller';
import { PlaidWebhookController } from './modules/plaid/webhook.controller';
import { SyncController } from './modules/sync/sync.controller';
import { ClerkService } from './modules/auth/clerk.service';

@Module({
  controllers: [
    ClerkController,
    AuthController,
    PlaidController,
    PlaidWebhookController,
    SyncController,
  ],
  providers: [
    AuthService,
    DatabaseService,
    PlaidService,
    SyncService,
    ClerkService,
  ],
  imports: [AuthModule, DatabaseModule, PlaidModule, SyncModule],
})
export class AppModule {}
