import {
  Controller,
  Post,
  Req,
  RawBodyRequest,
  Res,
  Headers,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PlaidService } from './plaid.service';
import { PlaidApi } from 'plaid';
import { jwtDecode } from 'jwt-decode';
import * as JWT from 'jose';
import * as sha256 from 'js-sha256';
import * as secureCompare from 'secure-compare';
import { JWTVerifyOptions } from 'jose';
import { DatabaseService } from '../database/database.service';
interface PlaidJwtPayload extends JWT.JWTPayload {
  request_body_sha256: string;
}

@Controller('plaid/webhook')
export class PlaidWebhookController {
  private KEY_CACHE: Map<string, any> = new Map();

  constructor(
    @Inject('PlaidClient') private readonly plaidClient: PlaidApi,
    private readonly plaidService: PlaidService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post()
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers('plaid-verification') plaidVerification: string,
  ) {
    if (!plaidVerification) {
      return res.status(400).json({
        success: false,
        message: 'Error occurred -- no Plaid verification header',
      });
    }

    const isValid = await this.verifyWebhook(request.rawBody, {
      'plaid-verification': plaidVerification,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature',
      });
    }

    const payload = JSON.parse(request.rawBody.toString());
    const type = payload.webhook_type;
    const code = payload.webhook_code;

    switch (type) {
      case 'LINK':
        if (code === 'SESSION_FINISHED' && payload.status === 'success') {
          try {
            const userId = await this.databaseService.getUserIdByLinkToken(
              payload.link_token,
            );
            const accessToken =
              await this.databaseService.getAccessTokenByUserId(userId);

            if (!accessToken) {
              await this.plaidService.exchangePublicToken(
                payload.link_token,
                payload.public_tokens[0],
              );
            }
          } catch (error) {
            console.error('Error exchanging public token:', error);
          }
        }

        break;

      case 'TRANSACTIONS':
        if (code === 'SYNC_UPDATES_AVAILABLE') {
          try {
            await this.plaidService.updateTransactions(payload.item_id);
          } catch (error) {
            console.error('Error updating transactions:', error);
          }
        }

        break;

      default:
        console.log('Unhandled Webhook');
        break;
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  }

  /**
   * Verifies the authenticity of a Plaid webhook.
   * @param body - The raw body of the webhook request.
   * @param headers - An object containing the 'plaid-verification' header.
   * @returns A promise that resolves to a boolean indicating whether the webhook is valid.
   */
  private async verifyWebhook(
    body: Buffer,
    headers: { 'plaid-verification': string },
  ): Promise<boolean> {
    const signedJwt = headers['plaid-verification'];
    const decodedToken = jwtDecode(signedJwt) as PlaidJwtPayload;
    const decodedTokenHeader = jwtDecode(signedJwt, { header: true });
    const currentKeyID = decodedTokenHeader.kid;

    if (!this.KEY_CACHE.has(currentKeyID)) {
      const keyIDsToUpdate = [];
      this.KEY_CACHE.forEach((key, keyID) => {
        if (key.expired_at == null) {
          keyIDsToUpdate.push(keyID);
        }
      });

      keyIDsToUpdate.push(currentKeyID);

      for (const keyID of keyIDsToUpdate) {
        try {
          const response = await this.plaidClient.webhookVerificationKeyGet({
            key_id: keyID,
          });
          const key = response.data.key;
          this.KEY_CACHE.set(keyID, key);
        } catch (err) {
          console.error(
            'Error fetching webhook verification key:',
            err.message,
          );
          return false;
        }
      }
    }

    if (!this.KEY_CACHE.has(currentKeyID)) {
      return false;
    }

    const key = this.KEY_CACHE.get(currentKeyID);

    if (key.expired_at != null) {
      return false;
    }

    try {
      const keyLike = await JWT.importJWK(key);
      const verifyOptions: JWTVerifyOptions = {
        maxTokenAge: '10 sec',
        clockTolerance: '10 sec', // Add clock tolerance
      };
      await JWT.jwtVerify(signedJwt, keyLike, verifyOptions);
    } catch (error) {
      console.error('Error verifying JWT:', error.message);
      return false;
    }

    const bodyHash = sha256.sha256(body);
    const claimedBodyHash = decodedToken.request_body_sha256;

    return secureCompare(bodyHash, claimedBodyHash);
  }
}
