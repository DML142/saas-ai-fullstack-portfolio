import { INestApplication } from '@nestjs/common';
import Redis from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from 'src/PrismaService';
import {
  AuthResponseBody,
  createIntegrationApp,
  createTestRedisClient,
  extractCookieValue,
  findSingleTokenByPrefix,
  uniqueEmail,
} from './integration/test-app';

describe('Auth (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: Redis;

  beforeAll(async () => {
    app = await createIntegrationApp();
    prisma = app.get(PrismaService);
    redis = createTestRedisClient();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { contains: 'int-test-' } },
    });
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.quit();
    await app.close();
  });

  const PASSWORD = 'correct-horse-battery-staple';

  it('registers a user against the real database', async () => {
    const email = uniqueEmail();

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);

    expect(res.body).toMatchObject({
      email,
      emailVerified: false,
      role: 'USER',
      tier: 'FREE',
    });
    expect((res.body as AuthResponseBody).accessToken).toEqual(
      expect.any(String),
    );
    expect(res.headers['set-cookie']?.[0]).toMatch(/^refreshToken=/);

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toBeNull();
  });

  it('rejects registering the same email twice', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(400);
  });

  it('rejects login with the wrong password', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('logs in and returns a profile matching /auth/me', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(201);

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set(
        'Authorization',
        `Bearer ${(loginRes.body as AuthResponseBody).accessToken}`,
      )
      .expect(200);

    expect(meRes.body).toMatchObject({ email, tier: 'FREE' });
  });

  it('rotates the refresh token and rejects reuse of the old one', async () => {
    const email = uniqueEmail();

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);
    const oldRefreshToken = extractCookieValue(registerRes, 'refreshToken');

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${oldRefreshToken}`)
      .expect(201);
    const rotatedRefreshToken = extractCookieValue(refreshRes, 'refreshToken');
    expect(rotatedRefreshToken).not.toEqual(oldRefreshToken);

    // Replaying the pre-rotation token must be rejected as reuse, not
    // silently accepted — this is the whole point of the family/jti model.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${oldRefreshToken}`)
      .expect(401);
  });

  it('verifies email using the real Redis-stored token', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);

    const token = await findSingleTokenByPrefix(redis, 'verify');

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token })
      .expect(201);

    const stored = await prisma.user.findUnique({ where: { email } });
    expect(stored?.emailVerified).toBe(true);
  });

  it('rejects an already-used verification token', async () => {
    const email = uniqueEmail();
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);

    const token = await findSingleTokenByPrefix(redis, 'verify');
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token })
      .expect(400);
  });

  it('resets the password via the real Redis-stored token and revokes existing sessions', async () => {
    const email = uniqueEmail();
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: PASSWORD })
      .expect(201);
    const oldRefreshToken = extractCookieValue(registerRes, 'refreshToken');

    await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email })
      .expect(201);

    const token = await findSingleTokenByPrefix(redis, 'reset');
    const newPassword = 'new-correct-horse-battery-staple';

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, password: newPassword })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: newPassword })
      .expect(201);

    // The access token itself isn't revoked (JWTs aren't stateful), but the
    // refresh-token family behind it must be — the guarantee reset-password
    // makes is "no one can silently stay logged in", not "this exact
    // access token stops working before it expires".
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refreshToken=${oldRefreshToken}`)
      .expect(401);
  });
});
