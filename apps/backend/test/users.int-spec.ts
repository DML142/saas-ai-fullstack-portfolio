import { INestApplication } from '@nestjs/common';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import { join } from 'path';
import Redis from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from 'src/PrismaService';
import { AVATAR_UPLOAD_DIR } from 'src/users/avatar-upload.config';
import {
  AuthResponseBody,
  createIntegrationApp,
  createTestRedisClient,
  uniqueEmail,
} from './integration/test-app';

// Smallest possible valid PNG (1x1 transparent pixel) — big enough for
// Multer's FileTypeValidator to recognize the real magic number, small
// enough to keep the spec fast.
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

interface AvatarResponseBody {
  avatarUrl: string | null;
}

describe('Users (integration)', () => {
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
    await rm(AVATAR_UPLOAD_DIR, { recursive: true, force: true });
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

  it('uploads an avatar, storing the file on disk and the URL in the database', async () => {
    const { userId, accessToken } = await registerAndGetToken();

    const res = await request(app.getHttpServer())
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('avatar', ONE_PIXEL_PNG, 'avatar.png')
      .expect(200);

    const body = res.body as AvatarResponseBody;
    expect(body.avatarUrl).toMatch(/^\/uploads\/avatars\/.+\.png$/);

    const stored = await prisma.user.findUnique({ where: { id: userId } });
    expect(stored?.avatarUrl).toBe(body.avatarUrl);

    const filename = body.avatarUrl!.split('/').pop()!;
    expect(existsSync(join(AVATAR_UPLOAD_DIR, filename))).toBe(true);
  });

  it('deletes the old file when replacing an avatar', async () => {
    const { accessToken } = await registerAndGetToken();

    const firstRes = await request(app.getHttpServer())
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('avatar', ONE_PIXEL_PNG, 'avatar.png')
      .expect(200);
    const firstBody = firstRes.body as AvatarResponseBody;
    const firstFilename = firstBody.avatarUrl!.split('/').pop()!;
    expect(existsSync(join(AVATAR_UPLOAD_DIR, firstFilename))).toBe(true);

    const secondRes = await request(app.getHttpServer())
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('avatar', ONE_PIXEL_PNG, 'avatar-2.png')
      .expect(200);

    const secondBody = secondRes.body as AvatarResponseBody;
    expect(secondBody.avatarUrl).not.toBe(firstBody.avatarUrl);
    expect(existsSync(join(AVATAR_UPLOAD_DIR, firstFilename))).toBe(false);
  });

  it('rejects a non-image file', async () => {
    const { accessToken } = await registerAndGetToken();

    await request(app.getHttpServer())
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('avatar', Buffer.from('not an image'), 'notes.txt')
      .expect(400);
  });

  it('removes an avatar, deleting the file and clearing the database column', async () => {
    const { userId, accessToken } = await registerAndGetToken();

    const uploadRes = await request(app.getHttpServer())
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('avatar', ONE_PIXEL_PNG, 'avatar.png')
      .expect(200);
    const filename = (uploadRes.body as AvatarResponseBody)
      .avatarUrl!.split('/')
      .pop()!;

    const removeRes = await request(app.getHttpServer())
      .delete('/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(removeRes.body).toEqual({ avatarUrl: null });

    const stored = await prisma.user.findUnique({ where: { id: userId } });
    expect(stored?.avatarUrl).toBeNull();
    expect(existsSync(join(AVATAR_UPLOAD_DIR, filename))).toBe(false);
  });

  it('removing an avatar that was never set is a no-op', async () => {
    const { accessToken } = await registerAndGetToken();

    const res = await request(app.getHttpServer())
      .delete('/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body).toEqual({ avatarUrl: null });
  });
});
