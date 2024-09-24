import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ClerkService {
  constructor(
    private readonly databaseService: DatabaseService, // Inject DatabaseService
  ) {}
  async createUser(data) {
    try {
      await this.databaseService.createUser(data);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Could not create user');
    }
  }
}
