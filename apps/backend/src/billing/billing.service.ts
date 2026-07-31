import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { STRIPE_CLIENT } from './stripe.provider';
import Stripe from 'stripe';
import { PrismaService } from 'src/PrismaService';
import { PaidTier, PRICE_TO_TIER, TIER_TO_PRICE } from './billing.config';
import { SubscriptionTier } from 'generated/prisma/enums';
import { MailService } from 'src/mail/mail.service';

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

@Injectable()
export class BillingService {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async ensureStripeCustomer(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeCustomerId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  async createCheckoutSession(userId: string, tier: PaidTier): Promise<string> {
    // An already-subscribed user changes plans via the billing portal, not a
    // second checkout — a new Checkout session would create a parallel
    // subscription and double-bill them.
    const currentTier = await this.getEffectiveTier(userId);
    if (currentTier !== SubscriptionTier.FREE) {
      return this.createPortalSession(userId);
    }

    const customerId = await this.ensureStripeCustomer(userId);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: TIER_TO_PRICE[tier], quantity: 1 }],
      success_url: process.env.STRIPE_CHECKOUT_SUCCESS_URL!,
      cancel_url: process.env.STRIPE_CHECKOUT_CANCEL_URL!,
    });

    if (!session.url) {
      throw new Error('Stripe did not return checkout url');
    }

    return session.url;
  }

  async createPortalSession(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      throw new BadRequestException('No billing account for this user yet');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: process.env.STRIPE_PORTAL_RETURN_URL!,
    });

    return session.url;
  }

  async getEffectiveTier(userId: string): Promise<SubscriptionTier> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { tier: true, status: true },
    });

    if (subscription && ACTIVE_STATUSES.has(subscription.status)) {
      return subscription.tier;
    }

    return SubscriptionTier.FREE;
  }

  async handleWebhookEvent(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Promise<void> {
    if (!rawBody || !signature) {
      throw new BadRequestException('Missing stripe webhook body or signature');
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error('stripe webhook secret is not set');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }

    const alreadyProcessed = await this.prisma.processedWebhookEvent.findUnique(
      {
        where: { id: event.id },
      },
    );
    if (alreadyProcessed) {
      return;
    }

    await this.applyEvent(event);

    await this.prisma.processedWebhookEvent.create({
      data: { id: event.id, type: event.type },
    });
  }

  private async applyEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const user = await this.syncSubscription(subscription);
        if (user && ACTIVE_STATUSES.has(subscription.status)) {
          await this.mail.queueSubscriptionConfirmedEmail(user.email);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await this.syncSubscription(event.data.object);
        break;
      }
      case 'invoice.payment_failed': {
        await this.handlePaymentFailed(event.data.object);
        break;
      }
    }
  }

  private async syncSubscription(
    subscription: Stripe.Subscription,
  ): Promise<{ id: string; email: string } | null> {
    const customerId = this.customerId(subscription.customer);

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: { id: true, email: true },
    });
    if (!user) {
      return null;
    }

    const item = subscription.items.data[0];
    const priceId = item.price.id;
    const tier = PRICE_TO_TIER[priceId] ?? SubscriptionTier.FREE;

    const data = {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
      stripePriceId: priceId,
      tier,
      status: subscription.status,
      currentPeriodEnd: new Date(item.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };

    await this.prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });

    return user;
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.customer) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { stripeCustomerId: this.customerId(invoice.customer) },
      select: { email: true },
    });
    if (!user) {
      return;
    }

    await this.mail.queuePaymentFailedEmail(user.email);
  }

  private customerId(
    customer: string | Stripe.Customer | Stripe.DeletedCustomer,
  ): string {
    return typeof customer === 'string' ? customer : customer.id;
  }
}
