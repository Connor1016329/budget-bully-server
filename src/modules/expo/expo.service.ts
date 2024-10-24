import { Inject, Injectable } from '@nestjs/common';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ExpoService {
  constructor(
    @Inject('ExpoClient') private readonly expoClient: Expo, // Inject the Expo client
    private readonly databaseService: DatabaseService,
  ) {}

  async sendMassNotifications(tokens: string[], title: string, body: string) {
    // Create the messages that you want to send to clients
    const messages = [];
    for (const pushToken of tokens) {
      // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

      // Check that all your push tokens appear to be valid Expo push tokens
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      // Construct a message (see https://docs.expo.io/push-notifications/sending-notifications/)
      messages.push({
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: { withSome: 'data' },
      });
    }

    // The Expo push notification service accepts batches of notifications so
    // that you don't need to send 1000 requests to send 1000 notifications. We
    // recommend you batch your notifications to reduce the number of requests
    // and to compress them (notifications with similar content will get
    // compressed).
    const chunks = this.expoClient.chunkPushNotifications(messages);
    const tickets = [];
    (async () => {
      // Send the chunks to the Expo push notification service. There are
      // different strategies you could use. A simple one is to send one chunk at a
      // time, which nicely spreads the load out over time:
      for (const chunk of chunks) {
        try {
          const ticketChunk =
            await this.expoClient.sendPushNotificationsAsync(chunk);
          console.log(ticketChunk);
          tickets.push(...ticketChunk);
          // NOTE: If a ticket contains an error code in ticket.details.error, you
          // must handle it appropriately. The error codes are listed in the Expo
          // documentation:
          // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
        } catch (error) {
          console.error(error.message, '\n', error.response.data);
        }
      }
    })();
  }

  async getReceipts(tickets: any[]) {
    // Later, after the Expo push notification service has delivered the
    // notifications to Apple or Google (usually quickly, but allow the service
    // up to 30 minutes when under load), a "receipt" for each notification is
    // created. The receipts will be available for at least a day; stale receipts
    // are deleted.
    //
    // The ID of each receipt is sent back in the response "ticket" for each
    // notification. In summary, sending a notification produces a ticket, which
    // contains a receipt ID you later use to get the receipt.
    //
    // The receipts may contain error codes to which you must respond. In
    // particular, Apple or Google may block apps that continue to send
    // notifications to devices that have blocked notifications or have uninstalled
    // your app. Expo does not control this policy and sends back the feedback from
    // Apple and Google so you can handle it appropriately.
    const receiptIds = [];
    for (const ticket of tickets) {
      // NOTE: Not all tickets have IDs; for example, tickets for notifications
      // that could not be enqueued will have error information and no receipt ID.
      if (ticket.status === 'ok') {
        receiptIds.push(ticket.id);
      }
    }

    const receiptIdChunks =
      this.expoClient.chunkPushNotificationReceiptIds(receiptIds);
    (async () => {
      // Like sending notifications, there are different strategies you could use
      // to retrieve batches of receipts from the Expo service.
      for (const chunk of receiptIdChunks) {
        try {
          const receipts =
            await this.expoClient.getPushNotificationReceiptsAsync(chunk);
          console.log(receipts);

          // The receipts specify whether Apple or Google successfully received the
          // notification and information about an error, if one occurred.
          for (const receiptId in receipts) {
            const { status, details } = receipts[receiptId];
            if (status === 'ok') {
              continue;
            } else if (status === 'error') {
              console.error(
                `There was an error sending a notification: ${details}`,
              );
              if (details && details.error) {
                // The error codes are listed in the Expo documentation:
                // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
                // You must handle the errors appropriately.
                console.error(`The error code is ${details.error}`);
              }
            }
          }
        } catch (error) {
          console.error(error.message, '\n', error.response.data);
        }
      }
    })();
  }

  async sendUnreviewedTransactionsNotification(
    token: string,
    transactions: {
      category: any;
      detailedCategory: any;
      name: string;
    }[],
    userId: string,
  ) {
    try {
      if (!Expo.isExpoPushToken(token)) {
        console.error(`Push token ${token} is not a valid Expo push token`);
        return;
      }

      const message: ExpoPushMessage = {
        to: token,
        sound: 'default',
      };

      let flag = false;

      // if categories include PERSONAL_CARE, GENERAL_MERCHANDISE, FOOD_AND_DRINK, ENTERTAINMENT, or TRAVEL, send a notification
      if (
        transactions.some(
          (transaction) => transaction.category === 'GENERAL_MERCHANDISE',
        )
      ) {
        // if users GENERAL_MERCHANDISE status is not GOOD, send a notification
        const status =
          await this.databaseService.getCategoryStatusByUserIdAndCategory(
            userId,
            'GENERAL_MERCHANDISE',
          );
        if (status !== 'GOOD') {
          flag = true;
          message.title = 'General Merchandise';
          message.subtitle = 'Unreviewed transactions';
          if (
            transactions.some((transaction) =>
              transaction.name.includes('Target'),
            )
          ) {
            message.body =
              'Target strikes again! Walking in for toothpaste and walking out with an entire patio set and a baby Yoda mug, because self-control is overrated.';
          } else if (
            transactions.some((transaction) =>
              transaction.name.includes('Amazon'),
            )
          ) {
            message.body =
              'Another Amazon purchase? Your front porch is starting to look like a warehouse. Too bad your wallet’s more like an empty shipping box.';
          } else {
            message.body =
              'Over budget on shopping? You must think of yourself as a philanthropist, generously donating to ‘The Help Me Stay Broke’ Foundation.';
          }
        }
      }
      if (
        transactions.some(
          (transaction) => transaction.category === 'FOOD_AND_DRINK',
        ) &&
        !flag
      ) {
        // if users FOOD_AND_DRINK status is not GOOD, send a notification
        const status =
          await this.databaseService.getCategoryStatusByUserIdAndCategory(
            userId,
            'FOOD_AND_DRINK',
          );
        if (status !== 'GOOD') {
          flag = true;
          message.title = 'Food and Drink';
          message.subtitle = 'Unreviewed transactions';
          if (
            transactions.some((transaction) =>
              transaction.name.includes('Starbucks'),
            )
          ) {
            message.body =
              'Spending your rent money on caramel macchiatos? That’s one expensive way to pretend you’re productive while you procrastinate your way into poverty.';
          } else if (
            transactions.some((transaction) =>
              transaction.name.includes('McDonald'),
            )
          ) {
            message.body =
              'Another meal out? Sure, why cook at home when you can eat like a king and budget like a court jester.';
          } else {
            message.body =
              "You spent how much at McDonald's? If your savings account had as much grease as those fries, maybe it wouldn’t be so slippery.";
          }
        }
      }
      if (
        transactions.some(
          (transaction) => transaction.category === 'PERSONAL_CARE',
        ) &&
        !flag
      ) {
        // if users PERSONAL_CARE status is not GOOD, send a notification
        const status =
          await this.databaseService.getCategoryStatusByUserIdAndCategory(
            userId,
            'PERSONAL_CARE',
          );
        if (status !== 'GOOD') {
          flag = true;
          message.title = 'Personal Care';
          message.subtitle = 'Unreviewed transactions';
          message.body =
            'You’re spending so much on skincare that your budget needs wrinkle cream. At least your face will look great while you’re crying over your credit card bill.';
        }
      }
      if (
        transactions.some(
          (transaction) => transaction.category === 'ENTERTAINMENT',
        ) &&
        !flag
      ) {
        // if users ENTERTAINMENT status is not GOOD, send a notification
        const status =
          await this.databaseService.getCategoryStatusByUserIdAndCategory(
            userId,
            'ENTERTAINMENT',
          );
        if (status !== 'GOOD') {
          flag = true;
          message.title = 'Entertainment';
          message.subtitle = 'Unreviewed transactions';
          message.body =
            'Oh, you’re over budget on fun stuff again? Guess someone thought they were starring in The Wolf of Wall Street. Spoiler alert: You’re more like ‘Broke of Main Street.’';
        }
      }
      if (
        transactions.some((transaction) => transaction.category === 'TRAVEL') &&
        !flag
      ) {
        // if users TRAVEL status is not GOOD, send a notification
        const status =
          await this.databaseService.getCategoryStatusByUserIdAndCategory(
            userId,
            'TRAVEL',
          );
        if (status !== 'GOOD') {
          flag = true;
          message.title = 'Travel';
          message.subtitle = 'Unreviewed transactions';
          message.body =
            'Over budget on travel? Nice! Now you can run away from your responsibilities in style.';
        }
      }
      if (!flag) {
        message.title = 'Unreviewed Transactions';
        message.body = 'You have unreviewed transactions';
      }

      await this.expoClient.sendPushNotificationsAsync([message]);
    } catch (error) {
      console.error(
        `Failed to send unreviewed transactions notification: ${error.message}`,
      );
      throw new Error(
        `Failed to send unreviewed transactions notification: ${error.message}`,
      );
    }
  }
}
