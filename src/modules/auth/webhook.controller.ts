import {
  Controller,
  Post,
  Req,
  RawBodyRequest,
  Res,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { ClerkService } from './clerk.service';

@Controller('clerk')
export class ClerkController {
  constructor(private readonly clerkService: ClerkService) {}

  @Post()
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>, // Accessing the raw body here
    @Res() res: Response,
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new HttpException(
        'You need a WEBHOOK_SECRET in your .env',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Check if all required Svix headers are present
    if (!svixId || !svixTimestamp || !svixSignature) {
      return res.status(400).json({
        success: false,
        message: 'Error occurred -- no svix headers',
      });
    }

    const wh = new Webhook(WEBHOOK_SECRET);

    let evt;

    // Use the raw body (Buffer) for Svix verification
    try {
      evt = wh.verify(request.rawBody, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err) {
      console.error('Error verifying webhook:', err.message);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Handle the webhook event
    if (evt.type === 'user.created') {
      const userData = evt.data;

      // Prepare data for the ClerkService
      const userPayload = {
        id: userData.id,
        email: userData.email_addresses[0]?.email_address, // Assuming primary email is the first
        firstName: userData.first_name,
        lastName: userData.last_name,
      };
      console.log('User payload:', userPayload);

      try {
        // Call createUser from ClerkService
        const newUser = await this.clerkService.createUser(userPayload);
        console.log('User created:', newUser);
        // Return success response
        return res.status(200).json({
          success: true,
          message: 'User created successfully',
          user: newUser,
        });
      } catch (err) {
        console.error('Error creating user:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    if (evt.type === 'user.updated') {
      const userData = evt.data;

      // Prepare data for the ClerkService
      const userPayload = {
        id: userData.id,
        email: userData.email_addresses[0]?.email_address, // Assuming primary email is the first
        firstName: userData.first_name,
        lastName: userData.last_name,
      };
      console.log('User payload:', userPayload);

      try {
        // Call createUser from ClerkService
        await this.clerkService.updateUser(userPayload);
        console.log('User updated');
        // Return success response
        return res.status(200).json({
          success: true,
          message: 'User updated successfully',
          user: userPayload.id,
        });
      } catch (err) {
        console.error('Error updating user:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    if (evt.type === 'user.deleted') {
      const userData = evt.data;

      try {
        // Call createUser from ClerkService
        await this.clerkService.deleteUser(userData.id);
        console.log('User deleted');
        // Return success response
        return res.status(200).json({
          success: true,
          message: 'User updated successfully',
          user: userData.id,
        });
      } catch (err) {
        console.error('Error updating user:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  }
}
