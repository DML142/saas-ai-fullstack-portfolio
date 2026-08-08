import { INestApplication } from '@nestjs/common';
import { TestingModuleBuilder } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import Stripe from 'stripe';
import Redis from 'ioredis';
import { PrismaService } from 'src/PrismaService';
import { STRIPE_CLIENT } from 'src/billing/stripe.provider';
import {
  AuthResponseBody,
  createIntegrationApp,
  createTestRedisClient,
  uniqueEmail,
} from './integration/test-app';

describe('Billing (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: Redis;
  let stripeMock: {
    customers: { create: jest.Mock };
    checkout: { sessions: { create: jest.Mock } };
    billingPortal: { sessions: { create: jest.Mock } };
    subscriptions: { update: jest.Mock };
    webhooks: { constructEvent: Stripe['webhooks']['constructEvent'] };
  };

  beforeAll(async () => {
    // `webhooks.constructEvent` is real Stripe signature-verification code
    // (no network call) — only the account-touching calls are mocked.
    const realStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    });
    stripeMock = {
      customers: { create: jest.fn() },
      checkout: { sessions: { create: jest.fn() } },
      billingPortal: { sessions: { create: jest.fn() } },
      subscriptions: { update: jest.fn() },
      webhooks: {
        constructEvent: realStripe.webhooks.constructEvent.bind(
          realStripe.webhooks,
        ) as Stripe['webhooks']['constructEvent'],
      },
    };

    app = await createIntegrationApp((builder: TestingModuleBuilder) =>
      builder.overrideProvider(STRIPE_CLIENT).useValue(stripeMock),
    );
    prisma = app.get(PrismaService);
    redis = createTestRedisClient();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await prisma.user.deleteMany({
      where: { email: { contains: 'int-test-' } },
    });
    // Also resets /auth/register's rate-limit counter, which otherwise
    // accumulates across this file's registered test users.
    await redis.flushdb();
  });

  afterAll(async () => {
    await redis.quit();
    await app.close();
  });

  async function registerAndGetToken(): Promise<{
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

  describe('POST /billing/checkout', () => {
    it('creates a Stripe customer and a Checkout session for a FREE user', async () => {
      const { userId, accessToken } = await registerAndGetToken();
      stripeMock.customers.create.mockResolvedValue({ id: 'cus_int_test_1' });
      stripeMock.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/c/pay/cs_test_int',
      });

      const res = await request(app.getHttpServer())
        .post('/billing/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tier: 'LITE' })
        .expect(200);

      expect(res.body).toEqual({
        url: 'https://checkout.stripe.com/c/pay/cs_test_int',
      });
      expect(stripeMock.billingPortal.sessions.create).not.toHaveBeenCalled();

      const stored = await prisma.user.findUnique({ where: { id: userId } });
      expect(stored?.stripeCustomerId).toBe('cus_int_test_1');
    });

    it('redirects an already-subscribed user to the billing portal instead of a new checkout', async () => {
      const { userId, accessToken } = await registerAndGetToken();
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: 'cus_int_test_existing' },
      });
      await prisma.subscription.create({
        data: {
          userId,
          stripeSubscriptionId: 'sub_int_test_existing',
          stripeCustomerId: 'cus_int_test_existing',
          stripePriceId: process.env.STRIPE_PRICE_PRO!,
          tier: 'PRO',
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      stripeMock.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/p/session/int_test',
      });

      const res = await request(app.getHttpServer())
        .post('/billing/checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tier: 'ULTRA' })
        .expect(200);

      expect(res.body).toEqual({
        url: 'https://billing.stripe.com/p/session/int_test',
      });
      expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/billing/checkout')
        .send({ tier: 'LITE' })
        .expect(401);
    });
  });

  describe('POST /billing/webhook', () => {
    function buildSubscriptionCreatedPayload(customerId: string): string {
      return JSON.stringify({
        id: `evt_int_test_${Date.now()}`,
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_int_test_new',
            customer: customerId,
            status: 'active',
            cancel_at_period_end: false,
            items: {
              data: [
                {
                  price: { id: process.env.STRIPE_PRICE_LITE },
                  current_period_end: Math.floor(Date.now() / 1000) + 2592000,
                },
              ],
            },
          },
        },
      });
    }

    function sign(payload: string): string {
      return Stripe.webhooks.generateTestHeaderString({
        payload,
        secret: process.env.STRIPE_WEBHOOK_SECRET!,
      });
    }

    it('rejects a request with an invalid signature', async () => {
      const payload = buildSubscriptionCreatedPayload('cus_does_not_matter');
      await request(app.getHttpServer())
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', 'tampered-signature')
        .send(payload)
        .expect(400);
    });

    it('syncs a subscription from a validly-signed event and is idempotent on replay', async () => {
      const { userId } = await registerAndGetToken();
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: 'cus_int_test_webhook' },
      });

      const payload = buildSubscriptionCreatedPayload('cus_int_test_webhook');
      const signature = sign(payload);

      await request(app.getHttpServer())
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200, { received: true });

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });
      expect(subscription).toMatchObject({
        tier: 'LITE',
        status: 'active',
        stripeSubscriptionId: 'sub_int_test_new',
      });
      const firstUpdatedAt = subscription!.updatedAt;

      const processedEvents = await prisma.processedWebhookEvent.findMany({
        where: { id: (JSON.parse(payload) as { id: string }).id },
      });
      expect(processedEvents).toHaveLength(1);

      // Replaying the exact same event (same id) must be a no-op — Stripe
      // retries webhooks, and re-applying must never re-run side effects.
      await request(app.getHttpServer())
        .post('/billing/webhook')
        .set('Content-Type', 'application/json')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200, { received: true });

      const afterReplay = await prisma.subscription.findUnique({
        where: { userId },
      });
      expect(afterReplay!.updatedAt).toEqual(firstUpdatedAt);

      const processedEventsAfterReplay =
        await prisma.processedWebhookEvent.findMany({
          where: { id: (JSON.parse(payload) as { id: string }).id },
        });
      expect(processedEventsAfterReplay).toHaveLength(1);
    });
  });
});
