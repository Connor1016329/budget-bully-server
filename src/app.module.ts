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
import { ExpoModule } from './modules/expo/expo.module';
import { ExpoService } from './modules/expo/expo.service';
import { TestsController } from './modules/tests/tests.controller';
@Module({
  controllers: [
    ClerkController,
    PlaidController,
    PlaidWebhookController,
    TestsController,
  ],
  providers: [
    AuthService,
    DatabaseService,
    PlaidService,
    ClerkService,
    ExpoService,
  ],
  imports: [AuthModule, DatabaseModule, PlaidModule, ExpoModule],
})
export class AppModule {}
