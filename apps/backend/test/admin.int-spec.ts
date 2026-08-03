import { INestApplication } from '@nestjs/common';
import Redis from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from 'src/PrismaService';
import {
  AuthResponseBody,
  createIntegrationApp,
  createTestRedisClient,
  uniqueEmail,
} from './integration/test-app';

interface UserListResponseBody {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
}

describe('Admin (integration)', () => {
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

  async function registerUser(): Promise<{
    userId: string;
    accessToken: string;
    email: string;
  }> {
    const email = uniqueEmail();
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'correct-horse-battery-staple' })
      .expect(201);
    const body = res.body as AuthResponseBody;
    return { userId: body.id, accessToken: body.accessToken, email };
  }

  async function registerAdmin(): Promise<{
    userId: string;
    accessToken: string;
  }> {
    const { userId } = await registerUser();
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN' },
    });
    // Role is embedded in the JWT at issue time, so a plain DB update to an
    // already-issued token's user doesn't retroactively change its claims —
    // log in again to get a token that reflects the new ADMIN role.
    const email = (await prisma.user.findUnique({ where: { id: userId } }))!
      .email;
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'correct-horse-battery-staple' })
      .expect(201);
    return {
      userId,
      accessToken: (loginRes.body as AuthResponseBody).accessToken,
    };
  }

  it('rejects a non-admin user on every admin route', async () => {
    const { accessToken } = await registerUser();
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/stats')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('lists users with real pagination, correctly transforming numeric query params', async () => {
    const admin = await registerAdmin();
    await registerUser();
    await registerUser();
    await registerUser();

    // The whole point of this scenario: `page`/`limit` arrive as strings
    // over HTTP — this only passes if the global ValidationPipe's
    // `transform: true` actually converts them via @Type(() => Number),
    // the exact behavior a bug once shipped without (tech.md's admin-panel
    // note on this).
    const res = await request(app.getHttpServer())
      .get('/admin/users?page=1&limit=2')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    const body = res.body as UserListResponseBody;

    expect(body.page).toBe(1);
    expect(body.limit).toBe(2);
    expect(body.data).toHaveLength(2);
    expect(body.total).toBeGreaterThanOrEqual(4);
  });

  it('refuses to let an admin change their own role', async () => {
    const admin = await registerAdmin();

    await request(app.getHttpServer())
      .patch(`/admin/users/${admin.userId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'USER' })
      .expect(403);

    const stored = await prisma.user.findUnique({
      where: { id: admin.userId },
    });
    expect(stored?.role).toBe('ADMIN');
  });

  it("changes another user's role", async () => {
    const admin = await registerAdmin();
    const target = await registerUser();

    const res = await request(app.getHttpServer())
      .patch(`/admin/users/${target.userId}/role`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ role: 'PREMIUM' })
      .expect(200);
    expect(res.body).toMatchObject({ id: target.userId, role: 'PREMIUM' });

    const stored = await prisma.user.findUnique({
      where: { id: target.userId },
    });
    expect(stored?.role).toBe('PREMIUM');
  });
});
