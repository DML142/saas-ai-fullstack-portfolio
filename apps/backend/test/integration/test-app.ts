import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import Redis from 'ioredis';
import { App } from 'supertest/types';
import { AppModule } from 'src/app.module';

export async function createIntegrationApp(
  moduleOverrides?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication<App>> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (moduleOverrides) {
    builder = moduleOverrides(builder);
  }

  const moduleFixture: TestingModule = await builder.compile();

  // Mirrors main.ts's bootstrap — a spec only exercises real behavior if it
  // goes through the same middleware/pipe wiring as a real request.
  const app = moduleFixture.createNestApplication<INestApplication<App>>({
    rawBody: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}

// Narrower than the real DTO, deliberately, so specs cast `res.body` to
// only what they use instead of `any`.
export interface AuthResponseBody {
  id: string;
  accessToken: string;
  email?: string;
  role?: string;
  tier?: string;
  emailVerified?: boolean;
}

export function createTestRedisClient(): Redis {
  return new Redis(process.env.REDIS_URL!);
}

export function uniqueEmail(prefix = 'int-test'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

// Supertest has no built-in way to read a cookie back out of a plain
// (non-agent) response, so `Set-Cookie` is parsed by hand.
export function extractCookieValue(
  res: { headers: Record<string, string | string[] | undefined> },
  name: string,
): string {
  const raw = res.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const match = cookies
    .map((c) => c.split(';')[0])
    .find((c) => c.startsWith(`${name}=`));
  if (!match) {
    throw new Error(`expected a "${name}" cookie in the response, found none`);
  }
  return match.slice(name.length + 1);
}

// Reads a single-use token directly out of Redis — integration specs don't
// run a mail transport, so the HTTP response never returns it.
export async function findSingleTokenByPrefix(
  redis: Redis,
  prefix: string,
): Promise<string> {
  const keys = await redis.keys(`${prefix}:*`);
  if (keys.length !== 1) {
    throw new Error(
      `expected exactly one "${prefix}:*" key in the test Redis, found ${keys.length}`,
    );
  }
  return keys[0].slice(prefix.length + 1);
}
