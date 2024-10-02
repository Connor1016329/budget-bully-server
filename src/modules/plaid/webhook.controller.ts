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

interface PlaidJwtPayload extends JWT.JWTPayload {
  request_body_sha256: string;
}

@Controller('plaid/webhook')
export class PlaidWebhookController {
  private KEY_CACHE: Map<string, any> = new Map();

  constructor(
    @Inject('PlaidClient') private readonly plaidClient: PlaidApi,
    private readonly plaidService: PlaidService,
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

    const webhookPayload = JSON.parse(request.rawBody.toString());
    const webhookType = webhookPayload.webhook_type;
    const webhookCode = webhookPayload.webhook_code;

    console.log('valid webhook received. Type: ', webhookType);

    // TODO: more webhook handling
    if (webhookType === 'LINK' && webhookCode === 'SESSION_FINISHED') {
      if (webhookPayload.status === 'success') {
        try {
          console.log('Webhook payload:', webhookPayload);
          await this.plaidService.exchangePublicToken(
            webhookPayload.link_token,
            webhookPayload.public_tokens[0],
          );
          return res.status(200).json({
            success: true,
            message: 'Public token exchanged successfully',
          });
        } catch (err) {
          console.error('Error exchanging public token:', err.message);
          return res.status(400).json({
            success: false,
            message: err.message,
          });
        }
      }
    }
    if (webhookType === 'TRANSACTIONS' && webhookCode === 'DEFAULT_UPDATE') {
      try {
        console.log('Webhook payload:', webhookPayload);
        //await this.plaidService.handleTransactionUpdate(webhookPayload);
        return res.status(200).json({
          success: true,
          message: 'Transaction update processed successfully',
        });
      } catch (err) {
        console.error('Error processing transaction update:', err.message);
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
    }

    // Default response for unhandled webhook types
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
        maxTokenAge: '5 min',
        clockTolerance: '5 min', // Add clock tolerance
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
