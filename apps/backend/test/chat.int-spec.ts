import { INestApplication } from '@nestjs/common';
import Redis from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from 'src/PrismaService';
import { getUsageKey } from 'src/chat/usage-key.util';
import {
  AuthResponseBody,
  createIntegrationApp,
  createTestRedisClient,
  uniqueEmail,
} from './integration/test-app';

interface WorkspaceResponseBody {
  id: string;
}

describe('Chat (integration)', () => {
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

  async function registerAndGetToken(): Promise<{
    userId: string;
    accessToken: string;
  }> {
    const email = uniqueEmail();
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'correct-horse-battery-staple' })
      .expect(201);
    const body = res.body as AuthResponseBody;
    return { userId: body.id, accessToken: body.accessToken };
  }

  it('sends a message, increments the real Redis usage counter, and reflects it in GET /chat/usage', async () => {
    const { userId, accessToken } = await registerAndGetToken();
    const auth = `Bearer ${accessToken}`;

    const workspaceRes = await request(app.getHttpServer())
      .post('/chat/workspaces')
      .set('Authorization', auth)
      .send({ name: 'Integration test workspace' })
      .expect(201);
    const workspaceId = (workspaceRes.body as WorkspaceResponseBody).id;

    const sendRes = await request(app.getHttpServer())
      .post(`/chat/workspaces/${workspaceId}/messages`)
      .set('Authorization', auth)
      .send({ content: 'Hello from an integration test' })
      .expect(201);
    expect(sendRes.body).toMatchObject({
      workspaceId,
      role: 'USER',
      content: 'Hello from an integration test',
    });

    const storedMessage = await prisma.message.findUnique({
      where: { id: (sendRes.body as WorkspaceResponseBody).id },
    });
    expect(storedMessage).not.toBeNull();

    const rawCounter = await redis.get(getUsageKey(userId));
    expect(rawCounter).toBe('1');

    const usageRes = await request(app.getHttpServer())
      .get('/chat/usage')
      .set('Authorization', auth)
      .expect(200);
    expect(usageRes.body).toEqual({ tier: 'FREE', used: 1, limit: 50 });
  });

  it('rejects a send once the real Redis counter is at the FREE tier limit', async () => {
    const { userId, accessToken } = await registerAndGetToken();
    const auth = `Bearer ${accessToken}`;

    const workspaceRes = await request(app.getHttpServer())
      .post('/chat/workspaces')
      .set('Authorization', auth)
      .send({ name: 'Quota test workspace' })
      .expect(201);
    const workspaceId = (workspaceRes.body as WorkspaceResponseBody).id;

    // Set the real counter to the FREE-tier limit directly, rather than
    // sending 50 messages, to keep the spec fast.
    await redis.set(getUsageKey(userId), '50', 'EX', 60 * 60 * 24 * 32);

    const res = await request(app.getHttpServer())
      .post(`/chat/workspaces/${workspaceId}/messages`)
      .set('Authorization', auth)
      .send({ content: 'One message too many' })
      .expect(403);
    expect(res.body).toMatchObject({
      message: 'Monthly message limit reached',
      tier: 'FREE',
      limit: 50,
      used: 50,
    });

    // A blocked send must never be counted — the counter stays exactly at
    // the limit, not incremented past it.
    const rawCounter = await redis.get(getUsageKey(userId));
    expect(rawCounter).toBe('50');
  });

  it('returns 404 for a workspace that belongs to another user', async () => {
    const owner = await registerAndGetToken();
    const intruder = await registerAndGetToken();

    const workspaceRes = await request(app.getHttpServer())
      .post('/chat/workspaces')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: "Owner's workspace" })
      .expect(201);
    const workspaceId = (workspaceRes.body as WorkspaceResponseBody).id;

    await request(app.getHttpServer())
      .post(`/chat/workspaces/${workspaceId}/messages`)
      .set('Authorization', `Bearer ${intruder.accessToken}`)
      .send({ content: 'Should not be allowed' })
      .expect(404);

    await request(app.getHttpServer())
      .get(`/chat/workspaces/${workspaceId}/messages`)
      .set('Authorization', `Bearer ${intruder.accessToken}`)
      .expect(404);
  });
});
