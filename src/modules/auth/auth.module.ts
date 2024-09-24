import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ClerkController } from './webhook.controller';
import { ClerkService } from './clerk.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, ClerkController],
  providers: [AuthService, ClerkService],
})
export class AuthModule {}
