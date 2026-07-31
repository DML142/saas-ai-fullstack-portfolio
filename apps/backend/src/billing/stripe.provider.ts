import { Provider } from '@nestjs/common';
import Stripe from 'stripe';

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

export const StripeProvider: Provider = {
  provide: STRIPE_CLIENT,
  useFactory: (): Stripe => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('Stripe key is not set');
    }

    return new Stripe(key, { typescript: true });
  },
};
