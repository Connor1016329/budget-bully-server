import { Module, Global } from '@nestjs/common';
import { ExpoService } from './expo.service';
import { Expo } from 'expo-server-sdk';

@Global()
@Module({
  providers: [
    ExpoService,
    {
      provide: 'ExpoClient',
      useFactory: () => {
        const client = new Expo();
        return client;
      },
    },
  ],
  exports: [ExpoService, 'ExpoClient'],
})
export class ExpoModule {}
