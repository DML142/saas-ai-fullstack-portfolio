import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from 'src/PrismaService';
import { MailService } from 'src/mail/mail.service';
import { SubscriptionTier } from 'generated/prisma/enums';
import { STRIPE_CLIENT } from './stripe.provider';

describe('BillingService', () => {
  let service: BillingService;
  let stripe: {
    webhooks: { constructEvent: jest.Mock };
    checkout: { sessions: { create: jest.Mock } };
    billingPortal: { sessions: { create: jest.Mock } };
    customers: { create: jest.Mock };
  };
  let prisma: {
    subscription: { findUnique: jest.Mock; upsert: jest.Mock };
    processedWebhookEvent: { findUnique: jest.Mock; create: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let mail: {
    queuePaymentFailedEmail: jest.Mock;
    queueSubscriptionConfirmedEmail: jest.Mock;
  };

  beforeEach(async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    stripe = {
      webhooks: { constructEvent: jest.fn() },
      checkout: { sessions: { create: jest.fn() } },
      billingPortal: { sessions: { create: jest.fn() } },
      customers: { create: jest.fn() },
    };
    prisma = {
      subscription: { findUnique: jest.fn(), upsert: jest.fn() },
      processedWebhookEvent: { findUnique: jest.fn(), create: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    mail = {
      queuePaymentFailedEmail: jest.fn(),
      queueSubscriptionConfirmedEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: STRIPE_CLIENT, useValue: stripe },
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('handleWebhookEvent — signature verification', () => {
    it('rejects a missing signature without calling Stripe', async () => {
      await expect(
        service.handleWebhookEvent(Buffer.from('{}'), undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(stripe.webhooks.constructEvent).not.toHaveBeenCalled();
    });

    it('rejects a tampered/invalid signature', async () => {
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('signature verification failed');
      });
      await expect(
        service.handleWebhookEvent(Buffer.from('{}'), 'bad-sig'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.processedWebhookEvent.create).not.toHaveBeenCalled();
    });

    it('accepts a valid signed event and records it', async () => {
      stripe.webhooks.constructEvent.mockReturnValue({
        id: 'evt_1',
        type: 'customer.created',
        data: { object: {} },
      });
      prisma.processedWebhookEvent.findUnique.mockResolvedValue(null);

      await service.handleWebhookEvent(Buffer.from('{}'), 'good-sig');

      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        expect.any(Buffer),
        'good-sig',
        'whsec_test',
      );
      expect(prisma.processedWebhookEvent.create).toHaveBeenCalledWith({
        data: { id: 'evt_1', type: 'customer.created' },
      });
    });
  });

  describe('handleWebhookEvent — idempotency', () => {
    it('skips an already-processed event', async () => {
      stripe.webhooks.constructEvent.mockReturnValue({
        id: 'evt_dup',
        type: 'customer.subscription.updated',
        data: { object: {} },
      });
      prisma.processedWebhookEvent.findUnique.mockResolvedValue({
        id: 'evt_dup',
      });

      await service.handleWebhookEvent(Buffer.from('{}'), 'good-sig');

      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
      expect(prisma.processedWebhookEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('createCheckoutSession — duplicate-subscription guard', () => {
    it('redirects an already-subscribed user to the billing portal', async () => {
      // getEffectiveTier → PRO (active), so no new checkout should be created.
      prisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: 'active',
      });
      prisma.user.findUnique.mockResolvedValue({ stripeCustomerId: 'cus_1' });
      stripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/p/session/test',
      });

      const url = await service.createCheckoutSession('u1', 'ULTRA');

      expect(url).toBe('https://billing.stripe.com/p/session/test');
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('creates a checkout session when the user has no active subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null); // effective tier FREE
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'u@example.com',
        stripeCustomerId: 'cus_1',
      });
      stripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/c/pay/cs_test',
      });

      const url = await service.createCheckoutSession('u1', 'PRO');

      expect(url).toBe('https://checkout.stripe.com/c/pay/cs_test');
      expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
    });
  });

  describe('getEffectiveTier', () => {
    it('returns the tier for an active paid subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: 'active',
      });
      expect(await service.getEffectiveTier('u1')).toBe(SubscriptionTier.PRO);
    });

    it('returns the tier for a trialing subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.LITE,
        status: 'trialing',
      });
      expect(await service.getEffectiveTier('u1')).toBe(SubscriptionTier.LITE);
    });

    it('returns FREE for a canceled subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        tier: SubscriptionTier.PRO,
        status: 'canceled',
      });
      expect(await service.getEffectiveTier('u1')).toBe(SubscriptionTier.FREE);
    });

    it('returns FREE when there is no subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      expect(await service.getEffectiveTier('u1')).toBe(SubscriptionTier.FREE);
    });
  });
});
