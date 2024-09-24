import { Module } from '@nestjs/common';
import { PlaidService } from './plaid.service';
import { PlaidController } from './plaid.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule], // Ensure ConfigModule is imported to use environment variables
  controllers: [PlaidController],
  providers: [
    PlaidService,
    {
      provide: 'PlaidClient', // Provide PlaidClient as a token
      useFactory: (configService: ConfigService) => {
        const plaidConfig = new Configuration({
          basePath:
            PlaidEnvironments[configService.get('PLAID_ENV', 'sandbox')], // Dynamically get the environment
          baseOptions: {
            headers: {
              'PLAID-CLIENT-ID': configService.get('PLAID_CLIENT_ID'),
              'PLAID-SECRET': configService.get('PLAID_SECRET'),
              'Plaid-Version': '2020-09-14',
            },
          },
        });
        return new PlaidApi(plaidConfig); // Return a new instance of PlaidApi
      },
      inject: [ConfigService], // Inject ConfigService to access environment variables
    },
  ],
  exports: ['PlaidClient'], // Export PlaidClient if it needs to be used in other modules
})
export class PlaidModule {}
