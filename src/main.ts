import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Use the environment variable PORT, or default to 3000 locally
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
