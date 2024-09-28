import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClerkController } from './webhook.controller';
import { ClerkService } from './clerk.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ClerkController],
  providers: [AuthService, ClerkService],
})
export class AuthModule {}
