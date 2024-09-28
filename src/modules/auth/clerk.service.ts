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

  async updateUser(data) {
    try {
      await this.databaseService.updateUser(data.id, data);
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Could not update user');
    }
  }

  async deleteUser(id) {
    try {
      await this.databaseService.deleteUser(id);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Could not update user');
    }
  }
}
