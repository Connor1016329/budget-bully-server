import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as postgres from 'postgres';
import { DatabaseService } from './database.service';
import { config } from 'dotenv';

config({ path: '.env' }); // Load environment variables from .env

@Global()
@Module({
  imports: [ConfigModule], // Import ConfigModule to use environment variables
  providers: [
    DatabaseService,
    {
      provide: 'DatabaseClient', // Provide a token for the database client
      useFactory: () => {
        const client = postgres(process.env.DATABASE_URL!, {
          debug: true,
          prepare: false, // Disable prefetch as it is not supported for "Transaction" pool mode
        });
        return drizzle(client); // Return a new instance of drizzle
      },
      inject: [ConfigService], // Inject ConfigService to access environment variables
    },
  ],
  exports: [DatabaseService, 'DatabaseClient'], // Export the database client to be used in other modules
})
export class DatabaseModule {}
